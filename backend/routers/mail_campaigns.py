"""Mail campaigns router — 13 endpoints for direct mail campaign management."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_quota, record_usage
from core.security.jwt import get_current_user
from database import get_db
from models.mail_campaigns import MailCampaign, MailRecipient
from schemas.mail_campaigns import (
    AddRecipientsRequest,
    CampaignAnalytics,
    CampaignListItem,
    CampaignResponse,
    CreateCampaignRequest,
    QuickSendRequest,
    RecipientResponse,
    UpdateCampaignRequest,
    VerifyResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mail-campaigns", tags=["mail-campaigns"])

SAMPLE_CONTEXT = {
    "recipient_name": "John Smith",
    "property_address": "123 Main St, Milwaukee, WI 53201",
    "sender_name": "Desiree Johnson",
    "sender_phone": "(414) 555-0199",
    "sender_company": "Parcel Investments",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_campaign_or_404(db: Session, campaign_id: UUID, user_id: UUID) -> MailCampaign:
    """Fetch a campaign owned by the user or raise 404."""
    campaign = (
        db.query(MailCampaign)
        .filter(
            MailCampaign.id == campaign_id,
            MailCampaign.created_by == user_id,
            MailCampaign.deleted_at.is_(None),
        )
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


def _get_service(db: Session):
    """Instantiate DirectMailService with the Lob provider."""
    from core.direct_mail.lob_provider import LobProvider
    from core.direct_mail.service import DirectMailService

    provider = LobProvider()
    return DirectMailService(db, provider)


# ---------------------------------------------------------------------------
# 1. POST / — create campaign (draft)
# ---------------------------------------------------------------------------


@router.post("/", response_model=CampaignResponse)
def create_campaign(
    body: CreateCampaignRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new direct mail campaign in draft status."""
    service = _get_service(db)
    campaign = service.create_campaign(
        name=body.name,
        mail_type=body.mail_type,
        template_front=body.template_front_html or "",
        template_back=body.template_back_html or "",
        from_address=body.from_address or {},
        user_id=current_user.id,
        description=body.description,
    )
    if body.scheduled_date:
        campaign.scheduled_date = body.scheduled_date
        db.commit()
        db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


# ---------------------------------------------------------------------------
# 2. GET / — list user's campaigns
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[CampaignListItem])
def list_campaigns(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all mail campaigns for the current user, newest first."""
    campaigns = (
        db.query(MailCampaign)
        .filter(
            MailCampaign.created_by == current_user.id,
            MailCampaign.deleted_at.is_(None),
        )
        .order_by(MailCampaign.created_at.desc())
        .all()
    )
    return [CampaignListItem.model_validate(c) for c in campaigns]


# ---------------------------------------------------------------------------
# 3. GET /{id} — full campaign with recipients
# ---------------------------------------------------------------------------


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch a single campaign with all recipients."""
    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    return CampaignResponse.model_validate(campaign)


# ---------------------------------------------------------------------------
# 4. PATCH /{id} — update (draft only)
# ---------------------------------------------------------------------------


@router.patch("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: UUID,
    body: UpdateCampaignRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a draft campaign's metadata or template content."""
    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    if campaign.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Only draft campaigns can be updated (current status: {campaign.status})",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


# ---------------------------------------------------------------------------
# 5. DELETE /{id} — soft delete (draft only)
# ---------------------------------------------------------------------------


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a draft campaign."""
    from datetime import datetime

    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    if campaign.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Only draft campaigns can be deleted (current status: {campaign.status})",
        )

    campaign.deleted_at = datetime.utcnow()
    db.commit()


# ---------------------------------------------------------------------------
# 6. POST /{id}/recipients — add recipients (max 500)
# ---------------------------------------------------------------------------


@router.post("/{campaign_id}/recipients", response_model=list[RecipientResponse])
def add_recipients(
    campaign_id: UUID,
    body: AddRecipientsRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add up to 500 recipients to a draft campaign."""
    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    if campaign.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Only draft campaigns accept recipients (current status: {campaign.status})",
        )

    service = _get_service(db)
    try:
        recipients = service.add_recipients(
            campaign_id=str(campaign_id),
            recipients=[r.model_dump() for r in body.recipients],
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return [RecipientResponse.model_validate(r) for r in recipients]


# ---------------------------------------------------------------------------
# 7. DELETE /{id}/recipients/{rid} — remove recipient (draft only)
# ---------------------------------------------------------------------------


@router.delete("/{campaign_id}/recipients/{recipient_id}", status_code=204)
def remove_recipient(
    campaign_id: UUID,
    recipient_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a single recipient from a draft campaign (soft delete)."""
    from datetime import datetime

    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    if campaign.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Only draft campaigns allow recipient removal (current status: {campaign.status})",
        )

    recipient = (
        db.query(MailRecipient)
        .filter(
            MailRecipient.id == recipient_id,
            MailRecipient.campaign_id == campaign_id,
            MailRecipient.deleted_at.is_(None),
        )
        .first()
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    recipient.deleted_at = datetime.utcnow()
    campaign.total_recipients = max(0, (campaign.total_recipients or 1) - 1)
    db.commit()


# ---------------------------------------------------------------------------
# 8. POST /{id}/verify — verify addresses via Lob
# ---------------------------------------------------------------------------


@router.post("/{campaign_id}/verify", response_model=VerifyResponse)
async def verify_addresses(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify all unverified recipient addresses in the campaign via Lob."""
    _get_campaign_or_404(db, campaign_id, current_user.id)

    service = _get_service(db)
    try:
        stats = await service.verify_addresses(str(campaign_id), current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return VerifyResponse(**stats)


# ---------------------------------------------------------------------------
# 9. POST /{id}/send — send campaign (tier gated)
# ---------------------------------------------------------------------------


@router.post("/{campaign_id}/send", response_model=CampaignResponse)
def send_campaign(
    campaign_id: UUID,
    _quota: None = Depends(require_quota("mail_pieces_per_month")),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Queue a campaign for sending. Dispatches a Dramatiq background task."""
    from core.tasks.mail_campaign import send_mail_campaign

    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    if campaign.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=400,
            detail=f"Campaign cannot be sent from status '{campaign.status}'",
        )

    verified_count = (
        db.query(MailRecipient)
        .filter(
            MailRecipient.campaign_id == campaign_id,
            MailRecipient.address_verified == True,  # noqa: E712
            MailRecipient.status == "pending",
            MailRecipient.deleted_at.is_(None),
        )
        .count()
    )
    if verified_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No verified recipients available to send to. Run /verify first.",
        )

    campaign.status = "scheduled"
    db.commit()

    send_mail_campaign.send(str(campaign_id), str(current_user.id))

    # Record usage for each verified recipient piece
    for _ in range(verified_count):
        record_usage(current_user.id, "mail_pieces_per_month", db)
    db.commit()

    db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


# ---------------------------------------------------------------------------
# 10. POST /{id}/cancel — cancel (draft or scheduled)
# ---------------------------------------------------------------------------


@router.post("/{campaign_id}/cancel", response_model=CampaignResponse)
def cancel_campaign(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a draft or scheduled campaign."""
    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    if campaign.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=400,
            detail=f"Only draft or scheduled campaigns can be cancelled (current status: {campaign.status})",
        )

    campaign.status = "cancelled"
    db.commit()
    db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


# ---------------------------------------------------------------------------
# 11. GET /{id}/preview — render template with sample data
# ---------------------------------------------------------------------------


@router.get("/{campaign_id}/preview")
def preview_campaign(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Render campaign templates with sample data for preview."""
    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)
    service = _get_service(db)

    front_html = service.render_template(
        campaign.template_front_html or "", SAMPLE_CONTEXT
    )
    back_html = service.render_template(
        campaign.template_back_html or "", SAMPLE_CONTEXT
    )

    return {"front_html": front_html, "back_html": back_html}


# ---------------------------------------------------------------------------
# 12. GET /{id}/analytics — delivery stats
# ---------------------------------------------------------------------------


@router.get("/{campaign_id}/analytics", response_model=CampaignAnalytics)
def get_analytics(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return delivery analytics for a campaign."""
    campaign = _get_campaign_or_404(db, campaign_id, current_user.id)

    total_sent = campaign.total_sent or 0
    total_delivered = campaign.total_delivered or 0
    total_returned = campaign.total_returned or 0

    delivery_rate = (total_delivered / total_sent) if total_sent > 0 else 0.0
    return_rate = (total_returned / total_sent) if total_sent > 0 else 0.0

    return CampaignAnalytics(
        campaign_id=campaign.id,
        total_sent=total_sent,
        total_delivered=total_delivered,
        total_returned=total_returned,
        delivery_rate=delivery_rate,
        return_rate=return_rate,
        total_cost_cents=campaign.total_cost_cents or 0,
    )


# ---------------------------------------------------------------------------
# 13. POST /quick-send — send a single mail piece directly
# ---------------------------------------------------------------------------


@router.post("/quick-send")
async def quick_send(
    body: QuickSendRequest,
    _quota: None = Depends(require_quota("mail_pieces_per_month")),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a single mail piece directly via Lob without creating a campaign."""
    from core.direct_mail.lob_provider import LobProvider

    provider = LobProvider()
    to_addr = {**body.to_address}
    if body.to_name and "name" not in to_addr:
        to_addr["name"] = body.to_name

    if body.mail_type.startswith("postcard"):
        size = (
            body.mail_type.split("_", 1)[1] if "_" in body.mail_type else "4x6"
        )
        result = await provider.send_postcard(
            to_addr,
            body.template_front_html,
            body.template_back_html or "",
            body.from_address,
            size,
        )
    else:
        result = await provider.send_letter(
            to_addr,
            body.template_front_html,
            body.from_address,
        )

    if result.status != "success":
        raise HTTPException(
            status_code=502,
            detail=f"Lob send failed: {result.error or result.status}",
        )

    record_usage(current_user.id, "mail_pieces_per_month", db)
    db.commit()

    return {
        "status": "sent",
        "lob_id": result.lob_id,
        "expected_delivery": result.expected_delivery,
        "cost_cents": result.cost_cents,
    }
