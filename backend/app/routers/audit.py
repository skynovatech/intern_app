from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.schemas.audit import AuditLogPage
from app.utils.dependencies import get_current_admin
from app.services.audit_service import query_audit_logs, list_actions, list_resources

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=AuditLogPage)
def get_audit_logs(
    page: int = 1,
    page_size: int = 50,
    action: str | None = None,
    resource: str | None = None,
    actor_email: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    logs, total = query_audit_logs(
        db,
        action=action,
        resource=resource,
        actor_email=actor_email,
        search=search,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    return AuditLogPage(
        items=logs,
        total=total,
        actions=list_actions(db),
        resources=list_resources(db),
    )


@router.get("/meta")
def get_audit_meta(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return {
        "actions": list_actions(db),
        "resources": list_resources(db),
    }