from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.models.lookup_item import LookupItem
from app.schemas.lookups import (
    LookupItemCreate,
    LookupItemUpdate,
    LookupItemResponse,
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.lookup_service import VALID_CATEGORIES
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/lookups", tags=["Lookups"])


def _check_category(category: str):
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category '{category}'. Valid: {', '.join(sorted(VALID_CATEGORIES))}",
        )


@router.get("")
def get_public_lookups(db: Session = Depends(get_db)):
    """Public endpoint used by the apply form and filters — only active items."""
    result: dict = {}
    rows = (
        db.query(LookupItem)
        .filter(LookupItem.is_active == True)
        .order_by(LookupItem.category.asc(), LookupItem.sort_order.asc(), LookupItem.id.asc())
        .all()
    )
    for row in rows:
        result.setdefault(row.category, []).append(row.value)
    for cat in VALID_CATEGORIES:
        result.setdefault(cat, [])
    return result


@router.get("/{category}", response_model=list[LookupItemResponse])
def list_category_items(
    category: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    _check_category(category)
    return (
        db.query(LookupItem)
        .filter(LookupItem.category == category)
        .order_by(LookupItem.sort_order.asc(), LookupItem.id.asc())
        .all()
    )


@router.post("/{category}", response_model=LookupItemResponse, status_code=201)
def create_category_item(
    category: str,
    payload: LookupItemCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    _check_category(category)
    dup = db.query(LookupItem).filter(
        LookupItem.category == category, LookupItem.value == payload.value
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="This value already exists in the list")

    max_sort = (
        db.query(LookupItem.sort_order)
        .filter(LookupItem.category == category)
        .order_by(LookupItem.sort_order.desc())
        .first()
    )
    item = LookupItem(
        category=category,
        value=payload.value,
        is_active=payload.is_active,
        sort_order=payload.sort_order if payload.sort_order is not None else (max_sort[0] + 1 if max_sort else 0),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    write_audit_log(db, current_admin.email, "lookup_create", "lookup", item.id,
                    f"Added '{payload.value}' to {category}", actor_name=current_admin.full_name)
    db.commit()
    return item


@router.put("/{category}/{item_id}", response_model=LookupItemResponse)
def update_category_item(
    category: str,
    item_id: int,
    payload: LookupItemUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    _check_category(category)
    item = db.query(LookupItem).filter(LookupItem.id == item_id).first()
    if not item or item.category != category:
        raise HTTPException(status_code=404, detail="Item not found")

    if payload.value is not None and payload.value != item.value:
        dup = db.query(LookupItem).filter(
            LookupItem.category == category,
            LookupItem.value == payload.value,
            LookupItem.id != item_id,
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail="This value already exists in the list")
        item.value = payload.value
    if payload.is_active is not None:
        item.is_active = payload.is_active
    if payload.sort_order is not None:
        item.sort_order = payload.sort_order

    db.commit()
    db.refresh(item)
    write_audit_log(db, current_admin.email, "lookup_update", "lookup", item.id,
                    f"Updated '{item.value}' in {category}", actor_name=current_admin.full_name)
    db.commit()
    return item


@router.delete("/{category}/{item_id}", status_code=204)
def delete_category_item(
    category: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    _check_category(category)
    item = db.query(LookupItem).filter(LookupItem.id == item_id).first()
    if not item or item.category != category:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    write_audit_log(db, current_admin.email, "lookup_delete", "lookup", item.id,
                    f"Deleted '{item.value}' from {category}", actor_name=current_admin.full_name)
    db.commit()