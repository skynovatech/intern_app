import logging
import os
import uuid

from fastapi import FastAPI, UploadFile, File, Depends, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text as sql_text

from app.database import engine, Base, SessionLocal, get_db
from app.config import get_settings
from app.models.admin import Admin
from app.models.job import Job  # Ensure the job table is included in Base.metadata.
from app.utils.security import get_password_hash
from app.utils.rate_limiter import rate_limiter
from app.services.websocket_manager import manager
from app.routers import (
    auth,
    applications,
    status,
    dashboard,
    communication,
    offer_letters,
    settings as settings_router,
    lookups,
    admin_users,
    jobs,
    audit as audit_router,
    offer_letter_templates,
)
from app.services.reminder_service import start_scheduler, stop_scheduler
from app.services.job_queue import (
    register_handler,
    start_worker,
    stop_worker,
)
from app.services.settings_service import seed_settings
from app.services.lookup_service import seed_lookups
from app.services.offer_letter_template_service import ensure_default_template
from app.services import notification_service
from app.routers.communication import _bulk_email_background, _bulk_whatsapp_background

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

settings = get_settings()

Base.metadata.create_all(bind=engine)

# migrate existing tables — add columns and indexes that don't exist yet
with engine.connect() as conn:
    for stmt in [
        "ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_path VARCHAR(255)",
        "ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50)",
        "CREATE INDEX IF NOT EXISTS ix_applications_status ON applications (status)",
        "CREATE INDEX IF NOT EXISTS ix_applications_domain ON applications (domain)",
        "CREATE INDEX IF NOT EXISTS ix_applications_created_at ON applications (created_at)",
        "CREATE INDEX IF NOT EXISTS ix_applications_email ON applications (email)",
        "CREATE INDEX IF NOT EXISTS ix_interviews_application_id ON interviews (application_id)",
        "CREATE INDEX IF NOT EXISTS ix_status_history_application_id ON status_history (application_id)",
        "CREATE INDEX IF NOT EXISTS ix_communication_log_application_id ON communication_log (application_id)",
    ]:
        try:
            conn.execute(sql_text(stmt))
        except Exception:
            pass  # column may already exist or not applicable
    conn.commit()

app = FastAPI(title="Skynova Tech Solutions", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(communication.router, prefix="/api")
app.include_router(offer_letters.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(lookups.router, prefix="/api")
app.include_router(admin_users.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(audit_router.router, prefix="/api")
app.include_router(offer_letter_templates.router, prefix="/api")


ALLOWED_RESUME_EXTENSIONS = {".pdf"}
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".jfif", ".tiff", ".bmp"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024


def _public_rate_limit(request: Request):
    rate_limiter.check("public", max_requests=20, window_seconds=60, ip=request.client.host if request.client else None)


@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    request: Request = None,
    _=Depends(_public_rate_limit),
):
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    content_type = file.content_type or ""

    if file_ext in ALLOWED_RESUME_EXTENSIONS or content_type == "application/pdf":
        subdir = "resumes"
        if not file_ext:
            file_ext = ".pdf"
    elif file_ext in ALLOWED_PHOTO_EXTENSIONS or content_type.startswith("image/"):
        subdir = "photos"
        if not file_ext:
            ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp"}
            file_ext = ext_map.get(content_type, ".jpg")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file_ext}' ({content_type}). Allowed: PDF for resume, images for photos",
        )

    logger = logging.getLogger("uvicorn")
    logger.info(f"[UPLOAD] filename={file.filename} ext={file_ext} type={content_type} -> {subdir}")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    return {"path": f"{subdir}/{unique_filename}", "filename": file.filename}


def _register_job_handlers():
    register_handler("send_application_confirmation", notification_service.send_application_confirmation)
    register_handler("send_status_notification", notification_service.send_status_notification)
    register_handler("send_interview_notification", notification_service.send_interview_notification)
    register_handler("send_offer_letter_notification", notification_service.send_offer_letter_notification)
    register_handler("send_offer_letter_draft_notification", notification_service.send_offer_letter_draft_notification)
    register_handler("send_bulk_status_notifications", notification_service.send_bulk_status_notifications)
    register_handler("bulk_email", _bulk_email_background)
    register_handler("bulk_whatsapp", _bulk_whatsapp_background)


@app.on_event("startup")
def on_startup():
    _register_job_handlers()

    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.email == settings.ADMIN_EMAIL).first()
        if not existing:
            admin = Admin(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="System Admin",
                role="admin",
            )
            db.add(admin)
        seed_settings(db)
        seed_lookups(db)
        ensure_default_template(db)
        db.commit()
    finally:
        db.close()

    start_scheduler()
    start_worker()
    logging.getLogger("uvicorn").info("Startup complete: admin seeded, lookups/settings seeded, worker running.")


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()
    stop_worker()


@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/company")
def company_info(db: SessionLocal = Depends(get_db)):
    """Public branding info for the apply page and email headers."""
    from app.services.settings_service import get_public_settings

    return {"settings": get_public_settings(db)}
