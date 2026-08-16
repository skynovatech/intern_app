from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from datetime import datetime
import json


class OfferLetterTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    structure: dict
    design: dict


class OfferLetterTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    structure: Optional[dict] = None
    design: Optional[dict] = None


class OfferLetterTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    structure: Any
    design: Any
    is_active: bool
    is_default: bool
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("structure", "design", mode="before")
    @classmethod
    def _parse_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v or {}

    model_config = {"from_attributes": True}


class OfferLetterTemplateList(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    is_default: bool
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
