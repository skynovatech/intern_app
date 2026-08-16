import json
from sqlalchemy.orm import Session
from app.models.offer_letter_template import OfferLetterTemplate

TEMPLATE_KEY = "internship_offer_letter"

DEFAULT_DESIGN = {
    "page": {"margin_top": 12.0, "margin_side": 18.0, "margin_bottom": 24.0},
    "colors": {
        "primary": "#2875E8",
        "dark_text": "#0B0D12",
        "body_text": "#5F6673",
        "border": "#E5E9F0",
        "background": "#FFFFFF",
        "accent": "#D4AF37",
    },
    "fonts": {
        "family": "inter",
        "body": 10.5,
        "title": 21.0,
        "subtitle": 9.5,
        "table_label": 9.5,
        "table_value": 10.5,
        "heading": 14.5,
        "signature": 10.0,
        "footer": 8.0,
    },
    "spacing": {
        "section_gap": 4.0,
        "table_row": 7.5,
        "line_height": 5.0,
    },
}

DEFAULT_STRUCTURE = {
    "title": {
        "text1": "INTERNSHIP",
        "text2": "OFFER LETTER",
        "size": 20.0,
        "align": "center",
        "show_underline": True,
        "letter_spacing": 1.6,
        "underline_color": "primary",
        "text1_color": "dark",
        "text2_color": "primary",
    },
    "sections": [
        {
            "id": "header",
            "type": "header",
            "label": "Header",
            "visible": True,
            "props": {
                "show_logo": True,
                "show_company_name": True,
                "show_tagline": True,
                "show_date": True,
                "logo_width": 12.0,
                "company_size": 15.0,
                "tagline_size": 8.0,
            },
        },
        {
            "id": "title",
            "type": "title",
            "label": "Document Title",
            "visible": True,
        },
        {
            "id": "candidate",
            "type": "candidate",
            "label": "Candidate Information",
            "visible": True,
            "props": {
                "greeting": "Dear {name},",
                "show_qualification": True,
                "show_college": True,
                "show_enrollment": True,
                "name_size": 12.5,
                "greeting_size": 12.5,
                "detail_size": 9.5,
            },
        },
        {
            "id": "congratulations",
            "type": "heading_paragraph",
            "label": "Congratulations",
            "visible": True,
            "props": {
                "heading": "Congratulations!",
                "heading_size": 14.5,
                "heading_color": "primary",
                "heading_align": "left",
                "line_height": 5.2,
                "letter_spacing": 0.0,
                "text_indent": 0.0,
                "space_before": 0.0,
                "space_after": 0.0,
                "text": (
                    "We are pleased to offer you an opportunity to undergo On-The-Job Training (OJT) "
                    "and Internship with {company_name}.\n\n"
                    "This program is designed to provide you with practical exposure and hands-on "
                    "experience, enhancing your skills and preparing you for future career opportunities."
                ),
                "align": "justify",
                "text_size": 10.5,
                "bold": False,
                "italic": False,
                "color": "body",
                "line_height": 5.2,
                "letter_spacing": 0.0,
                "text_indent": 0.0,
                "space_before": 0.0,
                "space_after": 0.0,
            },
        },
        {
            "id": "details",
            "type": "table",
            "label": "Internship Details",
            "visible": True,
            "props": {
                "heading": "INTERNSHIP DETAILS",
                "heading_size": 9.5,
                "heading_color": "primary",
                "heading_align": "left",
                "label_width": 60.0,
                "zebra": False,
                "rows": [
                    {"label": "Enrollment", "value": "Academic Internship", "visible": True},
                    {"label": "Internship Enrollment ID", "field": "enrollment_id", "visible": True},
                    {"label": "Technology", "field": "technology", "visible": True},
                    {"label": "Domain", "field": "domain_label", "visible": True},
                    {"label": "Organization", "field": "organization", "visible": True},
                    {"label": "Start Date", "field": "start_date", "visible": True},
                    {"label": "End Date", "field": "end_date", "visible": True},
                    {"label": "Stipend", "field": "stipend", "visible": True},
                ],
                "two_column": True,
            },
        },
        {
            "id": "closing",
            "type": "paragraph",
            "label": "Closing Paragraph",
            "visible": True,
            "props": {
                "text": (
                    "We believe this opportunity will contribute to your professional development, "
                    "and we look forward to your active participation.\n\n"
                    "Kindly sign a copy of this letter as confirmation of your acceptance.\n\n"
                    "Should you have any questions, feel free to contact us."
                ),
                "align": "justify",
                "text_size": 10.5,
                "bold": False,
                "italic": False,
                "color": "body",
            },
        },
        {
            "id": "signatures",
            "type": "signature",
            "label": "Signature Section",
            "visible": True,
            "props": {
                "show_authorized": True,
                "show_seal": True,
                "show_candidate": True,
                "authorized_label": "AUTHORIZED SIGNATORY",
                "candidate_label": "CANDIDATE SIGNATURE",
                "signature_height": 11.0,
            },
        },
        {
            "id": "footer",
            "type": "footer",
            "label": "Footer",
            "visible": True,
            "props": {
                "show_email": True,
                "show_website": True,
                "show_address": True,
                "show_phone": True,
            },
        },
    ],
}


def build_default_template(name: str = "Default Offer Letter") -> dict:
    return {
        "name": name,
        "structure": DEFAULT_STRUCTURE,
        "design": DEFAULT_DESIGN,
    }


def get_active_template(db: Session) -> OfferLetterTemplate | None:
    return (
        db.query(OfferLetterTemplate)
        .filter(OfferLetterTemplate.is_active == True)  # noqa: E712
        .order_by(OfferLetterTemplate.updated_at.desc())
        .first()
    )


def ensure_default_template(db: Session) -> None:
    count = db.query(OfferLetterTemplate).count()
    if count > 0:
        return
    tpl = build_default_template()
    db.add(OfferLetterTemplate(
        name=tpl["name"],
        description="The built-in internship offer letter template.",
        structure=json.dumps(tpl["structure"]),
        design=json.dumps(tpl["design"]),
        is_active=True,
        is_default=True,
    ))
    db.commit()


def parse_template(template: OfferLetterTemplate) -> dict:
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "structure": json.loads(template.structure or "{}"),
        "design": json.loads(template.design or "{}"),
        "is_active": template.is_active,
        "is_default": template.is_default,
        "updated_at": template.updated_at.isoformat() if template.updated_at else None,
    }
