from sqlalchemy.orm import Session
from app.models.lookup_item import LookupItem

DEFAULT_LOOKUPS = {
    "domain": [
        "Web Development", "Mobile Development", "Data Science", "Machine Learning",
        "AI / Deep Learning", "Cloud Computing", "Cybersecurity", "DevOps",
        "UI/UX Design", "Blockchain", "IoT", "Game Development",
        "Full Stack Development", "Backend Development", "Frontend Development",
        "Digital Marketing", "Social Media Marketing", "Graphic Design",
        "Video Editing", "Other",
    ],
    "duration": [
        "1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months", "Ongoing",
    ],
    "gender": [
        "Male", "Female", "Non-binary", "Other", "Prefer not to say",
    ],
    "degree": [
        "B.Tech", "B.E.", "BCA", "B.Sc", "M.Tech", "M.E.", "MCA", "M.Sc", "MBA", "Ph.D", "Other",
    ],
    "year": [
        "1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year", "Post Graduate",
    ],
    "status": [
        "Pending", "Reviewed", "Shortlisted", "Interview Scheduled",
        "Interview Completed", "Selected", "Rejected", "Withdrawn",
    ],
    "interview_type": [
        "Video", "In-Person", "Phone", "Technical", "HR",
    ],
}

VALID_CATEGORIES = set(DEFAULT_LOOKUPS.keys())


def seed_lookups(db: Session):
    existing_cats = {c for (c,) in db.query(LookupItem.category).distinct().all()}
    for category, values in DEFAULT_LOOKUPS.items():
        if category not in existing_cats:
            for i, value in enumerate(values):
                db.add(LookupItem(category=category, value=value, is_active=True, sort_order=i))
    db.commit()


def list_active_values(db: Session, category: str) -> list[str]:
    rows = (
        db.query(LookupItem)
        .filter(LookupItem.category == category, LookupItem.is_active == True)
        .order_by(LookupItem.sort_order.asc(), LookupItem.id.asc())
        .all()
    )
    return [r.value for r in rows]


def all_lookups(db: Session) -> dict:
    result = {}
    rows = (
        db.query(LookupItem)
        .order_by(LookupItem.category.asc(), LookupItem.sort_order.asc(), LookupItem.id.asc())
        .all()
    )
    for row in rows:
        result.setdefault(row.category, []).append(row.value)
    return result