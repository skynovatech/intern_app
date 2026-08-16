from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class OfferLetterTemplate(Base):
    __tablename__ = "offer_letter_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    structure = Column(Text, nullable=False)   # JSON: ordered sections + props
    design = Column(Text, nullable=False)      # JSON: design settings
    is_active = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    created_by = Column(String(255), nullable=True)
    updated_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
