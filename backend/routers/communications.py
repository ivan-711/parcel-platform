"""Communications router — send SMS/email and view contact message threads."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.communications.service import CommunicationService
from core.communications.sendgrid_email import SendGridEmailProvider
from core.communications.twilio_sms import TwilioSMSProvider
from core.security.jwt import get_current_user
from core.telemetry import track_event
from database import get_db
from limiter import limiter
from models.communications import Communication
from models.contacts import Contact
from models.deals import Deal
from models.properties import Property
from models.users import User
from schemas.communications import (
    CommunicationResponse,
    SendEmailRequest,
    SendSMSRequest,
    ThreadContact,
    ThreadResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/communications", tags=["communications"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _validate_deal_ownership(db: Session, deal_id, user_id) -> None:
    if deal_id is None:
        return
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == user_id, Deal.deleted_at.is_(None)).first()
    if not deal:
        raise HTTPException(status_code=404, detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"})


def _validate_property_ownership(db: Session, property_id, user_id) -> None:
    if property_id is None:
        return
    prop = db.query(Property).filter(Property.id == property_id, Property.created_by == user_id, Property.is_deleted == False).first()  # noqa: E712
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})


def _get_contact_or_404(db: Session, contact_id: UUID, user_id: UUID) -> Contact:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.created_by == user_id,
        Contact.is_deleted == False,  # noqa: E712
    ).first()
    if not contact:
        raise HTTPException(
            status_code=404,
            detail={"error": "Contact not found", "code": "NOT_FOUND"},
        )
    return contact


def _get_service(db: Session) -> CommunicationService:
    try:
        sms = TwilioSMSProvider()
    except ValueError:
        sms = None  # type: ignore[assignment]
    email = SendGridEmailProvider()
    return CommunicationService(db, sms_provider=sms, email_provider=email)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/send-sms", response_model=CommunicationResponse, status_code=201)
@limiter.limit("60/hour")
async def send_sms(
    request: Request,
    body: SendSMSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommunicationResponse:
    """Send an outbound SMS to a contact."""
    contact = _get_contact_or_404(db, body.contact_id, current_user.id)
    _validate_deal_ownership(db, body.deal_id, current_user.id)
    _validate_property_ownership(db, body.property_id, current_user.id)

    if not contact.phone:
        raise HTTPException(
            status_code=422,
            detail={"error": "Contact has no phone number", "code": "NO_PHONE"},
        )

    if contact.opted_out_sms:
        raise HTTPException(
            status_code=400,
            detail={"error": "Contact has opted out of SMS", "code": "OPTED_OUT"},
        )

    service = _get_service(db)
    try:
        comm = await service.send_sms(
            to_phone=contact.phone,
            body=body.body,
            from_user_id=current_user.id,
            contact_id=contact.id,
            deal_id=body.deal_id,
            property_id=body.property_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "code": "INVALID_REQUEST"})
    except RuntimeError as e:
        msg = str(e).lower()
        if "rate limit" in msg:
            raise HTTPException(status_code=429, detail={"error": str(e), "code": "RATE_LIMITED"})
        if "not configured" in msg:
            raise HTTPException(status_code=503, detail={"error": "SMS service not configured", "code": "PROVIDER_UNAVAILABLE"})
        raise HTTPException(status_code=502, detail={"error": "SMS service error", "code": "PROVIDER_ERROR"})

    track_event(current_user.id, "sms_sent", {"contact_id": str(contact.id)})

    return CommunicationResponse.model_validate(comm)


@router.post("/send-email", response_model=CommunicationResponse, status_code=201)
@limiter.limit("200/hour")
async def send_email(
    request: Request,
    body: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommunicationResponse:
    """Send an outbound email to a contact."""
    contact = _get_contact_or_404(db, body.contact_id, current_user.id)
    _validate_deal_ownership(db, body.deal_id, current_user.id)
    _validate_property_ownership(db, body.property_id, current_user.id)

    if not contact.email:
        raise HTTPException(
            status_code=422,
            detail={"error": "Contact has no email address", "code": "NO_EMAIL"},
        )

    service = _get_service(db)
    try:
        comm = await service.send_email(
            to_email=contact.email,
            subject=body.subject,
            body_html=body.body_html,
            body_text=body.body_text or "",
            from_user_id=current_user.id,
            contact_id=contact.id,
            deal_id=body.deal_id,
            property_id=body.property_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "code": "INVALID_REQUEST"})
    except RuntimeError as e:
        msg = str(e).lower()
        if "rate limit" in msg:
            raise HTTPException(status_code=429, detail={"error": str(e), "code": "RATE_LIMITED"})
        if "not configured" in msg:
            raise HTTPException(status_code=503, detail={"error": "Email service not configured", "code": "PROVIDER_UNAVAILABLE"})
        raise HTTPException(status_code=502, detail={"error": "Email service error", "code": "PROVIDER_ERROR"})

    track_event(current_user.id, "email_sent", {"contact_id": str(contact.id)})

    return CommunicationResponse.model_validate(comm)


@router.get("/thread/{contact_id}", response_model=ThreadResponse)
async def get_thread(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ThreadResponse:
    """Get all communications for a contact, ordered chronologically."""
    contact = _get_contact_or_404(db, contact_id, current_user.id)

    messages = (
        db.query(Communication)
        .filter(
            Communication.contact_id == contact_id,
            Communication.is_deleted == False,  # noqa: E712
        )
        .order_by(Communication.occurred_at.asc())
        .all()
    )

    contact_name = f"{contact.first_name} {contact.last_name or ''}".strip()

    return ThreadResponse(
        contact=ThreadContact(
            id=contact.id,
            name=contact_name,
            phone=contact.phone,
            email=contact.email,
        ),
        messages=[CommunicationResponse.model_validate(m) for m in messages],
        total=len(messages),
    )
