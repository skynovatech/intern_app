import logging
import time
import httpx
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
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not configured — skipping email send")
        return False

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            payload: dict = {
                "sender": {
                    "name": settings.SMTP_FROM_NAME,
                    "email": settings.SMTP_FROM_EMAIL,
                },
                "to": [{"email": to_email}],
                "subject": subject,
            }

            if html:
                payload["htmlContent"] = body
            else:
                payload["textContent"] = body

            if attachments:
                payload["attachment"] = []
                for filename, data, _mime_subtype in attachments:
                    import base64
                    payload["attachment"].append({
                        "name": filename,
                        "content": base64.b64encode(data).decode("utf-8"),
                    })

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    json=payload,
                    headers={
                        "api-key": settings.BREVO_API_KEY,
                        "Content-Type": "application/json",
                    },
                )

            if response.status_code in (200, 201):
                if attempt > 1:
                    logger.info(f"Email sent to {to_email} on retry attempt {attempt}")
                else:
                    logger.info(f"Email sent to {to_email}: {subject}")
                return True
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
                logger.warning(f"Brevo API attempt {attempt}/{MAX_RETRIES} failed for {to_email}: {last_error}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SECONDS * attempt)

        except httpx.TimeoutException as e:
            last_error = e
            logger.warning(f"Brevo API timeout attempt {attempt}/{MAX_RETRIES} for {to_email}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)
        except Exception as e:
            last_error = e
            logger.error(f"Failed to send email to {to_email}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)

    logger.error(f"All {MAX_RETRIES} attempts failed for email to {to_email}: {last_error}")
    return False
