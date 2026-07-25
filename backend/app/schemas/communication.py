from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class SendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    message: str
    html: bool = False


class SendWhatsAppRequest(BaseModel):
    to_phone: str
    message: str


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    category: Optional[str] = None
    is_active: bool = True


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    category: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WhatsAppTemplateCreate(BaseModel):
    name: str
    message: str
    category: Optional[str] = None
    is_active: bool = True


class WhatsAppTemplateUpdate(BaseModel):
    name: Optional[str] = None
    message: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class WhatsAppTemplateResponse(BaseModel):
    id: int
    name: str
    message: str
    category: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunicationLogResponse(BaseModel):
    id: int
    application_id: int
    channel: str
    subject: Optional[str]
    message: str
    status: str
    sent_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BulkSendEmailRequest(BaseModel):
    ids: List[int]
    subject: str
    message: str
    html: bool = False


class BulkSendWhatsAppRequest(BaseModel):
    ids: List[int]
    message: str
