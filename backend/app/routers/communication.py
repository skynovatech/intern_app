from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import httpx
import logging

from app.database import get_db, SessionLocal
from app.models.application import Application
from app.models.communication_log import CommunicationLog
from app.models.email_template import EmailTemplate
from app.models.whatsapp_template import WhatsAppTemplate
from app.schemas.communication import (
    SendEmailRequest,
    SendWhatsAppRequest,
    BulkSendEmailRequest,
    BulkSendWhatsAppRequest,
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTemplateResponse,
    WhatsAppTemplateCreate,
    WhatsAppTemplateUpdate,
    WhatsAppTemplateResponse,
    CommunicationLogResponse,
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.email_service import send_email
from app.services.template_service import resolve_variables, TEMPLATE_VARIABLES
from app.services.whatsapp_service import (
    send_whatsapp_message,
    check_connection,
    get_qr_code,
    logout_instance,
    delete_instance,
)
from app.config import get_settings
from app.services import notification_templates as default_tpls

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Communication"])
settings = get_settings()


def _app_to_dict(app) -> dict:
    return {
        "full_name": app.full_name,
        "email": app.email,
        "mobile": app.mobile,
        "college": app.college,
        "degree": app.degree,
        "department": app.department,
        "current_year": app.current_year,
        "domain": app.domain,
        "duration": app.duration,
        "status": app.status,
        "rating": app.rating,
    }


# ── Bulk Email (Background) ────────────────────────────────────────────


def _bulk_email_background(
    applications_data: list[dict],
    subject: str,
    message: str,
    html: bool,
    sent_by: str,
):
    db = SessionLocal()
    try:
        for app_data in applications_data:
            resolved_subject = resolve_variables(subject, app_data.get("_app"))
            resolved_body = resolve_variables(message, app_data.get("_app"),
                                               company_name=settings.COMPANY_NAME or "Skynova Tech Solutions")
            sent = send_email(
                to_email=app_data["email"],
                subject=resolved_subject,
                body=resolved_body,
                html=html,
            )
            db.add(CommunicationLog(
                application_id=app_data["id"],
                channel="email",
                subject=resolved_subject,
                message=resolved_body,
                status="sent" if sent else "failed",
                sent_by=sent_by,
            ))
        db.commit()
    except Exception as e:
        logger.error(f"Bulk email background failed: {e}")
        db.rollback()
    finally:
        db.close()


@router.post(
    "/applications/bulk/send-email",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def bulk_send_email(
    email_request: BulkSendEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    applications = db.query(Application).filter(Application.id.in_(email_request.ids)).all()
    if not applications:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No applications found")

    applications_data = [{"id": app.id, "email": app.email, "_app": _app_to_dict(app)} for app in applications]

    background_tasks.add_task(
        _bulk_email_background,
        applications_data=applications_data,
        subject=email_request.subject,
        message=email_request.message,
        html=email_request.html,
        sent_by=current_admin.email,
    )

    return {
        "message": f"Email sending initiated for {len(applications)} applicant(s)",
        "total": len(applications),
    }


# ── Bulk WhatsApp (Background) ─────────────────────────────────────────


def _bulk_whatsapp_background(
    applications_data: list[dict],
    message: str,
    sent_by: str,
):
    db = SessionLocal()
    try:
        for app_data in applications_data:
            if not app_data.get("whatsapp"):
                db.add(CommunicationLog(
                    application_id=app_data["id"],
                    channel="whatsapp",
                    message=message,
                    status="skipped",
                    sent_by=sent_by,
                ))
                continue

            resolved_msg = resolve_variables(message, app_data.get("_app"))
            sent = send_whatsapp_message(
                to_phone=app_data["whatsapp"],
                message=resolved_msg,
            )
            db.add(CommunicationLog(
                application_id=app_data["id"],
                channel="whatsapp",
                message=resolved_msg,
                status="sent" if sent else "failed",
                sent_by=sent_by,
            ))
        db.commit()
    except Exception as e:
        logger.error(f"Bulk WhatsApp background failed: {e}")
        db.rollback()
    finally:
        db.close()


@router.post(
    "/applications/bulk/send-whatsapp",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def bulk_send_whatsapp(
    whatsapp_request: BulkSendWhatsAppRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    applications = db.query(Application).filter(Application.id.in_(whatsapp_request.ids)).all()
    if not applications:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No applications found")

    applications_data = [
        {"id": app.id, "whatsapp": app.whatsapp or app.mobile, "_app": _app_to_dict(app)}
        for app in applications
    ]

    background_tasks.add_task(
        _bulk_whatsapp_background,
        applications_data=applications_data,
        message=whatsapp_request.message,
        sent_by=current_admin.email,
    )

    return {
        "message": f"WhatsApp sending initiated for {len(applications)} applicant(s)",
        "total": len(applications),
    }


# ── Send Email (actually sends via Zoho SMTP) ────────────────────────


@router.post(
    "/applications/{application_id}/send-email",
    response_model=CommunicationLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_email_to_applicant(
    application_id: int,
    email_request: SendEmailRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    resolved_subject = resolve_variables(email_request.subject, application)
    resolved_body = resolve_variables(email_request.message, application,
                                        company_name=settings.COMPANY_NAME or "Skynova Tech Solutions")

    sent = send_email(
        to_email=email_request.to_email,
        subject=resolved_subject,
        body=resolved_body,
        html=email_request.html,
    )

    log = CommunicationLog(
        application_id=application_id,
        channel="email",
        subject=resolved_subject,
        message=resolved_body,
        status="sent" if sent else "failed",
        sent_by=current_admin.email,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Email sending failed — check SMTP configuration",
        )

    return CommunicationLogResponse(
        id=log.id,
        application_id=log.application_id,
        channel=log.channel,
        subject=log.subject,
        message=log.message,
        status=log.status,
        sent_by=log.sent_by,
        created_at=log.created_at,
    )


# ── Send WhatsApp (actually sends via WhatsApp Cloud API) ─────────────


@router.post(
    "/applications/{application_id}/send-whatsapp",
    response_model=CommunicationLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_whatsapp_to_applicant(
    application_id: int,
    whatsapp_request: SendWhatsAppRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    resolved_message = resolve_variables(whatsapp_request.message, application)

    sent = send_whatsapp_message(
        to_phone=whatsapp_request.to_phone,
        message=resolved_message,
    )

    log = CommunicationLog(
        application_id=application_id,
        channel="whatsapp",
        subject=None,
        message=resolved_message,
        status="sent" if sent else "failed",
        sent_by=current_admin.email,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="WhatsApp sending failed — check WhatsApp Cloud API configuration",
        )

    return CommunicationLogResponse(
        id=log.id,
        application_id=log.application_id,
        channel=log.channel,
        subject=log.subject,
        message=log.message,
        status=log.status,
        sent_by=log.sent_by,
        created_at=log.created_at,
    )


# ── Communication History ─────────────────────────────────────────────


@router.get(
    "/applications/{application_id}/communications",
    response_model=List[CommunicationLogResponse],
)
def get_communication_history(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    logs = (
        db.query(CommunicationLog)
        .filter(CommunicationLog.application_id == application_id)
        .order_by(CommunicationLog.created_at.desc())
        .all()
    )

    return [CommunicationLogResponse.model_validate(log) for log in logs]


# ── Email Templates CRUD ──────────────────────────────────────────────


@router.get("/email-templates", response_model=List[EmailTemplateResponse])
def list_email_templates(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()


@router.post("/email-templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_email_template(
    template: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    db_template = EmailTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put("/email-templates/{template_id}", response_model=EmailTemplateResponse)
def update_email_template(
    template_id: int,
    template_update: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    db_template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")

    for field, value in template_update.model_dump(exclude_unset=True).items():
        setattr(db_template, field, value)

    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/email-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_email_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    db_template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")

    db.delete(db_template)
    db.commit()


# ── Default / Fallback Templates ──────────────────────────────────────


DEFAULT_EMAIL_TEMPLATES = [
    {
        "category": "status_change",
        "name": "Status Change (System Default)",
        "subject": "Application Status Update — {applicant_name}",
        "body": default_tpls.STATUS_EMAIL_BODY,
    },
    {
        "category": "interview_scheduled",
        "name": "Interview Scheduled (System Default)",
        "subject": "Interview Scheduled",
        "body": default_tpls.INTERVIEW_EMAIL_BODY,
    },
    {
        "category": "application_confirmation",
        "name": "Application Confirmation (System Default)",
        "subject": "Application Received — Thank You",
        "body": default_tpls.CONFIRMATION_EMAIL_BODY,
    },
]

DEFAULT_WHATSAPP_TEMPLATES = [
    {
        "category": "status_change",
        "name": "Status Change (System Default)",
        "message": default_tpls.STATUS_WHATSAPP_MSG,
    },
    {
        "category": "interview_scheduled",
        "name": "Interview Scheduled (System Default)",
        "message": default_tpls.INTERVIEW_WHATSAPP_MSG,
    },
    {
        "category": "application_confirmation",
        "name": "Application Confirmation (System Default)",
        "message": default_tpls.CONFIRMATION_WHATSAPP_MSG,
    },
]


@router.get("/default-email-templates")
def list_default_email_templates(current_admin=Depends(get_current_admin)):
    return DEFAULT_EMAIL_TEMPLATES


@router.get("/default-whatsapp-templates")
def list_default_whatsapp_templates(current_admin=Depends(get_current_admin)):
    return DEFAULT_WHATSAPP_TEMPLATES


# ── WhatsApp Templates CRUD ───────────────────────────────────────────


@router.get("/template-variables")
def list_template_variables(current_admin=Depends(get_current_admin)):
    from app.services.template_service import TEMPLATE_VARIABLES
    return [{"variable": k, "description": v} for k, v in TEMPLATE_VARIABLES.items()]


@router.get("/whatsapp-templates", response_model=List[WhatsAppTemplateResponse])
def list_whatsapp_templates(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return db.query(WhatsAppTemplate).order_by(WhatsAppTemplate.created_at.desc()).all()


@router.post("/whatsapp-templates", response_model=WhatsAppTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_whatsapp_template(
    template: WhatsAppTemplateCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    db_template = WhatsAppTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put("/whatsapp-templates/{template_id}", response_model=WhatsAppTemplateResponse)
def update_whatsapp_template(
    template_id: int,
    template_update: WhatsAppTemplateUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    db_template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WhatsApp template not found")

    for field, value in template_update.model_dump(exclude_unset=True).items():
        setattr(db_template, field, value)

    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/whatsapp-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_whatsapp_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    db_template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WhatsApp template not found")

    db.delete(db_template)
    db.commit()


# ── Evolution API (WhatsApp) Status ───────────────────────────────────


class WhatsAppStatusResponse(BaseModel):
    server_running: bool
    instance_connected: bool
    connection_state: str
    api_url: str
    instance_name: str


class QRCodeResponse(BaseModel):
    base64: str
    code: str


class CreateInstanceRequest(BaseModel):
    instance_name: str
    number: str


@router.get("/whatsapp/status", response_model=WhatsAppStatusResponse)
def get_whatsapp_status(
    current_admin=Depends(get_current_admin),
):
    settings = get_settings()
    conn = check_connection()

    return WhatsAppStatusResponse(
        server_running=conn["server"],
        instance_connected=conn["instance"],
        connection_state=conn["state"],
        api_url=settings.EVOLUTION_API_URL,
        instance_name=settings.EVOLUTION_INSTANCE_NAME,
    )


@router.get("/whatsapp/qr", response_model=QRCodeResponse)
def get_whatsapp_qr(
    current_admin=Depends(get_current_admin),
):
    qr = get_qr_code()
    if not qr:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="QR code not available — check Evolution API server",
        )
    return QRCodeResponse(base64=qr["base64"], code=qr["code"])


@router.post("/whatsapp/logout")
def whatsapp_logout(
    current_admin=Depends(require_role("admin")),
):
    success = logout_instance()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to logout WhatsApp instance",
        )
    return {"message": "WhatsApp instance logged out successfully"}


@router.post("/whatsapp/reconnect")
def whatsapp_reconnect(
    current_admin=Depends(get_current_admin),
):
    """Logout and reconnect — forces new QR code scan."""
    logout_instance()
    return {"message": "Logged out. Scan new QR code to reconnect."}


@router.delete("/whatsapp/instance")
def whatsapp_delete_instance(
    current_admin=Depends(get_current_admin),
):
    success = delete_instance()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to delete WhatsApp instance",
        )
    return {"message": "WhatsApp instance deleted successfully"}


@router.post("/whatsapp/instance")
def whatsapp_create_instance(
    request: CreateInstanceRequest,
    current_admin=Depends(get_current_admin),
):
    settings = get_settings()

    clean_number = request.number.replace(" ", "").replace("-", "").replace("+", "")
    if not clean_number.startswith("91") and len(clean_number) == 10:
        clean_number = f"91{clean_number}"

    headers = {"Content-Type": "application/json"}
    if settings.EVOLUTION_API_KEY:
        headers["apikey"] = settings.EVOLUTION_API_KEY

    payload = {
        "instanceName": request.instance_name,
        "number": clean_number,
        "integration": "WHATSAPP-BAILEYS",
        "qrcode": True,
        "reject_call": False,
        "groups_ignore": True,
        "always_online": False,
        "webhook": {
            "enabled": False,
        },
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{settings.EVOLUTION_API_URL}/instance/createInstance",
                json=payload,
                headers=headers,
            )

        if response.status_code in (200, 201):
            return {"message": "Instance created successfully", "data": response.json()}
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create instance: {response.text}",
            )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Evolution API server. Make sure Docker is running.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating instance: {str(e)}",
        )
