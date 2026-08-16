from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from sqlalchemy.sql import func
from app.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    mobile = Column(String(20), nullable=False)
    whatsapp = Column(String(20), nullable=True)
    dob = Column(String(10), nullable=False)
    gender = Column(String(20), nullable=False)
    address = Column(Text, nullable=True)

    college = Column(String(255), nullable=False)
    degree = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    current_year = Column(String(50), nullable=False)
    cgpa = Column(Float, nullable=True)

    domain = Column(String(100), nullable=False)
    duration = Column(String(50), nullable=False)
    preferred_joining_date = Column(String(10), nullable=True)

    technical_skills = Column(JSON, nullable=True)
    soft_skills = Column(JSON, nullable=True)
    projects = Column(Text, nullable=True)
    certifications = Column(Text, nullable=True)

    github = Column(String(500), nullable=True)
    linkedin = Column(String(500), nullable=True)
    portfolio = Column(String(500), nullable=True)

    resume_path = Column(String(500), nullable=True)
    photo_path = Column(String(500), nullable=True)

    status = Column(String(50), default="Pending", nullable=False)
    rating = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    employee_id = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
