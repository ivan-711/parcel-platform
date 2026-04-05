"""Dramatiq actors for direct mail campaign sending and delivery tracking."""

import logging

logger = logging.getLogger(__name__)

try:
    import dramatiq
except ImportError:
    dramatiq = None


def _noop(*a, **kw):
    logger.warning("Dramatiq not available — mail campaign task skipped")


if dramatiq:

    @dramatiq.actor(max_retries=2, min_backoff=10000)
    def send_mail_campaign(campaign_id: str, user_id: str):
        """Send all verified recipients in a campaign."""
        from database import SessionLocal
        from core.direct_mail.lob_provider import LobProvider
        from core.direct_mail.service import DirectMailService
        from models.mail_campaigns import MailCampaign, MailRecipient
        from datetime import datetime

        db = SessionLocal()
        try:
            provider = LobProvider()
            service = DirectMailService(db, provider)

            campaign = db.query(MailCampaign).filter(MailCampaign.id == campaign_id).first()
            if not campaign:
                return

            campaign.status = "sending"
            db.commit()

            recipients = (
                db.query(MailRecipient)
                .filter(
                    MailRecipient.campaign_id == campaign_id,
                    MailRecipient.status == "pending",
                    MailRecipient.address_verified == True,  # noqa: E712
                    MailRecipient.deleted_at.is_(None),
                )
                .all()
            )

            sent = 0
            total_cost = 0
            for recipient in recipients:
                try:
                    context = service._build_context(recipient, campaign)
                    front = service.render_template(campaign.template_front_html or "", context)
                    back = service.render_template(campaign.template_back_html or "", context)

                    to_addr = recipient.to_address or {}
                    from_addr = campaign.from_address or {}

                    if campaign.mail_type.startswith("postcard"):
                        size = (
                            campaign.mail_type.split("_", 1)[1]
                            if "_" in campaign.mail_type
                            else "4x6"
                        )
                        result = provider.send_postcard_sync(
                            to_addr, front, back, from_addr, size
                        )
                    else:
                        result = provider.send_letter_sync(to_addr, front, from_addr)

                    if result.status == "success":
                        recipient.lob_mail_id = result.lob_id
                        recipient.status = "sent"
                        recipient.cost_cents = result.cost_cents
                        recipient.rendered_front = front
                        recipient.rendered_back = back
                        sent += 1
                        total_cost += result.cost_cents
                    else:
                        recipient.status = "failed"

                    db.commit()
                except Exception as e:
                    logger.error("Failed to send mail to recipient %s: %s", recipient.id, e)
                    recipient.status = "failed"
                    db.commit()

            campaign.status = "sent"
            campaign.sent_at = datetime.utcnow()
            campaign.total_sent = sent
            campaign.total_cost_cents = total_cost
            db.commit()
        finally:
            db.close()

    @dramatiq.actor(max_retries=3, min_backoff=30000)
    def check_mail_delivery(campaign_id: str):
        """Poll Lob for delivery status updates."""
        from database import SessionLocal
        from core.direct_mail.lob_provider import LobProvider
        from models.mail_campaigns import MailCampaign, MailRecipient
        import asyncio

        db = SessionLocal()
        try:
            provider = LobProvider()
            campaign = db.query(MailCampaign).filter(MailCampaign.id == campaign_id).first()
            if not campaign:
                return

            recipients = (
                db.query(MailRecipient)
                .filter(
                    MailRecipient.campaign_id == campaign_id,
                    MailRecipient.lob_mail_id.isnot(None),
                    MailRecipient.status.in_(["sent", "in_transit"]),
                )
                .all()
            )

            delivered = 0
            returned = 0
            for recipient in recipients:
                try:
                    status_data = asyncio.run(provider.get_status(recipient.lob_mail_id))
                    tracking = status_data.get("tracking_events", [])
                    if tracking:
                        latest = tracking[-1].get("type", "")
                        if latest == "Delivered":
                            recipient.status = "delivered"
                            delivered += 1
                        elif latest in ("Returned to Sender", "Re-Routed"):
                            recipient.status = "returned"
                            returned += 1
                        elif latest == "In Transit":
                            recipient.status = "in_transit"
                    db.commit()
                except Exception as e:
                    logger.warning(
                        "Failed to check delivery for %s: %s", recipient.lob_mail_id, e
                    )

            campaign.total_delivered = (campaign.total_delivered or 0) + delivered
            campaign.total_returned = (campaign.total_returned or 0) + returned
            db.commit()
        finally:
            db.close()

else:
    send_mail_campaign = _noop
    check_mail_delivery = _noop
