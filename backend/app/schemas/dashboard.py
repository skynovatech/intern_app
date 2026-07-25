from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class DashboardStats(BaseModel):
    total: int
    pending: int
    reviewed: int
    shortlisted: int
    interview_scheduled: int
    interview_completed: int
    selected: int
    rejected: int
    withdrawn: int


class DomainStat(BaseModel):
    domain: str
    count: int


class AnalyticsResponse(BaseModel):
    stats: DashboardStats
    domain_distribution: List[DomainStat]
    gender_distribution: List[DomainStat]
    daily_applications: List[Dict[str, Any]]
    college_distribution: List[DomainStat]


class PaginatedApplications(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int
