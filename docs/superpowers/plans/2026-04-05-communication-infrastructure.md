# Communication Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real two-way SMS (Twilio) and email (SendGrid) to the existing manual communication logging system, with provider abstraction, webhook handlers, conversation thread UI, and A2P compliance info.

**Architecture:** Provider base classes → Twilio SMS + SendGrid email implementations → CommunicationService orchestrator → communications router (send endpoints) + webhook router (incoming/status) → frontend ConversationThread + StatusBadge + compose integration.

**Tech Stack:** FastAPI, SQLAlchemy, httpx, Twilio REST API, SendGrid v3 API, React 18, TypeScript, TanStack React Query, Tailwind CSS

---

### Task 1: Communication Model Updates + Migration

**Files:**
- Modify: `backend/models/communications.py`
- Create: `backend/alembic/versions/n4o5p6q7r8s9_add_communication_delivery_fields.py`

- [ ] **Step 1: Add delivery tracking columns to Communication model**

Add these imports and columns to `backend/models/communications.py`:

```python
"""Communication model — passive log of calls, emails, meetings, notes + real message delivery."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base
from models.base import TimestampMixin


class Communication(TimestampMixin, Base):
    """A record of communication — call, sms, email, meeting, or note."""

    __tablename__ = "communications"

    team_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False, index=True)

    channel = Column(String, nullable=False)
    # call | sms | email | meeting | note | packet
    direction = Column(String, nullable=True)
    # inbound | outbound | null for notes
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)

    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)

    occurred_at = Column(DateTime, nullable=False)

    is_deleted = Column(Boolean, default=False, nullable=False)

    # --- Delivery tracking (Wave 4) ---
    external_id = Column(String, nullable=True, index=True)  # Twilio MessageSid or SendGrid message ID
    status = Column(String, default="logged", nullable=False)
    # logged | queued | sent | delivered | failed | bounced | opened | clicked
    status_updated_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    cost_cents = Column(Integer, nullable=True)  # SMS cost in cents
    metadata = Column(JSONB, nullable=True)  # delivery details, open/click tracking
```

- [ ] **Step 2: Create migration**

```python
# backend/alembic/versions/n4o5p6q7r8s9_add_communication_delivery_fields.py
"""Add delivery tracking fields to communications table.

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "n4o5p6q7r8s9"
down_revision = "m3n4o5p6q7r8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("communications", sa.Column("external_id", sa.String, nullable=True))
    op.add_column("communications", sa.Column("status", sa.String, nullable=False, server_default="logged"))
    op.add_column("communications", sa.Column("status_updated_at", sa.DateTime, nullable=True))
    op.add_column("communications", sa.Column("error_message", sa.String, nullable=True))
    op.add_column("communications", sa.Column("cost_cents", sa.Integer, nullable=True))
    op.add_column("communications", sa.Column("metadata", JSONB, nullable=True))
    op.create_index("ix_communications_external_id", "communications", ["external_id"])


def downgrade() -> None:
    op.drop_index("ix_communications_external_id")
    op.drop_column("communications", "metadata")
    op.drop_column("communications", "cost_cents")
    op.drop_column("communications", "error_message")
    op.drop_column("communications", "status_updated_at")
    op.drop_column("communications", "status")
    op.drop_column("communications", "external_id")
```

- [ ] **Step 3: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('models/communications.py').read()); print('OK')"`

- [ ] **Step 4: Commit**

```bash
git add backend/models/communications.py backend/alembic/versions/n4o5p6q7r8s9_add_communication_delivery_fields.py
git commit -m "feat: add delivery tracking fields to Communication model (external_id, status, cost)"
```

---

### Task 2: Provider Base Classes + Twilio SMS Provider

**Files:**
- Create: `backend/core/communications/__init__.py`
- Create: `backend/core/communications/base.py`
- Create: `backend/core/communications/twilio_sms.py`

- [ ] **Step 1: Create package and base classes**

```python
# backend/core/communications/__init__.py
# (empty)
```

```python
# backend/core/communications/base.py
"""Abstract base classes for communication providers."""

from __future__ import annotations
from typing import Any


class BaseSMSProvider:
    """Interface for SMS providers (Twilio, etc.)."""

    async def send(self, to_phone: str, body: str, from_number: str) -> dict:
        """Send SMS. Returns {external_id, status, cost_cents, segments}."""
        raise NotImplementedError

    def validate_webhook(self, body: bytes, signature: str, url: str) -> bool:
        """Validate incoming webhook signature from provider."""
        raise NotImplementedError

    def parse_incoming(self, payload: dict) -> dict:
        """Parse incoming SMS. Returns {from_phone, body, external_id}."""
        raise NotImplementedError

    def parse_status(self, payload: dict) -> dict:
        """Parse status callback. Returns {external_id, status, error_message?}."""
        raise NotImplementedError


class BaseEmailProvider:
    """Interface for email providers (SendGrid, Postmark, etc.)."""

    async def send(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str,
        from_email: str,
        reply_to: str | None = None,
    ) -> dict:
        """Send email. Returns {external_id, status}."""
        raise NotImplementedError

    def validate_webhook(self, body: bytes, signature: str) -> bool:
        """Validate incoming webhook signature."""
        raise NotImplementedError

    def parse_incoming(self, payload: dict) -> dict:
        """Parse inbound email. Returns {from_email, subject, body, external_id}."""
        raise NotImplementedError

    def parse_events(self, payload: list[dict]) -> list[dict]:
        """Parse event webhook. Returns [{external_id, event_type, timestamp}]."""
        raise NotImplementedError
```

- [ ] **Step 2: Create Twilio SMS provider**

```python
# backend/core/communications/twilio_sms.py
"""Twilio SMS provider — sends SMS and validates webhooks via REST API."""

import hashlib
import hmac
import math
import os
import re
from base64 import b64encode
from typing import Any
from urllib.parse import urlencode

import httpx

from core.communications.base import BaseSMSProvider

_TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"

# Twilio status → our status enum
_STATUS_MAP = {
    "accepted": "queued",
    "queued": "queued",
    "sending": "queued",
    "sent": "sent",
    "delivered": "delivered",
    "undelivered": "failed",
    "failed": "failed",
}

# Common Twilio error codes
_ERROR_MESSAGES: dict[int, str] = {
    21211: "Invalid phone number",
    21614: "Not a mobile number",
    21610: "Recipient has opted out (STOP)",
    30003: "Unreachable destination handset",
    30004: "Message blocked",
    30005: "Unknown destination handset",
    30006: "Landline or unreachable carrier",
    30007: "Carrier violation",
    30008: "Unknown error",
}


def normalize_phone(phone: str) -> str:
    """Normalize a phone number to E.164 format (+1XXXXXXXXXX for US)."""
    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) == 10:
        digits = "1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if phone.startswith("+") and len(digits) >= 10:
        return f"+{digits}"
    raise ValueError(f"Cannot normalize phone number: {phone}")


def phone_digits(phone: str) -> str:
    """Extract only digits from a phone number (for matching)."""
    return re.sub(r"[^\d]", "", phone)


class TwilioSMSProvider(BaseSMSProvider):
    """Send and receive SMS via Twilio REST API (no SDK dependency)."""

    def __init__(self) -> None:
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER", "")
        self.status_callback_url = os.getenv("TWILIO_STATUS_CALLBACK_URL", "")

    async def send(self, to_phone: str, body: str, from_number: str | None = None) -> dict:
        """Send SMS via Twilio REST API."""
        if not self.account_sid or not self.auth_token:
            raise RuntimeError("Twilio credentials not configured")

        to_e164 = normalize_phone(to_phone)
        from_e164 = from_number or self.from_number
        if not from_e164:
            raise RuntimeError("No Twilio phone number configured")

        url = f"{_TWILIO_API_BASE}/Accounts/{self.account_sid}/Messages.json"
        form_data = {
            "From": from_e164,
            "To": to_e164,
            "Body": body,
        }
        if self.status_callback_url:
            form_data["StatusCallback"] = self.status_callback_url

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                data=form_data,
                auth=(self.account_sid, self.auth_token),
                timeout=15.0,
            )

        if resp.status_code == 429:
            raise RuntimeError("Twilio rate limit exceeded — try again in a moment")

        data = resp.json()

        if resp.status_code >= 400:
            error_code = data.get("code", 0)
            error_msg = data.get("message", "Unknown Twilio error")
            raise RuntimeError(f"Twilio error {error_code}: {error_msg}")

        # Estimate segments (GSM-7 = 160 chars, UCS-2 = 70 chars)
        segments = math.ceil(len(body) / 160)

        return {
            "external_id": data.get("sid", ""),
            "status": "queued",
            "cost_cents": 1,  # ~$0.0079/segment, round to 1 cent
            "segments": segments,
        }

    def validate_webhook(self, body: bytes, signature: str, url: str) -> bool:
        """Validate Twilio request signature (HMAC-SHA1)."""
        if not self.auth_token:
            return False

        # Twilio validation: sort POST params, concatenate to URL, HMAC-SHA1
        # For form-encoded bodies, parse params and sort
        from urllib.parse import parse_qs
        params = parse_qs(body.decode("utf-8"), keep_blank_values=True)
        sorted_params = sorted(params.items())
        validation_string = url
        for key, values in sorted_params:
            for value in values:
                validation_string += key + value

        expected = b64encode(
            hmac.new(
                self.auth_token.encode("utf-8"),
                validation_string.encode("utf-8"),
                hashlib.sha1,
            ).digest()
        ).decode("utf-8")

        return hmac.compare_digest(expected, signature)

    def parse_incoming(self, payload: dict) -> dict:
        """Parse incoming SMS from Twilio webhook (form-encoded POST)."""
        return {
            "from_phone": payload.get("From", ""),
            "body": payload.get("Body", ""),
            "external_id": payload.get("MessageSid", ""),
        }

    def parse_status(self, payload: dict) -> dict:
        """Parse delivery status callback from Twilio."""
        raw_status = payload.get("MessageStatus", "").lower()
        error_code = payload.get("ErrorCode")

        error_message = None
        if error_code:
            try:
                error_message = _ERROR_MESSAGES.get(int(error_code), f"Error code {error_code}")
            except (ValueError, TypeError):
                error_message = f"Error code {error_code}"

        return {
            "external_id": payload.get("MessageSid", ""),
            "status": _STATUS_MAP.get(raw_status, raw_status),
            "error_message": error_message,
        }
```

- [ ] **Step 3: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "from core.communications.twilio_sms import TwilioSMSProvider, normalize_phone; print(normalize_phone('4145551234')); print('OK')"`

- [ ] **Step 4: Commit**

```bash
git add backend/core/communications/__init__.py backend/core/communications/base.py backend/core/communications/twilio_sms.py
git commit -m "feat: provider base classes + Twilio SMS provider (httpx, E.164 normalization, webhook validation)"
```

---

### Task 3: SendGrid Email Provider

**Files:**
- Create: `backend/core/communications/sendgrid_email.py`

- [ ] **Step 1: Create SendGrid email provider**

```python
# backend/core/communications/sendgrid_email.py
"""SendGrid email provider — sends transactional email and handles event webhooks."""

import hashlib
import hmac
import os
from typing import Any

import httpx

from core.communications.base import BaseEmailProvider

_SENDGRID_API_BASE = "https://api.sendgrid.com/v3"

# SendGrid event → our status enum
_EVENT_MAP = {
    "processed": "queued",
    "delivered": "delivered",
    "bounce": "bounced",
    "dropped": "failed",
    "deferred": "queued",
    "open": "opened",
    "click": "clicked",
    "spamreport": "failed",
    "unsubscribe": "failed",
}


class SendGridEmailProvider(BaseEmailProvider):
    """Send email via SendGrid v3 API."""

    def __init__(self) -> None:
        self.api_key = os.getenv("SENDGRID_API_KEY", "")
        self.webhook_verification_key = os.getenv("SENDGRID_WEBHOOK_VERIFICATION_KEY", "")
        self.default_from = os.getenv("DEFAULT_FROM_EMAIL", "noreply@parceldesk.io")

    async def send(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str,
        from_email: str | None = None,
        reply_to: str | None = None,
    ) -> dict:
        """Send email via SendGrid v3 Mail Send."""
        if not self.api_key:
            raise RuntimeError("SendGrid API key not configured")

        sender = from_email or self.default_from

        payload: dict[str, Any] = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": sender},
            "subject": subject,
            "content": [],
            "tracking_settings": {
                "click_tracking": {"enable": True},
                "open_tracking": {"enable": True},
            },
        }

        if body_text:
            payload["content"].append({"type": "text/plain", "value": body_text})
        payload["content"].append({"type": "text/html", "value": body_html})

        if reply_to:
            payload["reply_to"] = {"email": reply_to}

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{_SENDGRID_API_BASE}/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )

        if resp.status_code == 429:
            raise RuntimeError("SendGrid rate limit exceeded")

        if resp.status_code >= 400:
            error_body = resp.text
            raise RuntimeError(f"SendGrid error {resp.status_code}: {error_body}")

        # SendGrid returns 202 Accepted with x-message-id header
        message_id = resp.headers.get("x-message-id", "")

        return {
            "external_id": message_id,
            "status": "queued",
        }

    def validate_webhook(self, body: bytes, signature: str) -> bool:
        """Validate SendGrid Event Webhook signature (simplified HMAC)."""
        if not self.webhook_verification_key:
            return True  # skip validation if key not configured

        expected = hmac.new(
            self.webhook_verification_key.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    def parse_incoming(self, payload: dict) -> dict:
        """Parse SendGrid Inbound Parse webhook (multipart form)."""
        return {
            "from_email": payload.get("from", ""),
            "subject": payload.get("subject", ""),
            "body": payload.get("text", "") or payload.get("html", ""),
            "external_id": payload.get("headers", ""),  # extract Message-ID from headers
        }

    def parse_events(self, payload: list[dict]) -> list[dict]:
        """Parse SendGrid Event Webhook batch."""
        results = []
        for event in payload:
            event_type = event.get("event", "").lower()
            mapped_status = _EVENT_MAP.get(event_type)
            if not mapped_status:
                continue
            results.append({
                "external_id": event.get("sg_message_id", "").split(".")[0],  # strip filter ID
                "event_type": mapped_status,
                "timestamp": event.get("timestamp"),
                "metadata": {
                    "url": event.get("url"),  # for click events
                    "reason": event.get("reason"),  # for bounce events
                    "ip": event.get("ip"),
                },
            })
        return results
```

- [ ] **Step 2: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "from core.communications.sendgrid_email import SendGridEmailProvider; print('OK')"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/communications/sendgrid_email.py
git commit -m "feat: SendGrid email provider (v3 API, event webhook parsing, open/click tracking)"
```

---

### Task 4: Communication Service

**Files:**
- Create: `backend/core/communications/service.py`

- [ ] **Step 1: Create the service**

```python
# backend/core/communications/service.py
"""Communication service — orchestrates sending, receiving, and status tracking."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.communications.base import BaseEmailProvider, BaseSMSProvider
from core.communications.twilio_sms import normalize_phone, phone_digits
from models.communications import Communication
from models.contacts import Contact
from models.tasks import Task


class CommunicationService:
    """Unified interface for sending and receiving messages."""

    def __init__(
        self,
        db: Session,
        sms_provider: BaseSMSProvider | None = None,
        email_provider: BaseEmailProvider | None = None,
    ) -> None:
        self.db = db
        self.sms_provider = sms_provider
        self.email_provider = email_provider

    async def send_sms(
        self,
        to_phone: str,
        body: str,
        from_user_id: UUID,
        team_id: UUID | None = None,
        contact_id: UUID | None = None,
        deal_id: UUID | None = None,
        property_id: UUID | None = None,
    ) -> Communication:
        """Send an SMS and create a Communication record."""
        if not self.sms_provider:
            raise RuntimeError("SMS provider not configured")

        result = await self.sms_provider.send(to_phone, body, from_number=None)

        comm = Communication(
            created_by=from_user_id,
            team_id=team_id,
            channel="sms",
            direction="outbound",
            body=body,
            contact_id=contact_id,
            deal_id=deal_id,
            property_id=property_id,
            occurred_at=datetime.utcnow(),
            external_id=result["external_id"],
            status=result.get("status", "queued"),
            cost_cents=result.get("cost_cents"),
            metadata={"segments": result.get("segments", 1)},
        )
        self.db.add(comm)
        self.db.commit()
        self.db.refresh(comm)
        return comm

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str | None,
        from_user_id: UUID,
        team_id: UUID | None = None,
        from_email: str | None = None,
        reply_to: str | None = None,
        contact_id: UUID | None = None,
        deal_id: UUID | None = None,
        property_id: UUID | None = None,
    ) -> Communication:
        """Send an email and create a Communication record."""
        if not self.email_provider:
            raise RuntimeError("Email provider not configured")

        result = await self.email_provider.send(
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text or "",
            from_email=from_email,
            reply_to=reply_to,
        )

        comm = Communication(
            created_by=from_user_id,
            team_id=team_id,
            channel="email",
            direction="outbound",
            subject=subject,
            body=body_html,
            contact_id=contact_id,
            deal_id=deal_id,
            property_id=property_id,
            occurred_at=datetime.utcnow(),
            external_id=result["external_id"],
            status=result.get("status", "queued"),
        )
        self.db.add(comm)
        self.db.commit()
        self.db.refresh(comm)
        return comm

    def handle_incoming_sms(
        self,
        from_phone: str,
        body: str,
        external_id: str,
    ) -> Communication:
        """Process an incoming SMS. Match to a contact if possible."""
        digits = phone_digits(from_phone)
        contact, user_id = self._match_contact_by_phone(digits)

        comm = Communication(
            created_by=user_id or UUID(int=0),  # system user if unmatched
            channel="sms",
            direction="inbound",
            body=body,
            contact_id=contact.id if contact else None,
            occurred_at=datetime.utcnow(),
            external_id=external_id,
            status="delivered",
        )
        self.db.add(comm)
        self.db.commit()
        self.db.refresh(comm)
        return comm

    def handle_incoming_email(
        self,
        from_email: str,
        subject: str,
        body: str,
        external_id: str,
    ) -> Communication:
        """Process an incoming email. Match to a contact if possible."""
        contact, user_id = self._match_contact_by_email(from_email)

        comm = Communication(
            created_by=user_id or UUID(int=0),
            channel="email",
            direction="inbound",
            subject=subject,
            body=body,
            contact_id=contact.id if contact else None,
            occurred_at=datetime.utcnow(),
            external_id=external_id,
            status="delivered",
        )
        self.db.add(comm)
        self.db.commit()
        self.db.refresh(comm)
        return comm

    def update_delivery_status(
        self,
        external_id: str,
        new_status: str,
        error_message: str | None = None,
    ) -> Communication | None:
        """Update a Communication's delivery status by external_id."""
        comm = self.db.query(Communication).filter(
            Communication.external_id == external_id,
        ).first()
        if not comm:
            return None

        comm.status = new_status
        comm.status_updated_at = datetime.utcnow()
        if error_message:
            comm.error_message = error_message

        # If failed, create a task for the user
        if new_status == "failed" and comm.created_by:
            contact_name = "Unknown"
            if comm.contact_id:
                contact = self.db.query(Contact).filter(Contact.id == comm.contact_id).first()
                if contact:
                    contact_name = " ".join(filter(None, [contact.first_name, contact.last_name]))

            task = Task(
                created_by=comm.created_by,
                title=f"{comm.channel.upper()} to {contact_name} failed — check number/email",
                description=error_message or "Message delivery failed",
                status="open",
                priority="high",
                contact_id=comm.contact_id,
                property_id=comm.property_id,
                deal_id=comm.deal_id,
            )
            self.db.add(task)

        self.db.commit()
        self.db.refresh(comm)
        return comm

    def _match_contact_by_phone(self, digits: str) -> tuple[Contact | None, UUID | None]:
        """Find a contact by phone number (digits-only comparison)."""
        if not digits or len(digits) < 10:
            return None, None

        # Strip leading '1' for US numbers to match both formats
        search_digits = digits[-10:] if len(digits) == 11 and digits.startswith("1") else digits

        contacts = self.db.query(Contact).filter(
            Contact.is_deleted == False,  # noqa: E712
            Contact.phone.isnot(None),
            func.regexp_replace(Contact.phone, r"[^\d]", "", "g").endswith(search_digits),
        ).all()

        if len(contacts) == 1:
            return contacts[0], contacts[0].created_by
        return None, None  # ambiguous or no match

    def _match_contact_by_email(self, email: str) -> tuple[Contact | None, UUID | None]:
        """Find a contact by email (case-insensitive exact match)."""
        if not email:
            return None, None

        contact = self.db.query(Contact).filter(
            Contact.is_deleted == False,  # noqa: E712
            func.lower(Contact.email) == email.lower().strip(),
        ).first()

        if contact:
            return contact, contact.created_by
        return None, None
```

- [ ] **Step 2: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('core/communications/service.py').read()); print('OK')"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/communications/service.py
git commit -m "feat: CommunicationService — send/receive SMS/email, contact matching, status tracking"
```

---

### Task 5: Communication Schemas + Router + Webhook Router

**Files:**
- Create: `backend/schemas/communications.py`
- Create: `backend/routers/communications.py`
- Create: `backend/routers/webhooks/__init__.py`
- Create: `backend/routers/webhooks/communications.py`
- Modify: `backend/main.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Create schemas**

```python
# backend/schemas/communications.py
"""Pydantic schemas for communication send endpoints and thread view."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SendSMSRequest(BaseModel):
    contact_id: UUID
    body: str = Field(..., min_length=1, max_length=1600)
    deal_id: Optional[UUID] = None
    property_id: Optional[UUID] = None


class SendEmailRequest(BaseModel):
    contact_id: UUID
    subject: str = Field(..., min_length=1)
    body_html: str = Field(..., min_length=1)
    body_text: Optional[str] = None
    deal_id: Optional[UUID] = None
    property_id: Optional[UUID] = None


class CommunicationResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    channel: str
    direction: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: str = "logged"
    error_message: Optional[str] = None
    external_id: Optional[str] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    property_id: Optional[UUID] = None
    cost_cents: Optional[int] = None
    occurred_at: datetime
    created_at: datetime


class ThreadContact(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class ThreadResponse(BaseModel):
    contact: ThreadContact
    messages: list[CommunicationResponse]
    total: int
```

- [ ] **Step 2: Create communications router**

```python
# backend/routers/communications.py
"""Communications router — send SMS/email and view conversation threads."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.communications.service import CommunicationService
from core.communications.twilio_sms import TwilioSMSProvider
from core.communications.sendgrid_email import SendGridEmailProvider
from core.security.jwt import get_current_user
from database import get_db
from models.communications import Communication
from models.contacts import Contact
from models.users import User
from schemas.communications import (
    CommunicationResponse,
    SendEmailRequest,
    SendSMSRequest,
    ThreadContact,
    ThreadResponse,
)

router = APIRouter(prefix="/communications", tags=["communications"])


def _get_service(db: Session) -> CommunicationService:
    return CommunicationService(
        db=db,
        sms_provider=TwilioSMSProvider(),
        email_provider=SendGridEmailProvider(),
    )


def _get_contact_or_404(db: Session, contact_id: UUID, user_id: UUID) -> Contact:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.created_by == user_id,
        Contact.is_deleted == False,  # noqa: E712
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail={"error": "Contact not found", "code": "CONTACT_NOT_FOUND"})
    return contact


@router.post("/send-sms", response_model=CommunicationResponse, status_code=201)
async def send_sms(
    body: SendSMSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send an SMS to a contact."""
    contact = _get_contact_or_404(db, body.contact_id, current_user.id)
    if not contact.phone:
        raise HTTPException(status_code=400, detail={"error": "Contact has no phone number", "code": "NO_PHONE"})

    service = _get_service(db)
    comm = await service.send_sms(
        to_phone=contact.phone,
        body=body.body,
        from_user_id=current_user.id,
        team_id=current_user.team_id,
        contact_id=contact.id,
        deal_id=body.deal_id,
        property_id=body.property_id,
    )

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "sms_sent", {
            "contact_id": str(contact.id),
            "body_length": len(body.body),
            "has_deal": body.deal_id is not None,
            "has_property": body.property_id is not None,
        })
    except Exception:
        pass

    return CommunicationResponse.model_validate(comm, from_attributes=True)


@router.post("/send-email", response_model=CommunicationResponse, status_code=201)
async def send_email(
    body: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send an email to a contact."""
    contact = _get_contact_or_404(db, body.contact_id, current_user.id)
    if not contact.email:
        raise HTTPException(status_code=400, detail={"error": "Contact has no email address", "code": "NO_EMAIL"})

    service = _get_service(db)
    comm = await service.send_email(
        to_email=contact.email,
        subject=body.subject,
        body_html=body.body_html,
        body_text=body.body_text,
        from_user_id=current_user.id,
        team_id=current_user.team_id,
        contact_id=contact.id,
        deal_id=body.deal_id,
        property_id=body.property_id,
    )

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "email_sent", {
            "contact_id": str(contact.id),
            "has_subject": bool(body.subject),
            "body_length": len(body.body_html),
        })
    except Exception:
        pass

    return CommunicationResponse.model_validate(comm, from_attributes=True)


@router.get("/thread/{contact_id}", response_model=ThreadResponse)
async def get_thread(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get conversation thread with a contact, ordered chronologically."""
    contact = _get_contact_or_404(db, contact_id, current_user.id)

    comms = db.query(Communication).filter(
        Communication.contact_id == contact_id,
        Communication.created_by == current_user.id,
        Communication.is_deleted == False,  # noqa: E712
    ).order_by(Communication.occurred_at.asc()).all()

    full_name = " ".join(filter(None, [contact.first_name, contact.last_name]))

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "conversation_thread_viewed", {
            "contact_id": str(contact_id),
            "message_count": len(comms),
        })
    except Exception:
        pass

    return ThreadResponse(
        contact=ThreadContact(
            id=contact.id,
            name=full_name,
            phone=contact.phone,
            email=contact.email,
        ),
        messages=[CommunicationResponse.model_validate(c, from_attributes=True) for c in comms],
        total=len(comms),
    )
```

- [ ] **Step 3: Create webhook router**

```python
# backend/routers/webhooks/__init__.py
# (empty)
```

```python
# backend/routers/webhooks/communications.py
"""Webhook endpoints for Twilio and SendGrid — NO auth, validated by provider signatures."""

from fastapi import APIRouter, Request, Response
from sqlalchemy.orm import Session

from core.communications.service import CommunicationService
from core.communications.twilio_sms import TwilioSMSProvider
from core.communications.sendgrid_email import SendGridEmailProvider
from database import get_db
from fastapi import Depends

router = APIRouter(tags=["webhooks-communications"])

_sms = TwilioSMSProvider()
_email = SendGridEmailProvider()

TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'


@router.post("/twilio/incoming")
async def twilio_incoming(request: Request, db: Session = Depends(get_db)):
    """Receive incoming SMS from Twilio."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    if not _sms.validate_webhook(body_bytes, signature, url):
        return Response(content="Invalid signature", status_code=403)

    form = await request.form()
    payload = dict(form)
    parsed = _sms.parse_incoming(payload)

    service = CommunicationService(db=db, sms_provider=_sms)
    comm = service.handle_incoming_sms(
        from_phone=parsed["from_phone"],
        body=parsed["body"],
        external_id=parsed["external_id"],
    )

    try:
        from core.telemetry import track_event
        track_event(None, "sms_received", {
            "matched_contact": comm.contact_id is not None,
        })
    except Exception:
        pass

    return Response(content=TWIML_EMPTY, media_type="application/xml")


@router.post("/twilio/status")
async def twilio_status(request: Request, db: Session = Depends(get_db)):
    """Receive delivery status updates from Twilio."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    if not _sms.validate_webhook(body_bytes, signature, url):
        return Response(content="Invalid signature", status_code=403)

    form = await request.form()
    payload = dict(form)
    parsed = _sms.parse_status(payload)

    service = CommunicationService(db=db)
    service.update_delivery_status(
        external_id=parsed["external_id"],
        new_status=parsed["status"],
        error_message=parsed.get("error_message"),
    )

    try:
        from core.telemetry import track_event
        track_event(None, "delivery_status_updated", {
            "channel": "sms",
            "status": parsed["status"],
        })
    except Exception:
        pass

    return Response(status_code=200)


@router.post("/sendgrid/incoming")
async def sendgrid_incoming(request: Request, db: Session = Depends(get_db)):
    """Receive inbound email from SendGrid Inbound Parse."""
    form = await request.form()
    payload = dict(form)
    parsed = _email.parse_incoming(payload)

    service = CommunicationService(db=db, email_provider=_email)
    comm = service.handle_incoming_email(
        from_email=parsed["from_email"],
        subject=parsed["subject"],
        body=parsed["body"],
        external_id=parsed["external_id"],
    )

    try:
        from core.telemetry import track_event
        track_event(None, "email_received", {
            "matched_contact": comm.contact_id is not None,
        })
    except Exception:
        pass

    return Response(status_code=200)


@router.post("/sendgrid/events")
async def sendgrid_events(request: Request, db: Session = Depends(get_db)):
    """Receive event webhooks from SendGrid (opens, clicks, bounces)."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")

    if not _email.validate_webhook(body_bytes, signature):
        return Response(content="Invalid signature", status_code=403)

    events = await request.json()
    parsed_events = _email.parse_events(events)

    service = CommunicationService(db=db)
    for event in parsed_events:
        service.update_delivery_status(
            external_id=event["external_id"],
            new_status=event["event_type"],
        )

    try:
        from core.telemetry import track_event
        for event in parsed_events:
            track_event(None, "delivery_status_updated", {
                "channel": "email",
                "status": event["event_type"],
            })
    except Exception:
        pass

    return Response(status_code=200)
```

- [ ] **Step 4: Register routers in main.py**

Add to the import line:
```python
from routers import ..., communications as comms_router  # noqa: E402
from routers.webhooks import communications as comms_webhooks  # noqa: E402
```

Add router registrations:
```python
app.include_router(comms_router.router, prefix="/api")
app.include_router(comms_webhooks.router, prefix="/api/webhooks/communications")
```

- [ ] **Step 5: Update .env.example**

Add after the Bricked section:
```
# Twilio SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_STATUS_CALLBACK_URL=

# SendGrid email
SENDGRID_API_KEY=
SENDGRID_WEBHOOK_VERIFICATION_KEY=
DEFAULT_FROM_EMAIL=noreply@parceldesk.io
```

- [ ] **Step 6: Verify**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('routers/communications.py').read()); ast.parse(open('routers/webhooks/communications.py').read()); ast.parse(open('schemas/communications.py').read()); print('ALL OK')"`

- [ ] **Step 7: Commit**

```bash
git add backend/schemas/communications.py backend/routers/communications.py backend/routers/webhooks/__init__.py backend/routers/webhooks/communications.py backend/main.py backend/.env.example
git commit -m "feat: communications router (send SMS/email, thread) + webhook handlers (Twilio/SendGrid)"
```

---

### Task 6: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useCommunications.ts`

- [ ] **Step 1: Add types**

Append to `frontend/src/types/index.ts`:

```typescript
// ---------------------------------------------------------------------------
// Communication + Thread types
// ---------------------------------------------------------------------------

export type DeliveryStatus = 'logged' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'

export interface SendSMSRequest {
  contact_id: string
  body: string
  deal_id?: string
  property_id?: string
}

export interface SendEmailRequest {
  contact_id: string
  subject: string
  body_html: string
  body_text?: string
  deal_id?: string
  property_id?: string
}

export interface ThreadMessage {
  id: string
  channel: string
  direction: 'inbound' | 'outbound' | null
  subject: string | null
  body: string | null
  status: DeliveryStatus
  error_message: string | null
  external_id: string | null
  contact_id: string | null
  deal_id: string | null
  property_id: string | null
  cost_cents: number | null
  occurred_at: string
  created_at: string
}

export interface ThreadContact {
  id: string
  name: string
  phone: string | null
  email: string | null
}

export interface ThreadResponse {
  contact: ThreadContact
  messages: ThreadMessage[]
  total: number
}
```

- [ ] **Step 2: Add API namespace**

Add to the `api` object in `frontend/src/lib/api.ts`:

```typescript
  communications: {
    sendSMS: (data: import('@/types').SendSMSRequest) =>
      request<import('@/types').ThreadMessage>('/api/communications/send-sms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendEmail: (data: import('@/types').SendEmailRequest) =>
      request<import('@/types').ThreadMessage>('/api/communications/send-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    thread: (contactId: string) =>
      request<import('@/types').ThreadResponse>(`/api/communications/thread/${contactId}`),
  },
```

- [ ] **Step 3: Create hooks**

```typescript
// frontend/src/hooks/useCommunications.ts
/** Communication thread and send hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { SendSMSRequest, SendEmailRequest } from '@/types'

export function useThread(contactId: string | undefined) {
  return useQuery({
    queryKey: ['communications', 'thread', contactId],
    queryFn: () => api.communications.thread(contactId!),
    enabled: !!contactId,
    staleTime: 10_000,
    refetchInterval: 30_000, // poll for new messages
  })
}

export function useSendSMS() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendSMSRequest) => api.communications.sendSMS(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'thread', variables.contact_id] })
      queryClient.invalidateQueries({ queryKey: ['contact-communications', variables.contact_id] })
      toast.success('SMS sent')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send SMS'),
  })
}

export function useSendEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendEmailRequest) => api.communications.sendEmail(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'thread', variables.contact_id] })
      queryClient.invalidateQueries({ queryKey: ['contact-communications', variables.contact_id] })
      toast.success('Email sent')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send email'),
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useCommunications.ts
git commit -m "feat: communication types, API namespace, and React Query hooks (thread, sendSMS, sendEmail)"
```

---

### Task 7: StatusBadge + ConversationThread Components

**Files:**
- Create: `frontend/src/components/communications/StatusBadge.tsx`
- Create: `frontend/src/components/communications/ConversationThread.tsx`

- [ ] **Step 1: Create StatusBadge**

```typescript
// frontend/src/components/communications/StatusBadge.tsx
import { Check, CheckCheck, Clock, Eye, ExternalLink, AlertCircle, XCircle, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliveryStatus } from '@/types'

const STATUS_CONFIG: Record<DeliveryStatus, { icon: React.ElementType; color: string; label: string }> = {
  logged: { icon: Edit3, color: 'text-[#8A8580]', label: 'Logged' },
  queued: { icon: Clock, color: 'text-[#8A8580]', label: 'Queued' },
  sent: { icon: Check, color: 'text-[#60A5FA]', label: 'Sent' },
  delivered: { icon: CheckCheck, color: 'text-[#4ADE80]', label: 'Delivered' },
  opened: { icon: Eye, color: 'text-[#60A5FA]', label: 'Opened' },
  clicked: { icon: ExternalLink, color: 'text-[#8B7AFF]', label: 'Clicked' },
  failed: { icon: AlertCircle, color: 'text-[#EF4444]', label: 'Failed' },
  bounced: { icon: XCircle, color: 'text-[#EF4444]', label: 'Bounced' },
}

interface Props {
  status: DeliveryStatus
  errorMessage?: string | null
  className?: string
}

export function StatusBadge({ status, errorMessage, className }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.logged
  const Icon = config.icon

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', config.color, className)}
      title={errorMessage || config.label}
    >
      <Icon size={10} />
      <span className="text-[10px]">{config.label}</span>
    </span>
  )
}
```

- [ ] **Step 2: Create ConversationThread**

```typescript
// frontend/src/components/communications/ConversationThread.tsx
import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Mail, Send, Loader2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { useThread, useSendSMS, useSendEmail } from '@/hooks/useCommunications'
import { cn } from '@/lib/utils'
import type { ThreadMessage, DeliveryStatus } from '@/types'

interface Props {
  contactId: string
  contactPhone: string | null
  contactEmail: string | null
}

const CHANNEL_ICON: Record<string, React.ElementType> = {
  sms: MessageSquare,
  email: Mail,
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 0) return time
  if (diffDays === 1) return `Yesterday ${time}`
  if (diffDays < 7) return `${diffDays}d ago ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

export function ConversationThread({ contactId, contactPhone, contactEmail }: Props) {
  const { data, isLoading } = useThread(contactId)
  const sendSMS = useSendSMS()
  const sendEmail = useSendEmail()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Compose state
  const defaultChannel = contactPhone ? 'sms' : contactEmail ? 'email' : 'sms'
  const [channel, setChannel] = useState<'sms' | 'email'>(defaultChannel)
  const [messageBody, setMessageBody] = useState('')
  const [emailSubject, setEmailSubject] = useState('')

  const isSending = sendSMS.isPending || sendEmail.isPending
  const messages = data?.messages ?? []

  // Filter to real messages (not logged activities)
  const realMessages = messages.filter(
    (m) => m.channel === 'sms' || m.channel === 'email'
  )

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [realMessages.length])

  function handleSend() {
    if (!messageBody.trim()) return

    if (channel === 'sms') {
      sendSMS.mutate(
        { contact_id: contactId, body: messageBody.trim() },
        { onSuccess: () => setMessageBody('') },
      )
    } else {
      sendEmail.mutate(
        {
          contact_id: contactId,
          subject: emailSubject.trim() || 'Message from Parcel',
          body_html: `<p>${messageBody.trim().replace(/\n/g, '<br>')}</p>`,
          body_text: messageBody.trim(),
        },
        {
          onSuccess: () => {
            setMessageBody('')
            setEmailSubject('')
          },
        },
      )
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (channel === 'sms' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (channel === 'email' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-[#141311] rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const canSendSMS = !!contactPhone
  const canSendEmail = !!contactEmail
  const smsChars = messageBody.length
  const smsSegments = Math.ceil(smsChars / 160) || 1

  return (
    <div className="flex flex-col">
      {/* Messages area */}
      <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
        {realMessages.length === 0 ? (
          <p className="text-sm text-[#8A8580] py-6 text-center">
            No messages yet. Send the first one below.
          </p>
        ) : (
          realMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose area */}
      {(canSendSMS || canSendEmail) && (
        <div className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-xl p-3 space-y-2">
          {/* Channel toggle */}
          <div className="flex items-center gap-1">
            {canSendSMS && (
              <button
                onClick={() => setChannel('sms')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer',
                  channel === 'sms'
                    ? 'bg-[#8B7AFF]/15 text-[#A89FFF] border border-[#8B7AFF]/30'
                    : 'text-[#8A8580] hover:text-[#C5C0B8]',
                )}
              >
                <MessageSquare size={12} /> SMS
              </button>
            )}
            {canSendEmail && (
              <button
                onClick={() => setChannel('email')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer',
                  channel === 'email'
                    ? 'bg-[#8B7AFF]/15 text-[#A89FFF] border border-[#8B7AFF]/30'
                    : 'text-[#8A8580] hover:text-[#C5C0B8]',
                )}
              >
                <Mail size={12} /> Email
              </button>
            )}
          </div>

          {/* Email subject */}
          {channel === 'email' && (
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-1.5 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40"
            />
          )}

          {/* Message body + send */}
          <div className="flex items-end gap-2">
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={channel === 'sms' ? 'Type a message...' : 'Type your message...'}
              className="flex-1 px-3 py-2 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40 resize-none"
              style={{ minHeight: '38px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !messageBody.trim()}
              className="shrink-0 w-9 h-9 rounded-lg bg-[#8B7AFF] text-white flex items-center justify-center hover:bg-[#7B6AEF] transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* SMS char counter */}
          {channel === 'sms' && smsChars > 0 && (
            <p className={cn('text-[10px] text-right', smsChars > 160 ? 'text-[#FBBF24]' : 'text-[#8A8580]')}>
              {smsChars}/160 {smsSegments > 1 && `(${smsSegments} segments)`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Message Bubble ──────────────────────────────────────
function MessageBubble({ message }: { message: ThreadMessage }) {
  const isOutbound = message.direction === 'outbound'
  const ChannelIcon = CHANNEL_ICON[message.channel] ?? MessageSquare

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-xl px-3.5 py-2.5 border',
          isOutbound
            ? 'bg-[#8B7AFF]/15 border-[#8B7AFF]/30'
            : 'bg-[#141311] border-[#1E1D1B]',
        )}
      >
        {message.subject && (
          <p className="text-xs text-[#C5C0B8] font-medium mb-1">{message.subject}</p>
        )}
        <p className="text-sm text-[#F0EDE8] whitespace-pre-wrap break-words">
          {message.body}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <ChannelIcon size={10} className="text-[#8A8580]" />
          <span className="text-[10px] text-[#8A8580]">{formatTime(message.occurred_at)}</span>
          {message.status !== 'logged' && (
            <StatusBadge
              status={message.status as DeliveryStatus}
              errorMessage={message.error_message}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/communications/StatusBadge.tsx frontend/src/components/communications/ConversationThread.tsx
git commit -m "feat: StatusBadge + ConversationThread components (iMessage-style bubbles, compose area)"
```

---

### Task 8: Contact Detail Page Integration

**Files:**
- Modify: `frontend/src/pages/contacts/ContactDetailPage.tsx`

- [ ] **Step 1: Integrate ConversationThread**

Replace the Communications Log section with ConversationThread + keep LogActivityForm:

1. Add import: `import { ConversationThread } from '@/components/communications/ConversationThread'`
2. In the Communications section (around line 221-252), replace the existing layout:
   - Show ConversationThread when contact has phone or email
   - Keep the "Log Activity" toggle and LogActivityForm below it
   - Change section title from "Communications Log" to "Conversation"

The section becomes:
```
Conversation
  ConversationThread (with compose area)
  ── divider ──
  Log Activity toggle → LogActivityForm (for manual call/meeting/note logging)
  ── divider ──
  CommunicationLog (shows ALL logged activities: calls, meetings, notes, packets)
```

3. Add `MessageSquare` to the lucide imports.

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/contacts/ContactDetailPage.tsx
git commit -m "feat: integrate ConversationThread on ContactDetailPage (thread + compose + activity log)"
```

---

### Task 9: A2P Compliance Section in Settings

**Files:**
- Modify: `frontend/src/pages/settings/SettingsPage.tsx`

- [ ] **Step 1: Add SMS Compliance tab**

Add a new tab `{ id: 'sms', label: 'SMS' }` to the tabs array in SettingsPage.

Create an `SMSCompliance` component inside the file (or inline) that shows:
- A status card: "Not Registered" (red) | "Pending" (yellow) | "Approved" (green)
- For MVP: status is always "Not Registered" until manual Twilio setup
- A "Register Your Brand" button that expands a form with: business name, type, EIN, address, website, use case
- Submit saves to localStorage for now (actual A2P registration is manual via Twilio console)
- Show a note: "Contact support to complete Twilio A2P registration after submitting this form."

Use the same Card/section styling as existing settings tabs. Satoshi 300 headings. Dark theme tokens.

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/settings/SettingsPage.tsx
git commit -m "feat: A2P 10DLC compliance info section in Settings (SMS tab)"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Backend syntax check**

Run: `cd /Users/ivanflores/parcel-platform/backend && python3 -c "import ast; ast.parse(open('models/communications.py').read()); ast.parse(open('core/communications/service.py').read()); ast.parse(open('core/communications/twilio_sms.py').read()); ast.parse(open('core/communications/sendgrid_email.py').read()); ast.parse(open('routers/communications.py').read()); ast.parse(open('routers/webhooks/communications.py').read()); ast.parse(open('schemas/communications.py').read()); print('ALL OK')"`

- [ ] **Step 2: Frontend build check**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Fix any remaining issues**
