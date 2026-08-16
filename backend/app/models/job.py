from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        __import__("sqlalchemy").Index("ix_jobs_status_created", "status", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(100), nullable=False, index=True)
    payload = Column(Text, nullable=True)
    status = Column(String(20), default="pending", index=True)
    queue = Column(String(50), default="default")
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    error = Column(Text, nullable=True)
    run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
