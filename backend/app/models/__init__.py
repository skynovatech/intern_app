from app.models.admin import Admin
from app.models.application import Application
from app.models.communication_log import CommunicationLog
from app.models.status_history import StatusHistory
from app.models.email_template import EmailTemplate
from app.models.whatsapp_template import WhatsAppTemplate
from app.models.interview import Interview

__all__ = [
    "Admin",
    "Application",
    "CommunicationLog",
    "StatusHistory",
    "EmailTemplate",
    "WhatsAppTemplate",
    "Interview",
]
