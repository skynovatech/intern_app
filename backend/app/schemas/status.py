from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class StatusUpdate(BaseModel):
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


class StatusHistoryResponse(BaseModel):
    id: int
    application_id: int
    old_status: Optional[str]
    new_status: str
    changed_by: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewSchedule(BaseModel):
    scheduled_date: str
    scheduled_time: str
    interview_type: str = "video"
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


class InterviewResponse(BaseModel):
    id: int
    application_id: int
    scheduled_date: str
    scheduled_time: str
    interview_type: str
    interviewer: Optional[str]
    location: Optional[str]
    notes: Optional[str]
    remarks: Optional[str]
    result: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class NoteUpdate(BaseModel):
    notes: str


class RatingUpdate(BaseModel):
    rating: int

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if v < 0 or v > 5:
            raise ValueError("Rating must be between 0 and 5")
        return v


class RemarksUpdate(BaseModel):
    remarks: str
