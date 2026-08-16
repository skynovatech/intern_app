import sys
sys.path.insert(0, ".")

from app.services.pdf_service import generate_application_pdf

class FakeApp:
    id = 1
    photo_path = None
    resume_path = None
    full_name = "Nawfal Aadil S"
    email = "nawfal@example.com"
    mobile = "9876543210"
    whatsapp = "9876543210"
    dob = "2004-05-12"
    gender = "Male"
    address = "Trichy"
    college = "CARE College"
    degree = "B.E CSE"
    department = "CSE"
    current_year = "Final Year"
    cgpa = 8.5
    domain = "Cybersecurity"
    duration = "6 Months"
    preferred_joining_date = "2026-08-10"
    technical_skills = ["Python"]
    projects = "Project A"
    github = ""
    linkedin = ""
    portfolio = ""
    status = "Pending"
    rating = None
    notes = None

try:
    b = generate_application_pdf(FakeApp())
    print("OK bytes:", len(b))
except Exception as e:
    print("CRASH:", type(e).__name__, e)
