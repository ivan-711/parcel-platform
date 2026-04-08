"""Service readiness — reports which optional external services are configured."""

import os

from fastapi import APIRouter

router = APIRouter()


@router.get("/service-status")
async def service_status():
    """Return which optional services have API keys configured.

    Public endpoint — no authentication required. Used by the frontend
    ComingSoonGate component to decide whether to show a feature page
    or a "Coming Soon" placeholder.
    """
    return {
        "skip_tracing": bool(os.getenv("BATCHDATA_API_KEY")),
        "direct_mail": bool(os.getenv("LOB_API_KEY")),
        "sms": bool(os.getenv("TWILIO_ACCOUNT_SID")),
        "email_outbound": bool(os.getenv("SENDGRID_API_KEY")),
    }
