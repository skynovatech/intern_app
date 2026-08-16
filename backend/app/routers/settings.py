from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.app_setting import AppSetting
from app.models.admin import Admin
from app.models.application import Application
from app.models.offer_letter import OfferLetter
from app.models.job import Job
from app.schemas.settings import (
    SettingResponse,
    SettingsUpdateRequest,
    PublicSettingsResponse,
)
from app.schemas.settings_api import (
    SettingsExportResponse,
    SettingsExportItem,
    SettingsImportRequest,
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.settings_service import DEFAULT_SETTINGS, get_public_settings

router = APIRouter(tags=["Settings"])


@router.get("/settings", response_model=list[SettingResponse])
def list_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return db.query(AppSetting).order_by(AppSetting.group.asc(), AppSetting.id.asc()).all()


def _audit(db, current_admin, action, summary, details=None):
    from app.models.audit_log import AuditLog
    import json
    db.add(AuditLog(
        actor_email=current_admin.email,
        actor_name=current_admin.full_name,
        action=action,
        resource="settings",
        resource_id=None,
        summary=(summary or "")[:500],
        details=json.dumps(details, default=str) if details else None,
    ))


@router.put("/settings")
def update_settings(
    request: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    for key, value in request.settings.items():
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if not setting:
            raise HTTPException(status_code=404, detail=f"Unknown setting key: {key}")
        setting.value = value
        db.add(setting)
    _audit(db, current_admin, "settings_update", f"Updated {len(request.settings)} setting(s)",
           {"updated": list(request.settings.keys())})
    db.commit()
    return {"message": f"Updated {len(request.settings)} setting(s)"}


@router.get("/settings/lookup/keys")
def list_setting_keys(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Return the known setting keys (label/type/group) so the UI can render inputs."""
    rows = db.query(AppSetting).order_by(AppSetting.group.asc(), AppSetting.id.asc()).all()
    return [
        {
            "key": r.key,
            "label": r.label,
            "type": r.type,
            "group": r.group,
            "value": r.value or "",
        }
        for r in rows
    ]


@router.get("/settings/export", response_model=SettingsExportResponse)
def export_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    rows = db.query(AppSetting).order_by(AppSetting.group.asc(), AppSetting.id.asc()).all()
    payload = [
        SettingsExportItem(key=r.key, label=r.label, value=r.value, type=r.type, group=r.group, is_public=r.is_public)
        for r in rows
    ]
    _audit(db, current_admin, "settings_export", "Exported settings", {"count": len(payload)})
    db.commit()
    res = SettingsExportResponse(settings=payload)
    return JSONResponse(
        content=res.model_dump(),
        headers={"Content-Disposition": "attachment; filename=settings.json"},
    )


@router.post("/settings/import")
def import_settings(
    request: SettingsImportRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    known = {d["key"] for d in DEFAULT_SETTINGS}
    updated = 0
    errors = []
    for item in request.settings:
        if item.key not in known:
            errors.append(item.key)
            continue
        setting = db.query(AppSetting).filter(AppSetting.key == item.key).first()
        if not setting:
            continue
        setting.value = item.value
        db.add(setting)
        updated += 1
    _audit(db, current_admin, "settings_import", f"Imported settings ({updated} updated, {len(errors)} skipped)",
           {"updated": updated, "skipped_keys": errors})
    db.commit()
    return {"message": f"Imported {updated} setting(s)", "skipped": errors}


@router.get("/settings/counts")
def settings_counts(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    def cnt(model):
        return db.query(model).count()
    return {
        "settings": cnt(AppSetting),
        "applications": cnt(Application),
        "selected": db.query(Application).filter(Application.status == "Selected").count(),
        "offer_drafts": db.query(OfferLetter).filter(OfferLetter.status == "draft").count(),
        "offer_sent": db.query(OfferLetter).filter(OfferLetter.status == "sent").count(),
        "jobs_failed": db.query(Job).filter(Job.status == "failed").count(),
    }


@router.get("/settings/public", response_model=PublicSettingsResponse)
def get_public_settings_endpoint(
    db: Session = Depends(get_db),
):
    return PublicSettingsResponse(settings=get_public_settings(db))