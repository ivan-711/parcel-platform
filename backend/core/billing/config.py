from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class StripeSettings(BaseSettings):
    """Stripe configuration loaded from environment variables."""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Price IDs — MVP: Pro only
    STRIPE_PRICE_PRO_MONTHLY: str = ""
    STRIPE_PRICE_PRO_ANNUAL: str = ""

    # Future tiers (not enforced yet)
    STRIPE_PRICE_STARTER_MONTHLY: str = ""
    STRIPE_PRICE_STARTER_ANNUAL: str = ""
    STRIPE_PRICE_TEAM_MONTHLY: str = ""
    STRIPE_PRICE_TEAM_ANNUAL: str = ""

    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    TRIAL_PERIOD_DAYS: int = 7

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("STRIPE_SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, v: str) -> str:
        if v and not v.startswith(("sk_test_", "sk_live_")):
            raise ValueError("STRIPE_SECRET_KEY must start with 'sk_test_' or 'sk_live_'")
        return v

    @field_validator("STRIPE_WEBHOOK_SECRET")
    @classmethod
    def _validate_webhook_secret(cls, v: str) -> str:
        if v and not v.startswith("whsec_"):
            raise ValueError("STRIPE_WEBHOOK_SECRET must start with 'whsec_'")
        return v

    @property
    def is_live(self) -> bool:
        """Whether the configured key is a live (production) key."""
        return self.STRIPE_SECRET_KEY.startswith("sk_live_")

    @property
    def is_configured(self) -> bool:
        """Whether both required Stripe credentials are set."""
        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_WEBHOOK_SECRET)

    def get_price_id(self, plan: str, interval: str) -> str:
        """Look up the Stripe Price ID for a given plan and interval."""
        key = f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}"
        price_id: str = getattr(self, key, "")
        if not price_id:
            raise ValueError(
                f"No Stripe Price ID configured for {plan}/{interval}. Set env var {key}."
            )
        return price_id

    @property
    def price_to_plan_map(self) -> dict[str, str]:
        """Reverse mapping from Stripe Price ID to plan name."""
        mapping: dict[str, str] = {}
        for plan in ("starter", "pro", "team"):
            for interval in ("monthly", "annual"):
                pid = getattr(self, f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}", "")
                if pid:
                    mapping[pid] = plan
        return mapping


@lru_cache(maxsize=1)
def get_stripe_settings() -> StripeSettings:
    """Cached singleton for Stripe settings."""
    return StripeSettings()
