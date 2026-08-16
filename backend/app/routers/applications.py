from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from fastapi import status as http_status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import Optional, List
import os
import uuid
import math
import zipfile
import io
import logging
from datetime import datetime

from app.database import get_db, SessionLocal
from app.models.admin import Admin
from app.models.application import Application
from app.models.interview import Interview
from app.models.status_history import StatusHistory
from app.models.communication_log import CommunicationLog
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationListResponse,
    BulkStatusUpdate, BulkDownloadRequest, BulkInterviewSchedule
)
from app.schemas.communication import CommunicationLogResponse
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.utils.rate_limiter import rate_limiter
from app.config import get_settings
from app.services.pdf_service import generate_application_pdf, generate_bulk_pdf
from app.services.employee_service import generate_employee_id
from app.services.job_queue import enqueue_job

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["Applications"])
settings = get_settings()

ALLOWED_RESUME_EXTENSIONS = {".pdf"}
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".jfif", ".tiff", ".bmp"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024


def _safe_upload_path(rel_path):
    """Return an absolute path inside UPLOAD_DIR for a stored upload, or None if unsafe."""
    if not rel_path:
        return None
    p = str(rel_path).replace("\\", "/")
    parts = [seg for seg in p.split("/") if seg not in ("", ".")]
    if any(seg == ".." for seg in parts):
        return None
    joined = "/".join(parts)
    if not joined.startswith(("photos/", "resumes/")):
        return None
    root = os.path.abspath(settings.UPLOAD_DIR)
    full = os.path.abspath(os.path.join(root, joined))
    if not full.startswith(root + os.sep):
        return None
    return full


def save_upload_file(file: UploadFile, subdirectory: str) -> str:
    file_ext = os.path.splitext(file.filename)[1].lower()
    content = file.file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="File too large. Maximum size is 5MB")
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    upload_path = os.path.join(settings.UPLOAD_DIR, subdirectory)
    os.makedirs(upload_path, exist_ok=True)
    file_path = os.path.join(upload_path, unique_filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    return f"{subdirectory}/{unique_filename}"


def _public_rate_limit(request: Request):
    rate_limiter.check("public_applications", max_requests=10, window_seconds=60,
                       ip=request.client.host if request.client else None)


@router.post("", response_model=ApplicationResponse, status_code=http_status.HTTP_201_CREATED)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    _=Depends(_public_rate_limit),
):
    db_application = Application(**application.model_dump())
    try:
        db.add(db_application)
        db.flush()
        enqueue_job("send_application_confirmation", {
            "app_data": {
                "id": db_application.id,
                "full_name": db_application.full_name,
                "email": db_application.email,
                "whatsapp": db_application.whatsapp or db_application.mobile,
            },
        }, db=db)
        db.commit()
        db.refresh(db_application)
    except IntegrityError as exc:
        db.rollback()
        logger.warning("Application rejected by a database constraint: %s", exc)
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="An application with these details already exists.",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Could not save application")
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The application database is temporarily unavailable. Please try again.",
        ) from exc

    return db_application


@router.get("", response_model=ApplicationListResponse)
def list_applications(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    domain: Optional[str] = None,
    college: Optional[str] = None,
    gender: Optional[str] = None,
    degree: Optional[str] = None,
    current_year: Optional[str] = None,
    duration: Optional[str] = None,
    cgpa_min: Optional[float] = None,
    cgpa_max: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(Application)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Application.full_name.ilike(search_term),
                Application.email.ilike(search_term),
                Application.mobile.ilike(search_term),
                Application.college.ilike(search_term),
            )
        )
    
    if status:
        query = query.filter(Application.status == status)
    
    if domain:
        query = query.filter(Application.domain == domain)
    
    if college:
        query = query.filter(Application.college.ilike(f"%{college}%"))
    
    if gender:
        query = query.filter(Application.gender == gender)
    
    if degree:
        query = query.filter(Application.degree == degree)
    
    if current_year:
        query = query.filter(Application.current_year == current_year)
    
    if duration:
        query = query.filter(Application.duration == duration)
    
    if cgpa_min is not None:
        query = query.filter(Application.cgpa >= cgpa_min)
    
    if cgpa_max is not None:
        query = query.filter(Application.cgpa <= cgpa_max)
    
    if date_from:
        query = query.filter(func.date(Application.created_at) >= date_from)
    
    if date_to:
        query = query.filter(func.date(Application.created_at) <= date_to)
    
    total = query.count()
    total_pages = math.ceil(total / per_page)
    
    sort_column = getattr(Application, sort_by, Application.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return ApplicationListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.put("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: int,
    application_update: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")
    
    update_data = application_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(application, field, value)
    
    db.commit()
    db.refresh(application)
    return application


@router.delete("/{application_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")

    for stored in (application.resume_path, application.photo_path):
        safe = _safe_upload_path(stored)
        if safe and os.path.exists(safe):
            os.remove(safe)

    db.delete(application)
    db.commit()


@router.post("/upload/resume/{application_id}")
async def upload_resume(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed for resumes"
        )
    
    if application.resume_path:
        old_path = _safe_upload_path(application.resume_path)
        if old_path and os.path.exists(old_path):
            os.remove(old_path)
    
    file_path = save_upload_file(file, "resumes")
    application.resume_path = file_path
    db.commit()
    db.refresh(application)
    
    return {"message": "Resume uploaded successfully", "path": file_path}


@router.post("/upload/photo/{application_id}")
async def upload_photo(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_PHOTO_EXTENSIONS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPG, JPEG, PNG, GIF, WEBP, JFIF, TIFF, BMP) are allowed for photos"
        )
    
    if application.photo_path:
        old_path = _safe_upload_path(application.photo_path)
        if old_path and os.path.exists(old_path):
            os.remove(old_path)
    
    file_path = save_upload_file(file, "photos")
    application.photo_path = file_path
    db.commit()
    db.refresh(application)
    
    return {"message": "Photo uploaded successfully", "path": file_path}


@router.put("/bulk/status", response_model=dict)
def bulk_update_status(
    bulk_update: BulkStatusUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    applications = db.query(Application).filter(Application.id.in_(bulk_update.ids)).all()
    if not applications:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="No applications found")

    missing_ids = [aid for aid in bulk_update.ids if aid not in {app.id for app in applications}]
    applications_data = []

    for application in applications:
        old_status = application.status
        application.status = bulk_update.new_status

        employee_id = application.employee_id
        if bulk_update.new_status == "Selected" and not employee_id:
            employee_id = generate_employee_id(db)
            application.employee_id = employee_id

        history_entry = StatusHistory(
            application_id=application.id,
            old_status=old_status,
            new_status=bulk_update.new_status,
            changed_by=current_admin.email,
            notes=bulk_update.notes,
        )
        db.add(history_entry)
        applications_data.append({
            "id": application.id,
            "full_name": application.full_name,
            "email": application.email,
            "whatsapp": application.whatsapp or application.mobile,
            "old_status": old_status,
            "notes": bulk_update.notes,
            "employee_id": employee_id,
        })

    db.commit()

    enqueue_job("send_bulk_status_notifications", {
        "applications_data": applications_data,
        "new_status": bulk_update.new_status,
        "sent_by": current_admin.email,
    })

    if bulk_update.new_status == "Selected":
        for application in applications:
            enqueue_job("send_offer_letter_notification", {
                "application_id": application.id,
                "sent_by": current_admin.email,
            })

    return {
        "message": f"Updated {len(applications)} application(s) to '{bulk_update.new_status}'",
        "updated": len(applications),
        "missing_ids": missing_ids,
    }


@router.post("/bulk/interview", response_model=dict)
def bulk_schedule_interview(
    bulk_interview: BulkInterviewSchedule,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    applications = db.query(Application).filter(Application.id.in_(bulk_interview.ids)).all()
    if not applications:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="No applications found")

    missing_ids = [aid for aid in bulk_interview.ids if aid not in {app.id for app in applications}]
    scheduled_count = 0

    for application in applications:
        old_status = application.status
        application.status = "Interview Scheduled"

        history_entry = StatusHistory(
            application_id=application.id,
            old_status=old_status,
            new_status="Interview Scheduled",
            changed_by=current_admin.email,
            notes=f"Interview scheduled for {bulk_interview.scheduled_date} at {bulk_interview.scheduled_time}",
        )
        db.add(history_entry)

        interview = Interview(
            application_id=application.id,
            scheduled_date=bulk_interview.scheduled_date,
            scheduled_time=bulk_interview.scheduled_time,
            interview_type=bulk_interview.interview_type,
            interviewer=bulk_interview.interviewer,
            location=bulk_interview.location,
            notes=bulk_interview.notes,
            status="scheduled",
        )
        db.add(interview)
        scheduled_count += 1

        enqueue_job("send_interview_notification", {
            "application_data": {
                "id": application.id,
                "full_name": application.full_name,
                "email": application.email,
                "whatsapp": application.whatsapp or application.mobile,
                "mobile": application.mobile,
            },
            "scheduled_date": bulk_interview.scheduled_date,
            "scheduled_time": bulk_interview.scheduled_time,
            "interview_type": bulk_interview.interview_type,
            "interviewer": bulk_interview.interviewer,
            "location": bulk_interview.location,
            "notes": bulk_interview.notes,
            "sent_by": current_admin.email,
        })

    db.commit()

    return {
        "message": f"Scheduled interviews for {scheduled_count} application(s)",
        "scheduled": scheduled_count,
        "missing_ids": missing_ids,
    }


@router.get("/{application_id}/download")
def download_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")

    pdf_bytes = generate_application_pdf(application)
    filename = f"{application.full_name.replace(' ', '_')}_{application.domain.replace(' ', '_')}_{application.id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{application_id}/photo")
def download_application_photo(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Application not found")

    if not application.photo_path:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="No photo uploaded")

    photo_full = os.path.join(settings.UPLOAD_DIR, application.photo_path)
    if not os.path.exists(photo_full):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Photo file not found on disk")

    ext = os.path.splitext(application.photo_path)[1].lower()
    media_types = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    with open(photo_full, "rb") as f:
        content = f.read()

    filename = f"{application.full_name.replace(' ', '_')}_{application.id}_photo{ext}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/bulk/download")
def bulk_download_applications(
    request: BulkDownloadRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    applications = db.query(Application).filter(Application.id.in_(request.ids)).all()
    if not applications:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="No applications found")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for app in applications:
            pdf_bytes = generate_application_pdf(app)
            filename = f"{app.full_name.replace(' ', '_')}_{app.domain.replace(' ', '_')}_{app.id}.pdf"
            zf.writestr(filename, pdf_bytes)

    zip_buffer.seek(0)

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="applications_bulk_{datetime.now().strftime("%Y%m%d")}.zip"'},
    )
