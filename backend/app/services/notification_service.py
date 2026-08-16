from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.email_template import EmailTemplate
from app.models.whatsapp_template import WhatsAppTemplate
from app.models.communication_log import CommunicationLog
from app.services.email_service import send_email
from app.services.whatsapp_service import send_whatsapp_message, send_whatsapp_media
from app.services.template_service import resolve_variables
from app.services.websocket_manager import manager
from app.config import get_settings
from app.services.notification_templates import (
    STATUS_EMAIL_BODY,
    STATUS_WHATSAPP_MSG,
    INTERVIEW_EMAIL_BODY,
    INTERVIEW_WHATSAPP_MSG,
    CONFIRMATION_EMAIL_BODY,
    CONFIRMATION_WHATSAPP_MSG,
    OFFER_EMAIL_BODY,
    OFFER_WHATSAPP_MSG,
)
from app.services.pdf_service import generate_application_pdf, generate_offer_letter, generate_offer_letter_from_offer
import base64
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

CATEGORY_STATUS_CHANGE = "status_change"
CATEGORY_INTERVIEW_SCHEDULED = "interview_scheduled"
CATEGORY_CONFIRMATION = "application_confirmation"
CATEGORY_OFFER_LETTER = "offer_letter"


def _get_company_name(db=None) -> str:
    if db is not None:
        try:
            from app.services.settings_service import get_setting_value
            value = get_setting_value(db, "company_name", "")
            if value:
                return value
        except Exception:
            pass
    return settings.COMPANY_NAME or "Skynova Tech Solutions"


def _get_employee_id_section(new_status: str, employee_id: Optional[str]) -> str:
    if new_status == "Selected" and employee_id:
        return (
            f"Congratulations! You have been selected for the internship.\n"
            f"Your Employee ID: {employee_id}\n\n"
        )
    return ""


def _wrap_html(body: str, db=None) -> str:
    if "<html" in body.lower() or "<body" in body.lower():
        return body
    company = _get_company_name(db)
    lines = body.split("\n")
    paragraphs = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("Hi ") or stripped.startswith("Dear "):
            paragraphs.append(f"<p>{stripped}</p>")
        elif stripped.startswith("--") or stripped.startswith("Best") or stripped.startswith("Regards") or stripped.startswith("Thanks"):
            paragraphs.append(f"<p>{stripped}</p>")
        elif ":" in stripped and not stripped.startswith("<"):
            parts = stripped.split(":", 1)
            paragraphs.append(f'<p><strong>{parts[0].strip()}:</strong>{parts[1].strip()}</p>')
        else:
            paragraphs.append(f"<p>{stripped}</p>")
    body_html = "\n".join(paragraphs)
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:24px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.5px">{company}</h1>
</td></tr></table>
</td></tr>
<tr><td style="padding:32px">
<div style="font-size:15px;line-height:1.6;color:#374151">
{body_html}
</div>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0">
<p style="margin:0;font-size:12px;color:#94a3b8">This is an automated message from {company}. Please do not reply directly to this email.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>"""


def _get_active_email_template(db: Session, category: str) -> Optional[EmailTemplate]:
    return db.query(EmailTemplate).filter(
        EmailTemplate.category == category,
        EmailTemplate.is_active == True,
    ).order_by(EmailTemplate.updated_at.desc()).first()


def _get_active_whatsapp_template(db: Session, category: str) -> Optional[WhatsAppTemplate]:
    return db.query(WhatsAppTemplate).filter(
        WhatsAppTemplate.category == category,
        WhatsAppTemplate.is_active == True,
    ).order_by(WhatsAppTemplate.updated_at.desc()).first()


def _resolve_email_body(
    db: Session,
    category: str,
    fallback_template: str,
    variables: dict,
) -> tuple[str, str]:
    company = _get_company_name(db)
    tmpl = _get_active_email_template(db, category)
    if tmpl:
        subject = resolve_variables(tmpl.subject, None, company_name=company)
        body = resolve_variables(tmpl.body, None, company_name=company)
        for key, val in variables.items():
            subject = subject.replace(key, val)
            body = body.replace(key, val)
        subject = subject.replace("{company_name}", company)
        body = body.replace("{company_name}", company)
        return subject, body
    subject = variables.get("{subject}", "Notification")
    fmt_vars = {k.strip("{}"): v for k, v in variables.items() if k != "{subject}"}
    body = fallback_template.format(**fmt_vars, company_name=company)
    return subject, body


def _resolve_whatsapp_body(
    db: Session,
    category: str,
    fallback_template: str,
    variables: dict,
) -> str:
    company = _get_company_name(db)
    tmpl = _get_active_whatsapp_template(db, category)
    if tmpl:
        body = resolve_variables(tmpl.message, None, company_name=company)
        for key, val in variables.items():
            body = body.replace(key, val)
        body = body.replace("{company_name}", company)
        return body
    fmt_vars = {k.strip("{}"): v for k, v in variables.items()}
    return fallback_template.format(**fmt_vars, company_name=company)


def send_status_notification(
    application_data: dict,
    old_status: str,
    new_status: str,
    notes: Optional[str],
    sent_by: str,
):
    db = SessionLocal()
    try:
        company = _get_company_name(db)
        notes_section = f"Notes: {notes}" if notes else ""
        employer = _get_employee_id_section(new_status, application_data.get("employee_id"))
        applicant_name = application_data["full_name"]

        variables = {
            "{applicant_name}": applicant_name,
            "{old_status}": old_status,
            "{new_status}": new_status,
            "{employee_id_section}": employer,
            "{notes_section}": notes_section,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_STATUS_CHANGE, STATUS_EMAIL_BODY, {
                **variables,
                "{subject}": f"Application Status Update — {new_status}",
            }
        )
        email_sent = send_email(
            to_email=application_data["email"],
            subject=subject,
            body=_wrap_html(email_body),
            html=True,
        )
        logger.info(f"Email to {application_data['email']}: {'sent' if email_sent else 'FAILED'}")
        db.add(CommunicationLog(
            application_id=application_data["id"],
            channel="email",
            subject=subject,
            message=email_body,
            status="sent" if email_sent else "failed",
            sent_by=sent_by,
        ))

        if application_data.get("whatsapp"):
            wa_body = _resolve_whatsapp_body(
                db, CATEGORY_STATUS_CHANGE, STATUS_WHATSAPP_MSG, variables
            )
            wa_sent = send_whatsapp_message(
                to_phone=application_data["whatsapp"],
                message=wa_body,
            )
            logger.info(f"WhatsApp to {application_data['whatsapp']}: {'sent' if wa_sent else 'FAILED'}")
            db.add(CommunicationLog(
                application_id=application_data["id"],
                channel="whatsapp",
                message=wa_body,
                status="sent" if wa_sent else "failed",
                sent_by=sent_by,
            ))

        db.commit()

        manager.broadcast_sync("notification", {
            "type": "status_update",
            "application_id": application_data["id"],
            "new_status": new_status,
        })
    except Exception as e:
        app_id = application_data.get("id", "unknown")
        logger.error(f"Status notification failed for application {app_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_interview_notification(
    application_data: dict,
    scheduled_date: str,
    scheduled_time: str,
    interview_type: str,
    interviewer: Optional[str],
    location: Optional[str],
    notes: Optional[str],
    sent_by: str,
):
    db = SessionLocal()
    try:
        company = _get_company_name(db)
        notes_section = f"Notes: {notes}" if notes else ""
        applicant_name = application_data["full_name"]

        variables = {
            "{applicant_name}": applicant_name,
            "{date}": scheduled_date,
            "{time}": scheduled_time,
            "{interview_type}": interview_type,
            "{interviewer}": interviewer or "TBD",
            "{location}": location or "TBD",
            "{notes_section}": notes_section,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_INTERVIEW_SCHEDULED, INTERVIEW_EMAIL_BODY, {
                **variables,
                "{subject}": "Interview Scheduled",
            }
        )

        email_sent = send_email(
            to_email=application_data["email"],
            subject=subject,
            body=_wrap_html(email_body),
            html=True,
        )
        db.add(CommunicationLog(
            application_id=application_data["id"],
            channel="email",
            subject=subject,
            message=email_body,
            status="sent" if email_sent else "failed",
            sent_by=sent_by,
        ))

        if application_data.get("whatsapp"):
            wa_body = _resolve_whatsapp_body(
                db, CATEGORY_INTERVIEW_SCHEDULED, INTERVIEW_WHATSAPP_MSG, variables
            )
            wa_sent = send_whatsapp_message(
                to_phone=application_data["whatsapp"],
                message=wa_body,
            )
            db.add(CommunicationLog(
                application_id=application_data["id"],
                channel="whatsapp",
                message=wa_body,
                status="sent" if wa_sent else "failed",
                sent_by=sent_by,
            ))

        db.commit()

        manager.broadcast_sync("notification", {
            "type": "interview_scheduled",
            "application_id": application_data["id"],
        })
    except Exception as e:
        app_id = application_data.get("id", "unknown")
        logger.error(f"Interview notification failed for application {app_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_application_confirmation(app_data: dict):
    db = SessionLocal()
    try:
        company = _get_company_name(db)
        applicant_name = app_data["full_name"]
        app_id = str(app_data["id"])

        variables = {
            "{applicant_name}": applicant_name,
            "{application_id}": app_id,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_CONFIRMATION, CONFIRMATION_EMAIL_BODY, {
                **variables,
                "{subject}": "Application Received — Thank You",
            }
        )
        from app.models.application import Application
        actual_app = db.query(Application).filter(Application.id == app_data["id"]).first()
        pdf_bytes = generate_application_pdf(actual_app) if actual_app else None

        email_sent = send_email(
            to_email=app_data["email"],
            subject=subject,
            body=_wrap_html(email_body),
            html=True,
            attachments=[("Application.pdf", pdf_bytes, "pdf")] if pdf_bytes else None,
        )

        logger.info(f"Confirmation email to {app_data['email']}: {'sent' if email_sent else 'FAILED'}")
        db.add(CommunicationLog(
            application_id=app_data["id"],
            channel="email",
            subject=subject,
            message=email_body + "\n\n[PDF application copy attached]" if pdf_bytes else email_body,
            status="sent" if email_sent else "failed",
            sent_by="system",
        ))

        if app_data.get("whatsapp"):
            wa_body = _resolve_whatsapp_body(
                db, CATEGORY_CONFIRMATION, CONFIRMATION_WHATSAPP_MSG, variables
            )
            wa_sent = send_whatsapp_message(
                to_phone=app_data["whatsapp"],
                message=wa_body,
            )
            pdf_sent = False
            if pdf_bytes:
                pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
                pdf_sent = send_whatsapp_media(
                    to_phone=app_data["whatsapp"],
                    media_url=pdf_b64,
                    caption=f"Application #{app_data['id']} — {app_data.get('full_name', '')}",
                    filename=f"Application_{app_data['id']}.pdf",
                )
            logger.info(f"Confirmation WhatsApp to {app_data['whatsapp']}: msg={'sent' if wa_sent else 'FAILED'}, pdf={'sent' if pdf_sent else 'FAILED'}")
            db.add(CommunicationLog(
                application_id=app_data["id"],
                channel="whatsapp",
                message=wa_body + "\n\n[PDF application copy attached]" if pdf_sent else wa_body,
                status="sent" if wa_sent else "failed",
                sent_by="system",
            ))

        db.commit()
    except Exception as e:
        app_id = app_data.get("id", "unknown")
        logger.error(f"Application confirmation failed for {app_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_bulk_status_notifications(
    applications_data: list[dict],
    new_status: str,
    sent_by: str,
):
    db = SessionLocal()
    try:
        company = _get_company_name(db)
        for app_data in applications_data:
            notes_section = f"Notes: {app_data['notes']}" if app_data.get("notes") else ""
            employee_section = _get_employee_id_section(new_status, app_data.get("employee_id"))

            variables = {
                "{applicant_name}": app_data["full_name"],
                "{old_status}": app_data["old_status"],
                "{new_status}": new_status,
                "{employee_id_section}": employee_section,
                "{notes_section}": notes_section,
            }

            _, email_body = _resolve_email_body(
                db, CATEGORY_STATUS_CHANGE, STATUS_EMAIL_BODY, {
                    **variables,
                    "{subject}": f"Application Status Update — {new_status}",
                }
            )

            email_sent = send_email(
                to_email=app_data["email"],
                subject=f"Application Status Update — {new_status}",
                body=_wrap_html(email_body),
                html=True,
            )
            db.add(CommunicationLog(
                application_id=app_data["id"],
                channel="email",
                subject=f"Application Status Update — {new_status}",
                message=email_body,
                status="sent" if email_sent else "failed",
                sent_by=sent_by,
            ))

            if app_data.get("whatsapp"):
                wa_body = _resolve_whatsapp_body(
                    db, CATEGORY_STATUS_CHANGE, STATUS_WHATSAPP_MSG, variables
                )
                wa_sent = send_whatsapp_message(to_phone=app_data["whatsapp"], message=wa_body)
                db.add(CommunicationLog(
                    application_id=app_data["id"],
                    channel="whatsapp",
                    message=wa_body,
                    status="sent" if wa_sent else "failed",
                    sent_by=sent_by,
                ))

        db.commit()

        manager.broadcast_sync("bulk_status_update", {
            "new_status": new_status,
            "count": len(applications_data),
        })
    except Exception as e:
        logger.error(f"Bulk notification failed: {e}")
        db.rollback()
    finally:
        db.close()


def send_offer_letter_notification(application_id: int, sent_by: str):
    db = SessionLocal()
    try:
        from app.models.application import Application
        from app.models.offer_letter import OfferLetter
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Offer letter notification failed: application {application_id} not found")
            return

        offer_letter = db.query(OfferLetter).filter(OfferLetter.application_id == application_id).first()
        if not offer_letter:
            offer_letter = OfferLetter(
                application_id=application.id,
                full_name=application.full_name,
                email=application.email,
                domain=application.domain,
                duration=application.duration,
                start_date=application.preferred_joining_date,
                employee_id=application.employee_id,
                status="draft",
            )
            db.add(offer_letter)
            db.flush()

        company = _get_company_name(db)
        employee_id = application.employee_id or "TBD"
        variables = {
            "{applicant_name}": application.full_name,
            "{employee_id}": employee_id,
            "{domain}": application.domain,
            "{duration}": application.duration,
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_OFFER_LETTER, OFFER_EMAIL_BODY, {
                **variables,
                "{subject}": f"Internship Offer Letter — {company}",
            }
        )

        pdf_bytes = generate_offer_letter(application, db=db)

        email_sent = False
        try:
            email_sent = send_email(
                to_email=application.email,
                subject=subject,
                body=_wrap_html(email_body),
                html=True,
                attachments=[("Offer_Letter.pdf", pdf_bytes, "pdf")],
            )
        except Exception as email_err:
            logger.error(f"Offer letter email failed: {email_err}")
        db.add(CommunicationLog(
            application_id=application.id,
            channel="email",
            subject=subject,
            message=email_body + "\n\n[Offer letter PDF attached]",
            status="sent" if email_sent else "failed",
            sent_by=sent_by,
        ))

        wa_sent = False
        pdf_sent = False
        whatsapp_number = application.whatsapp or application.mobile
        if whatsapp_number:
            try:
                wa_body = _resolve_whatsapp_body(
                    db, CATEGORY_OFFER_LETTER, OFFER_WHATSAPP_MSG, variables
                )
                wa_sent = send_whatsapp_message(
                    to_phone=whatsapp_number,
                    message=wa_body,
                )
                try:
                    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
                    pdf_sent = send_whatsapp_media(
                        to_phone=whatsapp_number,
                        media_url=pdf_b64,
                        caption=f"Offer Letter — {application.full_name}",
                        filename=f"Offer_Letter_{application.full_name.replace(' ', '_')}.pdf",
                    )
                except Exception as media_err:
                    logger.error(f"Offer letter WhatsApp media failed: {media_err}")
            except Exception as wa_err:
                logger.error(f"Offer letter WhatsApp failed: {wa_err}")
            db.add(CommunicationLog(
                application_id=application.id,
                channel="whatsapp",
                message=wa_body + ("\n\n[Offer letter PDF attached]" if pdf_sent else "") if whatsapp_number else "",
                status="sent" if wa_sent else "failed",
                sent_by=sent_by,
            ))

        db.commit()

        manager.broadcast_sync("notification", {
            "type": "offer_letter",
            "application_id": application.id,
            "employee_id": employee_id,
        })
    except Exception as e:
        logger.error(f"Offer letter notification failed for application {application_id}: {e}")
        db.rollback()
    finally:
        db.close()


def send_offer_letter_draft_notification(offer_id: int, sent_by: str):
    db = SessionLocal()
    try:
        from app.models.offer_letter import OfferLetter
        offer = db.query(OfferLetter).filter(OfferLetter.id == offer_id).first()
        if not offer:
            logger.error(f"Offer letter draft notification failed: offer letter {offer_id} not found")
            return

        company = _get_company_name(db)
        variables = {
            "{applicant_name}": offer.full_name,
            "{employee_id}": offer.employee_id or "TBD",
            "{domain}": offer.domain or "TBD",
            "{duration}": offer.duration or "TBD",
        }

        subject, email_body = _resolve_email_body(
            db, CATEGORY_OFFER_LETTER, OFFER_EMAIL_BODY, {
                **variables,
                "{subject}": f"Internship Offer Letter — {company}",
            }
        )

        pdf_bytes = generate_offer_letter_from_offer(offer, db=db)

        email_sent = False
        try:
            email_sent = send_email(
                to_email=offer.email,
                subject=subject,
                body=_wrap_html(email_body),
                html=True,
                attachments=[("Offer_Letter.pdf", pdf_bytes, "pdf")],
            )
        except Exception as email_err:
            logger.error(f"Offer letter draft email failed: {email_err}")
        if offer.application_id:
            db.add(CommunicationLog(
                application_id=offer.application_id,
                channel="email",
                subject=subject,
                message=email_body + "\n\n[Offer letter PDF attached]",
                status="sent" if email_sent else "failed",
                sent_by=sent_by,
            ))

        wa_sent = False
        pdf_sent = False
        whatsapp_number = offer.whatsapp
        if whatsapp_number:
            try:
                wa_body = _resolve_whatsapp_body(
                    db, CATEGORY_OFFER_LETTER, OFFER_WHATSAPP_MSG, variables
                )
                wa_sent = send_whatsapp_message(
                    to_phone=whatsapp_number,
                    message=wa_body,
                )
                try:
                    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
                    pdf_sent = send_whatsapp_media(
                        to_phone=whatsapp_number,
                        media_url=pdf_b64,
                        caption=f"Offer Letter — {offer.full_name}",
                        filename=f"Offer_Letter_{offer.full_name.replace(' ', '_')}.pdf",
                    )
                except Exception as media_err:
                    logger.error(f"Offer letter draft WhatsApp media failed: {media_err}")
            except Exception as wa_err:
                logger.error(f"Offer letter draft WhatsApp failed: {wa_err}")
            if offer.application_id:
                db.add(CommunicationLog(
                    application_id=offer.application_id,
                    channel="whatsapp",
                    message=wa_body + ("\n\n[Offer letter PDF attached]" if pdf_sent else ""),
                    status="sent" if wa_sent else "failed",
                    sent_by=sent_by,
                ))

        offer.status = "sent"
        from datetime import datetime, timezone
        offer.sent_at = datetime.now(timezone.utc)
        db.add(offer)
        db.commit()

        manager.broadcast_sync("notification", {
            "type": "offer_letter",
            "offer_letter_id": offer.id,
            "application_id": offer.application_id,
            "employee_id": offer.employee_id,
        })
        logger.info(f"Offer letter draft {offer.id} sent to {offer.email} by {sent_by}")
    except Exception as e:
        logger.error(f"Offer letter draft notification failed for offer letter {offer_id}: {e}")
        db.rollback()
    finally:
        db.close()
