from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    actor_email: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    summary: Optional[str] = None
    details: Optional[str] = None
    ip: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogPage(BaseModel):
    items: List[AuditLogResponse]
    total: int
    actions: List[str] = []
    resources: List[str] = []