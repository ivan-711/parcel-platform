"""SequenceEngine — enroll contacts, process due steps, handle replies."""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from models.contacts import Contact
from models.properties import Property
from models.sequences import Sequence, SequenceEnrollment, SequenceStep
from models.users import User


class SequenceEngine:
    """Stateless engine for driving automated follow-up sequences."""

    def __init__(self, db: Session, communication_service) -> None:
        self.db = db
        self.comm_service = communication_service

    # ------------------------------------------------------------------
    # Enroll
    # ------------------------------------------------------------------

    async def enroll(
        self,
        sequence_id: UUID,
        contact_id: UUID,
        user_id: UUID,
        team_id: UUID | None = None,
        property_id: UUID | None = None,
        deal_id: UUID | None = None,
    ) -> SequenceEnrollment:
        """Enroll a contact in a sequence and schedule the first step."""
        # Validate sequence
        sequence = (
            self.db.query(Sequence)
            .filter(
                Sequence.id == sequence_id,
                Sequence.created_by == user_id,
                Sequence.status == "active",
                Sequence.deleted_at.is_(None),
            )
            .first()
        )
        if sequence is None:
            raise ValueError("Sequence not found, not active, or does not belong to user")

        # Check for existing active enrollment
        existing = (
            self.db.query(SequenceEnrollment)
            .filter(
                SequenceEnrollment.sequence_id == sequence_id,
                SequenceEnrollment.contact_id == contact_id,
                SequenceEnrollment.status == "active",
                SequenceEnrollment.deleted_at.is_(None),
            )
            .first()
        )
        if existing is not None:
            raise ValueError("Contact is already actively enrolled in this sequence")

        # Get first step
        first_step = (
            self.db.query(SequenceStep)
            .filter(
                SequenceStep.sequence_id == sequence_id,
                SequenceStep.deleted_at.is_(None),
            )
            .order_by(SequenceStep.step_order)
            .first()
        )
        if first_step is None:
            raise ValueError("Sequence has no steps")

        # Calculate next_send_at from first step delay
        now = datetime.utcnow()
        next_send_at = now + timedelta(
            days=first_step.delay_days,
            hours=first_step.delay_hours,
        )

        enrollment = SequenceEnrollment(
            sequence_id=sequence_id,
            contact_id=contact_id,
            created_by=user_id,
            team_id=team_id if hasattr(SequenceEnrollment, "team_id") else None,
            property_id=property_id,
            deal_id=deal_id,
            status="active",
            current_step=0,
            next_send_at=next_send_at,
        )
        self.db.add(enrollment)

        sequence.total_enrolled = (sequence.total_enrolled or 0) + 1

        self.db.commit()
        self.db.refresh(enrollment)
        return enrollment

    # ------------------------------------------------------------------
    # Process due enrollments
    # ------------------------------------------------------------------

    async def process_due_enrollments(self) -> int:
        """Execute all steps whose next_send_at is now or past. Returns count processed."""
        now = datetime.utcnow()
        due = (
            self.db.query(SequenceEnrollment)
            .join(Sequence, Sequence.id == SequenceEnrollment.sequence_id)
            .join(Contact, Contact.id == SequenceEnrollment.contact_id)
            .filter(
                SequenceEnrollment.status == "active",
                SequenceEnrollment.next_send_at <= now,
                SequenceEnrollment.deleted_at.is_(None),
                Sequence.status == "active",
                Sequence.deleted_at.is_(None),
                Contact.is_deleted.is_(False),
            )
            .with_for_update(skip_locked=True)
            .all()
        )

        processed = 0
        for enrollment in due:
            try:
                await self.execute_step(enrollment)
                processed += 1
            except Exception:
                enrollment.status = "failed"
                self.db.commit()

        return processed

    # ------------------------------------------------------------------
    # Execute a single step
    # ------------------------------------------------------------------

    async def execute_step(self, enrollment: SequenceEnrollment) -> None:
        """Send the current step for an enrollment and advance state."""
        # Load active steps ordered by step_order
        steps = (
            self.db.query(SequenceStep)
            .filter(
                SequenceStep.sequence_id == enrollment.sequence_id,
                SequenceStep.deleted_at.is_(None),
            )
            .order_by(SequenceStep.step_order)
            .all()
        )

        step_index = enrollment.current_step
        if step_index >= len(steps):
            await self._complete_enrollment(enrollment)
            return

        step = steps[step_index]

        # Load related objects for template context
        contact = self.db.query(Contact).filter(Contact.id == enrollment.contact_id).first()
        prop = (
            self.db.query(Property).filter(Property.id == enrollment.property_id).first()
            if enrollment.property_id
            else None
        )
        user = self.db.query(User).filter(User.id == enrollment.created_by).first()

        context = self._build_context(contact, prop, user)

        body = self.render_template(step.body_template, context)
        subject = self.render_template(step.subject or "", context)

        if step.channel == "sms":
            if not contact or not contact.phone:
                enrollment.status = "failed"
                self.db.commit()
                return
            if getattr(contact, 'opted_out_sms', False):
                # Contact opted out — skip this SMS step, advance
                enrollment.current_step = step_index + 1
                if enrollment.current_step < len(steps):
                    next_step = steps[enrollment.current_step]
                    enrollment.next_send_at = datetime.utcnow() + timedelta(
                        days=next_step.delay_days, hours=next_step.delay_hours,
                    )
                    self.db.commit()
                else:
                    await self._complete_enrollment(enrollment)
                return
            await self.comm_service.send_sms(
                to_phone=contact.phone,
                body=body,
                from_user_id=enrollment.created_by,
                contact_id=enrollment.contact_id,
                deal_id=enrollment.deal_id,
                property_id=enrollment.property_id,
            )
        elif step.channel == "email":
            if not contact or not contact.email:
                enrollment.status = "failed"
                self.db.commit()
                return
            await self.comm_service.send_email(
                to_email=contact.email,
                subject=subject,
                body_html=body,
                body_text=body,
                from_user_id=enrollment.created_by,
                contact_id=enrollment.contact_id,
                deal_id=enrollment.deal_id,
                property_id=enrollment.property_id,
            )

        # Advance step
        enrollment.current_step = step_index + 1

        next_step_index = step_index + 1
        if next_step_index < len(steps):
            next_step = steps[next_step_index]
            enrollment.next_send_at = datetime.utcnow() + timedelta(
                days=next_step.delay_days,
                hours=next_step.delay_hours,
            )
            self.db.commit()
        else:
            await self._complete_enrollment(enrollment)

    # ------------------------------------------------------------------
    # Handle reply
    # ------------------------------------------------------------------

    def handle_reply(self, contact_id: UUID, user_id: UUID) -> int:
        """Stop all reply-sensitive enrollments for a contact. Returns count stopped."""
        now = datetime.utcnow()

        active_enrollments = (
            self.db.query(SequenceEnrollment)
            .join(Sequence, Sequence.id == SequenceEnrollment.sequence_id)
            .filter(
                SequenceEnrollment.contact_id == contact_id,
                SequenceEnrollment.status == "active",
                SequenceEnrollment.deleted_at.is_(None),
                Sequence.stop_on_reply.is_(True),
                Sequence.created_by == user_id,
            )
            .all()
        )

        count = 0
        for enrollment in active_enrollments:
            enrollment.status = "replied"
            enrollment.stopped_at = now
            enrollment.stopped_reason = "reply_received"
            enrollment.next_send_at = None

            sequence = self.db.query(Sequence).filter(Sequence.id == enrollment.sequence_id).first()
            if sequence:
                sequence.total_replied = (sequence.total_replied or 0) + 1

            count += 1

        if count:
            self.db.commit()

        return count

    # ------------------------------------------------------------------
    # Template rendering
    # ------------------------------------------------------------------

    def render_template(self, template: str, context: dict) -> str:
        """Replace {{variable}} tokens with context values. Unknown vars are left as-is."""
        def replacer(match: re.Match) -> str:
            key = match.group(1).strip()
            return str(context[key]) if key in context else match.group(0)

        return re.sub(r"\{\{(\s*\w+\s*)\}\}", replacer, template)

    # ------------------------------------------------------------------
    # Context building
    # ------------------------------------------------------------------

    def _build_context(
        self,
        contact: Contact | None,
        prop: Property | None,
        user: User | None,
    ) -> dict:
        """Build the template variable context from related objects."""
        first_name = ""
        last_name = ""
        full_name = ""
        if contact:
            first_name = contact.first_name or ""
            last_name = contact.last_name or ""
            full_name = f"{first_name} {last_name}".strip()

        property_address = ""
        property_city = ""
        property_state = ""
        if prop:
            property_address = prop.address_line1 or ""
            property_city = prop.city or ""
            property_state = prop.state or ""

        sender_name = ""
        if user:
            sender_name = user.name or ""

        return {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
            "property_address": property_address,
            "property_city": property_city,
            "property_state": property_state,
            "sender_name": sender_name,
            "asking_price": "",
            "arv": "",
            "cash_flow": "",
            "sender_phone": "",
            "sender_company": "",
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _complete_enrollment(self, enrollment: SequenceEnrollment) -> None:
        """Mark an enrollment completed and increment the sequence counter."""
        now = datetime.utcnow()
        enrollment.status = "completed"
        enrollment.completed_at = now
        enrollment.next_send_at = None

        sequence = self.db.query(Sequence).filter(Sequence.id == enrollment.sequence_id).first()
        if sequence:
            sequence.total_completed = (sequence.total_completed or 0) + 1

        self.db.commit()
