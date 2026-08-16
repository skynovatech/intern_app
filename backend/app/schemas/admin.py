from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "admin"


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminUserPasswordReset(BaseModel):
    new_password: str


class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    avatar_path: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
