import io
import os
from datetime import datetime
from fpdf import FPDF
from app.config import get_settings

settings = get_settings()

BLUE = (37, 99, 235)
DARK = (30, 30, 30)
GRAY = (100, 110, 120)
LIGHT = (245, 247, 250)
BORDER = (220, 225, 235)


def generate_application_pdf(app) -> bytes:
    pdf = FPDF()
    pdf.add_page()

    lm, rm = 15, 15
    pw = 210
    cw = pw - lm - rm
    pdf.set_left_margin(lm)
    pdf.set_right_margin(rm)

    logo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logo.png")
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
