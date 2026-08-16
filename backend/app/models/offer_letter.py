from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class OfferLetter(Base):
    __tablename__ = "offer_letters"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True, index=True)

    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    whatsapp = Column(String(20), nullable=True)

    degree = Column(String(255), nullable=True)
    college = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)

    enrollment_id = Column(String(50), nullable=True)
    technology = Column(String(100), nullable=True)
    domain_label = Column(String(100), nullable=True)
    organization = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)

    domain = Column(String(100), nullable=True)
    duration = Column(String(50), nullable=True)
    start_date = Column(String(10), nullable=True)
    end_date = Column(String(10), nullable=True)
    stipend = Column(String(50), nullable=True)
    reporting_sme = Column(String(255), nullable=True)
    shift_time = Column(String(50), nullable=True)
    shift_days = Column(String(50), nullable=True)
    sme_email = Column(String(255), nullable=True)
    sme_mobile = Column(String(50), nullable=True)
    employee_id = Column(String(50), nullable=True)

    body = Column(Text, nullable=True)

    status = Column(String(50), default="draft", nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())