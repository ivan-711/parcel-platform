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

    # Stripe Price IDs — display names: Steel (free) / Carbon ($79) / Titanium ($149)
    STRIPE_PRICE_CARBON_MONTHLY: str = ""
    STRIPE_PRICE_CARBON_ANNUAL: str = ""
    STRIPE_PRICE_TITANIUM_MONTHLY: str = ""
    STRIPE_PRICE_TITANIUM_ANNUAL: str = ""

    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    # Not currently used — reserved for card-required trial experiment.
    # See docs/SECURITY-FOLLOWUPS.md "Post-launch growth experiments" for context.
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

    # Internal plan name → Stripe display name mapping
    _PLAN_TO_STRIPE = {"pro": "CARBON", "business": "TITANIUM", "carbon": "CARBON", "titanium": "TITANIUM"}

    def get_price_id(self, plan: str, interval: str) -> str:
        """Look up the Stripe Price ID for a given plan and interval."""
        stripe_name = self._PLAN_TO_STRIPE.get(plan.lower(), plan.upper())
        key = f"STRIPE_PRICE_{stripe_name}_{interval.upper()}"
        price_id: str = getattr(self, key, "")
        if not price_id:
            raise ValueError(
                f"No Stripe Price ID configured for {plan}/{interval}. Set env var {key}."
            )
        return price_id

    @property
    def price_to_plan_map(self) -> dict[str, str]:
        """Reverse mapping from Stripe Price ID to internal plan name."""
        mapping: dict[str, str] = {}
        # Maps Stripe display names back to internal plan names
        for stripe_name, internal in (("CARBON", "pro"), ("TITANIUM", "business")):
            for interval in ("MONTHLY", "ANNUAL"):
                pid = getattr(self, f"STRIPE_PRICE_{stripe_name}_{interval}", "")
                if pid:
                    mapping[pid] = internal
        return mapping


@lru_cache(maxsize=1)
def get_stripe_settings() -> StripeSettings:
    """Cached singleton for Stripe settings."""
    return StripeSettings()
