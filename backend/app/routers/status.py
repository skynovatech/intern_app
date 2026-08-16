from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models.application import Application
from app.models.status_history import StatusHistory
from app.models.interview import Interview
from app.schemas.status import (
    StatusUpdate, StatusHistoryResponse, InterviewSchedule, InterviewResponse,
    NoteUpdate, RatingUpdate, RemarksUpdate
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.employee_service import generate_employee_id
from app.services.job_queue import enqueue_job
from app.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Status Management"])


@router.put("/applications/{application_id}/status", response_model=StatusHistoryResponse)
async def update_status(
    application_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    old_status = application.status
    application.status = status_update.new_status

    employee_id = application.employee_id
    if status_update.new_status == "Selected" and not employee_id:
        employee_id = generate_employee_id(db)
        application.employee_id = employee_id

    history_entry = StatusHistory(
        application_id=application_id,
        old_status=old_status,
        new_status=status_update.new_status,
        changed_by=current_admin.email,
        notes=status_update.notes,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)

    write_audit_log(
        db, current_admin.email, "status_update", "application", application.id,
        f"Updated status for {application.full_name}: {old_status} → {status_update.new_status}",
        {"old": old_status, "new": status_update.new_status, "notes": status_update.notes},
        actor_name=current_admin.full_name,
    )
    db.commit()

    app_data = {
        "id": application.id,
        "full_name": application.full_name,
        "email": application.email,
        "whatsapp": application.whatsapp or application.mobile,
        "mobile": application.mobile,
        "employee_id": employee_id,
    }

    enqueue_job("send_status_notification", {
        "application_data": app_data,
        "old_status": old_status,
        "new_status": status_update.new_status,
        "notes": status_update.notes,
        "sent_by": current_admin.email,
    })

    if status_update.new_status == "Selected":
        enqueue_job("send_offer_letter_notification", {
            "application_id": application.id,
            "sent_by": current_admin.email,
        })

    return history_entry


@router.get("/applications/{application_id}/history", response_model=List[StatusHistoryResponse])
def get_status_history(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    history = db.query(StatusHistory).filter(
        StatusHistory.application_id == application_id
    ).order_by(StatusHistory.created_at.desc()).all()

    return history


@router.put("/applications/{application_id}/rating", response_model=dict)
def update_rating(
    application_id: int,
    rating_update: RatingUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    application.rating = rating_update.rating
    db.commit()
    db.refresh(application)

    return {"message": "Rating updated successfully", "rating": application.rating}


@router.put("/applications/{application_id}/notes", response_model=dict)
def update_notes(
    application_id: int,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    application.notes = note_update.notes
    db.commit()
    db.refresh(application)

    return {"message": "Notes updated successfully", "notes": application.notes}


@router.post("/applications/{application_id}/interview", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    application_id: int,
    interview_schedule: InterviewSchedule,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    old_status = application.status
    application.status = "Interview Scheduled"

    history_entry = StatusHistory(
        application_id=application_id,
        old_status=old_status,
        new_status="Interview Scheduled",
        changed_by=current_admin.email,
        notes=f"Interview scheduled for {interview_schedule.scheduled_date} at {interview_schedule.scheduled_time}",
    )
    db.add(history_entry)

    interview = Interview(
        application_id=application_id,
        scheduled_date=interview_schedule.scheduled_date,
        scheduled_time=interview_schedule.scheduled_time,
        interview_type=interview_schedule.interview_type,
        interviewer=interview_schedule.interviewer,
        location=interview_schedule.location,
        notes=interview_schedule.notes,
        status="scheduled",
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    app_data = {
        "id": application.id,
        "full_name": application.full_name,
        "email": application.email,
        "whatsapp": application.whatsapp or application.mobile,
        "mobile": application.mobile,
    }

    enqueue_job("send_interview_notification", {
        "application_data": app_data,
        "scheduled_date": interview_schedule.scheduled_date,
        "scheduled_time": interview_schedule.scheduled_time,
        "interview_type": interview_schedule.interview_type,
        "interviewer": interview_schedule.interviewer,
        "location": interview_schedule.location,
        "notes": interview_schedule.notes,
        "sent_by": current_admin.email,
    })

    return interview


@router.get("/applications/{application_id}/interviews", response_model=List[InterviewResponse])
def get_interviews(
    application_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    interviews = db.query(Interview).filter(
        Interview.application_id == application_id
    ).order_by(Interview.created_at.desc()).all()

    return interviews


@router.put("/interview/{interview_id}/remarks", response_model=dict)
def update_interview_remarks(
    interview_id: int,
    remarks_update: RemarksUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role("admin")),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    interview.remarks = remarks_update.remarks
    db.commit()
    db.refresh(interview)

    return {"message": "Remarks updated", "remarks": interview.remarks}
