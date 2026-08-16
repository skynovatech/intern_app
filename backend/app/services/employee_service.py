from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.application import Application


def generate_employee_id(db: Session) -> str:
    prefix = "SA"

    last_id = (
        db.query(func.max(Application.employee_id))
        .filter(Application.employee_id.like(f"{prefix}%"))
        .scalar()
    )

    if last_id:
        seq = int(last_id[len(prefix):]) + 1
    else:
        seq = 1

    return f"{prefix}{seq:03d}"
