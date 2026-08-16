STATUS_EMAIL_BODY = """\
Hi {applicant_name},

Your application status has been updated.

Previous Status: {old_status}
New Status: {new_status}

{employee_id_section}
{notes_section}
If you have any questions, please don't hesitate to reach out.

Best regards,
{company_name} Recruitment Team
"""

STATUS_WHATSAPP_MSG = (
    "Hi {applicant_name},\n\n"
    "Your application status has been updated.\n"
    "Previous: {old_status}\n"
    "New: {new_status}\n\n"
    "{employee_id_section}"
    "{notes_section}"
)

INTERVIEW_EMAIL_BODY = """\
Hi {applicant_name},

An interview has been scheduled for your application.

Date: {date}
Time: {time}
Type: {interview_type}
Interviewer: {interviewer}
Location: {location}

{notes_section}
Please be available at the scheduled time. If you need to reschedule, contact us as soon as possible.

Best regards,
{company_name} Recruitment Team
"""

INTERVIEW_WHATSAPP_MSG = (
    "Hi {applicant_name},\n\n"
    "Interview scheduled!\n"
    "Date: {date}\n"
    "Time: {time}\n"
    "Type: {interview_type}\n"
    "Interviewer: {interviewer}\n"
    "Location: {location}\n\n"
    "{notes_section}"
)

CONFIRMATION_EMAIL_BODY = """\
Hi {applicant_name},

Thank you for applying to {company_name}!

Your application has been received successfully. Please find your application details attached.

Application ID: {application_id}

We will review your application and get back to you soon. If you have any questions, feel free to reach out.

Best regards,
{company_name} Recruitment Team
"""

CONFIRMATION_WHATSAPP_MSG = (
    "Hi {applicant_name},\n\n"
    "Thank you for applying to {company_name}!\n\n"
    "Your application (ID: {application_id}) has been received successfully.\n\n"
    "We will review it and get back to you soon."
)

OFFER_EMAIL_BODY = """\
Hi {applicant_name},

Congratulations! We are pleased to offer you an internship at {company_name}.

Your Employee ID: {employee_id}
Domain: {domain}
Duration: {duration}

Please find your offer letter attached to this email. Kindly review the details.

We look forward to having you on board.

Best regards,
{company_name} Recruitment Team
"""

OFFER_WHATSAPP_MSG = (
    "Hi {applicant_name},\n\n"
    "Congratulations! You have been selected for an internship at {company_name}.\n"
    "Your Employee ID: {employee_id}\n"
    "Domain: {domain}\n"
    "Duration: {duration}\n\n"
    "Your offer letter has been sent to your email."
)
