from dataclasses import dataclass
from enum import IntEnum
from typing import Optional


class Tier(IntEnum):
    """Billing tiers ordered by feature access level."""

    FREE = 0
    STARTER = 1
    PRO = 2
    TEAM = 3

    @classmethod
    def from_str(cls, value: str) -> "Tier":
        """Convert a string like 'pro' to the corresponding Tier enum."""
        try:
            return cls[value.upper()]
        except (KeyError, AttributeError):
            return cls.FREE


@dataclass(frozen=True)
class TierLimits:
    """Feature flags and usage limits for a billing tier."""

    analyses_per_month: Optional[int]
    saved_deals: Optional[int]
    ai_messages_per_month: Optional[int]
    document_uploads_per_month: Optional[int]
    ai_chat_enabled: bool
    pdf_export: bool
    pipeline_enabled: bool
    portfolio_enabled: bool
    offer_letter: bool
    compare_deals: bool
    team_seats: Optional[int]


TIER_LIMITS: dict[Tier, TierLimits] = {
    Tier.FREE: TierLimits(
        analyses_per_month=3,
        saved_deals=5,
        ai_messages_per_month=5,
        document_uploads_per_month=0,
        ai_chat_enabled=True,
        pdf_export=False,
        pipeline_enabled=False,
        portfolio_enabled=False,
        offer_letter=False,
        compare_deals=False,
        team_seats=None,
    ),
    Tier.STARTER: TierLimits(
        analyses_per_month=25,
        saved_deals=50,
        ai_messages_per_month=30,
        document_uploads_per_month=5,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=False,
        offer_letter=False,
        compare_deals=False,
        team_seats=None,
    ),
    Tier.PRO: TierLimits(
        analyses_per_month=None,
        saved_deals=None,
        ai_messages_per_month=150,
        document_uploads_per_month=25,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=True,
        offer_letter=True,
        compare_deals=True,
        team_seats=None,
    ),
    Tier.TEAM: TierLimits(
        analyses_per_month=None,
        saved_deals=None,
        ai_messages_per_month=500,
        document_uploads_per_month=None,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=True,
        offer_letter=True,
        compare_deals=True,
        team_seats=5,
    ),
}
