from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    actor_email = Column(String(255), nullable=True)
    actor_name = Column(String(255), nullable=True)

    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True)
    summary = Column(String(500), nullable=True)
    details = Column(Text, nullable=True)
    ip = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


def log_action(
    db: "Session",
    action: str,
    resource: str,
    resource_id: str | int | None = None,
    summary: str | None = None,
    details: dict | None = None,
    actor_email: str | None = None,
    actor_name: str | None = None,
    ip: str | None = None,
):
    import json
    try:
        db.add(AuditLog(
            actor_email=actor_email,
            actor_name=actor_name,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id is not None else None,
            summary=summary,
            details=json.dumps(details, default=str) if details else None,
            ip=ip,
        ))
        db.commit()
    except Exception:
        db.rollback()


def log_action_with_commit(
    db: "Session",
    action: str,
    resource: str,
    resource_id: int | str | None = None,
    summary: str | None = None,
    details: dict | None = None,
    actor_email: str | None = None,
    actor_name: str | None = None,
    ip: str | None = None,
):
    """Log an action after committing the caller's own transaction, so both commit once."""
    try:
        db.add(AuditLog(
            actor_email=actor_email,
            actor_name=actor_name,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id is not None else None,
            summary=summary,
            details=__import__("json").dumps(details, default=str) if details else None,
            ip=ip,
        ))
    except Exception:
        db.rollback()