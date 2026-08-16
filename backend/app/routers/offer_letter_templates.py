from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi import status as http_status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import copy
import json

from app.database import get_db
from app.models.admin import Admin
from app.models.offer_letter_template import OfferLetterTemplate
from app.schemas.offer_letter_template import (
    OfferLetterTemplateCreate,
    OfferLetterTemplateUpdate,
    OfferLetterTemplateResponse,
    OfferLetterTemplateList,
)
from app.utils.dependencies import get_current_admin
from app.utils.permissions import require_role
from app.services.offer_letter_template_service import (
    build_default_template,
    parse_template,
    ensure_default_template,
)
from app.services.pdf_service import generate_offer_letter_from_template

router = APIRouter(prefix="/offer-letter-templates", tags=["Offer Letter Templates"])


def _get_or_404(template_id: int, db: Session) -> OfferLetterTemplate:
    tpl = db.query(OfferLetterTemplate).filter(OfferLetterTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Template not found")
    return tpl


@router.get("", response_model=List[OfferLetterTemplateList])
def list_templates(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    ensure_default_template(db)
    return db.query(OfferLetterTemplate).order_by(OfferLetterTemplate.updated_at.desc()).all()


@router.post("", response_model=OfferLetterTemplateResponse, status_code=http_status.HTTP_201_CREATED)
def create_template(
    payload: OfferLetterTemplateCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    tpl = OfferLetterTemplate(
        name=payload.name,
        description=payload.description,
        structure=json.dumps(payload.structure),
        design=json.dumps(payload.design),
        created_by=current_admin.email,
        updated_by=current_admin.email,
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.get("/{template_id}", response_model=OfferLetterTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return _get_or_404(template_id, db)


@router.put("/{template_id}", response_model=OfferLetterTemplateResponse)
def update_template(
    template_id: int,
    payload: OfferLetterTemplateUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    tpl = _get_or_404(template_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        tpl.name = data["name"]
    if "description" in data:
        tpl.description = data["description"]
    if "structure" in data:
        tpl.structure = json.dumps(data["structure"])
    if "design" in data:
        tpl.design = json.dumps(data["design"])
    tpl.updated_by = current_admin.email
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    tpl = _get_or_404(template_id, db)
    if tpl.is_active:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the active template. Activate another template first.",
        )
    db.delete(tpl)
    db.commit()


@router.post("/{template_id}/duplicate", response_model=OfferLetterTemplateResponse)
def duplicate_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    src = _get_or_404(template_id, db)
    new = OfferLetterTemplate(
        name=f"{src.name} (Copy)",
        description=src.description,
        structure=src.structure,
        design=src.design,
        created_by=current_admin.email,
        updated_by=current_admin.email,
    )
    db.add(new)
    db.commit()
    db.refresh(new)
    return new


@router.post("/{template_id}/activate", response_model=OfferLetterTemplateResponse)
def activate_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    tpl = _get_or_404(template_id, db)
    db.query(OfferLetterTemplate).filter(
        OfferLetterTemplate.is_active == True  # noqa: E712
    ).update({OfferLetterTemplate.is_active: False})
    tpl.is_active = True
    tpl.updated_by = current_admin.email
    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/reset-default", response_model=OfferLetterTemplateResponse)
def reset_to_default(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_role("admin")),
):
    default = db.query(OfferLetterTemplate).filter(OfferLetterTemplate.is_default == True).first()  # noqa: E712
    if not default:
        raise HTTPException(status_code=404, detail="Default template not found")
    built = build_default_template(default.name)
    default.structure = json.dumps(built["structure"])
    default.design = json.dumps(built["design"])
    default.updated_by = current_admin.email
    db.commit()
    db.refresh(default)
    return default


@router.post("/{template_id}/preview")
def preview_template(
    template_id: int,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Render a PDF preview of a template using the latest selected candidate sample.

    Accepts an optional body with {structure, design} to preview unsaved edits.
    """
    tpl = _get_or_404(template_id, db)
    structure = json.loads(tpl.structure)
    design = json.loads(tpl.design)
    if payload:
        if isinstance(payload.get("structure"), dict):
            structure = payload["structure"]
        if isinstance(payload.get("design"), dict):
            design = payload["design"]
    pdf_bytes = generate_offer_letter_from_template(
        structure=structure,
        design=design,
        db=db,
        preview=True,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="template_preview.pdf"'},
    )
