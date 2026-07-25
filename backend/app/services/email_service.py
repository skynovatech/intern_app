import smtplib
import logging
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html: bool = False,
    attachments: Optional[list[tuple[str, bytes, str]]] = None,
) -> bool:
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping email send")
        return False

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if attachments:
                msg = MIMEMultipart("mixed")
                msg_alternative = MIMEMultipart("alternative")
                msg.attach(msg_alternative)
            else:
                msg = MIMEMultipart("alternative")
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            if html:
                part = MIMEText(body, "html", "utf-8")
            else:
                part = MIMEText(body, "plain", "utf-8")
            if attachments:
                msg_alternative.attach(part)
            else:
                msg.attach(part)

            if attachments:
                for filename, data, mime_subtype in attachments:
                    attached = MIMEApplication(data, _subtype=mime_subtype)
                    attached.add_header("Content-Disposition", "attachment", filename=filename)
                    msg.attach(attached)

            if settings.SMTP_USE_SSL:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
                server.starttls()

            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(
                settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME,
                to_email,
                msg.as_string(),
            )
            server.quit()

            if attempt > 1:
                logger.info(f"Email sent to {to_email} on retry attempt {attempt}")
            else:
                logger.info(f"Email sent to {to_email}: {subject}")
            return True

        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed — check SMTP_USERNAME and SMTP_PASSWORD")
            return False

        except (smtplib.SMTPException, TimeoutError, OSError) as e:
            last_error = e
            logger.warning(f"SMTP attempt {attempt}/{MAX_RETRIES} failed for {to_email}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)

        except Exception as e:
            last_error = e
            logger.error(f"Failed to send email to {to_email}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)

    logger.error(f"All {MAX_RETRIES} attempts failed for email to {to_email}: {last_error}")
    return False
