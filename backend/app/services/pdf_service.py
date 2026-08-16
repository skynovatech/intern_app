import io
import os
import re
import json
from datetime import datetime
from fpdf import FPDF
from app.config import get_settings
from app.services.settings_service import get_settings_map

settings = get_settings()

# ── Skynova brand palette ─────────────────────────────────────────────
PRIMARY = (40, 117, 232)      # #2875E8
DARK = (11, 13, 18)           # #0B0D12 (dark navy / black)
BODY = (58, 66, 80)           # #3A4250 readable body text
SECONDARY = (95, 102, 115)    # #5F6673
BORDER = (229, 233, 240)      # #E5E9F0
BG = (247, 249, 252)          # #F7F9FC
WHITE = (255, 255, 255)
GOLD = (212, 175, 55)         # #D4AF37 (subtle accent only)
LIGHT_BLUE = (235, 242, 251)  # decorative shapes
CIRCUIT = (224, 233, 246)     # circuit line colour
MUTED_ICON = (168, 174, 186)

# Aliases used by the application-form PDF generator
GRAY = (100, 106, 115)        # #646A73 muted grey text
BLUE = PRIMARY                # brand blue
LIGHT = (244, 246, 250)       # #F4F6FA light row fill

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
FONT_DIR = os.path.join(BACKEND_DIR, "fonts")
DEFAULT_LOGO = os.path.join(BACKEND_DIR, "logo.png")

SETTING_KEYS = [
    "company_name", "company_tagline", "company_phone", "company_email", "company_website",
    "company_address", "company_logo_path", "authorized_signatory", "authorized_designation",
    "authorized_signature", "company_seal", "brand_primary_color", "brand_accent_color",
]


def _hex_to_rgb(value):
    h = str(value or "").strip().lstrip("#")
    if len(h) == 6 and all(c in "0123456789abcdefABCDEF" for c in h):
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    return PRIMARY


def _resolve_asset(path, default=None):
    if not path:
        return default
    p = str(path).strip()
    if not p:
        return default
    candidates = []
    if os.path.isabs(p) or re.match(r"^[A-Za-z]:[\\/]", p):
        candidates.append(p)
    else:
        candidates.append(os.path.join(BACKEND_DIR, p))
        candidates.append(os.path.join(BACKEND_DIR, settings.UPLOAD_DIR, p))
        candidates.append(os.path.join(settings.UPLOAD_DIR, p))
    for c in candidates:
        if os.path.exists(c):
            return c
    return default


def _company_settings(db):
    s = get_settings_map(db, SETTING_KEYS)
    env = get_settings()

    def env_or(key, attr, default=""):
        return s.get(key) or getattr(env, attr, "") or default

    return {
        "name": env_or("company_name", "COMPANY_NAME", "Skynova Tech Solutions"),
        "tagline": env_or("company_tagline", "COMPANY_TAGLINE", ""),
        "phone": env_or("company_phone", "COMPANY_PHONE", ""),
        "email": env_or("company_email", "COMPANY_EMAIL", "") or getattr(env, "SMTP_FROM_EMAIL", ""),
        "website": s.get("company_website") or "",
        "address": env_or("company_address", "COMPANY_ADDRESS", ""),
        "logo_path": _resolve_asset(s.get("company_logo_path"), DEFAULT_LOGO),
        "signatory": s.get("authorized_signatory") or "",
        "designation": s.get("authorized_designation") or "",
        "signature": _resolve_asset(s.get("authorized_signature")),
        "seal": _resolve_asset(s.get("company_seal")),
        "primary": _hex_to_rgb(s.get("brand_primary_color") or "#2875E8"),
        "accent": _hex_to_rgb(s.get("brand_accent_color") or "#D4AF37"),
    }


# ── Data validation / formatting ──────────────────────────────────────

_VOWELS = set("aeiou")


def _clean_text(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def _is_junk(value):
    t = _clean_text(value)
    if not t:
        return True
    low = t.lower()
    if re.fullmatch(r"[-_.\s]+", t):
        return True
    if re.fullmatch(r"x{2,}", low):
        return True
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", t)
    if m and not (1950 <= int(m.group(1)) <= 2100):
        return True
    if re.fullmatch(r"[a-z]{4,10}", low) and not any(ch in low for ch in _VOWELS):
        return True
    return False


def _display(value, default="Not Specified"):
    t = _clean_text(value)
    if _is_junk(t):
        return default
    return t


_DATE_FORMATS = [
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
    "%d-%b-%Y", "%d %b %Y", "%b %d, %Y", "%B %d, %Y",
]


def _fmt_date(value):
    if value is None or value == "":
        return None
    if hasattr(value, "strftime"):
        try:
            return value.strftime("%d-%b-%Y")
        except Exception:
            return None
    t = _clean_text(value)
    if re.match(r"^\d{4}-\d{2}-\d{2}T", t):
        t = t[:10]
    for fmt in _DATE_FORMATS:
        try:
            d = datetime.strptime(t, fmt)
            if 1950 <= d.year <= 2100:
                return d.strftime("%d-%b-%Y")
        except ValueError:
            continue
    return None


# ── Font helpers ──────────────────────────────────────────────────────

FONT_FAMILIES = {
    "inter": {
        "label": "Inter",
        "family": "Inter",
        "medium": "InterMedium",
        "semi": "InterSemi",
        "light": "InterLight",
        "files": {
            "": "Inter-Regular.ttf",
            "B": "Inter-Bold.ttf",
            "I": "Inter-Italic.ttf",
            "M": "Inter-Medium.ttf",
            "S": "Inter-SemiBold.ttf",
            "L": "Inter-Light.ttf",
        },
    },
    "poppins": {
        "label": "Poppins",
        "family": "Poppins",
        "medium": "PoppinsMedium",
        "semi": "PoppinsSemi",
        "light": "PoppinsLight",
        "files": {
            "": "Poppins-Regular.ttf",
            "B": "Poppins-Bold.ttf",
            "I": "Poppins-Italic.ttf",
            "M": "Poppins-Medium.ttf",
            "S": "Poppins-SemiBold.ttf",
            "L": "Poppins-Light.ttf",
        },
    },
    "lato": {
        "label": "Lato",
        "family": "Lato",
        "medium": "Lato",
        "semi": "Lato",
        "light": "LatoLight",
        "files": {
            "": "Lato-Regular.ttf",
            "B": "Lato-Bold.ttf",
            "I": "Lato-Italic.ttf",
            "M": None,
            "S": None,
            "L": "Lato-Light.ttf",
        },
    },
}

FONT_OPTIONS = [{"value": key, "label": fam["label"]} for key, fam in FONT_FAMILIES.items()]


def _ensure_fonts(pdf):
    if getattr(pdf, "_fonts_loaded", False):
        return
    for fam in FONT_FAMILIES.values():
        base = fam["family"]
        files = fam["files"]
        for style, fname in (("", files.get("")), ("B", files.get("B")), ("I", files.get("I"))):
            if not fname:
                continue
            path = os.path.join(FONT_DIR, fname)
            if os.path.exists(path):
                try:
                    pdf.add_font(base, style, path)
                except Exception:
                    pass
        for suffix, fname in (("Medium", files.get("M")), ("Semi", files.get("S")), ("Light", files.get("L"))):
            if not fname:
                continue
            path = os.path.join(FONT_DIR, fname)
            if os.path.exists(path):
                try:
                    pdf.add_font(base + suffix, "", path)
                except Exception:
                    pass
    pdf._fonts_loaded = True


def _resolve_font(key):
    return FONT_FAMILIES.get(str(key or "").strip().lower()) or FONT_FAMILIES["inter"]


def _set_font(pdf, family, style, size):
    try:
        pdf.set_font(family, style, size)
        return
    except Exception:
        pass
    base = family.replace("Medium", "").replace("Semi", "").replace("Light", "")
    try:
        pdf.set_font(base, style, size)
        return
    except Exception:
        pass
    try:
        pdf.set_font("Inter", style, size)
        return
    except Exception:
        pdf.set_font("Helvetica", "B" if "B" in style else "", size)


# ── Image sizing ──────────────────────────────────────────────────────

def _fit_size(w, h, max_w, max_h):
    """Scale pixel dims (w, h) to fit within max_w x max_h (mm), preserving ratio."""
    if w <= 0 or h <= 0:
        return min(max_w, max_h), min(max_w, max_h)
    ratio = w / h
    if ratio >= 1:
        ww = max_h * ratio
        if ww > max_w:
            return max_w, max_w / ratio
        return ww, max_h
    hh = max_h
    ww = max_h * ratio
    if ww > max_w:
        hh = max_w / ratio
        ww = max_w
    return ww, hh


def _img_size(path, max_w, max_h):
    try:
        from PIL import Image
        with Image.open(path) as im:
            w, h = im.size
    except Exception:
        w, h = 125, 125
    return _fit_size(w, h, max_w, max_h)


def _crop_transparent_signature(path, max_w, max_h):
    """Crop the visible (non-transparent) content of a signature image and fit it
    into max_w x max_h mm. Returns (pil_image, mm_w, mm_h) or (None, None, None).

    Handles transparent padding around the pen strokes so the rendered signature
    is comparable in size to a reference signature drawn into the same box.
    """
    try:
        from PIL import Image
        with Image.open(path) as im:
            im.load()
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                im = im.convert("RGBA")
                alpha = im.getchannel("A")
                bbox = alpha.getbbox()
                if bbox is None:
                    return None, None, None
                if bbox != (0, 0, im.width, im.height):
                    im = im.crop(bbox)
            w, h = im.size
            if w <= 0 or h <= 0:
                return None, None, None
            mw, mh = _fit_size(w, h, max_w, max_h)
            return im, mw, mh
    except Exception:
        return None, None, None


# ── Line-style icons (drawn with fpdf primitives) ─────────────────────

def _icon_id(pdf, x, y, s):
    pdf.rect(x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, style="D", round_corners=True, corner_radius=s * 0.18)
    pdf.ellipse(x + s * 0.2, y + s * 0.24, s * 0.28, s * 0.28, style="F")
    pdf.line(x + s * 0.2, y + s * 0.64, x + s * 0.8, y + s * 0.64)
    pdf.line(x + s * 0.2, y + s * 0.78, x + s * 0.6, y + s * 0.78)


def _icon_code(pdf, x, y, s):
    pdf.line(x + s * 0.12, y + s * 0.26, x + s * 0.38, y + s * 0.5)
    pdf.line(x + s * 0.12, y + s * 0.74, x + s * 0.38, y + s * 0.5)
    pdf.line(x + s * 0.62, y + s * 0.26, x + s * 0.88, y + s * 0.5)
    pdf.line(x + s * 0.62, y + s * 0.74, x + s * 0.88, y + s * 0.5)
    pdf.line(x + s * 0.6, y + s * 0.2, x + s * 0.4, y + s * 0.8)


def _icon_cap(pdf, x, y, s):
    pdf.line(x + s * 0.08, y + s * 0.74, x + s * 0.92, y + s * 0.74)
    pdf.line(x + s * 0.16, y + s * 0.74, x + s * 0.5, y + s * 0.24)
    pdf.line(x + s * 0.84, y + s * 0.74, x + s * 0.5, y + s * 0.24)
    pdf.line(x + s * 0.5, y + s * 0.24, x + s * 0.5, y + s * 0.52)
    pdf.ellipse(x + s * 0.44, y + s * 0.5, s * 0.12, s * 0.12, style="F")


def _icon_building(pdf, x, y, s):
    pdf.rect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8, style="D")
    pdf.line(x + s * 0.5, y + s * 0.1, x + s * 0.5, y + s * 0.42)
    pdf.line(x + s * 0.1, y + s * 0.42, x + s * 0.9, y + s * 0.42)
    pdf.rect(x + s * 0.2, y + s * 0.18, s * 0.18, s * 0.16, style="D")
    pdf.rect(x + s * 0.62, y + s * 0.18, s * 0.18, s * 0.16, style="D")
    pdf.rect(x + s * 0.4, y + s * 0.7, s * 0.2, s * 0.2, style="D")


def _icon_location(pdf, x, y, s):
    pdf.ellipse(x + s * 0.24, y + s * 0.08, s * 0.52, s * 0.52, style="D")
    pdf.line(x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.94)
    pdf.line(x + s * 0.5, y + s * 0.94, x + s * 0.26, y + s * 0.78)
    pdf.line(x + s * 0.5, y + s * 0.94, x + s * 0.74, y + s * 0.78)


def _icon_calendar(pdf, x, y, s):
    pdf.rect(x + s * 0.06, y + s * 0.24, s * 0.88, s * 0.68, style="D", round_corners=True, corner_radius=s * 0.1)
    pdf.line(x + s * 0.06, y + s * 0.44, x + s * 0.94, y + s * 0.44)
    pdf.line(x + s * 0.22, y + s * 0.08, x + s * 0.22, y + s * 0.28)
    pdf.line(x + s * 0.78, y + s * 0.08, x + s * 0.78, y + s * 0.28)


def _icon_clock(pdf, x, y, s):
    pdf.ellipse(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, style="D")
    pdf.line(x + s * 0.5, y + s * 0.5, x + s * 0.5, y + s * 0.24)
    pdf.line(x + s * 0.5, y + s * 0.5, x + s * 0.72, y + s * 0.5)


def _icon_currency(pdf, x, y, s):
    pdf.ellipse(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, style="D")
    pdf.ellipse(x + s * 0.26, y + s * 0.26, s * 0.48, s * 0.48, style="D")
    pdf.line(x + s * 0.5, y + s * 0.18, x + s * 0.5, y + s * 0.82)
    pdf.line(x + s * 0.3, y + s * 0.42, x + s * 0.7, y + s * 0.42)
    pdf.line(x + s * 0.3, y + s * 0.56, x + s * 0.62, y + s * 0.56)


def _icon_mail(pdf, x, y, s):
    pdf.rect(x + s * 0.06, y + s * 0.24, s * 0.88, s * 0.54, style="D", round_corners=True, corner_radius=s * 0.08)
    pdf.line(x + s * 0.12, y + s * 0.3, x + s * 0.5, y + s * 0.6)
    pdf.line(x + s * 0.88, y + s * 0.3, x + s * 0.5, y + s * 0.6)


def _icon_phone(pdf, x, y, s):
    with pdf.rotation(45, x + s * 0.5, y + s * 0.5):
        pdf.rect(x + s * 0.16, y + s * 0.28, s * 0.68, s * 0.44, style="D", round_corners=True, corner_radius=s * 0.16)


def _icon_link(pdf, x, y, s):
    pdf.ellipse(x + s * 0.06, y + s * 0.44, s * 0.42, s * 0.42, style="D")
    pdf.ellipse(x + s * 0.52, y + s * 0.14, s * 0.42, s * 0.42, style="D")
    pdf.line(x + s * 0.3, y + s * 0.7, x + s * 0.62, y + s * 0.38)
    pdf.line(x + s * 0.24, y + s * 0.76, x + s * 0.56, y + s * 0.44)


def _icon_user(pdf, x, y, s):
    pdf.ellipse(x + s * 0.32, y + s * 0.1, s * 0.36, s * 0.36, style="D")
    pdf.line(x + s * 0.2, y + s * 0.74, x + s * 0.2, y + s * 0.6)
    pdf.arc(x + s * 0.2, y + s * 0.6, s * 0.3, start_angle=180, end_angle=360)
    pdf.line(x + s * 0.8, y + s * 0.6, x + s * 0.8, y + s * 0.74)


def _icon_grid(pdf, x, y, s):
    pdf.rect(x + s * 0.1, y + s * 0.1, s * 0.36, s * 0.36, style="D")
    pdf.rect(x + s * 0.54, y + s * 0.1, s * 0.36, s * 0.36, style="D")
    pdf.rect(x + s * 0.1, y + s * 0.54, s * 0.36, s * 0.36, style="D")
    pdf.rect(x + s * 0.54, y + s * 0.54, s * 0.36, s * 0.36, style="D")


_ICONS = {
    "id": _icon_id,
    "code": _icon_code,
    "cap": _icon_cap,
    "building": _icon_building,
    "location": _icon_location,
    "calendar": _icon_calendar,
    "clock": _icon_clock,
    "currency": _icon_currency,
    "mail": _icon_mail,
    "phone": _icon_phone,
    "link": _icon_link,
    "user": _icon_user,
    "grid": _icon_grid,
}


def _draw_icon(pdf, x, y, kind, s, color):
    pdf.set_draw_color(*color)
    pdf.set_fill_color(*color)
    pdf.set_line_width(0.3)
    _ICONS.get(kind, _icon_grid)(pdf, x, y, s)


# ── Public document generator ─────────────────────────────────────────

def generate_application_pdf(app) -> bytes:
    pdf = FPDF()
    pdf.add_page()

    lm, rm = 15, 15
    pw = 210
    cw = pw - lm - rm
    pdf.set_left_margin(lm)
    pdf.set_right_margin(rm)

    logo_path = DEFAULT_LOGO
    app_id = str(app.id).zfill(4)
    top = 10

    if os.path.exists(logo_path):
        pdf.image(logo_path, x=lm, y=top, w=13)

    photo_w = 0
    if app.photo_path:
        photo_full = os.path.join(settings.UPLOAD_DIR, app.photo_path)
        if os.path.exists(photo_full):
            try:
                photo_w = 18
                pdf.image(photo_full, x=pw - rm - photo_w, y=top, w=photo_w)
            except Exception:
                photo_w = 0

    right_col_w = cw - 16 - photo_w

    pdf.set_xy(lm + 16, top + 0.5)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*DARK)
    pdf.cell(right_col_w, 5.5, "Skynova Tech Solutions", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(lm + 16)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(right_col_w, 4, "Internship Application Form", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(lm + 16, top)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*BLUE)
    pdf.cell(right_col_w, 5.5, f"#{app_id}", align="R", new_x="LMARGIN", new_y="NEXT")

    ref = f"STS/{app_id}/{datetime.now().strftime('%Y')}"
    pdf.set_xy(lm + 16, top + 10)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*GRAY)
    pdf.cell(right_col_w, 3.5, f"App No: {app_id}  |  {ref}", align="R", new_x="LMARGIN", new_y="NEXT")

    line_y = max(pdf.get_y(), top + 20) + 2
    pdf.set_y(line_y)
    pdf.set_draw_color(*BLUE)
    pdf.set_line_width(0.6)
    pdf.line(lm, pdf.get_y(), pw - rm, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 6, "APPLICANT DETAILS", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    def field_row(label, value, col2_label=None, col2_value=None):
        pdf.set_fill_color(*LIGHT)
        y_before = pdf.get_y()
        if col2_label:
            w1 = cw * 0.48
            w2 = cw * 0.48
            pdf.rect(lm, y_before, cw, 7, "F")
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*GRAY)
            pdf.cell(32, 7, f" {label}", align="L")
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*DARK)
            pdf.cell(w1 - 32, 7, str(value) if value is not None else "-")
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*GRAY)
            pdf.cell(28, 7, f" {col2_label}", align="L")
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*DARK)
            pdf.cell(w2 - 28, 7, str(col2_value) if col2_value is not None else "-", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.rect(lm, y_before, cw, 7, "F")
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*GRAY)
            pdf.cell(32, 7, f" {label}", align="L")
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*DARK)
            pdf.cell(cw - 32, 7, str(value) if value is not None else "-", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*BORDER)
        pdf.line(lm, pdf.get_y(), pw - rm, pdf.get_y())

    def section(title):
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*BLUE)
        pdf.cell(0, 7, title.upper(), new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*BLUE)
        pdf.set_line_width(0.4)
        pdf.line(lm, pdf.get_y(), pw - rm, pdf.get_y())
        pdf.ln(2)

    def full_row(label, value):
        pdf.set_fill_color(*LIGHT)
        y_before = pdf.get_y()
        pdf.rect(lm, y_before, cw, 7, "F")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*GRAY)
        pdf.cell(32, 7, f" {label}", align="L")
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(*DARK)
        val = str(value) if value is not None else "-"
        pdf.multi_cell(cw - 32, 7, val, new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(*BORDER)
        pdf.line(lm, pdf.get_y(), pw - rm, pdf.get_y())

    field_row("Full Name", app.full_name, "Email", app.email)
    field_row("Mobile", app.mobile, "WhatsApp", app.whatsapp or app.mobile)
    field_row("Date of Birth", app.dob, "Gender", app.gender)
    full_row("Address", app.address)

    section("Education")
    field_row("College", app.college, "Degree", app.degree)
    field_row("Department", app.department, "Current Year", app.current_year)
    field_row("CGPA", app.cgpa, "", "")

    section("Internship Details")
    field_row("Domain", app.domain, "Duration", app.duration)
    full_row("Preferred Joining", app.preferred_joining_date)

    section("Skills & Projects")
    skills = ", ".join(app.technical_skills) if app.technical_skills else "-"
    full_row("Technical Skills", skills)
    if app.projects:
        lines = app.projects.split("\n") if "\n" in app.projects else [app.projects]
        for line in lines[:3]:
            full_row("", line.strip())

    section("Links")
    field_row("GitHub", app.github, "LinkedIn", app.linkedin)
    full_row("Portfolio", app.portfolio)

    section("Status")
    field_row("Current Status", app.status, "Rating", f"{app.rating}/5" if app.rating else "-")

    if app.notes:
        section("Notes")
        full_row("", app.notes)

    pdf.ln(5)
    pdf.set_draw_color(*BORDER)
    pdf.set_line_width(0.4)
    pdf.line(lm, pdf.get_y(), pw - rm, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(cw / 2, 4, f"Application No: STS/{app_id}/{datetime.now().strftime('%Y')}", align="L")
    now = datetime.now().strftime("%d %b %Y at %I:%M %p")
    pdf.cell(cw / 2, 4, f"Generated: {now}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(180, 185, 195)
    pdf.cell(0, 3.5, "Skynova Tech Solutions  |  This is a computer-generated document", align="C")

    return bytes(pdf.output())


# ── Offer letter (template-driven corporate) ─────────────────────────

def generate_offer_letter(app, body=None, db=None) -> bytes:
    return generate_offer_letter_from_offer(app, body=body, db=db)


def _field_value(f: dict, source) -> str:
    key = str(source or "").strip()
    if not key:
        return ""
    mapping = {
        "name": "full_name", "candidate_name": "full_name", "full_name": "full_name",
        "applicant_name": "full_name", "employee_id": "enrollment_id",
        "company": "company", "company_name": "company",
        "tagline": "tagline", "company_tagline": "tagline",
        "qualification": "qualification", "college": "college",
        "enrollment_id": "enrollment_id", "technology": "technology",
        "domain": "domain_label", "domain_label": "domain_label",
        "organization": "org", "org": "org", "location": "location",
        "start_date": "start_date", "end_date": "end_date", "duration": "duration",
        "stipend": "stipend", "reporting_sme": "reporting_sme",
        "shift_time": "shift_time", "shift_days": "shift_days",
        "sme_email": "sme_email", "sme_mobile": "sme_mobile",
        "authorized_signatory": "signatory", "signatory": "signatory",
        "designation": "designation", "date": "date", "letter_date": "date",
        "company_email": "footer_email", "company_website": "footer_website",
        "company_address": "footer_location", "company_phone": "footer_phone",
    }
    k = mapping.get(key, key)
    return _display(f.get(k), "Not Specified")


def _sub_vars(text, f: dict) -> str:
    if not text:
        return text
    def repl(m):
        return _field_value(f, m.group(1))
    return re.sub(r"\{\{?\s*([a-z_0-9]+)\s*\}?\}", repl, text)


def generate_offer_letter_from_offer(offer, body=None, db=None) -> bytes:
    """Render a branded A4 offer letter from an offer model OR an Application.

    Reads the active OfferLetterTemplate (structure + design) and the company
    branding settings from the AppSetting table when a db session is supplied.
    """
    cs = _company_settings(db)

    def get(name, default=""):
        return getattr(offer, name, None) or default

    start_date = _fmt_date(get("start_date") or get("preferred_joining_date"))
    end_date = _fmt_date(get("end_date"))
    letter_date = _fmt_date(get("letter_date")) or datetime.now().strftime("%d-%b-%Y")

    full_name = _display(get("full_name"))
    qualification = _display(get("degree") or get("domain_label") or get("department"))
    college = _display(get("college"))

    fields = {
        "company": cs["name"],
        "tagline": cs["tagline"],
        "date": letter_date,
        "full_name": full_name,
        "qualification": qualification,
        "college": college,
        "enrollment_id": _display(get("enrollment_id") or get("employee_id")),
        "technology": _display(get("technology") or get("domain")),
        "domain_label": _display(get("domain_label") or get("department")),
        "org": _display(get("organization") or cs["name"]),
        "location": _display(get("location")),
        "start_date": start_date or "Not Specified",
        "end_date": end_date or "Not Specified",
        "duration": _display(get("duration")),
        "stipend": _display(get("stipend"), "Not Applicable"),
        "reporting_sme": _display(get("reporting_sme")),
        "shift_time": _display(get("shift_time")),
        "shift_days": _display(get("shift_days")),
        "sme_email": _display(get("sme_email") or get("email")),
        "sme_mobile": _display(get("sme_mobile")),
        "body": body if body is not None else get("body"),
        "signatory": _display(cs["signatory"], cs["name"]) if cs["signatory"] else cs["name"],
        "designation": cs["designation"],
        "signature_path": cs["signature"],
        "candidate_signature_path": get("candidate_signature") or "",
        "seal_path": cs["seal"],
        "logo_path": cs["logo_path"],
        "primary": cs["primary"],
        "accent": cs["accent"],
        "footer_email": cs["email"],
        "footer_website": cs["website"],
        "footer_location": cs["address"],
        "footer_phone": cs["phone"],
    }

    structure, design = None, None
    if db is not None:
        from app.services.offer_letter_template_service import get_active_template
        tpl = get_active_template(db)
        if tpl:
            try:
                structure = json.loads(tpl.structure)
                design = json.loads(tpl.design)
            except Exception:
                structure, design = None, None
    return _render_offer_letter_pdf(fields, structure, design)


def generate_offer_letter_from_template(structure: dict, design: dict, db=None, preview: bool = False) -> bytes:
    """Render a preview PDF for a template using a sample candidate + company settings."""
    cs = _company_settings(db)

    sample = {
        "full_name": "Nawfal Aadil S",
        "degree": "B.E CSE",
        "college": "CARE College of Engineering, Trichy",
        "enrollment_id": "SA001",
        "technology": "Web Development",
        "domain_label": "CSE",
        "start_date": "2026-08-15",
        "end_date": "2026-11-15",
        "stipend": "Not Applicable",
    }
    if preview and db is not None:
        try:
            from app.models.application import Application
            app = (
                db.query(Application)
                .filter(Application.status == "Selected")
                .order_by(Application.updated_at.desc())
                .first()
            )
            if app:
                def g(name, default=""):
                    return getattr(app, name, None) or default
                sample = {
                    "full_name": _display(g("full_name")),
                    "degree": _display(g("degree") or g("domain_label") or g("department")),
                    "college": _display(g("college")),
                    "enrollment_id": _display(g("enrollment_id") or g("employee_id")),
                    "technology": _display(g("technology") or g("domain")),
                    "domain_label": _display(g("domain_label") or g("department")),
                    "start_date": _fmt_date(g("start_date") or g("preferred_joining_date")) or "Not Specified",
                    "end_date": _fmt_date(g("end_date")) or "Not Specified",
                    "stipend": _display(g("stipend"), "Not Applicable"),
                }
        except Exception:
            pass

    fields = {
        "company": cs["name"],
        "tagline": cs["tagline"],
        "date": datetime.now().strftime("%d-%b-%Y"),
        "full_name": sample["full_name"],
        "qualification": sample["degree"],
        "college": sample["college"],
        "enrollment_id": sample["enrollment_id"],
        "technology": sample["technology"],
        "domain_label": sample["domain_label"],
        "org": cs["name"],
        "location": "",
        "start_date": sample["start_date"],
        "end_date": sample["end_date"],
        "duration": "",
        "stipend": sample["stipend"],
        "reporting_sme": "",
        "shift_time": "",
        "shift_days": "",
        "sme_email": "",
        "sme_mobile": "",
        "body": None,
        "signatory": _display(cs["signatory"], cs["name"]) if cs["signatory"] else cs["name"],
        "designation": cs["designation"],
        "signature_path": cs["signature"],
        "candidate_signature_path": "",
        "seal_path": cs["seal"],
        "logo_path": cs["logo_path"],
        "primary": cs["primary"],
        "accent": cs["accent"],
        "footer_email": cs["email"],
        "footer_website": cs["website"],
        "footer_location": cs["address"],
        "footer_phone": cs["phone"],
    }
    return _render_offer_letter_pdf(fields, structure, design)


# ── Renderer ──────────────────────────────────────────────────────────

def _wrap_lines(pdf, text, width, family, style, size, line_h):
    _set_font(pdf, family, style, size)
    try:
        lines = pdf.multi_cell(width, line_h, text, dry_run=True, output="LINES")
    except Exception:
        lines = [text]
    return lines if lines else [""]


def _template_color(design: dict, key: str, default):
    colors = (design or {}).get("colors", {}) or {}
    return _hex_to_rgb(colors.get(key) or default)


def _section_color(design: dict, name: str, default):
    """Resolve a section-level colour key (from the design palette) to RGB."""
    palette = {
        "primary": _template_color(design, "primary", "#2875E8"),
        "dark": _template_color(design, "dark_text", "#0B0D12"),
        "body": _template_color(design, "body_text", "#5F6673"),
        "accent": _template_color(design, "accent", "#D4AF37"),
        "border": _template_color(design, "border", "#E5E9F0"),
    }
    return palette.get(str(name or "").strip(), default)


def _pdf_align(value, default="L"):
    """Normalise editor alignment values to fpdf align codes (L/C/R/J)."""
    mapping = {
        "left": "L", "center": "C", "right": "R",
        "justify": "J", "justified": "J",
    }
    v = mapping.get(str(value or "").strip().lower())
    if v:
        return v
    raw = str(value or default).strip().upper()[:1]
    return raw if raw in "LCRJ" else default


def _render_offer_letter_pdf(f: dict, structure: dict = None, design: dict = None) -> bytes:
    if structure is None or design is None:
        from app.services.offer_letter_template_service import build_default_template
        _tpl = build_default_template()
        structure = structure or _tpl["structure"]
        design = design or _tpl["design"]

    # ── Resolve design settings ─────────────────────────────────────
    page = (design.get("page") or {}) or {}
    ML = float(page.get("margin_side", 18.0))
    MR = ML
    MT = float(page.get("margin_top", 14.0))
    PW, PH = 210.0, 297.0
    CW = PW - ML - MR

    primary = _template_color(design, "primary", "#2875E8")
    dark = _template_color(design, "dark_text", "#0B0D12")
    body = _template_color(design, "body_text", "#5F6673")
    secondary = _template_color(design, "body_text", "#5F6673")
    border = _template_color(design, "border", "#E5E9F0")
    bg_color = _template_color(design, "background", "#FFFFFF")
    accent = _template_color(design, "accent", "#D4AF37")

    fonts = (design.get("fonts") or {}) or {}
    f_body = float(fonts.get("body", 10.0))
    f_title = float(fonts.get("title", 20.0))
    f_sub = float(fonts.get("subtitle", 9.0))
    f_tbl_label = float(fonts.get("table_label", 8.5))
    f_tbl_val = float(fonts.get("table_value", 9.5))
    f_heading = float(fonts.get("heading", 13.5))
    f_sig = float(fonts.get("signature", 9.5))
    f_foot = float(fonts.get("footer", 7.5))

    _default_font = _resolve_font(fonts.get("family"))

    spacing = (design.get("spacing") or {}) or {}
    section_gap = float(spacing.get("section_gap", 4.0))
    table_row = float(spacing.get("table_row", 7.0))
    line_h = float(spacing.get("line_height", 5.0))

    sections = (structure.get("sections") or [])
    has_footer = any(s.get("type") == "footer" and s.get("visible", True) for s in sections)

    def _sec_font(props):
        """Per-section font override falling back to the design default."""
        key = str((props or {}).get("font") or "").strip().lower()
        return _resolve_font(key) if key else _default_font

    def corner_accents(page):
        """Subtle geometric blue corner marks near the page edges (never overlap text)."""
        light = (216, 228, 247)
        pdf.set_draw_color(*light)
        pdf.set_line_width(0.4)
        top = MT - 3.0
        # top-left
        pdf.line(ML, top, ML + 9, top)
        pdf.line(ML, top, ML, top + 3.5)
        # top-right
        pdf.line(PW - MR, top, PW - MR - 9, top)
        pdf.line(PW - MR, top, PW - MR, top + 3.5)
        # bottom-left (above footer band)
        bot = PH - 23.0
        pdf.line(ML, bot, ML + 9, bot)
        pdf.line(ML, bot, ML, bot - 3.5)
        # bottom-right
        pdf.line(PW - MR, bot, PW - MR - 9, bot)
        pdf.line(PW - MR, bot, PW - MR, bot - 3.5)

    class OfferPDF(FPDF):
        def header(self):
            if self.page_no() == 1:
                corner_accents(self)

        def footer(self):
            if self.page_no() > 1:
                corner_accents(self)
            if has_footer:
                _draw_footer(self, f, ML, MR, PW, PH, primary, f_foot, secondary, border, bg_color, _default_font["family"])

    pdf = OfferPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    pdf.set_left_margin(ML)
    pdf.set_right_margin(MR)
    pdf.set_top_margin(MT)
    _ensure_fonts(pdf)

    y = MT

    # ── Section renderers (corporate, minimal) ──────────────────────
    def render_header(props):
        nonlocal y
        props = props or {}
        fam = _sec_font(props)
        logo_w = float(props.get("logo_width", 12.0))
        logo_h = logo_w
        logo = f.get("logo_path")
        if props.get("show_logo", True) and logo and os.path.exists(logo):
            lw, lh = _img_size(logo, max_w=52.0, max_h=15.0)
            logo_w, logo_h = lw, lh
            try:
                pdf.image(logo, x=ML, y=y + 0.5, w=logo_w, h=logo_h)
            except Exception:
                logo_w, logo_h = 0.0, 0.0

        name_parts = (f.get("company") or "Skynova Tech Solutions").split()
        line1 = (name_parts[0].upper() if name_parts else "SKYNOVA")
        line2 = (" ".join(name_parts[1:]).upper() if len(name_parts) > 1 else "")

        tx = ML + logo_w + 4.5 if logo_w else ML
        ty = y + max(0.0, (logo_h - 11.0) / 2) if logo_h else y

        if props.get("show_company_name", True):
            pdf.set_xy(tx, ty)
            _set_font(pdf, fam["family"], "B", float(props.get("company_size", 13.5)))
            pdf.set_text_color(*dark)
            pdf.cell(CW - tx + ML, 5.6, line1, new_x="LMARGIN", new_y="NEXT")
            if line2:
                pdf.set_x(tx)
                _set_font(pdf, fam["medium"], "", 9.5)
                pdf.set_text_color(*primary)
                pdf.cell(CW - tx + ML, 4.0, line2, new_x="LMARGIN", new_y="NEXT")
        if props.get("show_tagline", True) and f.get("tagline"):
            pdf.set_x(tx)
            _set_font(pdf, fam["light"], "", float(props.get("tagline_size", 7.2)))
            pdf.set_text_color(*secondary)
            pdf.cell(CW - tx + ML, 3.4, _clean_text(f["tagline"]), new_x="LMARGIN", new_y="NEXT")

        if props.get("show_date", True):
            date_text = f.get("date") or datetime.now().strftime("%d-%b-%Y")
            pdf.set_xy(PW - MR - 40, y + 0.4)
            _set_font(pdf, fam["family"], "", 8.5)
            pdf.set_text_color(*secondary)
            pdf.cell(40, 3.6, f"Date: {date_text}", align="R")

        dy = y + max(logo_h, 13.0) + 3.5
        pdf.set_draw_color(*primary)
        pdf.set_line_width(0.5)
        pdf.line(ML, dy, PW - MR, dy)
        y = dy + section_gap

    def render_title(props):
        nonlocal y
        title = (structure.get("title") or {}) or {}
        fam = _sec_font(title)
        t1 = title.get("text1", "INTERNSHIP")
        t2 = title.get("text2", "OFFER LETTER")
        size = float(title.get("size", f_title))
        align = _pdf_align(title.get("align"), "C")
        ls = float(title.get("letter_spacing", 1.6))
        t1_color = _section_color(design, title.get("text1_color"), dark)
        t2_color = _section_color(design, title.get("text2_color"), primary)
        ul_color = _section_color(design, title.get("underline_color"), primary)

        pdf.set_xy(ML, y)
        _set_font(pdf, fam["family"], "B", size)
        pdf.set_text_color(*t1_color)
        pdf.set_char_spacing(ls)
        pdf.cell(CW, size * 0.37, t1, align=align)
        pdf.set_char_spacing(0)
        y += size * 0.37
        pdf.set_xy(ML, y)
        _set_font(pdf, fam["family"], "B", size)
        pdf.set_text_color(*t2_color)
        pdf.set_char_spacing(ls)
        pdf.cell(CW, size * 0.37, t2, align=align)
        pdf.set_char_spacing(0)
        y += size * 0.37

        if title.get("show_underline", True):
            pdf.set_draw_color(*ul_color)
            pdf.set_line_width(0.7)
            if align == "L":
                x1, x2 = ML, ML + 18
            elif align == "R":
                x1, x2 = PW - MR - 18, PW - MR
            else:
                cx = PW / 2
                x1, x2 = cx - 9, cx + 9
            pdf.line(x1, y + 2.0, x2, y + 2.0)
        y += 7.2

    def render_candidate(props):
        nonlocal y
        props = props or {}
        fam = _sec_font(props)
        name = f.get("full_name", "")
        qual = f.get("qualification")
        college = f.get("college")
        enrollment = f.get("enrollment_id")
        greeting = _sub_vars(props.get("greeting", "Dear {name},"), f)

        pdf.set_xy(ML, y)
        _set_font(pdf, fam["semi"], "", float(props.get("greeting_size", props.get("name_size", 11.5))))
        pdf.set_text_color(*dark)
        pdf.multi_cell(CW, 5.2, greeting, new_x="LMARGIN", new_y="NEXT")
        y = pdf.get_y() + 0.6

        if qual and props.get("show_qualification", True):
            _set_font(pdf, fam["family"], "", float(props.get("detail_size", 9.0)))
            pdf.set_text_color(*body)
            pdf.set_xy(ML, y)
            pdf.cell(CW, 3.8, _clean_text(qual), new_x="LMARGIN", new_y="NEXT")
            y = pdf.get_y() + 0.2
        if college and props.get("show_college", True):
            _set_font(pdf, fam["family"], "", float(props.get("detail_size", 9.0)))
            pdf.set_text_color(*body)
            pdf.set_xy(ML, y)
            pdf.cell(CW, 3.8, _clean_text(college), new_x="LMARGIN", new_y="NEXT")
            y = pdf.get_y() + 0.4
        if enrollment and props.get("show_enrollment", True):
            pdf.set_xy(ML, y)
            _set_font(pdf, fam["family"], "", float(props.get("detail_size", 9.0)))
            pdf.set_text_color(*body)
            pdf.cell(CW, 3.8, "Internship Enrollment ID: " + enrollment, new_x="LMARGIN", new_y="NEXT")
            y = pdf.get_y() + 0.2
        y += 1.6

    def _render_text_block(props, text, fam=None):
        """Shared paragraph renderer honouring alignment, size, style & colour."""
        nonlocal y
        props = props or {}
        fam = fam or _default_font
        text = _sub_vars(text, f)
        paragraphs = [re.sub(r"\s+", " ", p) for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [re.sub(r"\s+", " ", text)]
        align = _pdf_align(props.get("align"), "J")
        psize = float(props.get("text_size", f_body))
        pstyle = ("B" if props.get("bold", False) else "") + ("I" if props.get("italic", False) else "")
        pcolor = _section_color(design, props.get("color"), body)
        lh = float(props.get("line_height", line_h))
        ls = float(props.get("letter_spacing", 0.0))
        indent = float(props.get("text_indent", 0.0))
        tw = max(CW - indent, 5.0)
        pdf.set_xy(ML + indent, y)
        _set_font(pdf, fam["family"], pstyle, psize)
        pdf.set_text_color(*pcolor)
        for p in paragraphs:
            pdf.set_x(ML + indent)
            pdf.set_char_spacing(ls)
            pdf.multi_cell(tw, lh, p, align=align, new_x="LMARGIN", new_y="NEXT")
            pdf.set_char_spacing(0)
            pdf.ln(0.7)
        y = pdf.get_y() + section_gap

    def render_heading_paragraph(props):
        nonlocal y
        props = props or {}
        fam = _sec_font(props)
        heading = props.get("heading", "Congratulations!")
        head_size = float(props.get("heading_size", f_heading))
        head_color = _section_color(design, props.get("heading_color"), primary)
        head_align = _pdf_align(props.get("heading_align"), "L")
        text = props.get("text", "")

        pdf.set_xy(ML, y)
        _set_font(pdf, fam["family"], "B", head_size)
        pdf.set_text_color(*head_color)
        pdf.cell(CW, 7.4, heading, new_x="LMARGIN", new_y="NEXT", align=head_align)
        y += 7.4
        pdf.set_draw_color(*head_color)
        pdf.set_line_width(0.5)
        if head_align == "R":
            pdf.line(PW - MR - 18, y + 0.5, PW - MR, y + 0.5)
        else:
            pdf.line(ML, y + 0.5, ML + 18, y + 0.5)
        y += 3.0
        _render_text_block(props, text, fam)

    def render_paragraph(props):
        fam = _sec_font(props)
        _render_text_block(props, props.get("text", ""), fam)

    def render_list(props):
        nonlocal y
        props = props or {}
        fam = _sec_font(props)
        items = [i for i in props.get("items", []) if i.get("visible", True)]
        if not items:
            return
        if y > PH - 90:
            pdf.add_page()
            pdf.set_left_margin(ML)
            pdf.set_right_margin(MR)
            y = pdf.get_y() + 4.0
        align = _pdf_align(props.get("align"), "L")
        psize = float(props.get("item_size", f_body))
        pstyle = ("B" if props.get("bold", False) else "") + ("I" if props.get("italic", False) else "")
        pcolor = _section_color(design, props.get("color"), body)
        use_bullet = props.get("bullet", True)
        gap = float(props.get("spacing", 2.0))
        lh = float(props.get("line_height", line_h))
        ls = float(props.get("letter_spacing", 0.0))
        indent = float(props.get("text_indent", 0.0))
        bullet_w = 5.0
        text_w = max(CW - indent - bullet_w, 5.0)
        pdf.set_text_color(*pcolor)
        for item in items:
            text = _sub_vars(item.get("text", ""), f)
            lines = _wrap_lines(pdf, text, text_w - 2.0, fam["family"], pstyle, psize, lh)
            if not lines:
                continue
            for i, line in enumerate(lines):
                if use_bullet and i == 0:
                    _set_font(pdf, fam["family"], pstyle, psize)
                    pdf.set_xy(ML + indent, y)
                    pdf.cell(bullet_w, lh, "\u2022", align="C")
                _set_font(pdf, fam["family"], pstyle, psize)
                pdf.set_char_spacing(ls)
                pdf.set_xy(ML + indent + bullet_w, y)
                pdf.multi_cell(text_w - bullet_w, lh, line, align=align, new_x="LMARGIN", new_y="NEXT")
                pdf.set_char_spacing(0)
                y = pdf.get_y()
            y += gap

    def render_table(props):
        nonlocal y
        props = props or {}
        fam = _sec_font(props)
        heading = props.get("heading", "INTERNSHIP DETAILS")
        head_size = float(props.get("heading_size", 9.0))
        head_color = _section_color(design, props.get("heading_color"), primary)
        head_align = _pdf_align(props.get("heading_align"), "L")
        zebra = props.get("zebra", False)
        row_gap = float(props.get("row_gap", 1.8))

        rows = [r for r in props.get("rows", []) if r.get("visible", True)]
        if not rows:
            return

        if y > PH - 110:
            pdf.add_page()
            pdf.set_left_margin(ML)
            pdf.set_right_margin(MR)
            y = pdf.get_y() + 4.0

        # heading (advance past the heading cell so rows never overlap it)
        head_h = max(5.0, head_size * 0.7)
        pdf.set_xy(ML, y)
        _set_font(pdf, fam["semi"], "", head_size)
        pdf.set_text_color(*head_color)
        pdf.set_char_spacing(1.0)
        pdf.cell(CW, head_h, heading, new_x="LMARGIN", new_y="NEXT", align=head_align)
        pdf.set_char_spacing(0)
        y = pdf.get_y() + 2.0

        label_w = float(props.get("label_width", 60.0))
        value_w = CW - label_w
        row_pad = 4.0

        def resolved(row):
            label = row.get("label", "")
            if "value" in row and row.get("value"):
                val = _sub_vars(row["value"], f)
            else:
                val = _field_value(f, row.get("field", ""))
            n = len(_wrap_lines(pdf, val, value_w - 6.0, fam["family"], "", f_tbl_val, 4.2))
            return label, val, max(table_row, n * 4.2 + 5.2)

        data = [resolved(r) for r in rows]
        total_h = sum(rh for _, _, rh in data)

        if y + total_h > PH - 20:
            pdf.add_page()
            pdf.set_left_margin(ML)
            pdf.set_right_margin(MR)
            y = pdf.get_y() + 4.0

        row_y = y
        zebra_fill = (244, 246, 250)
        for i, (label, val, rh) in enumerate(data):
            pdf.set_fill_color(*(zebra_fill if (zebra and i % 2 == 1) else WHITE))
            pdf.set_draw_color(*border)
            pdf.set_line_width(0.3)
            pdf.rect(ML, row_y, CW, rh, style="DF")
            _set_font(pdf, fam["semi"], "", f_tbl_label)
            pdf.set_text_color(*dark)
            pdf.set_xy(ML + 5.0, row_y + row_gap)
            pdf.multi_cell(label_w - 8.0, 4.2, label, new_x="LMARGIN", new_y="NEXT")
            _set_font(pdf, fam["family"], "", f_tbl_val)
            pdf.set_text_color(*body)
            pdf.set_xy(ML + label_w + 3.0, row_y + row_gap)
            pdf.multi_cell(value_w - 6.0, 4.2, val, new_x="LMARGIN", new_y="NEXT")
            row_y += rh
        y = row_y + section_gap

    def render_signature(props):
        nonlocal y
        props = props or {}
        fam = _sec_font(props)
        show_authorized = props.get("show_authorized", True)
        show_seal = props.get("show_seal", True)
        show_candidate = props.get("show_candidate", True)

        if y > PH - 55:
            pdf.add_page()
            pdf.set_left_margin(ML)
            pdf.set_right_margin(MR)
            y = pdf.get_y() + 4.0

        col_w = (CW - 26.0) / 2
        right_x = ML + col_w + 26.0
        sig_y = y

        pdf.set_draw_color(*border)
        pdf.set_line_width(0.3)
        pdf.line(ML, sig_y - 3.0, PW - MR, sig_y - 3.0)

        if show_seal:
            seal = f.get("seal_path")
            if seal and os.path.exists(seal):
                seal_w, seal_h = _img_size(seal, 24.0, 24.0)
                sx = PW / 2 - seal_w / 2
                sy = sig_y + 2.0
                try:
                    pdf.image(seal, x=sx, y=sy, w=seal_w, h=seal_h)
                except Exception:
                    pass

        auth_w, auth_h = 40.0, 11.0
        if show_authorized:
            lx = ML
            pdf.set_xy(lx, sig_y)
            _set_font(pdf, fam["semi"], "", 6.6)
            pdf.set_text_color(*primary)
            pdf.set_char_spacing(1.0)
            pdf.cell(col_w, 3.0, props.get("authorized_label", "AUTHORIZED SIGNATORY"))
            pdf.set_char_spacing(0)
            sig_img_y = sig_y + 4.0
            has_sig = bool(f.get("signature_path") and os.path.exists(f["signature_path"]))
            if has_sig:
                try:
                    iw, ih = _img_size(f["signature_path"], 40.0, 11.0)
                    auth_w, auth_h = iw, ih
                    pdf.image(f["signature_path"], x=lx, y=sig_img_y, w=iw, h=ih)
                except Exception:
                    has_sig = False
            line_y = sig_img_y + (12.0 if has_sig else 3.0)
            pdf.set_draw_color(*dark)
            pdf.set_line_width(0.4)
            pdf.line(lx, line_y, lx + 46, line_y)
            pdf.set_xy(lx, line_y + 1.8)
            _set_font(pdf, fam["semi"], "", f_sig)
            pdf.set_text_color(*dark)
            pdf.cell(col_w, 4.2, _clean_text(f.get("signatory") or "Not Specified"), new_x="LMARGIN", new_y="NEXT")
            if f.get("designation"):
                _set_font(pdf, fam["family"], "", 8.0)
                pdf.set_text_color(*secondary)
                pdf.set_xy(lx, pdf.get_y())
                pdf.cell(col_w, 3.4, _clean_text(f["designation"]), new_x="LMARGIN", new_y="NEXT")
            _set_font(pdf, fam["family"], "", 8.0)
            pdf.set_text_color(*secondary)
            pdf.set_xy(lx, pdf.get_y())
            pdf.cell(col_w, 3.4, f"Date: {f.get('date') or ''}", new_x="LMARGIN", new_y="NEXT")

        if show_candidate:
            rx = right_x
            pdf.set_xy(rx, sig_y)
            _set_font(pdf, fam["semi"], "", 6.6)
            pdf.set_text_color(*primary)
            pdf.set_char_spacing(1.0)
            pdf.cell(col_w, 3.0, props.get("candidate_label", "CANDIDATE SIGNATURE"), align="R")
            pdf.set_char_spacing(0)
            sig_img_y = sig_y + 4.0
            cand_sig = f.get("candidate_signature_path")
            has_cand = bool(cand_sig and os.path.exists(cand_sig))
            if has_cand:
                try:
                    c_img, c_mw, c_mh = _crop_transparent_signature(cand_sig, auth_w, auth_h)
                    if c_img is not None:
                        cx = rx + (col_w - c_mw) / 2
                        cy = sig_img_y + max(0.0, (auth_h - c_mh) / 2)
                        pdf.image(c_img, x=cx, y=cy, w=c_mw, h=c_mh)
                    else:
                        iw, ih = _img_size(cand_sig, auth_w, auth_h)
                        cx = rx + (col_w - iw) / 2
                        cy = sig_img_y + max(0.0, (auth_h - ih) / 2)
                        pdf.image(cand_sig, x=cx, y=cy, w=iw, h=ih)
                except Exception:
                    has_cand = False
            line_y = sig_img_y + (12.0 if has_cand else 3.0)
            pdf.set_draw_color(*dark)
            pdf.set_line_width(0.4)
            pdf.line(rx + col_w - 46, line_y, rx + col_w, line_y)
            pdf.set_xy(rx, line_y + 1.8)
            _set_font(pdf, fam["semi"], "", f_sig)
            pdf.set_text_color(*dark)
            pdf.cell(col_w, 4.2, _clean_text(f.get("full_name") or "Not Specified"), align="R", new_x="LMARGIN", new_y="NEXT")
            _set_font(pdf, fam["family"], "", 8.0)
            pdf.set_text_color(*secondary)
            pdf.set_xy(rx, pdf.get_y())
            pdf.cell(col_w, 3.4, "Candidate Signature", align="R", new_x="LMARGIN", new_y="NEXT")
            _set_font(pdf, fam["family"], "", 8.0)
            pdf.set_text_color(*secondary)
            pdf.set_xy(rx, pdf.get_y())
            pdf.cell(col_w, 3.4, f"Date: {f.get('date') or ''}", align="R", new_x="LMARGIN", new_y="NEXT")

        y = sig_y + 24.0

    renderers = {
        "header": render_header,
        "title": render_title,
        "candidate": render_candidate,
        "heading_paragraph": render_heading_paragraph,
        "paragraph": render_paragraph,
        "list": render_list,
        "table": render_table,
        "signature": render_signature,
        "footer": lambda props: None,
    }

    for section in sections:
        if not section.get("visible", True):
            continue
        stype = section.get("type")
        fn = renderers.get(stype)
        if not fn:
            continue
        props = section.get("props") or {}
        y += float(props.get("space_before", 0.0))
        if y > PH - 45 and y > MT:
            pdf.add_page()
            pdf.set_left_margin(ML)
            pdf.set_right_margin(MR)
            y = pdf.get_y() + 4.0
        fn(props)
        y += float(props.get("space_after", 0.0))

    return bytes(pdf.output())


def _draw_footer(pdf, f, ML, MR, PW, PH, primary, f_foot=7.5, secondary=None, border=None, bg_color=None, family="Inter"):
    CW = PW - ML - MR
    secondary = secondary or SECONDARY
    border = border or BORDER
    bg_color = bg_color or BG
    band_top = PH - 20.0
    pdf.set_fill_color(*bg_color)
    pdf.rect(0, band_top, PW, 20.0, "F")
    pdf.set_draw_color(*primary)
    pdf.set_line_width(0.5)
    pdf.line(ML, band_top, PW - MR, band_top)

    parts = [f.get(k) for k in ("footer_email", "footer_website", "footer_location", "footer_phone")]
    parts = [_clean_text(p) for p in parts if _clean_text(p)]
    if not parts:
        return
    text = "  |  ".join(parts)

    _set_font(pdf, family, "", f_foot)
    pdf.set_text_color(*secondary)
    pdf.set_xy(ML, band_top + 8.2)
    pdf.cell(CW, 3.4, text, align="C", new_x="LMARGIN", new_y="NEXT")


def _get_pdf_company() -> str:
    return "Skynova Tech Solutions"


def generate_bulk_pdf(applications) -> bytes:
    pdf = FPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(0, 15, "Bulk Applications Report", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f"Total: {len(applications)} application(s)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    for idx, app in enumerate(applications, 1):
        if pdf.get_y() > 240:
            pdf.add_page()

        pdf.set_fill_color(79, 70, 229)
        pdf.rect(10, pdf.get_y(), 190, 0.5, "F")
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 8, f"{idx}. {app.full_name}", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 5, f"{app.email} | {app.mobile} | {app.college} | {app.domain}", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(79, 70, 229)

        status_colors = {
            "Pending": (254, 243, 199), "Reviewed": (219, 234, 254),
            "Shortlisted": (243, 232, 255), "Selected": (209, 250, 229),
            "Rejected": (254, 226, 226),
        }
        r, g, b = status_colors.get(app.status, (240, 240, 240))
        pdf.set_fill_color(r, g, b)
        pdf.cell(0, 6, f"  {app.status}  ", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(80, 80, 80)
        pdf.ln(2)

    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(0, 5, f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} - Skynova Tech Solutions", align="C")

    return bytes(pdf.output())
