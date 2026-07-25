import logging
import os
import uuid

from fastapi import FastAPI, UploadFile, File, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base, SessionLocal
from app.config import get_settings
from app.models.admin import Admin
from app.utils.security import get_password_hash
from app.utils.rate_limiter import rate_limiter
from app.services.websocket_manager import manager
from app.routers import auth, applications, status, dashboard, communication

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

settings = get_settings()

Base.metadata.create_all(bind=engine)

# migrate existing tables — add columns that don't exist yet
with engine.connect() as conn:
    for stmt in [
        "ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_path VARCHAR(255)",
        "ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
    ]:
        try:
            conn.execute(__import__("sqlalchemy").text(stmt))
        except Exception:
            pass  # column may already exist or not applicable
    conn.commit()

app = FastAPI(title="Skynova Tech Solutions", version="1.1.0")

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


ALLOWED_RESUME_EXTENSIONS = {".pdf"}
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".jfif", ".tiff", ".bmp"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024


def _public_rate_limit():
    rate_limiter.check("public", max_requests=20, window_seconds=60)


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), _=Depends(_public_rate_limit)):
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

    print(f"[UPLOAD] filename={file.filename} ext={file_ext} type={content_type} -> {subdir}")

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


@app.on_event("startup")
def create_default_admin():
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
            db.commit()
    finally:
        db.close()


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
