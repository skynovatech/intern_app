from sqlalchemy.orm import Session
from app.models.app_setting import AppSetting

DEFAULT_SETTINGS = [
    {"key": "company_name", "label": "Company Name", "type": "string", "group": "company", "is_public": True},
    {"key": "company_tagline", "label": "Company Tagline", "type": "string", "group": "company", "is_public": True},
    {"key": "company_phone", "label": "Company Phone", "type": "string", "group": "company", "is_public": False},
    {"key": "company_email", "label": "Company Email", "type": "string", "group": "company", "is_public": False},
    {"key": "company_website", "label": "Company Website", "type": "string", "group": "company", "is_public": False},
    {"key": "company_address", "label": "Company Address", "type": "textarea", "group": "company", "is_public": False},
    {"key": "authorized_signatory", "label": "Authorized Signatory Name", "type": "string", "group": "company", "is_public": False},
    {"key": "authorized_designation", "label": "Authorized Signatory Designation", "type": "string", "group": "company", "is_public": False},
    {"key": "authorized_signature", "label": "Authorized Signature (image path)", "type": "string", "group": "branding", "is_public": False},
    {"key": "company_seal", "label": "Company Seal (image path)", "type": "string", "group": "branding", "is_public": False},
    {"key": "admin_whatsapp_threshold", "label": "Bulk WhatsApp batch size", "type": "number", "group": "notifications", "is_public": False},
    {"key": "site_url", "label": "Site Base URL", "type": "string", "group": "company", "is_public": False},
    {"key": "brand_color", "label": "Brand Color", "type": "string", "group": "branding", "is_public": True},
    {"key": "brand_primary_color", "label": "Document Primary Color", "type": "string", "group": "branding", "is_public": True},
    {"key": "brand_accent_color", "label": "Document Accent Color", "type": "string", "group": "branding", "is_public": True},
    {"key": "company_logo_path", "label": "Company Logo Path", "type": "string", "group": "branding", "is_public": True},
]

STARTUP_VALUES = {
    "company_name": "Skynova Tech Solutions",
    "company_tagline": "A Global Entity of Skynova Tech Solutions",
    "company_website": "https://www.skynovatech.in",
    "company_address": "Trichy, Tamil Nadu, India",
    "authorized_signatory": "",
    "authorized_designation": "HR Manager",
    "site_url": "http://localhost:3000",
    "brand_color": "#6366f1",
    "brand_primary_color": "#2875E8",
    "brand_accent_color": "#D4AF37",
}


def seed_settings(db: Session):
    existing = {s.key for s in db.query(AppSetting).all()}
    for default in DEFAULT_SETTINGS:
        if default["key"] not in existing:
            db.add(AppSetting(
                key=default["key"],
                label=default["label"],
                value=STARTUP_VALUES.get(default["key"], ""),
                type=default["type"],
                group=default["group"],
                is_public=default["is_public"],
            ))
    db.commit()


def get_setting_value(db: Session, key: str, default: str = "") -> str:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row and row.value is not None:
        return row.value
    return default


def get_settings_map(db: Session | None, keys) -> dict:
    """Return {key: value} for the requested setting keys. Missing keys default to ""."""
    if db is None:
        return {}
    rows = db.query(AppSetting).filter(AppSetting.key.in_(list(keys))).all()
    return {r.key: (r.value or "") for r in rows}


def get_public_settings(db: Session) -> dict:
    rows = db.query(AppSetting).filter(AppSetting.is_public == True).all()
    return {r.key: r.value or "" for r in rows}