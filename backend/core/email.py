"""Email notifications via Resend API."""

import logging
import os

import resend

logger = logging.getLogger(__name__)


def send_document_complete_email(
    user_email: str, user_name: str, filename: str, document_id: str
) -> bool:
    """Send an email notifying the user that document analysis is complete.

    Returns True on success, False if skipped or failed.  Never raises.
    """
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — skipping email notification")
        return False

    resend.api_key = api_key

    try:
        resend.Emails.send(
            {
                "from": "Parcel <notifications@parcel-platform.app>",
                "to": user_email,
                "subject": f"Document analysis complete: {filename}",
                "html": build_document_complete_html(filename, document_id),
            }
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")
        return False


def build_document_complete_html(filename: str, document_id: str) -> str:
    """Return branded HTML for the document-complete notification email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, sans-serif; background: #08080F; color: #F1F5F9; padding: 40px; max-width: 600px; margin: 0 auto;">
      <div style="margin-bottom: 32px;">
        <span style="color: #6366F1; font-size: 24px; font-weight: 700;">Parcel</span>
      </div>
      <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Document analysis complete</h1>
      <p style="color: #94A3B8; margin-bottom: 24px;">Your document has been analyzed by AI and is ready to review.</p>
      <div style="background: #0F0F1A; border: 1px solid #1A1A2E; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-weight: 500;">{filename}</p>
      </div>
      <a href="https://parcel-platform-kappa.vercel.app/documents" style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Analysis →</a>
      <p style="color: #475569; font-size: 12px; margin-top: 40px;">You're receiving this because you have document notifications enabled in Parcel. <a href="https://parcel-platform-kappa.vercel.app/settings" style="color: #6366F1;">Manage preferences</a></p>
    </body>
    </html>
    """
