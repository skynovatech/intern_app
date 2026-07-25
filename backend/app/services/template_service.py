from typing import Optional
from app.models.application import Application

TEMPLATE_VARIABLES = {
    "{{applicant_name}}": "Full name of the applicant",
    "{{email}}": "Email address",
    "{{mobile}}": "Mobile number",
    "{{college}}": "College name",
    "{{degree}}": "Degree",
    "{{department}}": "Department",
    "{{current_year}}": "Current year of study",
    "{{domain}}": "Internship domain",
    "{{duration}}": "Internship duration",
    "{{status}}": "Current application status",
    "{{rating}}": "Application rating",
    "{{company_name}}": "Your company name",
}


def resolve_variables(text: str, app=None, company_name: str = "Our Company") -> str:
    result = text
    if app:
        is_dict = isinstance(app, dict)
        replacements = {
            "{{applicant_name}}": (app.get("full_name") if is_dict else app.full_name) or "",
            "{{email}}": (app.get("email") if is_dict else app.email) or "",
            "{{mobile}}": (app.get("mobile") if is_dict else app.mobile) or "",
            "{{college}}": (app.get("college") if is_dict else app.college) or "",
            "{{degree}}": (app.get("degree") if is_dict else app.degree) or "",
            "{{department}}": (app.get("department") if is_dict else app.department) or "",
            "{{current_year}}": (app.get("current_year") if is_dict else app.current_year) or "",
            "{{domain}}": (app.get("domain") if is_dict else app.domain) or "",
            "{{duration}}": (app.get("duration") if is_dict else app.duration) or "",
            "{{status}}": (app.get("status") if is_dict else app.status) or "",
            "{{rating}}": str(app.get("rating") if is_dict else app.rating) if (app.get("rating") if is_dict else app.rating) else "0",
            "{{company_name}}": company_name,
        }
        for var, val in replacements.items():
            result = result.replace(var, val)
    else:
        result = result.replace("{{company_name}}", company_name)
    return result
