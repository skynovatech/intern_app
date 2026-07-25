import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    LoginRequest, TokenResponse, AdminResponse, AdminUpdate,
    ChangePasswordRequest, RefreshTokenRequest,
)
from app.utils.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    hash_token, REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.utils.dependencies import get_current_admin
from app.utils.rate_limiter import rate_limiter
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def _auth_rate_limit():
    rate_limiter.check("auth_login", max_requests=10, window_seconds=60)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db), _=Depends(_auth_rate_limit)):
    admin = db.query(Admin).filter(Admin.email == request.email).first()

    if not admin or not verify_password(request.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )

    access_token = create_access_token(data={"sub": str(admin.id)})
    raw_refresh = create_refresh_token()
    refresh_token = RefreshToken(
        admin_id=admin.id,
        token_hash=hash_token(raw_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db), _=Depends(_auth_rate_limit)):
    token_hash = hash_token(request.refresh_token)
    stored = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > datetime.now(timezone.utc),
    ).first()

    if not stored:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    stored.is_revoked = True
    db.add(stored)

    admin = db.query(Admin).filter(Admin.id == stored.admin_id).first()
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found or inactive",
        )

    access_token = create_access_token(data={"sub": str(admin.id)})
    raw_refresh = create_refresh_token()
    new_stored = RefreshToken(
        admin_id=admin.id,
        token_hash=hash_token(raw_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_stored)
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/logout")
def logout(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    token_hash = hash_token(request.refresh_token)
    stored = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.admin_id == current_admin.id,
        RefreshToken.is_revoked == False,
    ).first()

    if stored:
        stored.is_revoked = True
        db.commit()

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AdminResponse)
def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin


@router.put("/me", response_model=AdminResponse)
def update_profile(
    update: AdminUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if update.full_name is not None:
        current_admin.full_name = update.full_name
    if update.email is not None and update.email != current_admin.email:
        existing = db.query(Admin).filter(Admin.email == update.email).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        current_admin.email = update.email
    db.commit()
    db.refresh(current_admin)
    return current_admin


@router.put("/me/password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if not verify_password(req.current_password, current_admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    current_admin.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/me/avatar", response_model=AdminResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    content_type = file.content_type or ""
    if ext not in ALLOWED_AVATAR_EXTENSIONS and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed images: {', '.join(ALLOWED_AVATAR_EXTENSIONS)}")
    if not ext and content_type.startswith("image/"):
        ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp"}
        ext = ext_map.get(content_type, ".jpg")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 2MB")

    if current_admin.avatar_path:
        old = os.path.join(settings.UPLOAD_DIR, current_admin.avatar_path)
        if os.path.exists(old):
            os.remove(old)

    import uuid
    filename = f"avatars/{uuid.uuid4()}{ext}"
    full_path = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(content)

    current_admin.avatar_path = filename
    db.commit()
    db.refresh(current_admin)
    return current_admin


@router.delete("/me/avatar", response_model=AdminResponse)
def remove_avatar(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if current_admin.avatar_path:
        old = os.path.join(settings.UPLOAD_DIR, current_admin.avatar_path)
        if os.path.exists(old):
            os.remove(old)
        current_admin.avatar_path = None
        db.commit()
        db.refresh(current_admin)
    return current_admin
