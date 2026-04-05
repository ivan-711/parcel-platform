"""SkipTraceService — orchestrates skip tracing, 30-day caching, and contact creation."""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.skip_tracing.batchdata_provider import BatchDataProvider, COST_CENTS_PER_TRACE
from models.skip_traces import SkipTrace
from models.properties import Property
from models.contacts import Contact
from models.data_source_events import DataSourceEvent

logger = logging.getLogger(__name__)


class SkipTraceService:
    def __init__(self, db: Session, provider: BatchDataProvider):
        self.db = db
        self.provider = provider

    # ------------------------------------------------------------------
    # Public: trace by property
    # ------------------------------------------------------------------

    async def trace_property(
        self,
        property_id: UUID,
        user_id: UUID,
        team_id: Optional[UUID] = None,
    ) -> SkipTrace:
        """Load a property and run a skip trace using its address fields."""
        prop = (
            self.db.query(Property)
            .filter(Property.id == property_id, Property.created_by == user_id)
            .first()
        )
        if not prop:
            raise ValueError(f"Property {property_id} not found or not owned by user")

        return await self.trace_address(
            address=prop.address_line1,
            city=prop.city,
            state=prop.state,
            zip_code=prop.zip_code,
            user_id=user_id,
            team_id=team_id,
            property_id=property_id,
        )

    # ------------------------------------------------------------------
    # Public: trace by address
    # ------------------------------------------------------------------

    async def trace_address(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: str,
        user_id: UUID,
        team_id: Optional[UUID] = None,
        property_id: Optional[UUID] = None,
    ) -> SkipTrace:
        """Run a skip trace for an address, returning a cached result if available."""
        # 1. 30-day cache check
        cached = self._check_cache(address, city, state, zip_code, user_id)
        if cached:
            logger.info("Skip trace cache hit for address=%s, city=%s", address, city)
            return cached

        # 2. Call provider
        result = await self.provider.skip_trace_address(address, city, state, zip_code)

        # 3. Map status
        if result.status == "success":
            mapped_status = "found"
        elif result.status == "not_found":
            mapped_status = "not_found"
        else:
            mapped_status = "failed"

        cost = COST_CENTS_PER_TRACE if mapped_status == "found" else None

        # 4. Persist SkipTrace record
        skip_trace = SkipTrace(
            property_id=property_id,
            created_by=user_id,
            team_id=team_id,
            input_address=address,
            input_city=city,
            input_state=state,
            input_zip=zip_code,
            status=mapped_status,
            owner_first_name=result.owner_first_name,
            owner_last_name=result.owner_last_name,
            phones=result.phones,
            emails=result.emails,
            mailing_address=result.mailing_address,
            is_absentee_owner=result.is_absentee_owner,
            demographics=result.demographics,
            raw_response=result.raw_response,
            traced_at=datetime.utcnow(),
            cost_cents=cost,
        )
        self.db.add(skip_trace)

        # 5. Log DataSourceEvent only when property_id is provided (NOT NULL constraint)
        if property_id is not None:
            event = DataSourceEvent(
                property_id=property_id,
                provider="batchdata",
                request_type="skip_trace",
                response_status=result.status,
                cost_cents=cost,
                latency_ms=result.latency_ms,
            )
            self.db.add(event)

        self.db.commit()
        self.db.refresh(skip_trace)
        return skip_trace

    # ------------------------------------------------------------------
    # Public: create contact from trace result
    # ------------------------------------------------------------------

    def create_contact_from_trace(
        self,
        skip_trace_id: UUID,
        user_id: UUID,
        team_id: Optional[UUID] = None,
        contact_type: str = "seller",
    ) -> dict:
        """Create (or match) a Contact from a completed SkipTrace record."""
        skip_trace = (
            self.db.query(SkipTrace)
            .filter(SkipTrace.id == skip_trace_id, SkipTrace.created_by == user_id)
            .first()
        )
        if not skip_trace:
            raise ValueError(f"SkipTrace {skip_trace_id} not found or not owned by user")

        # Already linked to a contact
        if skip_trace.contact_id:
            existing = self.db.query(Contact).filter(Contact.id == skip_trace.contact_id).first()
            return {"existing": True, "contact": existing}

        # Resolve primary phone and email from JSONB arrays
        primary_phone = _get_primary_phone(skip_trace.phones)
        primary_email = _get_primary_email(skip_trace.emails)

        # Try to match by phone (digits-only comparison)
        matched_contact = None
        if primary_phone:
            phone_digits = re.sub(r"\D", "", primary_phone)
            if phone_digits:
                matched_contact = (
                    self.db.query(Contact)
                    .filter(
                        Contact.created_by == user_id,
                        func.regexp_replace(Contact.phone, r"\D", "", "g") == phone_digits,
                    )
                    .first()
                )

        # Try to match by email (case-insensitive) if phone didn't match
        if not matched_contact and primary_email:
            matched_contact = (
                self.db.query(Contact)
                .filter(
                    Contact.created_by == user_id,
                    func.lower(Contact.email) == primary_email.lower(),
                )
                .first()
            )

        if matched_contact:
            skip_trace.contact_id = matched_contact.id
            self.db.commit()
            self.db.refresh(skip_trace)
            return {"existing": True, "contact": matched_contact}

        # No match — create a new Contact
        new_contact = Contact(
            created_by=user_id,
            team_id=team_id,
            first_name=skip_trace.owner_first_name or "Unknown",
            last_name=skip_trace.owner_last_name,
            phone=primary_phone,
            email=primary_email,
            contact_type=contact_type,
        )
        self.db.add(new_contact)
        self.db.flush()  # get new_contact.id before commit

        skip_trace.contact_id = new_contact.id
        self.db.commit()
        self.db.refresh(new_contact)
        return {"existing": False, "contact": new_contact}

    # ------------------------------------------------------------------
    # Private: 30-day cache
    # ------------------------------------------------------------------

    def _check_cache(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: str,
        user_id: UUID,
    ) -> Optional[SkipTrace]:
        """Return the most recent successful SkipTrace within the last 30 days, or None."""
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        return (
            self.db.query(SkipTrace)
            .filter(
                SkipTrace.created_by == user_id,
                SkipTrace.status == "found",
                SkipTrace.traced_at >= thirty_days_ago,
                func.lower(SkipTrace.input_address) == address.lower(),
                func.lower(SkipTrace.input_city) == city.lower(),
                func.lower(SkipTrace.input_state) == state.lower(),
                SkipTrace.deleted_at.is_(None),
            )
            .order_by(SkipTrace.traced_at.desc())
            .first()
        )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _get_primary_phone(phones) -> Optional[str]:
    """Extract primary phone number from JSONB phones array."""
    if not phones:
        return None
    # Prefer the one flagged is_primary=True, fall back to first entry
    for ph in phones:
        if ph.get("is_primary"):
            return ph.get("number")
    return phones[0].get("number") if phones else None


def _get_primary_email(emails) -> Optional[str]:
    """Extract primary email address from JSONB emails array."""
    if not emails:
        return None
    for em in emails:
        if em.get("is_primary"):
            return em.get("email")
    return emails[0].get("email") if emails else None
