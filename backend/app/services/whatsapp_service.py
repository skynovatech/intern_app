import httpx
import logging
import time
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


def _api_url() -> str:
    return settings.EVOLUTION_API_URL.rstrip("/")


def get_evolution_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if settings.EVOLUTION_API_KEY:
        headers["apikey"] = settings.EVOLUTION_API_KEY
    return headers


def _clean_phone(to_phone: str) -> str:
    clean = to_phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    clean = clean.lstrip("+")
    if not clean.startswith("91") and len(clean) == 10:
        clean = f"91{clean}"
    if not clean.startswith("+"):
        clean = f"+{clean}"
    return clean


def check_connection() -> dict:
    result = {"server": False, "instance": False, "state": "disconnected"}

    try:
        with httpx.Client(timeout=10.0) as client:
            server_resp = client.get(
                f"{_api_url()}/manager",
                headers=get_evolution_headers(),
            )
            result["server"] = server_resp.status_code == 200

            if not result["server"]:
                return result

            instance_resp = client.get(
                f"{_api_url()}/instance/connectionState/{settings.EVOLUTION_INSTANCE_NAME}",
                headers=get_evolution_headers(),
            )

            if instance_resp.status_code == 200:
                data = instance_resp.json()
                result["instance"] = True
                result["state"] = data.get("state", {}).get("connection", "unknown")
            else:
                result["state"] = "instance_not_found"

    except httpx.ConnectError:
        result["state"] = "server_unreachable"
    except Exception as e:
        logger.error(f"Evolution API connection check failed: {e}")
        result["state"] = "error"

    return result


def get_qr_code() -> dict | None:
    if not settings.EVOLUTION_API_KEY or not settings.EVOLUTION_INSTANCE_NAME:
        logger.warning("Evolution API not configured")
        return None

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{_api_url()}/instance/connect/{settings.EVOLUTION_INSTANCE_NAME}",
                headers=get_evolution_headers(),
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "base64": data.get("base64", ""),
                    "code": data.get("code", ""),
                }
            else:
                logger.error(f"QR code fetch failed: {response.status_code}")
                return None

    except Exception as e:
        logger.error(f"Failed to get QR code: {e}")
        return None


def send_whatsapp_message(
    to_phone: str,
    message: str,
) -> bool:
    if not settings.EVOLUTION_API_KEY or not settings.EVOLUTION_INSTANCE_NAME:
        logger.warning("Evolution API not configured — skipping message send")
        return False

    clean_phone = _clean_phone(to_phone)
    url = f"{_api_url()}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
    payload = {
        "number": clean_phone,
        "text": message,
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    url,
                    json=payload,
                    headers=get_evolution_headers(),
                )

            if response.status_code in (200, 201):
                if attempt > 1:
                    logger.info(f"WhatsApp message sent to {clean_phone} on retry attempt {attempt}")
                else:
                    logger.info(f"WhatsApp message sent to {clean_phone}")
                return True
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
                logger.warning(f"WhatsApp attempt {attempt}/{MAX_RETRIES} failed for {clean_phone}: {last_error}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SECONDS * attempt)

        except httpx.TimeoutException as e:
            last_error = e
            logger.warning(f"WhatsApp timeout attempt {attempt}/{MAX_RETRIES} for {clean_phone}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)
        except Exception as e:
            last_error = e
            logger.warning(f"WhatsApp attempt {attempt}/{MAX_RETRIES} failed for {clean_phone}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)

    logger.error(f"All {MAX_RETRIES} attempts failed for WhatsApp to {clean_phone}: {last_error}")
    return False


def send_whatsapp_media(
    to_phone: str,
    media_url: str,
    caption: str = "",
    filename: str = "document.pdf",
) -> bool:
    if not settings.EVOLUTION_API_KEY or not settings.EVOLUTION_INSTANCE_NAME:
        logger.warning("Evolution API not configured — skipping media send")
        return False

    clean_phone = _clean_phone(to_phone)
    url = f"{_api_url()}/message/sendMedia/{settings.EVOLUTION_INSTANCE_NAME}"
    payload = {
        "number": clean_phone,
        "mediatype": "document",
        "mimetype": "application/pdf",
        "media": media_url,
        "fileName": filename,
        "caption": caption,
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    url,
                    json=payload,
                    headers=get_evolution_headers(),
                )

            if response.status_code in (200, 201):
                logger.info(f"WhatsApp media sent to {clean_phone}")
                return True
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
                logger.warning(f"WhatsApp media attempt {attempt}/{MAX_RETRIES} failed: {last_error}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SECONDS * attempt)

        except httpx.TimeoutException as e:
            last_error = e
            logger.warning(f"WhatsApp media timeout attempt {attempt}/{MAX_RETRIES}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)
        except Exception as e:
            last_error = e
            logger.warning(f"WhatsApp media attempt {attempt}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)

    logger.error(f"All {MAX_RETRIES} attempts failed for WhatsApp media: {last_error}")
    return False


def logout_instance() -> bool:
    if not settings.EVOLUTION_API_KEY or not settings.EVOLUTION_INSTANCE_NAME:
        return False

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.delete(
                f"{_api_url()}/instance/logout/{settings.EVOLUTION_INSTANCE_NAME}",
                headers=get_evolution_headers(),
            )
            return response.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Failed to logout instance: {e}")
        return False


def delete_instance() -> bool:
    if not settings.EVOLUTION_API_KEY or not settings.EVOLUTION_INSTANCE_NAME:
        return False

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.delete(
                f"{_api_url()}/instance/delete/{settings.EVOLUTION_INSTANCE_NAME}",
                headers=get_evolution_headers(),
            )
            return response.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Failed to delete instance: {e}")
        return False
