"""Communications webhook router — Twilio and SendGrid inbound/status handlers."""

import logging

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from core.communications.sendgrid_email import SendGridEmailProvider
from core.communications.service import CommunicationService
from core.communications.twilio_sms import TwilioSMSProvider
from core.telemetry import track_event
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["communications-webhooks"])

# Module-level provider instances (no credentials required at import time)
_sms = TwilioSMSProvider.__new__(TwilioSMSProvider)
_sms.account_sid = ""
_sms.auth_token = ""
_sms.default_from = ""
_sms.status_callback_url = ""

_email = SendGridEmailProvider()


def _get_service(db: Session) -> CommunicationService:
    return CommunicationService(db, sms_provider=_sms, email_provider=_email)


# ---------------------------------------------------------------------------
# Twilio
# ---------------------------------------------------------------------------


@router.post("/twilio/incoming")
async def twilio_incoming(
    request: Request,
    db: Session = Depends(get_db),
) -> Response:
    """Receive an inbound Twilio SMS webhook."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    # Lazy-init real credentials from env so module can import without them set
    import os
    _sms.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    _sms.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    _sms.default_from = os.getenv("TWILIO_PHONE_NUMBER", "")

    if not _sms.validate_webhook(body_bytes, signature, url):
        return JSONResponse(
            status_code=403,
            content={"error": "Invalid Twilio signature", "code": "INVALID_SIGNATURE"},
        )

    form = await request.form()
    payload = dict(form)
    parsed = _sms.parse_incoming(payload)

    service = _get_service(db)
    comm = service.handle_incoming_sms(
        from_phone=parsed["from_phone"],
        body=parsed["body"],
        external_id=parsed["external_id"],
    )

    matched_contact = comm.contact_id is not None
    track_event(
        str(comm.created_by),
        "sms_received",
        {"matched_contact": matched_contact, "external_id": parsed["external_id"]},
    )

    twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/status")
async def twilio_status(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Receive Twilio delivery status callback."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    import os
    _sms.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    _sms.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")

    if not _sms.validate_webhook(body_bytes, signature, url):
        return JSONResponse(
            status_code=403,
            content={"error": "Invalid Twilio signature", "code": "INVALID_SIGNATURE"},
        )

    form = await request.form()
    payload = dict(form)
    parsed = _sms.parse_status(payload)

    service = _get_service(db)
    service.update_delivery_status(
        external_id=parsed["external_id"],
        new_status=parsed["status"],
        error_message=parsed.get("error_message"),
    )

    track_event(
        "system",
        "delivery_status_updated",
        {"external_id": parsed["external_id"], "status": parsed["status"]},
    )

    return JSONResponse(status_code=200, content={"status": "ok"})


# ---------------------------------------------------------------------------
# SendGrid
# ---------------------------------------------------------------------------


@router.post("/sendgrid/incoming")
async def sendgrid_incoming(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Receive an inbound email from SendGrid Inbound Parse."""
    form = await request.form()
    payload = dict(form)
    parsed = _email.parse_incoming(payload)

    service = _get_service(db)
    comm = service.handle_incoming_email(
        from_email=parsed["from_email"],
        subject=parsed["subject"],
        body=parsed["body_text"] or parsed["body_html"],
        external_id=parsed["external_id"] or "",
    )

    matched_contact = comm.contact_id is not None
    track_event(
        str(comm.created_by),
        "email_received",
        {"matched_contact": matched_contact, "from_email": parsed["from_email"]},
    )

    return JSONResponse(status_code=200, content={"status": "ok"})


@router.post("/sendgrid/events")
async def sendgrid_events(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Receive SendGrid event webhook (delivery, open, click, bounce, etc.)."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")

    if not _email.validate_webhook(body_bytes, signature):
        return JSONResponse(
            status_code=403,
            content={"error": "Invalid SendGrid signature", "code": "INVALID_SIGNATURE"},
        )

    import json
    try:
        events = json.loads(body_bytes)
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    parsed_events = _email.parse_events(events)
    service = _get_service(db)

    for event in parsed_events:
        service.update_delivery_status(
            external_id=event["external_id"],
            new_status=event["event_type"],
        )

    track_event(
        "system",
        "delivery_status_updated",
        {"count": len(parsed_events), "channel": "email"},
    )

    return JSONResponse(status_code=200, content={"status": "ok"})
