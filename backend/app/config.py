from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:12345@localhost:5432/internship_ats"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ADMIN_EMAIL: str = "admin@company.com"
    ADMIN_PASSWORD: str = "admin123"
    UPLOAD_DIR: str = "uploads"

    # Brevo SMTP (Email)
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "hr@skynovatech.in"
    SMTP_FROM_NAME: str = "Skynova Tech Solutions"
    SMTP_USE_SSL: bool = False

    BREVO_API_KEY: str = ""

    # Company
    COMPANY_NAME: str = "Skynova Tech Solutions"
    COMPANY_TAGLINE: str = "A Global Entity of Skynova Tech Solutions"
    COMPANY_PHONE: str = ""
    COMPANY_EMAIL: str = ""
    COMPANY_ADDRESS: str = ""

    # App URL (used for generating links in notifications, WhatsApp media, etc.)
    APP_URL: str = "http://127.0.0.1:8000"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Evolution API (WhatsApp)
    EVOLUTION_API_URL: str = "http://localhost:8085"
    EVOLUTION_API_KEY: str = ""
    EVOLUTION_INSTANCE_NAME: str = "ats-whatsapp"

    # Interview reminders (auto-notifications)
    REMINDER_ENABLED: bool = True
    REMINDER_HOURS_BEFORE: int = 24
    REMINDER_INTERVAL_MINUTES: int = 60

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
