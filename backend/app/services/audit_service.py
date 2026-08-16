from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
import json


def write_audit_log(
    db: Session,
    actor_email: str,
    action: str,
    resource: str = "general",
    resource_id=None,
    summary: str = "",
    details: dict | None = None,
    actor_name: str | None = None,
    ip: str | None = None,
):
    db.add(AuditLog(
        actor_email=actor_email,
        actor_name=actor_name,
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id is not None else None,
        summary=(summary or "")[:500],
        details=json.dumps(details, default=str) if details else None,
        ip=ip,
    ))


def query_audit_logs(
    db: Session,
    action: str | None = None,
    resource: str | None = None,
    actor_email: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource == resource)
    if actor_email:
        query = query.filter(AuditLog.actor_email == actor_email)
    if search:
        term = f"%{search}%"
        query = query.filter(
            AuditLog.summary.ilike(term)
            | AuditLog.resource.ilike(term)
            | AuditLog.action.ilike(term)
            | AuditLog.actor_email.ilike(term)
        )

    total = query.count()
    rows = (
        query.order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(min(limit, 500))
        .all()
    )
    return rows, total


def list_actions(db: Session):
    rows = db.query(AuditLog.action).distinct().all()
    return sorted(r[0] for r in rows if r[0])


def list_resources(db: Session):
    rows = db.query(AuditLog.resource).distinct().all()
    return sorted(r[0] for r in rows if r[0])