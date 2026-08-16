from pydantic import BaseModel
from typing import Optional, List


class OfferLetterBulkRequest(BaseModel):
    application_ids: List[int]
    action: str = "send"  # "draft" | "send"


class OfferBulkResultItem(BaseModel):
    application_id: int
    full_name: str
    offer_id: Optional[int] = None
    job_id: Optional[int] = None


class OfferBulkResult(BaseModel):
    action: str
    created: List[OfferBulkResultItem] = []
    queued: List[OfferBulkResultItem] = []
    skipped: List[OfferBulkResultItem] = []