from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


class OfferLetterDraftCreate(BaseModel):
    application_id: Optional[int] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None

    degree: Optional[str] = None
    college: Optional[str] = None
    city: Optional[str] = None

    enrollment_id: Optional[str] = None
    technology: Optional[str] = None
    domain_label: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None

    domain: Optional[str] = None
    duration: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    stipend: Optional[str] = None
    reporting_sme: Optional[str] = None
    shift_time: Optional[str] = None
    shift_days: Optional[str] = None
    sme_email: Optional[str] = None
    sme_mobile: Optional[str] = None
    employee_id: Optional[str] = None

    body: Optional[str] = None

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, v):
        if v is not None and not re.match(r"^\d{10}$", v):
            raise ValueError("WhatsApp number must be exactly 10 digits")
        return v


class OfferLetterDraftUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None

    degree: Optional[str] = None
    college: Optional[str] = None
    city: Optional[str] = None

    enrollment_id: Optional[str] = None
    technology: Optional[str] = None
    domain_label: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None

    domain: Optional[str] = None
    duration: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    stipend: Optional[str] = None
    reporting_sme: Optional[str] = None
    shift_time: Optional[str] = None
    shift_days: Optional[str] = None
    sme_email: Optional[str] = None
    sme_mobile: Optional[str] = None
    employee_id: Optional[str] = None

    body: Optional[str] = None

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, v):
        if v is not None and not re.match(r"^\d{10}$", v):
            raise ValueError("WhatsApp number must be exactly 10 digits")
        return v


class OfferLetterResponse(BaseModel):
    id: int
    application_id: Optional[int] = None
    full_name: str
    email: str
    whatsapp: Optional[str] = None

    degree: Optional[str] = None
    college: Optional[str] = None
    city: Optional[str] = None

    enrollment_id: Optional[str] = None
    technology: Optional[str] = None
    domain_label: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None

    domain: Optional[str] = None
    duration: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    stipend: Optional[str] = None
    reporting_sme: Optional[str] = None
    shift_time: Optional[str] = None
    shift_days: Optional[str] = None
    sme_email: Optional[str] = None
    sme_mobile: Optional[str] = None
    employee_id: Optional[str] = None

    body: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}