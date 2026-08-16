import json
import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.job import Job

logger = logging.getLogger(__name__)

STALE_RUNNING_TIMEOUT_SECONDS = 120
RETRY_DELAY_SECONDS = 30
POLL_INTERVAL_SECONDS = 2

HANDLERS: dict[str, Callable] = {}
_stop_event = threading.Event()
_thread: threading.Thread | None = None


def register_handler(kind: str, fn: Callable):
    HANDLERS[kind] = fn


def enqueue_job(kind: str, payload: Optional[dict] = None, run_at: Optional[datetime] = None,
                max_attempts: int = 3, queue: str = "default") -> int:
    db = SessionLocal()
    try:
        job = Job(
            kind=kind,
            payload=json.dumps(payload or {}, default=str),
            status="pending",
            queue=queue,
            max_attempts=max_attempts,
            run_at=run_at,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id
    finally:
        db.close()


def _claim_next_job() -> tuple[Optional[Job], Optional[Session]]:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        stale = now - timedelta(seconds=STALE_RUNNING_TIMEOUT_SECONDS)
        job = (
            db.query(Job)
            .filter(
                or_(
                    and_(Job.status == "pending",
                         or_(Job.run_at.is_(None), Job.run_at <= now)),
                    and_(Job.status == "running", Job.started_at < stale),
                )
            )
            .order_by(Job.created_at.asc())
            .first()
        )
        if job:
            job.status = "running"
            job.started_at = now
            job.attempts += 1
            db.commit()
            return job, db
        db.close()
        return None, None
    except Exception:
        db.rollback()
        db.close()
        return None, None


def _process_job(job: Job, db: Session):
    handler = HANDLERS.get(job.kind)
    if not handler:
        job.status = "failed"
        job.error = f"No handler registered for job kind '{job.kind}'"
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        logger.error(job.error)
        return

    try:
        payload = json.loads(job.payload or "{}")
        handler(**payload)
        job.status = "done"
        job.error = None
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Job #{job.id} ({job.kind}) completed")
    except Exception as e:
        db.rollback()
        logger.error(f"Job #{job.id} ({job.kind}) failed: {e}")
        if job.attempts >= job.max_attempts:
            job.status = "failed"
            job.error = str(e)[:500]
            job.finished_at = datetime.now(timezone.utc)
        else:
            job.status = "pending"
            job.error = f"{str(e)[:300]} (will retry)"
            job.run_at = datetime.now(timezone.utc) + timedelta(seconds=RETRY_DELAY_SECONDS * job.attempts)
        db.commit()


def _worker_loop():
    logger.info("[JOB-QUEUE] Worker started")
    while not _stop_event.is_set():
        try:
            job, db = _claim_next_job()
            if job and db:
                try:
                    _process_job(job, db)
                finally:
                    db.close()
            else:
                _stop_event.wait(POLL_INTERVAL_SECONDS)
        except Exception as e:
            logger.error(f"[JOB-QUEUE] Worker loop error: {e}")
            _stop_event.wait(POLL_INTERVAL_SECONDS)


def start_worker():
    global _thread, _stop_event
    if _thread and _thread.is_alive():
        return
    _stop_event = threading.Event()
    _thread = threading.Thread(target=_worker_loop, name="job-worker", daemon=True)
    _thread.start()


def stop_worker():
    global _stop_event
    _stop_event.set()