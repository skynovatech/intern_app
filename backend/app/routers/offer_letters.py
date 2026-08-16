from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.admin import Admin
from app.models.application import Application
from app.models.offer_letter import OfferLetter
from app.schemas.application import ApplicationResponse
from app.schemas.offer_letter import (
    OfferLetterDraftCreate,
    OfferLetterDraftUpdate,
    OfferLetterResponse,
)
from app.schemas.offer_bulk import (
    OfferLetterBulkRequest,
    OfferBulkResult,
    OfferBulkResultItem,
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.pdf_service import generate_offer_letter, generate_offer_letter_from_offer
from app.services.employee_service import generate_employee_id
from app.services.job_queue import enqueue_job
from app.services.websocket_manager import manager
from app.models.job import Job

OFFER_JOB_KINDS = ("send_offer_letter_draft_notification", "send_offer_letter_notification")

router = APIRouter(tags=["Offer Letters"])


def _calc_end_date(start_date: Optional[str], duration: Optional[str]) -> Optional[str]:
    if not start_date or not duration:
        return None
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        return None
    duration_str = duration.strip().lower()
    if duration_str == "ongoing":
        return None
    import re as _re
    m = _re.match(r"^(\d+)\s*months?$", duration_str)
    if not m:
        return None
    months = int(m.group(1))
    end = start
    month_index = end.month - 1 + months
    end = end.replace(year=end.year + month_index // 12, month=month_index % 12 + 1)
    end = end - timedelta(days=1)
    return end.strftime("%Y-%m-%d")


def _get_selected_application(application_id: int, db: Session) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")
    if application.status != "Selected":
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Offer letter can only be generated for selected applications",
        )
    return application


def _get_offer_or_404(offer_id: int, db: Session) -> OfferLetter:
    offer = db.query(OfferLetter).filter(OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Offer letter not found")
    return offer


def _filename_for(name: str, offer_id: int) -> str:
    return f"Offer_Letter_{name.replace(' ', '_')}_{offer_id}.pdf"


# ── Drafts CRUD ────────────────────────────────────────────────────────


@router.post("/offer-letters/drafts", response_model=OfferLetterResponse, status_code=http_status.HTTP_201_CREATED)
def create_offer_letter_draft(
    payload: OfferLetterDraftCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if payload.application_id:
        application = db.query(Application).filter(Application.id == payload.application_id).first()
        if not application:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")

        full_name = payload.full_name or application.full_name
        email = payload.email or application.email
        whatsapp = payload.whatsapp or application.whatsapp or application.mobile
        domain = payload.domain or application.domain
        duration = payload.duration or application.duration
        start_date = payload.start_date or application.preferred_joining_date
        employee_id = payload.employee_id or application.employee_id

        if not employee_id and application.status == "Selected":
            employee_id = generate_employee_id(db)
            if not application.employee_id:
                application.employee_id = employee_id
                db.add(application)
    else:
        if not payload.full_name or not payload.email:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="full_name and email are required when no application is linked",
            )
        full_name = payload.full_name
        email = payload.email
        whatsapp = payload.whatsapp or None
        domain = payload.domain
        duration = payload.duration
        start_date = payload.start_date
        employee_id = payload.employee_id or None

    offer = OfferLetter(
        application_id=payload.application_id,
        full_name=full_name,
        email=email,
        whatsapp=whatsapp,
        domain=domain,
        duration=duration,
        start_date=start_date,
        end_date=payload.end_date or _calc_end_date(start_date, duration),
        employee_id=employee_id,
        body=payload.body,
        status="draft",
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.get("/offer-letters/drafts", response_model=List[OfferLetterResponse])
def list_offer_letter_drafts(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(OfferLetter)

    if search:
        term = f"%{search}%"
        query = query.filter(
            OfferLetter.full_name.ilike(term)
            | OfferLetter.email.ilike(term)
            | OfferLetter.employee_id.ilike(term)
        )

    if status:
        if status not in ("draft", "sent"):
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Status must be 'draft' or 'sent'")
        query = query.filter(OfferLetter.status == status)

    return query.order_by(OfferLetter.updated_at.desc()).all()


@router.get("/offer-letters/drafts/{offer_id}", response_model=OfferLetterResponse)
def get_offer_letter_draft(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return _get_offer_or_404(offer_id, db)


@router.put("/offer-letters/drafts/{offer_id}", response_model=OfferLetterResponse)
def update_offer_letter_draft(
    offer_id: int,
    payload: OfferLetterDraftUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    offer = _get_offer_or_404(offer_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    start_date = update_data.get("start_date", offer.start_date)
    duration = update_data.get("duration", offer.duration)
    if update_data.get("end_date") is None and start_date and duration:
        update_data["end_date"] = _calc_end_date(start_date, duration)
    for field, value in update_data.items():
        setattr(offer, field, value)

    db.commit()
    db.refresh(offer)
    return offer


@router.delete("/offer-letters/drafts/{offer_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_offer_letter_draft(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    offer = _get_offer_or_404(offer_id, db)
    db.delete(offer)
    db.commit()


# ── Preview & Send ─────────────────────────────────────────────────────


@router.get("/offer-letters/drafts/{offer_id}/preview")
def preview_offer_letter(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    offer = _get_offer_or_404(offer_id, db)
    pdf_bytes = generate_offer_letter_from_offer(offer, db=db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{_filename_for(offer.full_name, offer.id)}"'},
    )


@router.post("/offer-letters/drafts/{offer_id}/send")
def send_offer_letter_draft(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    offer = _get_offer_or_404(offer_id, db)

    enqueue_job("send_offer_letter_draft_notification", {
        "offer_id": offer_id,
        "sent_by": current_admin.email,
    })

    return {
        "message": f"Offer letter sending queued to {offer.email}",
        "offer_id": offer.id,
    }


def _log_audit(db: Session, action: str, resource: str, resource_id, summary: str, admin: Admin, details: dict | None = None):
    from app.models.audit_log import AuditLog
    import json
    summary = (summary or "")[:500]
    db.add(AuditLog(
        actor_email=admin.email,
        actor_name=admin.full_name,
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id is not None else None,
        summary=summary,
        details=json.dumps(details, default=str) if details else None,
    ))


@router.get("/offer-letters/stats")
def offer_letter_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    selected = db.query(Application).filter(Application.status == "Selected").count()
    with_employee_id = db.query(Application).filter(
        Application.status == "Selected", Application.employee_id.isnot(None)
    ).count()
    drafts = db.query(OfferLetter).filter(OfferLetter.status == "draft").count()
    sent = db.query(OfferLetter).filter(OfferLetter.status == "sent").count()
    last_sent = db.query(OfferLetter.sent_at).filter(OfferLetter.sent_at.isnot(None)).order_by(OfferLetter.sent_at.desc()).first()

    offer_jobs = {"pending": 0, "running": 0, "failed": 0}
    for kind in OFFER_JOB_KINDS:
        for st in offer_jobs:
            offer_jobs[st] += db.query(Job).filter(Job.kind == kind, Job.status == st).count()

    return {
        "selected_candidates": selected,
        "with_employee_id": with_employee_id,
        "drafts": drafts,
        "sent": sent,
        "last_sent_at": last_sent[0] if last_sent else None,
        "offer_jobs": offer_jobs,
    }


@router.post("/offer-letters/drafts/{offer_id}/duplicate", response_model=OfferLetterResponse, status_code=http_status.HTTP_201_CREATED)
def duplicate_offer_letter_draft(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    source = _get_offer_or_404(offer_id, db)
    copy = OfferLetter(
        application_id=source.application_id,
        full_name=source.full_name,
        email=source.email,
        whatsapp=source.whatsapp,
        degree=source.degree,
        college=source.college,
        city=source.city,
        enrollment_id=source.enrollment_id,
        technology=source.technology,
        domain_label=source.domain_label,
        organization=source.organization,
        location=source.location,
        domain=source.domain,
        duration=source.duration,
        start_date=source.start_date,
        end_date=source.end_date,
        stipend=source.stipend,
        reporting_sme=source.reporting_sme,
        shift_time=source.shift_time,
        shift_days=source.shift_days,
        sme_email=source.sme_email,
        sme_mobile=source.sme_mobile,
        employee_id=source.employee_id,
        body=source.body,
        status="draft",
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    _log_audit(db, "duplicate", "offer_letter", copy.id,
               f"Duplicated offer letter from draft #{source.id} for {copy.full_name}", current_admin,
               {"target_offer_id": source.id})

    db.commit()
    manager.broadcast_sync("offers", {"type": "offer_created", "offer_id": copy.id})
    return copy


@router.post("/offer-letters/bulk", response_model=OfferBulkResult)
def bulk_offer_action(
    payload: OfferLetterBulkRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    if payload.action not in ("draft", "send"):
        raise HTTPException(status_code=400, detail="action must be 'draft' or 'send'")

    result = OfferBulkResult(action=payload.action)
    application_ids = list(dict.fromkeys(payload.application_ids))

    for app_id in application_ids:
        app = db.query(Application).filter(Application.id == app_id).first()
        if not app:
            continue
        if app.status != "Selected":
            result.skipped.append(OfferBulkResultItem(
                application_id=app.id, full_name=app.full_name,
                offer_id=None, job_id=None,
            ))
            continue

        if payload.action == "draft":
            employee_id = app.employee_id
            if not employee_id:
                employee_id = generate_employee_id(db)
                app.employee_id = employee_id
                db.add(app)
            offer = OfferLetter(
                application_id=app.id,
                full_name=app.full_name,
                email=app.email,
                whatsapp=app.whatsapp or app.mobile,
                domain=app.domain,
                duration=app.duration,
                start_date=app.preferred_joining_date,
                employee_id=employee_id,
                body=None,
                status="draft",
            )
            db.add(offer)
            db.flush()
            result.created.append(OfferBulkResultItem(
                application_id=app.id, full_name=app.full_name, offer_id=offer.id,
            ))
        else:
            job_id = enqueue_job("send_offer_letter_notification", {
                "application_id": app.id,
                "sent_by": current_admin.email,
            })
            result.queued.append(OfferBulkResultItem(
                application_id=app.id, full_name=app.full_name, job_id=job_id,
            ))

    db.commit()
    _log_audit(db, "bulk_offer", "offer_letter", None,
               f"Bulk offer action '{payload.action}' on {len(result.created) + len(result.queued)} candidates", current_admin,
               {"created": len(result.created), "queued": len(result.queued), "skipped": len(result.skipped)})
    db.commit()
    manager.broadcast_sync("offers", {"type": "bulk_offer", "data": payload.action})
    return result


# ── Application-linked legacy endpooints ───────────────────────────────


@router.get("/offer-letters", response_model=List[ApplicationResponse])
def list_offer_letters(
    search: Optional[str] = None,
    has_employee_id: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(Application).filter(Application.status == "Selected")

    if search:
        term = f"%{search}%"
        query = query.filter(
            Application.full_name.ilike(term)
            | Application.email.ilike(term)
            | Application.employee_id.ilike(term)
        )

    if has_employee_id is not None:
        if has_employee_id:
            query = query.filter(Application.employee_id.isnot(None))
        else:
            query = query.filter(Application.employee_id.is_(None))

    return query.order_by(Application.updated_at.desc()).all()


@router.get("/applications/{application_id}/offer-letter")
def download_offer_letter(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    application = _get_selected_application(application_id, db)
    pdf_bytes = generate_offer_letter(application, db=db)
    filename = f"Offer_Letter_{application.full_name.replace(' ', '_')}_{application.id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/applications/{application_id}/offer-letter/send")
def send_offer_letter(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    application = _get_selected_application(application_id, db)

    enqueue_job("send_offer_letter_notification", {
        "application_id": application_id,
        "sent_by": current_admin.email,
    })

    return {"message": f"Offer letter sent to {application.email}", "application_id": application_id}