from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.email_template import EmailTemplate
from app.models.whatsapp_template import WhatsAppTemplate
from app.models.communication_log import CommunicationLog
from app.services.email_service import send_email
from app.services.whatsapp_service import send_whatsapp_message, send_whatsapp_media
from app.services.template_service import resolve_variables
from app.services.websocket_manager import manager
from app.config import get_settings
from app.services.notification_templates import (
    STATUS_EMAIL_BODY,
    STATUS_WHATSAPP_MSG,
    INTERVIEW_EMAIL_BODY,
    INTERVIEW_WHATSAPP_MSG,
    CONFIRMATION_EMAIL_BODY,
    CONFIRMATION_WHATSAPP_MSG,
)
from app.services.pdf_service import generate_application_pdf
import base64
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

CATEGORY_STATUS_CHANGE = "status_change"
CATEGORY_INTERVIEW_SCHEDULED = "interview_scheduled"
CATEGORY_CONFIRMATION = "application_confirmation"


def _get_company_name() -> str:
    return settings.COMPANY_NAME or "Skynova Tech Solutions"


def _wrap_html(body: str) -> str:
    if "<html" in body.lower() or "<body" in body.lower():
        return body
    company = _get_company_name()
    lines = body.split("\n")
    paragraphs = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("Hi ") or stripped.startswith("Dear "):
            paragraphs.append(f"<p>{stripped}</p>")
        elif stripped.startswith("--") or stripped.startswith("Best") or stripped.startswith("Regards") or stripped.startswith("Thanks"):
            paragraphs.append(f"<p>{stripped}</p>")
        elif ":" in stripped and not stripped.startswith("<"):
            parts = stripped.split(":", 1)
            paragraphs.append(f'<p><strong>{parts[0].strip()}:</strong>{parts[1].strip()}</p>')
        else:
            paragraphs.append(f"<p>{stripped}</p>")
    body_html = "\n".join(paragraphs)
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:24px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.5px">{company}</h1>
</td></tr></table>
</td></tr>
<tr><td style="padding:32px">
<div style="font-size:15px;line-height:1.6;color:#374151">
{body_html}
</div>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0">
<p style="margin:0;font-size:12px;color:#94a3b8">This is an automated message from {company}. Please do not reply directly to this email.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>"""


def _get_active_email_template(db: Session, category: str) -> Optional[EmailTemplate]:
    return db.query(EmailTemplate).filter(
        EmailTemplate.category == category,
        EmailTemplate.is_active == True,
    ).order_by(EmailTemplate.updated_at.desc()).first()


def _get_active_whatsapp_template(db: Session, category: str) -> Optional[WhatsAppTemplate]:
    return db.query(WhatsAppTemplate).filter(
        WhatsAppTemplate.category == category,
        WhatsAppTemplate.is_active == True,
    ).order_by(WhatsAppTemplate.updated_at.desc()).first()


def _resolve_email_body(
    db: Session,
    category: str,
    fallback_template: str,
    variables: dict,
) -> tuple[str, str]:
    company = _get_company_name()
    tmpl = _get_active_email_template(db, category)
    if tmpl:
        subject = resolve_variables(tmpl.subject, None, company_name=company)
        body = resolve_variables(tmpl.body, None, company_name=company)
        for key, val in variables.items():
            subject = subject.replace(key, val)
            body = body.replace(key, val)
        subject = subject.replace("{company_name}", company)
        body = body.replace("{company_name}", company)
        return subject, body
    subject = variables.get("{subject}", "Notification")
    fmt_vars = {k.strip("{}"): v for k, v in variables.items() if k != "{subject}"}
    body = fallback_template.format(**fmt_vars, company_name=company)
    return subject, body


def _resolve_whatsapp_body(
    db: Session,
    category: str,
    fallback_template: str,
    variables: dict,
) -> str:
    company = _get_company_name()
    tmpl = _get_active_whatsapp_template(db, category)
    if tmpl:
        body = resolve_variables(tmpl.message, None, company_name=company)
        for key, val in variables.items():
            body = body.replace(key, val)
        body = body.replace("{company_name}", company)
        return body
    fmt_vars = {k.strip("{}"): v for k, v in variables.items()}
    return fallback_template.format(**fmt_vars, company_name=company)


def send_status_notification(
    application_data: dict,
    old_status: str,
    new_status: str,
    notes: Optional[str],
    sent_by: str,
):
    db = SessionLocal()
    try:
        company = _get_company_name()
        notes_section = f"Notes: {notes}" if notes else ""
        applicant_name = application_data["full_name"]

        variables = {
            "{applicant_name}": applicant_name,
            "{old_status}": old_status,
            "{new_status}": new_status,
            "{notes_section}": notes_section,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_STATUS_CHANGE, STATUS_EMAIL_BODY, {
                **variables,
                "{subject}": f"Application Status Update — {new_status}",
            }
        )
        email_sent = send_email(
            to_email=application_data["email"],
            subject=subject,
            body=_wrap_html(email_body),
            html=True,
        )
        logger.info(f"Email to {application_data['email']}: {'sent' if email_sent else 'FAILED'}")
        db.add(CommunicationLog(
            application_id=application_data["id"],
            channel="email",
            subject=subject,
            message=email_body,
            status="sent" if email_sent else "failed",
            sent_by=sent_by,
        ))

        if application_data.get("whatsapp"):
            wa_body = _resolve_whatsapp_body(
                db, CATEGORY_STATUS_CHANGE, STATUS_WHATSAPP_MSG, variables
            )
            wa_sent = send_whatsapp_message(
                to_phone=application_data["whatsapp"],
                message=wa_body,
            )
            logger.info(f"WhatsApp to {application_data['whatsapp']}: {'sent' if wa_sent else 'FAILED'}")
            db.add(CommunicationLog(
                application_id=application_data["id"],
                channel="whatsapp",
                message=wa_body,
                status="sent" if wa_sent else "failed",
                sent_by=sent_by,
            ))

        db.commit()

        manager.broadcast_sync("notification", {
            "type": "status_update",
            "application_id": application_data["id"],
            "new_status": new_status,
        })
    except Exception as e:
        app_id = application_data.get("id", "unknown")
        logger.error(f"Status notification failed for application {app_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_interview_notification(
    application_data: dict,
    scheduled_date: str,
    scheduled_time: str,
    interview_type: str,
    interviewer: Optional[str],
    location: Optional[str],
    notes: Optional[str],
    sent_by: str,
):
    db = SessionLocal()
    try:
        company = _get_company_name()
        notes_section = f"Notes: {notes}" if notes else ""
        applicant_name = application_data["full_name"]

        variables = {
            "{applicant_name}": applicant_name,
            "{date}": scheduled_date,
            "{time}": scheduled_time,
            "{interview_type}": interview_type,
            "{interviewer}": interviewer or "TBD",
            "{location}": location or "TBD",
            "{notes_section}": notes_section,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_INTERVIEW_SCHEDULED, INTERVIEW_EMAIL_BODY, {
                **variables,
                "{subject}": "Interview Scheduled",
            }
        )

        email_sent = send_email(
            to_email=application_data["email"],
            subject=subject,
            body=_wrap_html(email_body),
            html=True,
        )
        db.add(CommunicationLog(
            application_id=application_data["id"],
            channel="email",
            subject=subject,
            message=email_body,
            status="sent" if email_sent else "failed",
            sent_by=sent_by,
        ))

        if application_data.get("whatsapp"):
            wa_body = _resolve_whatsapp_body(
                db, CATEGORY_INTERVIEW_SCHEDULED, INTERVIEW_WHATSAPP_MSG, variables
            )
            wa_sent = send_whatsapp_message(
                to_phone=application_data["whatsapp"],
                message=wa_body,
            )
            db.add(CommunicationLog(
                application_id=application_data["id"],
                channel="whatsapp",
                message=wa_body,
                status="sent" if wa_sent else "failed",
                sent_by=sent_by,
            ))

        db.commit()

        manager.broadcast_sync("notification", {
            "type": "interview_scheduled",
            "application_id": application_data["id"],
        })
    except Exception as e:
        app_id = application_data.get("id", "unknown")
        logger.error(f"Interview notification failed for application {app_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_application_confirmation(app_data: dict):
    db = SessionLocal()
    try:
        company = _get_company_name()
        applicant_name = app_data["full_name"]
        app_id = str(app_data["id"])

        variables = {
            "{applicant_name}": applicant_name,
            "{application_id}": app_id,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_CONFIRMATION, CONFIRMATION_EMAIL_BODY, {
                **variables,
                "{subject}": "Application Received — Thank You",
            }
        )
        from app.models.application import Application
        actual_app = db.query(Application).filter(Application.id == app_data["id"]).first()
        pdf_bytes = generate_application_pdf(actual_app) if actual_app else None

        email_sent = send_email(
            to_email=app_data["email"],
            subject=subject,
            body=_wrap_html(email_body),
            html=True,
            attachments=[("Application.pdf", pdf_bytes, "pdf")] if pdf_bytes else None,
        )

        logger.info(f"Confirmation email to {app_data['email']}: {'sent' if email_sent else 'FAILED'}")
        db.add(CommunicationLog(
            application_id=app_data["id"],
            channel="email",
            subject=subject,
            message=email_body + "\n\n[PDF application copy attached]" if pdf_bytes else email_body,
            status="sent" if email_sent else "failed",
            sent_by="system",
        ))

        if app_data.get("whatsapp"):
            wa_body = _resolve_whatsapp_body(
                db, CATEGORY_CONFIRMATION, CONFIRMATION_WHATSAPP_MSG, variables
            )
            wa_sent = send_whatsapp_message(
                to_phone=app_data["whatsapp"],
                message=wa_body,
            )
            pdf_sent = False
            if pdf_bytes:
                pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
                pdf_sent = send_whatsapp_media(
                    to_phone=app_data["whatsapp"],
                    media_url=pdf_b64,
                    caption=f"Application #{app_data['id']} — {app_data.get('full_name', '')}",
                    filename=f"Application_{app_data['id']}.pdf",
                )
            logger.info(f"Confirmation WhatsApp to {app_data['whatsapp']}: msg={'sent' if wa_sent else 'FAILED'}, pdf={'sent' if pdf_sent else 'FAILED'}")
            db.add(CommunicationLog(
                application_id=app_data["id"],
                channel="whatsapp",
                message=wa_body + "\n\n[PDF application copy attached]" if pdf_sent else wa_body,
                status="sent" if wa_sent else "failed",
                sent_by="system",
            ))

        db.commit()
    except Exception as e:
        app_id = app_data.get("id", "unknown")
        logger.error(f"Application confirmation failed for {app_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_bulk_status_notifications(
    applications_data: list[dict],
    new_status: str,
    sent_by: str,
):
    db = SessionLocal()
    try:
        company = _get_company_name()
        for app_data in applications_data:
            notes_section = f"Notes: {app_data['notes']}" if app_data.get("notes") else ""

            variables = {
                "{applicant_name}": app_data["full_name"],
                "{old_status}": app_data["old_status"],
                "{new_status}": new_status,
                "{notes_section}": notes_section,
            }

            _, email_body = _resolve_email_body(
                db, CATEGORY_STATUS_CHANGE, STATUS_EMAIL_BODY, {
                    **variables,
                    "{subject}": f"Application Status Update — {new_status}",
                }
            )

            email_sent = send_email(
                to_email=app_data["email"],
                subject=f"Application Status Update — {new_status}",
                body=_wrap_html(email_body),
                html=True,
            )
            db.add(CommunicationLog(
                application_id=app_data["id"],
                channel="email",
                subject=f"Application Status Update — {new_status}",
                message=email_body,
                status="sent" if email_sent else "failed",
                sent_by=sent_by,
            ))

            if app_data.get("whatsapp"):
                wa_body = _resolve_whatsapp_body(
                    db, CATEGORY_STATUS_CHANGE, STATUS_WHATSAPP_MSG, variables
                )
                wa_sent = send_whatsapp_message(to_phone=app_data["whatsapp"], message=wa_body)
                db.add(CommunicationLog(
                    application_id=app_data["id"],
                    channel="whatsapp",
                    message=wa_body,
                    status="sent" if wa_sent else "failed",
                    sent_by=sent_by,
                ))

        db.commit()

        manager.broadcast_sync("bulk_status_update", {
            "new_status": new_status,
            "count": len(applications_data),
        })
    except Exception as e:
        logger.error(f"Bulk notification failed: {e}")
        db.rollback()
    finally:
        db.close()
