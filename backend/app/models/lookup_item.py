from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class LookupItem(Base):
    __tablename__ = "lookup_items"
    __table_args__ = (
        # keep items unique per category so admin edits don't create duplicates
        __import__("sqlalchemy").UniqueConstraint("category", "value", name="uq_lookup_category_value"),
    )

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    value = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
