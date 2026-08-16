import logging
import threading
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.interview import Interview
from app.models.application import Application
from app.models.communication_log import CommunicationLog
from app.services.email_service import send_email
from app.services.whatsapp_service import send_whatsapp_message
from app.services.notification_service import (
    _get_company_name,
    _wrap_html,
    _resolve_email_body,
    _resolve_whatsapp_body,
    CATEGORY_INTERVIEW_SCHEDULED,
)
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Use a unique marker embedded in the logged message to avoid duplicate reminders
# for the same interview across scheduler runs.
_REMINDER_MARKER = "[Auto-Reminder]"

_stop_event = threading.Event()
_thread: threading.Thread | None = None

REMINDER_EMAIL_BODY = """\
Hi {applicant_name},

This is a friendly reminder that your interview with {company_name} is scheduled as follows:

Date: {date}
Time: {time}
Mode: {interview_type}
Contact: {location}
Interviewer: {interviewer}

Please be online a few minutes early and have your documents ready.

Best regards,
{company_name}
"""

REMINDER_WHATSAPP_MSG = """\
Hi {applicant_name},

Reminder: your interview with {company_name} is scheduled on {date} at {time} ({interview_type}).
Contact: {location}. Please be ready a few minutes early.

Thanks,
{company_name}
"""


def _parse_interview_dt(scheduled_date: str, scheduled_time: str) -> datetime | None:
    try:
        time_part = scheduled_time.split(".")[0].strip()
        return datetime.strptime(f"{scheduled_date} {time_part}", "%Y-%m-%d %H:%M")
    except (ValueError, TypeError):
        logger.warning(
            f"Could not parse interview datetime: date={scheduled_date!r} time={scheduled_time!r}"
        )
        return None


def _already_reminded(db: Session, interview_id: int, application_id: int) -> bool:
    logs = (
        db.query(CommunicationLog)
        .filter(
            CommunicationLog.application_id == application_id,
            CommunicationLog.message.like(f"%{_REMINDER_MARKER}{interview_id}%"),
        )
        .first()
    )
    return logs is not None


def _send_reminder(db: Session, interview: Interview, app: Application):
    if _already_reminded(db, interview.id, app.id):
        return

    company = _get_company_name(db)
    variables = {
        "{applicant_name}": app.full_name,
        "{date}": interview.scheduled_date,
        "{time}": interview.scheduled_time,
        "{interview_type}": interview.interview_type or "TBD",
        "{interviewer}": interview.interviewer or "TBD",
        "{location}": interview.location or "TBD",
    }

    subject, email_body = _resolve_email_body(
        db,
        CATEGORY_INTERVIEW_SCHEDULED,
        REMINDER_EMAIL_BODY,
        {**variables, "{subject}": "Interview Reminder"},
    )
    email_sent = send_email(
        to_email=app.email,
        subject=subject,
        body=_wrap_html(email_body),
        html=True,
    )
    logger.info(
        f"[REMINDER] Email to {app.email} (interview {interview.id}): "
        f"{'sent' if email_sent else 'FAILED'}"
    )
    db.add(
        CommunicationLog(
            application_id=app.id,
            channel="email",
            subject=subject,
            message=f"{email_body}\n\n{_REMINDER_MARKER}{interview.id}",
            status="sent" if email_sent else "failed",
            sent_by="system",
        )
    )

    whatsapp = app.whatsapp or app.mobile
    if whatsapp:
        wa_body = _resolve_whatsapp_body(
            db, CATEGORY_INTERVIEW_SCHEDULED, REMINDER_WHATSAPP_MSG, variables
        )
        wa_sent = send_whatsapp_message(to_phone=whatsapp, message=wa_body)
        logger.info(
            f"[REMINDER] WhatsApp to {whatsapp} (interview {interview.id}): "
            f"{'sent' if wa_sent else 'FAILED'}"
        )
        db.add(
            CommunicationLog(
                application_id=app.id,
                channel="whatsapp",
                message=f"{wa_body}\n\n{_REMINDER_MARKER}{interview.id}",
                status="sent" if wa_sent else "failed",
                sent_by="system",
            )
        )

    db.commit()


def run_reminder_once():
    """Send interview reminders for upcoming interviews within the configured window."""
    db = SessionLocal()
    try:
        now = datetime.now()
        rows = (
            db.query(Interview, Application)
            .join(Application, Application.id == Interview.application_id)
            .filter(Interview.status == "scheduled")
            .all()
        )

        window = timedelta(hours=settings.REMINDER_HOURS_BEFORE)
        for interview, app in rows:
            dt = _parse_interview_dt(interview.scheduled_date, interview.scheduled_time)
            if dt is None:
                continue
            delta = dt - now
            # Reminder only when interview is upcoming and within the pre-interview window.
            if timedelta(0) < delta <= window:
                _send_reminder(db, interview, app)
    except Exception as e:
        logger.error(f"Interview reminder run failed: {e}")
        db.rollback()
    finally:
        db.close()


def _loop():
    interval = max(settings.REMINDER_INTERVAL_MINUTES, 1) * 60
    logger.info(
        f"[REMINDER] Scheduler started (every {settings.REMINDER_INTERVAL_MINUTES} min, "
        f"{settings.REMINDER_HOURS_BEFORE}h before interview)."
    )
    while not _stop_event.is_set():
        try:
            run_reminder_once()
        except Exception as e:
            logger.error(f"[REMINDER] Error in reminder loop: {e}")
        _stop_event.wait(interval)


def start_scheduler():
    global _thread, _stop_event
    if not settings.REMINDER_ENABLED:
        logger.info("[REMINDER] Reminders disabled. Skipping scheduler.")
        return
    if _thread and _thread.is_alive():
        return
    _stop_event = threading.Event()
    _thread = threading.Thread(target=_loop, name="interview-reminder", daemon=True)
    _thread.start()


def stop_scheduler():
    global _stop_event
    _stop_event.set()