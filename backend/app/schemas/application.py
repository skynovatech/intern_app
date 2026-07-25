from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import re


class ApplicationCreate(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    whatsapp: Optional[str] = None
    dob: str
    gender: str
    address: Optional[str] = None

    college: str
    degree: str
    department: str
    current_year: str
    cgpa: Optional[float] = None

    domain: str
    duration: str
    preferred_joining_date: Optional[str] = None

    technical_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    projects: Optional[str] = None
    certifications: Optional[str] = None

    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None

    resume_path: Optional[str] = None
    photo_path: Optional[str] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v):
        if not re.match(r"^\d{10}$", v):
            raise ValueError("Mobile number must be exactly 10 digits")
        return v

    @field_validator("cgpa")
    @classmethod
    def validate_cgpa(cls, v):
        if v is not None and (v < 0 or v > 10):
            raise ValueError("CGPA must be between 0 and 10")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        valid_genders = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"]
        if v not in valid_genders:
            raise ValueError(f"Gender must be one of: {', '.join(valid_genders)}")
        return v


class ApplicationUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    whatsapp: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

    college: Optional[str] = None
    degree: Optional[str] = None
    department: Optional[str] = None
    current_year: Optional[str] = None
    cgpa: Optional[float] = None

    domain: Optional[str] = None
    duration: Optional[str] = None
    preferred_joining_date: Optional[str] = None

    technical_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    projects: Optional[str] = None
    certifications: Optional[str] = None

    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None

    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and not re.match(r"^\d{10}$", v):
            raise ValueError("Mobile number must be exactly 10 digits")
        return v

    @field_validator("cgpa")
    @classmethod
    def validate_cgpa(cls, v):
        if v is not None and (v < 0 or v > 10):
            raise ValueError("CGPA must be between 0 and 10")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = [
                "Pending", "Reviewed", "Shortlisted", "Interview Scheduled",
                "Interview Completed", "Selected", "Rejected", "Withdrawn"
            ]
            if v not in valid_statuses:
                raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class ApplicationResponse(BaseModel):
    id: int
    full_name: str
    email: str
    mobile: str
    whatsapp: Optional[str] = None
    dob: str
    gender: str
    address: Optional[str] = None

    college: str
    degree: str
    department: str
    current_year: str
    cgpa: Optional[float] = None

    domain: str
    duration: str
    preferred_joining_date: Optional[str] = None

    technical_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    projects: Optional[str] = None
    certifications: Optional[str] = None

    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None

    resume_path: Optional[str] = None
    photo_path: Optional[str] = None

    status: str
    rating: int
    notes: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class BulkDownloadRequest(BaseModel):
    ids: List[int]


class BulkStatusUpdate(BaseModel):
    ids: List[int]
    new_status: str
    notes: Optional[str] = None

    @field_validator("new_status")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = [
            "Pending", "Reviewed", "Shortlisted", "Interview Scheduled",
            "Interview Completed", "Selected", "Rejected", "Withdrawn"
        ]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class BulkInterviewSchedule(BaseModel):
    ids: List[int]
    scheduled_date: str
    scheduled_time: str
    interview_type: str = "Video"
    interviewer: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("interview_type")
    @classmethod
    def validate_interview_type(cls, v):
        normalized = v.strip().title()
        valid_types = ["Video", "In-Person", "Phone", "Technical", "Hr"]
        if normalized not in valid_types:
            raise ValueError(f"Interview type must be one of: {', '.join(valid_types)}")
        return normalized
