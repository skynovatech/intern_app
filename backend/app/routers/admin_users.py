from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserPasswordReset,
    AdminUserResponse,
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.utils.security import get_password_hash
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/admins", tags=["Admin Users"])

VALID_ROLES = {"admin", "viewer"}


def _validate_role(role: str):
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role}'. Valid roles: {', '.join(sorted(VALID_ROLES))}",
        )


@router.get("", response_model=list[AdminUserResponse])
def list_admins(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    return db.query(Admin).order_by(Admin.created_at.asc()).all()


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    _validate_role(payload.role)
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(Admin).filter(Admin.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already in use")

    admin = Admin(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    write_audit_log(db, current_admin.email, "admin_create", "admin", admin.id,
                    f"Created admin account for {admin.email} (role: {admin.role})", actor_name=current_admin.full_name)
    db.commit()
    return admin


@router.put("/{user_id}", response_model=AdminUserResponse)
def update_admin(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    admin = db.query(Admin).filter(Admin.id == user_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if payload.email is not None and payload.email != admin.email:
        dup = db.query(Admin).filter(Admin.email == payload.email, Admin.id != user_id).first()
        if dup:
            raise HTTPException(status_code=409, detail="Email already in use")
        admin.email = payload.email
    if payload.full_name is not None:
        admin.full_name = payload.full_name
    if payload.role is not None:
        _validate_role(payload.role)
        admin.role = payload.role

    # Prevents locking yourself out of the last active admin account
    if payload.is_active is not None and admin.id != current_admin.id:
        if payload.is_active is False:
            active_count = db.query(Admin).filter(Admin.is_active == True).count()
            if active_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot deactivate the last active admin")
        admin.is_active = payload.is_active

    db.commit()
    db.refresh(admin)
    write_audit_log(db, current_admin.email, "admin_update", "admin", admin.id,
                    f"Updated admin {admin.email}", actor_name=current_admin.full_name)
    db.commit()
    return admin


@router.post("/{user_id}/reset-password")
def reset_admin_password(
    user_id: int,
    payload: AdminUserPasswordReset,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    admin = db.query(Admin).filter(Admin.id == user_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    admin.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    write_audit_log(db, current_admin.email, "admin_password_reset", "admin", admin.id,
                    f"Reset password for {admin.email}", actor_name=current_admin.full_name)
    db.commit()
    return {"message": f"Password reset for {admin.email}"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    admin = db.query(Admin).filter(Admin.id == user_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    active_count = db.query(Admin).filter(Admin.is_active == True).count()
    if admin.is_active and active_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last active admin")
    db.delete(admin)
    db.commit()
    write_audit_log(db, current_admin.email, "admin_delete", "admin", admin.id,
                    f"Deleted admin account for {admin.email}", actor_name=current_admin.full_name)
    db.commit()