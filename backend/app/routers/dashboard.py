from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any
from datetime import datetime, timedelta

from app.database import get_db
from app.models.application import Application
from app.schemas.dashboard import DashboardStats, DomainStat, AnalyticsResponse
from app.utils.dependencies import get_current_admin

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    total = db.query(Application).count()
    pending = db.query(Application).filter(Application.status == "Pending").count()
    reviewed = db.query(Application).filter(Application.status == "Reviewed").count()
    shortlisted = db.query(Application).filter(Application.status == "Shortlisted").count()
    interview_scheduled = db.query(Application).filter(Application.status == "Interview Scheduled").count()
    interview_completed = db.query(Application).filter(Application.status == "Interview Completed").count()
    selected = db.query(Application).filter(Application.status == "Selected").count()
    rejected = db.query(Application).filter(Application.status == "Rejected").count()
    withdrawn = db.query(Application).filter(Application.status == "Withdrawn").count()

    return DashboardStats(
        total=total,
        pending=pending,
        reviewed=reviewed,
        shortlisted=shortlisted,
        interview_scheduled=interview_scheduled,
        interview_completed=interview_completed,
        selected=selected,
        rejected=rejected,
        withdrawn=withdrawn,
    )


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    total = db.query(Application).count()
    pending = db.query(Application).filter(Application.status == "Pending").count()
    reviewed = db.query(Application).filter(Application.status == "Reviewed").count()
    shortlisted = db.query(Application).filter(Application.status == "Shortlisted").count()
    interview_scheduled = db.query(Application).filter(Application.status == "Interview Scheduled").count()
    interview_completed = db.query(Application).filter(Application.status == "Interview Completed").count()
    selected = db.query(Application).filter(Application.status == "Selected").count()
    rejected = db.query(Application).filter(Application.status == "Rejected").count()
    withdrawn = db.query(Application).filter(Application.status == "Withdrawn").count()

    stats = DashboardStats(
        total=total,
        pending=pending,
        reviewed=reviewed,
        shortlisted=shortlisted,
        interview_scheduled=interview_scheduled,
        interview_completed=interview_completed,
        selected=selected,
        rejected=rejected,
        withdrawn=withdrawn,
    )

    domain_results = db.query(
        Application.domain, func.count(Application.id)
    ).group_by(Application.domain).all()
    domain_distribution = [DomainStat(domain=r[0], count=r[1]) for r in domain_results]

    gender_results = db.query(
        Application.gender, func.count(Application.id)
    ).group_by(Application.gender).all()
    gender_distribution = [DomainStat(domain=r[0], count=r[1]) for r in gender_results]

    college_results = db.query(
        Application.college, func.count(Application.id)
    ).group_by(Application.college).order_by(func.count(Application.id).desc()).limit(10).all()
    college_distribution = [DomainStat(domain=r[0], count=r[1]) for r in college_results]

    thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
    daily_results = db.query(
        func.date(Application.created_at).label("date"),
        func.count(Application.id).label("count"),
    ).filter(
        func.date(Application.created_at) >= thirty_days_ago
    ).group_by(
        func.date(Application.created_at)
    ).order_by(
        func.date(Application.created_at)
    ).all()

    counts_by_date: Dict[str, int] = {str(row[0]): row[1] for row in daily_results}

    daily_applications: list[Dict[str, Any]] = []
    for i in range(30):
        date = (datetime.now() - timedelta(days=29 - i)).date()
        date_str = date.isoformat()
        daily_applications.append({"date": date_str, "count": counts_by_date.get(date_str, 0)})

    return AnalyticsResponse(
        stats=stats,
        domain_distribution=domain_distribution,
        gender_distribution=gender_distribution,
        daily_applications=daily_applications,
        college_distribution=college_distribution,
    )
