"""CommunicationService — orchestrates send/receive and delivery tracking."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.communications.base import BaseEmailProvider, BaseSMSProvider
from core.communications.twilio_sms import normalize_phone, phone_digits
from models.communications import Communication
from models.contacts import Contact
from models.tasks import Task

_NIL_UUID = UUID(int=0)


class CommunicationService:
    """Orchestrates sending/receiving messages and tracking delivery status."""

    def __init__(
        self,
        db: Session,
        sms_provider: BaseSMSProvider | None = None,
        email_provider: BaseEmailProvider | None = None,
    ) -> None:
        self.db = db
        self.sms_provider = sms_provider
        self.email_provider = email_provider

    # ------------------------------------------------------------------
    # Outbound
    # ------------------------------------------------------------------

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
        """Send an outbound SMS and create a Communication record."""
        if self.sms_provider is None:
            raise RuntimeError("No SMS provider configured")

        result = await self.sms_provider.send(to_phone=to_phone, body=body, from_number=None)

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
            external_id=result.get("external_id"),
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
        body_text: str,
        from_user_id: UUID,
        team_id: UUID | None = None,
        from_email: str | None = None,
        reply_to: str | None = None,
        contact_id: UUID | None = None,
        deal_id: UUID | None = None,
        property_id: UUID | None = None,
    ) -> Communication:
        """Send an outbound email and create a Communication record."""
        if self.email_provider is None:
            raise RuntimeError("No email provider configured")

        result = await self.email_provider.send(
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            from_email=from_email or "",
            reply_to=reply_to,
        )

        comm = Communication(
            created_by=from_user_id,
            team_id=team_id,
            channel="email",
            direction="outbound",
            subject=subject,
            body=body_text,
            contact_id=contact_id,
            deal_id=deal_id,
            property_id=property_id,
            occurred_at=datetime.utcnow(),
            external_id=result.get("external_id"),
            status=result.get("status", "queued"),
        )
        self.db.add(comm)
        self.db.commit()
        self.db.refresh(comm)
        return comm

    # ------------------------------------------------------------------
    # Inbound
    # ------------------------------------------------------------------

    def handle_incoming_sms(
        self,
        from_phone: str,
        body: str,
        external_id: str,
    ) -> Communication:
        """Record an inbound SMS, matching to a contact if possible."""
        digits = phone_digits(from_phone)
        contact, owner_id = self._match_contact_by_phone(digits)

        comm = Communication(
            created_by=owner_id or _NIL_UUID,
            team_id=contact.team_id if contact else None,
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
        """Record an inbound email, matching to a contact if possible."""
        contact, owner_id = self._match_contact_by_email(from_email)

        comm = Communication(
            created_by=owner_id or _NIL_UUID,
            team_id=contact.team_id if contact else None,
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

    # ------------------------------------------------------------------
    # Delivery status
    # ------------------------------------------------------------------

    def update_delivery_status(
        self,
        external_id: str,
        new_status: str,
        error_message: str | None = None,
    ) -> Communication | None:
        """Update the delivery status of a Communication by its external_id.

        If the status transitions to 'failed', a follow-up Task is created for
        the owning user so they can investigate.
        """
        comm = (
            self.db.query(Communication)
            .filter(Communication.external_id == external_id)
            .first()
        )
        if comm is None:
            return None

        comm.status = new_status
        comm.status_updated_at = datetime.utcnow()
        if error_message is not None:
            comm.error_message = error_message

        if new_status == "failed":
            # Build a descriptive task title.
            contact_name: str | None = None
            if comm.contact_id:
                contact = self.db.query(Contact).filter(Contact.id == comm.contact_id).first()
                if contact:
                    contact_name = f"{contact.first_name} {contact.last_name or ''}".strip()

            channel_label = comm.channel.upper() if comm.channel else "message"
            if contact_name:
                task_title = f"{channel_label} to {contact_name} failed — check number/email"
            else:
                task_title = f"{channel_label} delivery failed — check number/email"

            task = Task(
                created_by=comm.created_by,
                team_id=comm.team_id,
                title=task_title,
                description=(
                    f"Delivery of {channel_label} (external_id={external_id}) failed. "
                    + (f"Error: {error_message}" if error_message else "No error details.")
                ),
                status="open",
                priority="high",
                contact_id=comm.contact_id,
                deal_id=comm.deal_id,
                property_id=comm.property_id,
            )
            self.db.add(task)

        self.db.commit()
        self.db.refresh(comm)
        return comm

    # ------------------------------------------------------------------
    # Contact matching helpers
    # ------------------------------------------------------------------

    def _match_contact_by_phone(
        self, digits: str
    ) -> tuple[Contact | None, UUID | None]:
        """Match a Contact by phone number using the last 10 digits (US matching).

        Returns (contact, created_by) if exactly one match is found, otherwise
        (None, None).
        """
        search_digits = digits[-10:] if len(digits) >= 10 else digits
        if not search_digits:
            return None, None

        # Strip non-digits from stored phone then match trailing digits.
        stripped = func.regexp_replace(Contact.phone, r"[^\d]", "", "g")
        matches = (
            self.db.query(Contact)
            .filter(
                Contact.is_deleted.is_(False),
                Contact.phone.isnot(None),
                stripped.endswith(search_digits),
            )
            .all()
        )

        if len(matches) == 1:
            c = matches[0]
            return c, c.created_by
        return None, None

    def _match_contact_by_email(
        self, email: str
    ) -> tuple[Contact | None, UUID | None]:
        """Case-insensitive exact match on Contact.email.

        Returns (contact, created_by) if exactly one match is found, otherwise
        (None, None).
        """
        normalised = email.lower().strip()
        matches = (
            self.db.query(Contact)
            .filter(
                Contact.is_deleted.is_(False),
                Contact.email.isnot(None),
                func.lower(Contact.email) == normalised,
            )
            .all()
        )

        if len(matches) == 1:
            c = matches[0]
            return c, c.created_by
        return None, None
