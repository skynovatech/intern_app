from pydantic import BaseModel
from typing import Optional, List


class LookupItemCreate(BaseModel):
    category: str
    value: str
    is_active: bool = True
    sort_order: Optional[int] = None


class LookupItemUpdate(BaseModel):
    value: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class LookupItemResponse(BaseModel):
    id: int
    category: str
    value: str
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class LookupCategoryResponse(BaseModel):
    category: str
    items: List[LookupItemResponse]
