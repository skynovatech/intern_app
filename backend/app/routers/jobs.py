from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.models.job import Job
from app.schemas.job import JobResponse
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.job_queue import _process_job, enqueue_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=list[JobResponse])
def list_jobs(
    limit: int = 100,
    status_filter: str | None = None,
    kind: str | None = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    query = db.query(Job)
    if status_filter and status_filter in ("pending", "running", "done", "failed"):
        query = query.filter(Job.status == status_filter)
    if kind:
        kinds = [k.strip() for k in kind.split(",") if k.strip()]
        if kinds:
            query = query.filter(Job.kind.in_(kinds))
    return (
        query.order_by(Job.created_at.desc()).limit(min(limit, 500)).all()
    )


@router.get("/counts")
def job_counts(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    counts = {}
    for status_name in ("pending", "running", "done", "failed"):
        counts[status_name] = db.query(Job).filter(Job.status == status_name).count()
    counts["total"] = sum(counts.values())
    return counts


@router.post("/{job_id}/retry", response_model=JobResponse)
def retry_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "failed" or job.attempts >= job.max_attempts:
        job.status = "pending"
        job.attempts = 0
        job.error = None
        job.run_at = None
        db.commit()
        db.refresh(job)
        return job
    raise HTTPException(status_code=400, detail="Only failed jobs can be retried")


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("pending", "failed"):
        db.delete(job)
        db.commit()