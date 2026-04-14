"""DirectMailService — orchestrates campaign creation, recipient management,
address verification, and mail dispatch via LobProvider.
"""

import re
from uuid import UUID

from sqlalchemy.orm import Session

from core.direct_mail.lob_provider import LobProvider
from models.mail_campaigns import MailCampaign, MailRecipient
from models.contacts import Contact
from models.properties import Property


class DirectMailService:
    """Orchestrate direct mail campaigns using a Lob provider.

    Args:
        db:       SQLAlchemy session — caller owns the lifecycle.
        provider: LobProvider instance for API calls.
    """

    def __init__(self, db: Session, provider: LobProvider) -> None:
        self.db = db
        self.provider = provider

    # ------------------------------------------------------------------
    # Campaign creation
    # ------------------------------------------------------------------

    def create_campaign(
        self,
        name: str,
        mail_type: str,
        template_front: str,
        template_back: str,
        from_address: dict,
        user_id: UUID,
        team_id: UUID | None = None,
        description: str | None = None,
    ) -> MailCampaign:
        """Create a new campaign in draft status.

        Args:
            name:            Human-readable campaign name.
            mail_type:       One of postcard_4x6 | postcard_6x9 | postcard_6x11 | letter.
            template_front:  HTML template string for front side / body.
            template_back:   HTML template string for back side (postcards only).
            from_address:    Sender address dict {name, line1, city, state, zip}.
            user_id:         UUID of the owning user.
            team_id:         Optional team UUID for shared campaigns.
            description:     Optional human-readable description.

        Returns:
            Persisted MailCampaign in draft status.
        """
        campaign = MailCampaign(
            created_by=user_id,
            team_id=team_id,
            name=name,
            description=description,
            status="draft",
            mail_type=mail_type,
            template_front_html=template_front,
            template_back_html=template_back,
            from_address=from_address,
        )
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        return campaign

    # ------------------------------------------------------------------
    # Recipient management
    # ------------------------------------------------------------------

    def add_recipients(
        self,
        campaign_id: str,
        recipients: list[dict],
        user_id: UUID,
    ) -> list[MailRecipient]:
        """Add recipient records to a draft campaign.

        Args:
            campaign_id: UUID string of the target campaign.
            recipients:  List of dicts, each containing:
                           contact_id?   — UUID string, optional
                           property_id?  — UUID string, optional
                           to_name?      — display name, optional
                           to_address    — {line1, city, state, zip}
            user_id:     UUID of the requesting user (ownership check).

        Returns:
            List of persisted MailRecipient records.

        Raises:
            ValueError: If campaign not found, not owned by user, or not in draft status.
        """
        campaign = self._get_owned_campaign(campaign_id, user_id)
        if campaign.status != "draft":
            raise ValueError(
                f"Campaign {campaign_id} is not in draft status (current: {campaign.status})"
            )

        created: list[MailRecipient] = []
        for r in recipients:
            # Ownership check: contact_id must belong to this user
            if r.get("contact_id"):
                contact_check = (
                    self.db.query(Contact)
                    .filter(
                        Contact.id == r["contact_id"],
                        Contact.created_by == user_id,
                        Contact.is_deleted == False,  # noqa: E712
                    )
                    .first()
                )
                if not contact_check:
                    continue

            # Ownership check: property_id must belong to this user
            if r.get("property_id"):
                prop_check = (
                    self.db.query(Property)
                    .filter(
                        Property.id == r["property_id"],
                        Property.created_by == user_id,
                        Property.is_deleted == False,  # noqa: E712
                    )
                    .first()
                )
                if not prop_check:
                    continue

            to_address = r.get("to_address", {})
            # Ensure name is present in address dict for Lob
            if "name" not in to_address and r.get("to_name"):
                to_address = {**to_address, "name": r["to_name"]}

            recipient = MailRecipient(
                campaign_id=campaign.id,
                contact_id=r.get("contact_id"),
                property_id=r.get("property_id"),
                to_name=r.get("to_name"),
                to_address=to_address,
                address_verified=False,
                status="pending",
            )
            self.db.add(recipient)
            created.append(recipient)

        campaign.total_recipients = (campaign.total_recipients or 0) + len(created)
        self.db.commit()
        for rec in created:
            self.db.refresh(rec)
        return created

    # ------------------------------------------------------------------
    # Address verification
    # ------------------------------------------------------------------

    async def verify_addresses(self, campaign_id: str, user_id: UUID) -> dict:
        """Verify all unverified recipient addresses via Lob.

        Updates each recipient's address_verified, deliverability, and
        standardized to_address in place.

        Args:
            campaign_id: UUID string of the target campaign.
            user_id:     UUID of the requesting user (ownership check).

        Returns:
            Summary dict: {total, deliverable, undeliverable, no_match}.
        """
        self._get_owned_campaign(campaign_id, user_id)  # ownership guard

        unverified = (
            self.db.query(MailRecipient)
            .filter(
                MailRecipient.campaign_id == campaign_id,
                MailRecipient.address_verified == False,  # noqa: E712
                MailRecipient.deleted_at.is_(None),
            )
            .all()
        )

        stats = {"total": len(unverified), "deliverable": 0, "undeliverable": 0, "no_match": 0}

        for recipient in unverified:
            try:
                result = await self.provider.verify_address(recipient.to_address or {})
                recipient.deliverability = result.deliverability

                if result.deliverability == "deliverable":
                    recipient.address_verified = True
                    # Overwrite with standardized components from Lob
                    standardized = {
                        **recipient.to_address,
                        "line1": result.primary_line or recipient.to_address.get("line1", ""),
                        "city": result.city or recipient.to_address.get("city", ""),
                        "state": result.state or recipient.to_address.get("state", ""),
                        "zip": result.zip_code or recipient.to_address.get("zip", ""),
                    }
                    recipient.to_address = standardized
                    stats["deliverable"] += 1
                elif result.deliverability in ("undeliverable", "deliverable_missing_unit"):
                    recipient.address_verified = False
                    stats["undeliverable"] += 1
                else:
                    recipient.address_verified = False
                    stats["no_match"] += 1
            except Exception:
                recipient.address_verified = False
                recipient.deliverability = "no_match"
                stats["no_match"] += 1

        self.db.commit()
        return stats

    # ------------------------------------------------------------------
    # Sending
    # ------------------------------------------------------------------

    async def send_single(
        self, recipient: MailRecipient, campaign: MailCampaign
    ) -> None:
        """Render template and send a single mail piece via Lob.

        Updates recipient.lob_mail_id, status, and cost_cents in place.
        Caller is responsible for committing the session.

        Args:
            recipient: MailRecipient to send to.
            campaign:  Parent MailCampaign (provides template + from_address).
        """
        context = self._build_context(recipient, campaign)
        front = self.render_template(campaign.template_front_html or "", context)
        back = self.render_template(campaign.template_back_html or "", context)

        to_addr = recipient.to_address or {}
        from_addr = campaign.from_address or {}

        if campaign.mail_type.startswith("postcard"):
            size = (
                campaign.mail_type.split("_", 1)[1]
                if "_" in campaign.mail_type
                else "4x6"
            )
            result = await self.provider.send_postcard(to_addr, front, back, from_addr, size)
        else:
            result = await self.provider.send_letter(to_addr, front, from_addr)

        recipient.lob_mail_id = result.lob_id
        recipient.status = "sent" if result.status == "success" else "failed"
        recipient.cost_cents = result.cost_cents
        recipient.rendered_front = front
        recipient.rendered_back = back

    # ------------------------------------------------------------------
    # Template rendering
    # ------------------------------------------------------------------

    def render_template(self, template: str, context: dict) -> str:
        """Replace {{variable}} placeholders with context values.

        Unknown variables are left as-is (not blanked) so missing data is
        visible rather than silently dropped.

        Args:
            template: HTML string with {{key}} placeholders.
            context:  Dict mapping key names to replacement values.

        Returns:
            Rendered string.
        """
        def replacer(match: re.Match) -> str:
            key = match.group(1).strip()
            value = context.get(key)
            if value is None:
                return match.group(0)  # leave {{variable}} as-is
            return str(value)

        return re.sub(r"\{\{(\s*\w+\s*)\}\}", replacer, template)

    # ------------------------------------------------------------------
    # Context building
    # ------------------------------------------------------------------

    def _build_context(self, recipient: MailRecipient, campaign: MailCampaign) -> dict:
        """Build template variable dict from recipient, campaign, and linked CRM records.

        Args:
            recipient: MailRecipient providing address and optional CRM links.
            campaign:  MailCampaign providing sender information.

        Returns:
            Dict of string → string values for template rendering.
        """
        # Recipient name — prefer to_name; fall back to linked contact
        recipient_name = recipient.to_name or ""
        if not recipient_name and recipient.contact_id:
            contact: Contact | None = (
                self.db.query(Contact)
                .filter(
                    Contact.id == recipient.contact_id,
                    Contact.created_by == campaign.created_by,
                )
                .first()
            )
            if contact:
                parts = [contact.first_name or "", contact.last_name or ""]
                recipient_name = " ".join(p for p in parts if p).strip()

        # Property address — from linked property if available
        property_address = ""
        if recipient.property_id:
            prop: Property | None = (
                self.db.query(Property)
                .filter(
                    Property.id == recipient.property_id,
                    Property.created_by == campaign.created_by,
                )
                .first()
            )
            if prop:
                property_address = (
                    f"{prop.address_line1}, {prop.city}, {prop.state} {prop.zip_code}"
                )

        # Sender details — extracted from campaign.from_address dict
        from_addr = campaign.from_address or {}
        sender_name = from_addr.get("name", "")
        sender_phone = from_addr.get("phone", "")
        sender_company = from_addr.get("company", "")

        return {
            "recipient_name": recipient_name,
            "property_address": property_address,
            "sender_name": sender_name,
            "sender_phone": sender_phone,
            "sender_company": sender_company,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_owned_campaign(self, campaign_id: str, user_id: UUID) -> MailCampaign:
        """Fetch a campaign and assert the requesting user owns it.

        Args:
            campaign_id: UUID string of the campaign.
            user_id:     UUID of the requesting user.

        Returns:
            MailCampaign instance.

        Raises:
            ValueError: If the campaign is not found or not owned by user.
        """
        campaign = (
            self.db.query(MailCampaign)
            .filter(
                MailCampaign.id == campaign_id,
                MailCampaign.deleted_at.is_(None),
            )
            .first()
        )
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        if str(campaign.created_by) != str(user_id):
            raise ValueError(f"Campaign {campaign_id} not owned by user {user_id}")
        return campaign
