# Agent 02 — Stripe Service Layer Design

**Date:** 2026-03-28
**File:** `backend/services/stripe_service.py`
**Scope:** Single interface between Parcel and the Stripe API — all Stripe calls go through this module
**Stack:** FastAPI + SQLAlchemy 2 (sync) + PostgreSQL (Railway) | pydantic-settings for config

---

## 1. Stripe Configuration via Pydantic Settings

All Stripe config lives in a dedicated settings class that validates at import time. The backend already uses `pydantic-settings` (see `requirements.txt`), and this follows the same `load_dotenv()` + env-var pattern used by `database.py` and `auth.py`.

```python
# backend/core/billing/config.py
"""Stripe configuration — validated at import time, fails fast on missing keys."""

from __future__ import annotations

import logging
from enum import Enum
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class StripeEnvironment(str, Enum):
    TEST = "test"
    LIVE = "live"


class StripeSettings(BaseSettings):
    """Stripe API configuration.

    All fields are read from environment variables. The class validates
    key prefixes against the runtime environment to prevent accidental
    live-key usage in development (and vice versa).

    Env vars:
        STRIPE_SECRET_KEY         — sk_test_... or sk_live_...
        STRIPE_WEBHOOK_SECRET     — whsec_...
        STRIPE_PRICE_STARTER_MONTHLY — price_...
        STRIPE_PRICE_STARTER_ANNUAL  — price_...
        STRIPE_PRICE_PRO_MONTHLY     — price_...
        STRIPE_PRICE_PRO_ANNUAL      — price_...
        STRIPE_PRICE_TEAM_MONTHLY    — price_...
        STRIPE_PRICE_TEAM_ANNUAL     — price_...
        ENVIRONMENT               — "development" | "production"
        FRONTEND_URL              — e.g. "https://parceldesk.io"
    """

    # ── Keys ──────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str

    # ── Price IDs (created in Stripe Dashboard or via setup script) ───
    STRIPE_PRICE_STARTER_MONTHLY: str = ""
    STRIPE_PRICE_STARTER_ANNUAL: str = ""
    STRIPE_PRICE_PRO_MONTHLY: str = ""
    STRIPE_PRICE_PRO_ANNUAL: str = ""
    STRIPE_PRICE_TEAM_MONTHLY: str = ""
    STRIPE_PRICE_TEAM_ANNUAL: str = ""

    # ── App context (already present in the environment) ──────────────
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Billing behaviour ─────────────────────────────────────────────
    TRIAL_PERIOD_DAYS: int = 14
    WEBHOOK_TOLERANCE_SECONDS: int = 300  # 5-minute replay window

    model_config = {"env_file": ".env", "extra": "ignore"}

    # ── Validators ────────────────────────────────────────────────────

    @field_validator("STRIPE_SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, v: str) -> str:
        if not v.startswith(("sk_test_", "sk_live_")):
            raise ValueError(
                "STRIPE_SECRET_KEY must start with 'sk_test_' or 'sk_live_'. "
                f"Got prefix: '{v[:8]}...'"
            )
        return v

    @field_validator("STRIPE_WEBHOOK_SECRET")
    @classmethod
    def _validate_webhook_secret(cls, v: str) -> str:
        if not v.startswith("whsec_"):
            raise ValueError(
                "STRIPE_WEBHOOK_SECRET must start with 'whsec_'. "
                f"Got prefix: '{v[:8]}...'"
            )
        return v

    # ── Derived properties ────────────────────────────────────────────

    @property
    def stripe_env(self) -> StripeEnvironment:
        """Determine test vs live from the secret key prefix."""
        if self.STRIPE_SECRET_KEY.startswith("sk_live_"):
            return StripeEnvironment.LIVE
        return StripeEnvironment.TEST

    @property
    def is_live(self) -> bool:
        return self.stripe_env == StripeEnvironment.LIVE

    def validate_key_environment_match(self) -> None:
        """Raise RuntimeError if the key mode does not match ENVIRONMENT.

        Call this once during application startup (in main.py or a lifespan
        handler) — NOT at import time, because tests may need to override
        ENVIRONMENT after import.
        """
        if self.ENVIRONMENT == "production" and not self.is_live:
            raise RuntimeError(
                "SECURITY: Test Stripe key (sk_test_) detected in production. "
                "Set STRIPE_SECRET_KEY to a live key."
            )
        if self.ENVIRONMENT != "production" and self.is_live:
            raise RuntimeError(
                "SECURITY: Live Stripe key (sk_live_) detected in non-production "
                f"environment ({self.ENVIRONMENT}). Use a test key for development."
            )

    def get_price_id(self, plan: str, interval: str) -> str:
        """Look up the Stripe Price ID for a plan + interval combination.

        Args:
            plan: "starter" | "pro" | "team"
            interval: "monthly" | "annual"

        Returns:
            The Stripe Price ID (price_...) string.

        Raises:
            ValueError: If the plan/interval combination is unknown or the
                        corresponding env var is empty.
        """
        key = f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}"
        price_id: str = getattr(self, key, "")
        if not price_id:
            raise ValueError(
                f"No Stripe Price ID configured for {plan}/{interval}. "
                f"Set the {key} environment variable."
            )
        return price_id

    # Map Stripe Price IDs back to Parcel plan names.  Built lazily so
    # it reflects whatever price IDs are configured at runtime.
    @property
    def price_to_plan_map(self) -> dict[str, str]:
        """Reverse map: Stripe price_id -> Parcel plan name."""
        mapping: dict[str, str] = {}
        for plan in ("starter", "pro", "team"):
            for interval in ("monthly", "annual"):
                pid = getattr(
                    self,
                    f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}",
                    "",
                )
                if pid:
                    mapping[pid] = plan
        return mapping


@lru_cache(maxsize=1)
def get_stripe_settings() -> StripeSettings:
    """Singleton accessor — cached after first call."""
    return StripeSettings()  # type: ignore[call-arg]
```

---

## 2. Custom Exception Hierarchy

Every Stripe API call can fail in different ways. This hierarchy lets callers distinguish transient (retryable) failures from permanent ones without coupling to `stripe.error.*` types.

```python
# backend/core/billing/exceptions.py
"""Billing-specific exceptions.

These wrap Stripe SDK errors into Parcel's domain so that routers and
services never expose raw Stripe error types to callers.
"""

from __future__ import annotations


class BillingError(Exception):
    """Base class for all billing/Stripe errors."""

    def __init__(self, message: str, code: str = "BILLING_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class StripeTransientError(BillingError):
    """Transient Stripe failure — safe to retry (rate limit, network, 500)."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="STRIPE_TRANSIENT")


class StripeCardError(BillingError):
    """The customer's card was declined or failed verification."""

    def __init__(self, message: str, decline_code: str | None = None) -> None:
        self.decline_code = decline_code
        super().__init__(message, code="CARD_DECLINED")


class StripeInvalidRequestError(BillingError):
    """Permanent request error — bad parameters, missing resource, etc."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="STRIPE_INVALID_REQUEST")


class StripeAuthenticationError(BillingError):
    """Invalid API key — fatal configuration error."""

    def __init__(self) -> None:
        super().__init__(
            "Stripe authentication failed — check STRIPE_SECRET_KEY",
            code="STRIPE_AUTH_FAILED",
        )


class WebhookVerificationError(BillingError):
    """Webhook signature verification failed — possible spoofing."""

    def __init__(self, reason: str = "Invalid signature") -> None:
        super().__init__(reason, code="WEBHOOK_VERIFICATION_FAILED")


class CustomerNotFoundError(BillingError):
    """The Parcel user does not have a linked Stripe customer."""

    def __init__(self, user_id: str) -> None:
        super().__init__(
            f"No Stripe customer linked to user {user_id}",
            code="NO_STRIPE_CUSTOMER",
        )


class SubscriptionNotFoundError(BillingError):
    """The Parcel user does not have an active Stripe subscription."""

    def __init__(self, user_id: str) -> None:
        super().__init__(
            f"No Stripe subscription found for user {user_id}",
            code="NO_SUBSCRIPTION",
        )
```

---

## 3. Stripe Service — Complete Implementation

This is the core module. Every Stripe API interaction goes through `StripeService`. The class is stateless — it receives a SQLAlchemy `Session` per call and reads config from the singleton `StripeSettings`.

```python
# backend/services/stripe_service.py
"""Stripe service — the single interface between Parcel and Stripe.

All Stripe API calls are routed through this module. It handles:
- Customer creation and lookup
- Checkout Session creation (new subscriptions)
- Customer Portal sessions (self-service billing management)
- Subscription retrieval, update, and cancellation
- Webhook event verification and dispatch
- Subscription state synchronization (Stripe -> Parcel DB)

Design principles:
- Every public method wraps Stripe SDK calls in a try/except that maps
  stripe.error.* exceptions to Parcel's BillingError hierarchy.
- Transient failures (rate limits, network errors, Stripe 500s) are
  retried with exponential backoff before raising.
- The service never stores card data — only Stripe object IDs.
- The service never sets stripe.api_key globally. It passes the key
  per-request to avoid cross-contamination in test environments.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import stripe
from sqlalchemy.orm import Session

from core.billing.config import StripeSettings, get_stripe_settings
from core.billing.exceptions import (
    BillingError,
    CustomerNotFoundError,
    StripeAuthenticationError,
    StripeCardError,
    StripeInvalidRequestError,
    StripeTransientError,
    SubscriptionNotFoundError,
    WebhookVerificationError,
)
from models.users import User

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
#  Constants
# ──────────────────────────────────────────────────────────────────────

# Retry configuration for transient Stripe failures
_MAX_RETRIES: int = 3
_BASE_BACKOFF_SECONDS: float = 0.5  # 0.5s, 1s, 2s

# Valid Stripe subscription statuses and their Parcel access implications
ACTIVE_STATUSES: frozenset[str] = frozenset({"active", "trialing"})
GRACE_STATUSES: frozenset[str] = frozenset({"past_due"})
TERMINAL_STATUSES: frozenset[str] = frozenset({
    "canceled", "unpaid", "incomplete_expired",
})

# State machine: legal subscription status transitions
VALID_TRANSITIONS: dict[str, set[str]] = {
    "trialing":            {"active", "canceled", "incomplete_expired", "paused", "past_due"},
    "active":              {"past_due", "canceled", "unpaid", "paused"},
    "past_due":            {"active", "canceled", "unpaid"},
    "unpaid":              {"active", "canceled"},
    "canceled":            set(),   # terminal
    "incomplete":          {"active", "incomplete_expired", "canceled"},
    "incomplete_expired":  set(),   # terminal
    "paused":              {"active", "canceled"},
}

# Webhook events Parcel subscribes to, organized by priority tier
TIER_1_EVENTS: list[str] = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "customer.subscription.trial_will_end",
]
TIER_2_EVENTS: list[str] = [
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.finalized",
    "checkout.session.expired",
]
ALL_WEBHOOK_EVENTS: list[str] = TIER_1_EVENTS + TIER_2_EVENTS


# ──────────────────────────────────────────────────────────────────────
#  Internal helpers
# ──────────────────────────────────────────────────────────────────────

def _stripe_api_call(func: Any, *args: Any, **kwargs: Any) -> Any:
    """Execute a Stripe SDK call with retry logic for transient failures.

    Retries on:
        - stripe.error.RateLimitError (429)
        - stripe.error.APIConnectionError (network issue)
        - stripe.error.APIError (Stripe 500)

    Does NOT retry:
        - stripe.error.CardError (customer's card problem)
        - stripe.error.InvalidRequestError (bad params — our bug)
        - stripe.error.AuthenticationError (bad API key — config bug)

    Args:
        func: A Stripe SDK method (e.g., stripe.Customer.create).
        *args, **kwargs: Passed through to the SDK method.

    Returns:
        The Stripe API response object.

    Raises:
        StripeTransientError: After exhausting all retries.
        StripeCardError: On card decline / failure.
        StripeInvalidRequestError: On bad request parameters.
        StripeAuthenticationError: On invalid API key.
        BillingError: On any other unexpected Stripe error.
    """
    last_exception: Exception | None = None

    for attempt in range(_MAX_RETRIES):
        try:
            return func(*args, **kwargs)

        except stripe.error.RateLimitError as e:
            last_exception = e
            _wait = _BASE_BACKOFF_SECONDS * (2 ** attempt)
            logger.warning(
                "Stripe rate limit hit (attempt %d/%d), retrying in %.1fs",
                attempt + 1, _MAX_RETRIES, _wait,
            )
            time.sleep(_wait)

        except stripe.error.APIConnectionError as e:
            last_exception = e
            _wait = _BASE_BACKOFF_SECONDS * (2 ** attempt)
            logger.warning(
                "Stripe connection error (attempt %d/%d): %s — retrying in %.1fs",
                attempt + 1, _MAX_RETRIES, str(e), _wait,
            )
            time.sleep(_wait)

        except stripe.error.APIError as e:
            # Stripe 500 or unknown server error
            last_exception = e
            _wait = _BASE_BACKOFF_SECONDS * (2 ** attempt)
            logger.warning(
                "Stripe API error (attempt %d/%d): %s — retrying in %.1fs",
                attempt + 1, _MAX_RETRIES, str(e), _wait,
            )
            time.sleep(_wait)

        except stripe.error.CardError as e:
            # Not retryable — the customer's card was declined
            logger.info(
                "Stripe card error: %s (decline_code=%s)",
                e.user_message, e.code,
            )
            raise StripeCardError(
                message=e.user_message or "Your card was declined.",
                decline_code=e.code,
            ) from e

        except stripe.error.InvalidRequestError as e:
            # Not retryable — bad params or missing resource (our bug)
            logger.error("Stripe invalid request: %s (param=%s)", str(e), e.param)
            raise StripeInvalidRequestError(str(e)) from e

        except stripe.error.AuthenticationError as e:
            # Fatal — the API key is wrong
            logger.critical("Stripe authentication failed — check STRIPE_SECRET_KEY")
            raise StripeAuthenticationError() from e

        except stripe.error.StripeError as e:
            # Catch-all for any other Stripe SDK errors
            logger.error("Unexpected Stripe error: %s", str(e))
            raise BillingError(
                message=f"Stripe error: {e.user_message or str(e)}",
                code="STRIPE_UNKNOWN",
            ) from e

    # All retries exhausted for a transient error
    logger.error(
        "Stripe API call failed after %d retries: %s",
        _MAX_RETRIES, str(last_exception),
    )
    raise StripeTransientError(
        f"Stripe temporarily unavailable after {_MAX_RETRIES} retries: "
        f"{str(last_exception)}"
    ) from last_exception


def _unix_to_datetime(ts: int | None) -> datetime | None:
    """Convert a Unix timestamp (from Stripe) to a timezone-aware datetime."""
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


# ──────────────────────────────────────────────────────────────────────
#  Stripe Service
# ──────────────────────────────────────────────────────────────────────

class StripeService:
    """Parcel's single interface to the Stripe API.

    Usage from a FastAPI router:

        from services.stripe_service import StripeService

        svc = StripeService()
        checkout_url = svc.create_checkout_session(db, user, "pro", "monthly")

    The service is stateless and safe to instantiate per-request or as a
    module-level singleton. It reads configuration from StripeSettings
    (which is cached via lru_cache).

    IMPORTANT: This service never sets `stripe.api_key` globally.  Every
    SDK call passes `api_key=...` explicitly.  This prevents key leakage
    between test fixtures and production code.
    """

    def __init__(self, settings: StripeSettings | None = None) -> None:
        """Initialize the Stripe service.

        Args:
            settings: Optional override for testing. If None, reads from
                      environment variables via get_stripe_settings().
        """
        self._settings = settings or get_stripe_settings()
        self._api_key = self._settings.STRIPE_SECRET_KEY

    # ── Property accessors ────────────────────────────────────────────

    @property
    def settings(self) -> StripeSettings:
        return self._settings

    # ──────────────────────────────────────────────────────────────────
    #  1. Customer Management
    # ──────────────────────────────────────────────────────────────────

    def create_customer(self, db: Session, user: User) -> str:
        """Create a Stripe Customer for a Parcel user.

        If the user already has a stripe_customer_id, returns it without
        making a Stripe API call (idempotent).

        The Stripe Customer is linked to the Parcel user via metadata
        so that webhook handlers can resolve the user from Stripe events.

        Args:
            db: SQLAlchemy session (will be committed on success).
            user: The Parcel User ORM object.

        Returns:
            The Stripe Customer ID (cus_...).

        Raises:
            StripeTransientError: Stripe is temporarily unavailable.
            StripeAuthenticationError: Invalid API key.
        """
        # Idempotent: if the user already has a customer ID, return it
        if hasattr(user, "stripe_customer_id") and user.stripe_customer_id:
            return user.stripe_customer_id

        customer = _stripe_api_call(
            stripe.Customer.create,
            email=user.email,
            name=user.name,
            metadata={
                "parcel_user_id": str(user.id),
                "parcel_environment": self._settings.ENVIRONMENT,
            },
            api_key=self._api_key,
        )

        user.stripe_customer_id = customer.id  # type: ignore[attr-defined]
        db.commit()

        logger.info(
            "Created Stripe customer %s for user %s",
            customer.id, user.id,
        )
        return customer.id

    def get_or_create_customer(self, db: Session, user: User) -> str:
        """Ensure the user has a Stripe Customer and return the ID.

        This is the recommended entry point — call this before creating
        Checkout Sessions or Portal Sessions.

        Args:
            db: SQLAlchemy session.
            user: The Parcel User ORM object.

        Returns:
            The Stripe Customer ID (cus_...).
        """
        return self.create_customer(db, user)

    # ──────────────────────────────────────────────────────────────────
    #  2. Checkout Session (New Subscriptions)
    # ──────────────────────────────────────────────────────────────────

    def create_checkout_session(
        self,
        db: Session,
        user: User,
        plan: str,
        interval: str,
    ) -> str:
        """Create a Stripe Checkout Session for a new subscription.

        The user is redirected to Stripe's hosted checkout page. After
        payment (or trial start), Stripe redirects back to Parcel's
        frontend and fires a `checkout.session.completed` webhook.

        Args:
            db: SQLAlchemy session.
            user: The authenticated Parcel user.
            plan: "starter" | "pro" | "team"
            interval: "monthly" | "annual"

        Returns:
            The Stripe Checkout Session URL to redirect the user to.

        Raises:
            ValueError: If plan/interval combination has no configured price.
            StripeTransientError: Stripe is temporarily unavailable.
            StripeInvalidRequestError: Bad parameters (our bug).
            StripeAuthenticationError: Invalid API key.
        """
        # Resolve the Stripe Price ID from config
        price_id = self._settings.get_price_id(plan, interval)

        # Ensure the user has a Stripe Customer
        customer_id = self.get_or_create_customer(db, user)

        frontend_url = self._settings.FRONTEND_URL

        session = _stripe_api_call(
            stripe.checkout.Session.create,
            customer=customer_id,
            client_reference_id=str(user.id),  # Links session -> Parcel user
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=(
                f"{frontend_url}/settings?billing=success"
                f"&session_id={{CHECKOUT_SESSION_ID}}"
            ),
            cancel_url=f"{frontend_url}/settings?billing=canceled",
            subscription_data={
                "trial_period_days": self._settings.TRIAL_PERIOD_DAYS,
                "metadata": {
                    "parcel_user_id": str(user.id),
                    "parcel_plan": plan,
                },
            },
            allow_promotion_codes=True,
            api_key=self._api_key,
        )

        logger.info(
            "Created Checkout Session %s for user %s (plan=%s, interval=%s)",
            session.id, user.id, plan, interval,
        )
        return session.url

    # ──────────────────────────────────────────────────────────────────
    #  3. Customer Portal Session (Self-Service Billing)
    # ──────────────────────────────────────────────────────────────────

    def create_portal_session(self, user: User) -> str:
        """Create a Stripe Customer Portal session.

        The portal lets users self-manage: update payment method, view
        invoices, switch plans, or cancel. Parcel does not need to build
        UI for these actions.

        Args:
            user: The authenticated Parcel user. Must have a
                  stripe_customer_id.

        Returns:
            The portal session URL to redirect the user to.

        Raises:
            CustomerNotFoundError: User has no linked Stripe customer.
            StripeTransientError: Stripe is temporarily unavailable.
        """
        customer_id = getattr(user, "stripe_customer_id", None)
        if not customer_id:
            raise CustomerNotFoundError(str(user.id))

        session = _stripe_api_call(
            stripe.billing_portal.Session.create,
            customer=customer_id,
            return_url=f"{self._settings.FRONTEND_URL}/settings",
            api_key=self._api_key,
        )

        logger.info(
            "Created Portal Session for user %s (customer=%s)",
            user.id, customer_id,
        )
        return session.url

    # ──────────────────────────────────────────────────────────────────
    #  4. Subscription Retrieval
    # ──────────────────────────────────────────────────────────────────

    def get_subscription(self, user: User) -> dict[str, Any]:
        """Fetch the current subscription from Stripe (source of truth).

        Returns a normalized dict with the fields Parcel cares about.
        This is useful for the settings/billing page to show current
        plan status without relying solely on the local DB cache.

        Args:
            user: The Parcel user. Must have stripe_subscription_id.

        Returns:
            Dict with keys: id, status, plan, current_period_end,
            cancel_at_period_end, trial_end, default_payment_method.

        Raises:
            SubscriptionNotFoundError: No subscription linked.
            StripeTransientError: Stripe is temporarily unavailable.
            StripeInvalidRequestError: Subscription ID invalid/deleted.
        """
        sub_id = getattr(user, "stripe_subscription_id", None)
        if not sub_id:
            raise SubscriptionNotFoundError(str(user.id))

        sub = _stripe_api_call(
            stripe.Subscription.retrieve,
            sub_id,
            expand=["default_payment_method"],
            api_key=self._api_key,
        )

        # Resolve Parcel plan from the price on the first subscription item
        plan = "free"
        if sub.get("items") and sub["items"]["data"]:
            price_id = sub["items"]["data"][0]["price"]["id"]
            plan = self._settings.price_to_plan_map.get(price_id, "free")

        return {
            "id": sub["id"],
            "status": sub["status"],
            "plan": plan,
            "current_period_end": _unix_to_datetime(sub.get("current_period_end")),
            "cancel_at_period_end": sub.get("cancel_at_period_end", False),
            "trial_end": _unix_to_datetime(sub.get("trial_end")),
            "default_payment_method": _format_payment_method(
                sub.get("default_payment_method")
            ),
        }

    # ──────────────────────────────────────────────────────────────────
    #  5. Subscription Update (Plan Changes)
    # ──────────────────────────────────────────────────────────────────

    def update_subscription(
        self,
        db: Session,
        user: User,
        new_plan: str,
        new_interval: str,
    ) -> dict[str, Any]:
        """Change a user's subscription plan.

        Upgrade behaviour:
            Immediate switch with prorated charge for the remainder of
            the current billing period.

        Downgrade behaviour:
            Change takes effect at the end of the current billing period
            (no proration — user keeps higher plan until renewal).

        Args:
            db: SQLAlchemy session.
            user: The Parcel user with an active subscription.
            new_plan: "starter" | "pro" | "team"
            new_interval: "monthly" | "annual"

        Returns:
            Dict with updated subscription details (same shape as
            get_subscription).

        Raises:
            SubscriptionNotFoundError: No active subscription.
            ValueError: Invalid plan/interval combination.
            StripeTransientError: Stripe is temporarily unavailable.
        """
        sub_id = getattr(user, "stripe_subscription_id", None)
        if not sub_id:
            raise SubscriptionNotFoundError(str(user.id))

        new_price_id = self._settings.get_price_id(new_plan, new_interval)

        # Retrieve current subscription to get the subscription item ID
        current_sub = _stripe_api_call(
            stripe.Subscription.retrieve,
            sub_id,
            api_key=self._api_key,
        )
        current_item_id = current_sub["items"]["data"][0]["id"]

        # Determine current plan to decide upgrade vs downgrade
        current_price_id = current_sub["items"]["data"][0]["price"]["id"]
        current_plan = self._settings.price_to_plan_map.get(current_price_id, "free")

        plan_hierarchy = {"free": 0, "starter": 1, "pro": 2, "team": 3}
        is_upgrade = plan_hierarchy.get(new_plan, 0) > plan_hierarchy.get(current_plan, 0)

        # Upgrades: immediate proration. Downgrades: change at period end.
        proration_behavior = "create_prorations" if is_upgrade else "none"

        updated_sub = _stripe_api_call(
            stripe.Subscription.modify,
            sub_id,
            items=[{"id": current_item_id, "price": new_price_id}],
            proration_behavior=proration_behavior,
            api_key=self._api_key,
        )

        # Update local cache
        user.plan = new_plan  # type: ignore[attr-defined]
        user.current_period_end = _unix_to_datetime(  # type: ignore[attr-defined]
            updated_sub.get("current_period_end")
        )
        db.commit()

        logger.info(
            "Subscription %s updated: %s -> %s (%s, proration=%s)",
            sub_id, current_plan, new_plan,
            "upgrade" if is_upgrade else "downgrade",
            proration_behavior,
        )

        return {
            "id": updated_sub["id"],
            "status": updated_sub["status"],
            "plan": new_plan,
            "current_period_end": _unix_to_datetime(
                updated_sub.get("current_period_end")
            ),
            "cancel_at_period_end": updated_sub.get("cancel_at_period_end", False),
            "proration_behavior": proration_behavior,
        }

    # ──────────────────────────────────────────────────────────────────
    #  6. Subscription Cancellation
    # ──────────────────────────────────────────────────────────────────

    def cancel_subscription(
        self,
        db: Session,
        user: User,
        immediately: bool = False,
    ) -> dict[str, Any]:
        """Cancel a user's subscription.

        Default behaviour: cancel at the end of the current billing
        period. The user retains access until then. Set immediately=True
        to cancel now (rare — mainly for admin use or fraud cases).

        Args:
            db: SQLAlchemy session.
            user: The Parcel user.
            immediately: If True, cancel right now instead of at
                         period end.

        Returns:
            Dict with updated subscription state.

        Raises:
            SubscriptionNotFoundError: No subscription to cancel.
            StripeTransientError: Stripe is temporarily unavailable.
        """
        sub_id = getattr(user, "stripe_subscription_id", None)
        if not sub_id:
            raise SubscriptionNotFoundError(str(user.id))

        if immediately:
            # Hard cancel — ends access now
            canceled_sub = _stripe_api_call(
                stripe.Subscription.cancel,
                sub_id,
                api_key=self._api_key,
            )
            user.plan = "free"  # type: ignore[attr-defined]
            user.plan_status = "canceled"  # type: ignore[attr-defined]
        else:
            # Soft cancel — cancel at period end
            canceled_sub = _stripe_api_call(
                stripe.Subscription.modify,
                sub_id,
                cancel_at_period_end=True,
                api_key=self._api_key,
            )
            # User keeps current plan until period ends; webhook will
            # fire customer.subscription.deleted at that point.

        db.commit()

        logger.info(
            "Subscription %s %s for user %s",
            sub_id,
            "canceled immediately" if immediately else "set to cancel at period end",
            user.id,
        )

        return {
            "id": canceled_sub["id"],
            "status": canceled_sub["status"],
            "cancel_at_period_end": canceled_sub.get("cancel_at_period_end", False),
            "canceled_immediately": immediately,
        }

    # ──────────────────────────────────────────────────────────────────
    #  7. Webhook Event Verification & Dispatch
    # ──────────────────────────────────────────────────────────────────

    def verify_webhook_event(
        self,
        payload: bytes,
        sig_header: str,
    ) -> dict[str, Any]:
        """Verify a Stripe webhook signature and return the parsed event.

        CRITICAL: `payload` must be the raw request body bytes — do NOT
        parse or transform them before passing to this method. Signature
        verification operates on the exact bytes Stripe sent.

        Args:
            payload: Raw request body bytes from `await request.body()`.
            sig_header: Value of the `Stripe-Signature` HTTP header.

        Returns:
            The verified Stripe Event as a dict.

        Raises:
            WebhookVerificationError: Signature invalid or payload
                                       malformed.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=sig_header,
                secret=self._settings.STRIPE_WEBHOOK_SECRET,
                tolerance=self._settings.WEBHOOK_TOLERANCE_SECONDS,
            )
        except ValueError as e:
            logger.warning("Webhook payload invalid: %s", str(e))
            raise WebhookVerificationError("Invalid payload") from e
        except stripe.error.SignatureVerificationError as e:
            logger.warning("Webhook signature verification failed: %s", str(e))
            raise WebhookVerificationError("Invalid signature") from e

        return event

    def handle_webhook_event(self, event: dict[str, Any], db: Session) -> None:
        """Dispatch a verified webhook event to the appropriate handler.

        This is the central event router. It logs the event type and ID,
        then delegates to a specific handler method. Unhandled event types
        are logged but not treated as errors (Stripe may add new events).

        The caller (the webhook router) is responsible for:
        1. Verifying the signature (via verify_webhook_event)
        2. Deduplication (via the webhook_events table)
        3. Returning 200 to Stripe quickly

        Args:
            event: A verified Stripe Event dict.
            db: SQLAlchemy session.
        """
        event_type: str = event["type"]
        event_id: str = event["id"]
        data_object: dict[str, Any] = event["data"]["object"]

        logger.info(
            "Processing webhook: type=%s id=%s object_id=%s",
            event_type, event_id, data_object.get("id", "unknown"),
        )

        # Dispatch table — maps event types to handler methods
        handlers: dict[str, Any] = {
            "checkout.session.completed":          self._handle_checkout_completed,
            "customer.subscription.created":       self._handle_subscription_created,
            "customer.subscription.updated":       self._handle_subscription_updated,
            "customer.subscription.deleted":       self._handle_subscription_deleted,
            "customer.subscription.trial_will_end": self._handle_trial_will_end,
            "customer.subscription.paused":        self._handle_subscription_paused,
            "customer.subscription.resumed":       self._handle_subscription_resumed,
            "invoice.paid":                        self._handle_invoice_paid,
            "invoice.payment_failed":              self._handle_payment_failed,
            "invoice.payment_action_required":     self._handle_payment_action_required,
            "checkout.session.expired":            self._handle_checkout_expired,
        }

        handler = handlers.get(event_type)
        if handler:
            handler(data_object, db)
        else:
            logger.info("Unhandled webhook event type: %s", event_type)

    # ── Webhook Handler: checkout.session.completed ───────────────────

    def _handle_checkout_completed(
        self, session: dict[str, Any], db: Session
    ) -> None:
        """Handle a completed Checkout Session.

        This fires when a user finishes Stripe Checkout for a new
        subscription. It links the Stripe customer and subscription to
        the Parcel user and sets their plan.

        Uses client_reference_id (set during session creation) to resolve
        the Parcel user, which is more reliable than looking up by
        customer email.
        """
        user_id: str | None = session.get("client_reference_id")
        customer_id: str | None = session.get("customer")
        subscription_id: str | None = session.get("subscription")

        if not user_id:
            logger.error(
                "checkout.session.completed missing client_reference_id: %s",
                session.get("id"),
            )
            return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(
                "checkout.session.completed: user %s not found", user_id
            )
            return

        # Link Stripe IDs to user
        user.stripe_customer_id = customer_id  # type: ignore[attr-defined]
        user.stripe_subscription_id = subscription_id  # type: ignore[attr-defined]

        # Resolve plan from the subscription
        if subscription_id:
            try:
                sub = _stripe_api_call(
                    stripe.Subscription.retrieve,
                    subscription_id,
                    api_key=self._api_key,
                )
                plan = self._resolve_plan_from_subscription(sub)
                user.plan = plan  # type: ignore[attr-defined]
                user.plan_status = sub.get("status", "active")  # type: ignore[attr-defined]
                user.current_period_end = _unix_to_datetime(  # type: ignore[attr-defined]
                    sub.get("current_period_end")
                )
                user.trial_ends_at = _unix_to_datetime(  # type: ignore[attr-defined]
                    sub.get("trial_end")
                )
            except BillingError:
                # If we cannot fetch the subscription, still save customer/sub IDs.
                # The sync_subscription_status job will catch up.
                logger.warning(
                    "Could not fetch subscription %s during checkout — "
                    "will sync later",
                    subscription_id,
                )

        db.commit()
        logger.info(
            "Checkout completed: user=%s customer=%s subscription=%s",
            user_id, customer_id, subscription_id,
        )

    # ── Webhook Handler: customer.subscription.created ────────────────

    def _handle_subscription_created(
        self, subscription: dict[str, Any], db: Session
    ) -> None:
        """Handle a newly created subscription.

        This may arrive before or after checkout.session.completed.
        The handler is safe to run in either order because it uses an
        upsert pattern: if checkout already set the fields, this is a
        no-op update. If checkout has not run yet, we set what we can
        (customer lookup by stripe_customer_id).
        """
        customer_id: str = subscription.get("customer", "")
        subscription_id: str = subscription.get("id", "")
        status: str = subscription.get("status", "")

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            # checkout.session.completed may not have run yet — that
            # handler will set stripe_customer_id. Log and return OK.
            logger.info(
                "subscription.created: no user with customer=%s — "
                "checkout handler will link later",
                customer_id,
            )
            return

        # Upsert: set subscription ID and status
        user.stripe_subscription_id = subscription_id  # type: ignore[attr-defined]
        user.plan_status = status  # type: ignore[attr-defined]
        user.plan = self._resolve_plan_from_subscription(subscription)  # type: ignore[attr-defined]
        user.current_period_end = _unix_to_datetime(  # type: ignore[attr-defined]
            subscription.get("current_period_end")
        )
        user.trial_ends_at = _unix_to_datetime(  # type: ignore[attr-defined]
            subscription.get("trial_end")
        )

        db.commit()
        logger.info(
            "Subscription created: user=%s sub=%s status=%s",
            user.id, subscription_id, status,
        )

    # ── Webhook Handler: customer.subscription.updated ────────────────

    def _handle_subscription_updated(
        self, subscription: dict[str, Any], db: Session
    ) -> None:
        """Handle subscription updates (plan change, renewal, status change).

        Uses the fetch-on-receive pattern for critical state: after
        receiving the event, we fetch the subscription from Stripe's API
        to get the canonical current state. This eliminates ordering
        issues when multiple update events arrive out of sequence.
        """
        subscription_id: str = subscription.get("id", "")

        # Fetch ground truth from Stripe instead of trusting event payload
        try:
            canonical_sub = _stripe_api_call(
                stripe.Subscription.retrieve,
                subscription_id,
                api_key=self._api_key,
            )
        except BillingError as e:
            logger.error(
                "Failed to fetch subscription %s during update: %s",
                subscription_id, str(e),
            )
            # Fall back to event payload
            canonical_sub = subscription

        customer_id: str = canonical_sub.get("customer", "")
        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            logger.warning(
                "subscription.updated: no user for customer=%s", customer_id
            )
            return

        new_status: str = canonical_sub.get("status", "")
        current_status: str = getattr(user, "plan_status", "")

        # State machine validation: only apply legal transitions
        if current_status and new_status != current_status:
            valid_next = VALID_TRANSITIONS.get(current_status, set())
            if new_status not in valid_next:
                logger.warning(
                    "Ignoring invalid transition %s -> %s for user %s",
                    current_status, new_status, user.id,
                )
                return

        user.plan = self._resolve_plan_from_subscription(canonical_sub)  # type: ignore[attr-defined]
        user.plan_status = new_status  # type: ignore[attr-defined]
        user.current_period_end = _unix_to_datetime(  # type: ignore[attr-defined]
            canonical_sub.get("current_period_end")
        )
        user.trial_ends_at = _unix_to_datetime(  # type: ignore[attr-defined]
            canonical_sub.get("trial_end")
        )

        db.commit()
        logger.info(
            "Subscription updated: user=%s sub=%s status=%s -> %s plan=%s",
            user.id, subscription_id, current_status, new_status,
            user.plan,  # type: ignore[attr-defined]
        )

    # ── Webhook Handler: customer.subscription.deleted ────────────────

    def _handle_subscription_deleted(
        self, subscription: dict[str, Any], db: Session
    ) -> None:
        """Handle a fully canceled/expired subscription.

        Downgrades the user to the Free tier. The subscription row is
        kept (soft-delete pattern) — only the status and plan change.
        """
        customer_id: str = subscription.get("customer", "")

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            logger.warning(
                "subscription.deleted: no user for customer=%s", customer_id
            )
            return

        previous_plan = getattr(user, "plan", "free")
        user.plan = "free"  # type: ignore[attr-defined]
        user.plan_status = "canceled"  # type: ignore[attr-defined]

        db.commit()
        logger.info(
            "Subscription deleted: user=%s downgraded from %s to free",
            user.id, previous_plan,
        )

    # ── Webhook Handler: customer.subscription.trial_will_end ─────────

    def _handle_trial_will_end(
        self, subscription: dict[str, Any], db: Session
    ) -> None:
        """Handle the 3-day trial ending warning.

        Fires 3 days before the trial expires. Parcel should send the
        user an email reminding them to add a payment method. The actual
        email sending is delegated to a notification service (not
        Stripe's concern).
        """
        customer_id: str = subscription.get("customer", "")
        trial_end = subscription.get("trial_end")

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            return

        logger.info(
            "Trial ending soon for user=%s (trial_end=%s)",
            user.id, _unix_to_datetime(trial_end),
        )

        # TODO: trigger trial-ending email via notification service
        # from core.email import send_trial_ending_email
        # send_trial_ending_email(user.email, _unix_to_datetime(trial_end))

    # ── Webhook Handler: customer.subscription.paused ─────────────────

    def _handle_subscription_paused(
        self, subscription: dict[str, Any], db: Session
    ) -> None:
        """Handle subscription pause (not currently enabled for Parcel).

        Included for forward-compatibility. If pause is ever enabled in
        the Customer Portal, this handler restricts access without
        deleting data.
        """
        customer_id: str = subscription.get("customer", "")
        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            return

        user.plan_status = "paused"  # type: ignore[attr-defined]
        db.commit()
        logger.info("Subscription paused for user=%s", user.id)

    # ── Webhook Handler: customer.subscription.resumed ────────────────

    def _handle_subscription_resumed(
        self, subscription: dict[str, Any], db: Session
    ) -> None:
        """Handle subscription resume after pause."""
        customer_id: str = subscription.get("customer", "")
        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            return

        user.plan_status = subscription.get("status", "active")  # type: ignore[attr-defined]
        user.plan = self._resolve_plan_from_subscription(subscription)  # type: ignore[attr-defined]
        db.commit()
        logger.info("Subscription resumed for user=%s", user.id)

    # ── Webhook Handler: invoice.paid ─────────────────────────────────

    def _handle_invoice_paid(
        self, invoice: dict[str, Any], db: Session
    ) -> None:
        """Handle a successfully paid invoice.

        Confirms payment was collected. Clears any past_due flags and
        updates the billing period end date from the subscription.
        """
        customer_id: str = invoice.get("customer", "")
        subscription_id: str | None = invoice.get("subscription")

        if not subscription_id:
            # One-off invoice, not subscription — skip
            return

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            return

        # If user was past_due, payment succeeded — restore to active
        if getattr(user, "plan_status", "") == "past_due":
            user.plan_status = "active"  # type: ignore[attr-defined]

        # Fetch updated period end from the subscription
        try:
            sub = _stripe_api_call(
                stripe.Subscription.retrieve,
                subscription_id,
                api_key=self._api_key,
            )
            user.current_period_end = _unix_to_datetime(  # type: ignore[attr-defined]
                sub.get("current_period_end")
            )
        except BillingError:
            logger.warning(
                "Could not refresh subscription %s after invoice.paid",
                subscription_id,
            )

        db.commit()
        logger.info(
            "Invoice paid for user=%s (invoice=%s, amount=%s %s)",
            user.id,
            invoice.get("id"),
            invoice.get("amount_paid"),
            invoice.get("currency", "usd"),
        )

    # ── Webhook Handler: invoice.payment_failed ───────────────────────

    def _handle_payment_failed(
        self, invoice: dict[str, Any], db: Session
    ) -> None:
        """Handle a failed invoice payment.

        Sets the user to past_due status. Stripe will retry payment
        automatically per the Smart Retries schedule. The frontend
        should show a warning banner when plan_status == "past_due".
        """
        customer_id: str = invoice.get("customer", "")
        subscription_id: str | None = invoice.get("subscription")

        if not subscription_id:
            return

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            return

        user.plan_status = "past_due"  # type: ignore[attr-defined]
        db.commit()

        logger.warning(
            "Payment failed for user=%s (invoice=%s, attempt=%s)",
            user.id,
            invoice.get("id"),
            invoice.get("attempt_count"),
        )

        # TODO: trigger dunning email via notification service
        # from core.email import send_payment_failed_email
        # send_payment_failed_email(user.email)

    # ── Webhook Handler: invoice.payment_action_required ──────────────

    def _handle_payment_action_required(
        self, invoice: dict[str, Any], db: Session
    ) -> None:
        """Handle SCA / 3D Secure authentication required.

        The user must complete additional authentication in the Stripe
        Customer Portal or hosted invoice page.
        """
        customer_id: str = invoice.get("customer", "")

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id  # type: ignore[attr-defined]
        ).first()

        if not user:
            return

        logger.info(
            "Payment action required for user=%s (invoice=%s)",
            user.id, invoice.get("id"),
        )

        # TODO: notify user that 3DS authentication is needed
        # The Stripe hosted invoice page handles the actual 3DS flow.

    # ── Webhook Handler: checkout.session.expired ─────────────────────

    def _handle_checkout_expired(
        self, session: dict[str, Any], db: Session
    ) -> None:
        """Handle an expired (abandoned) Checkout Session.

        Logged for analytics. No state change needed — the user simply
        did not complete checkout.
        """
        user_id: str | None = session.get("client_reference_id")
        logger.info(
            "Checkout session expired: session=%s user=%s",
            session.get("id"), user_id,
        )

    # ──────────────────────────────────────────────────────────────────
    #  8. Subscription Sync (Stripe -> Parcel DB)
    # ──────────────────────────────────────────────────────────────────

    def sync_subscription_status(self, db: Session, user: User) -> dict[str, Any]:
        """Fetch the subscription from Stripe and update local DB to match.

        This is the "fetch-on-demand" reconciliation pattern. Call it:
        - On the billing settings page (ensure freshness)
        - In a daily cron job for all active subscribers
        - As a recovery mechanism after missed webhooks

        Args:
            db: SQLAlchemy session.
            user: The Parcel user with stripe_subscription_id.

        Returns:
            Dict with the synced subscription state.

        Raises:
            SubscriptionNotFoundError: No subscription linked.
            StripeTransientError: Stripe is temporarily unavailable.
        """
        sub_id = getattr(user, "stripe_subscription_id", None)
        if not sub_id:
            raise SubscriptionNotFoundError(str(user.id))

        sub = _stripe_api_call(
            stripe.Subscription.retrieve,
            sub_id,
            api_key=self._api_key,
        )

        plan = self._resolve_plan_from_subscription(sub)
        status = sub.get("status", "")

        # Detect drift
        old_plan = getattr(user, "plan", "free")
        old_status = getattr(user, "plan_status", "")

        user.plan = plan  # type: ignore[attr-defined]
        user.plan_status = status  # type: ignore[attr-defined]
        user.current_period_end = _unix_to_datetime(  # type: ignore[attr-defined]
            sub.get("current_period_end")
        )
        user.trial_ends_at = _unix_to_datetime(  # type: ignore[attr-defined]
            sub.get("trial_end")
        )

        db.commit()

        if old_plan != plan or old_status != status:
            logger.warning(
                "Subscription drift detected for user=%s: "
                "plan %s->%s, status %s->%s",
                user.id, old_plan, plan, old_status, status,
            )

        return {
            "id": sub["id"],
            "status": status,
            "plan": plan,
            "current_period_end": _unix_to_datetime(sub.get("current_period_end")),
            "synced": True,
            "drift_detected": old_plan != plan or old_status != status,
        }

    def reconcile_all_subscriptions(self, db: Session) -> list[dict[str, Any]]:
        """Reconcile ALL active subscribers against Stripe.

        Intended for a daily cron job. Iterates every user with an
        active-ish subscription status and syncs their state from Stripe.

        This is the safety net that catches missed webhooks.

        Args:
            db: SQLAlchemy session.

        Returns:
            A list of dicts for subscriptions where drift was detected.
        """
        users = db.query(User).filter(
            User.stripe_subscription_id.isnot(None),  # type: ignore[attr-defined]
            User.plan_status.in_(  # type: ignore[attr-defined]
                list(ACTIVE_STATUSES | GRACE_STATUSES | {"trialing"})
            ),
        ).all()

        mismatches: list[dict[str, Any]] = []

        for user in users:
            try:
                result = self.sync_subscription_status(db, user)
                if result.get("drift_detected"):
                    mismatches.append({
                        "user_id": str(user.id),
                        "subscription_id": result["id"],
                        "new_plan": result["plan"],
                        "new_status": result["status"],
                    })
            except SubscriptionNotFoundError:
                logger.warning(
                    "Reconciliation: user %s has sub ID but no Stripe subscription",
                    user.id,
                )
            except StripeTransientError:
                logger.error(
                    "Reconciliation: Stripe unavailable for user %s — skipping",
                    user.id,
                )
            except BillingError as e:
                logger.error(
                    "Reconciliation error for user %s: %s", user.id, str(e)
                )

        if mismatches:
            logger.warning(
                "Reconciliation found %d mismatches out of %d subscribers",
                len(mismatches), len(users),
            )

        return mismatches

    # ──────────────────────────────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────────────────────────────

    def _resolve_plan_from_subscription(
        self, subscription: dict[str, Any]
    ) -> str:
        """Extract the Parcel plan name from a Stripe Subscription object.

        Looks at the first subscription item's price ID and maps it to
        a Parcel plan via the configured price_to_plan_map. Falls back
        to checking the price's metadata for a 'parcel_plan' key.

        Returns "free" if the plan cannot be determined.
        """
        items = subscription.get("items", {}).get("data", [])
        if not items:
            return "free"

        price_id: str = items[0].get("price", {}).get("id", "")

        # Try direct lookup from config
        plan = self._settings.price_to_plan_map.get(price_id)
        if plan:
            return plan

        # Fallback: check price metadata (set during price creation)
        metadata = items[0].get("price", {}).get("metadata", {})
        plan = metadata.get("parcel_plan", "free")

        if plan == "free":
            logger.warning(
                "Could not resolve plan for price %s — defaulting to free",
                price_id,
            )

        return plan


# ──────────────────────────────────────────────────────────────────────
#  Module-level helpers (used by the service and by get_subscription)
# ──────────────────────────────────────────────────────────────────────

def _format_payment_method(pm: Any) -> dict[str, str | None] | None:
    """Format a Stripe PaymentMethod into safe display fields.

    Only exposes brand and last4 — NEVER raw card numbers, CVV, or
    expiration dates.
    """
    if pm is None:
        return None

    if isinstance(pm, str):
        # Not expanded — just the pm_ ID
        return {"id": pm, "brand": None, "last4": None}

    card = pm.get("card", {}) if isinstance(pm, dict) else getattr(pm, "card", None)
    if card is None:
        return {"id": pm.get("id", ""), "brand": None, "last4": None}

    if isinstance(card, dict):
        return {
            "id": pm.get("id", ""),
            "brand": card.get("brand"),
            "last4": card.get("last4"),
        }

    return {
        "id": pm.get("id", "") if isinstance(pm, dict) else getattr(pm, "id", ""),
        "brand": getattr(card, "brand", None),
        "last4": getattr(card, "last4", None),
    }
```

---

## 4. Startup Validation

Add this to `main.py` (or a FastAPI lifespan handler) so the backend fails fast if Stripe is misconfigured.

```python
# In backend/main.py — add to startup or lifespan

from core.billing.config import get_stripe_settings

@app.on_event("startup")
def _validate_stripe_config() -> None:
    """Validate Stripe configuration at startup.

    Fails fast with a clear error if:
    - Required env vars are missing
    - API key prefix does not match the environment
    - Webhook secret format is wrong
    """
    try:
        settings = get_stripe_settings()
        settings.validate_key_environment_match()
    except Exception as e:
        # Log but do not crash — allows health checks to still respond
        # during deployment. The billing routes will fail with clear
        # errors if Stripe is misconfigured.
        import logging
        logging.getLogger(__name__).error(
            "Stripe configuration error: %s — billing features disabled",
            str(e),
        )
```

---

## 5. Dependency Injection for Routers

The service is instantiated per-request via a FastAPI dependency. This makes it easy to mock in tests.

```python
# backend/dependencies/billing.py
"""FastAPI dependencies for billing routes."""

from __future__ import annotations

from services.stripe_service import StripeService


def get_stripe_service() -> StripeService:
    """Dependency that provides the Stripe service.

    Returns a new instance each time. The underlying StripeSettings
    is cached (lru_cache), so this is cheap.

    Override in tests:
        app.dependency_overrides[get_stripe_service] = lambda: mock_svc
    """
    return StripeService()
```

Usage in a router:

```python
# backend/routers/billing.py (sketch — full router is a separate design doc)

from fastapi import APIRouter, Depends
from dependencies.billing import get_stripe_service
from services.stripe_service import StripeService

router = APIRouter(prefix="/billing", tags=["billing"])

@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    svc: StripeService = Depends(get_stripe_service),
) -> dict:
    url = svc.create_checkout_session(db, current_user, body.plan, body.interval)
    return {"checkout_url": url}

@router.post("/portal")
async def create_portal(
    current_user: User = Depends(get_current_user),
    svc: StripeService = Depends(get_stripe_service),
) -> dict:
    url = svc.create_portal_session(current_user)
    return {"portal_url": url}
```

---

## 6. Error Handling Patterns Summary

Every Stripe API call flows through `_stripe_api_call`, which provides a consistent error handling contract:

| Stripe SDK Exception | Retried? | Parcel Exception | HTTP Status (at router level) |
|---|---|---|---|
| `RateLimitError` (429) | Yes (3x) | `StripeTransientError` | 503 |
| `APIConnectionError` | Yes (3x) | `StripeTransientError` | 503 |
| `APIError` (500) | Yes (3x) | `StripeTransientError` | 503 |
| `CardError` | No | `StripeCardError` | 402 |
| `InvalidRequestError` | No | `StripeInvalidRequestError` | 400 |
| `AuthenticationError` | No | `StripeAuthenticationError` | 500 |
| Other `StripeError` | No | `BillingError` | 500 |

The router layer converts these to HTTP responses:

```python
# backend/routers/billing.py — exception handler pattern

from fastapi import HTTPException, status
from core.billing.exceptions import (
    BillingError,
    CustomerNotFoundError,
    StripeCardError,
    StripeTransientError,
)

@router.post("/checkout")
async def create_checkout(...):
    try:
        url = svc.create_checkout_session(db, current_user, body.plan, body.interval)
        return {"checkout_url": url}
    except StripeCardError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": e.message, "code": e.code},
        )
    except CustomerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": e.message, "code": e.code},
        )
    except StripeTransientError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "Payment service temporarily unavailable", "code": e.code},
        )
    except BillingError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": e.message, "code": e.code},
        )
```

---

## 7. Retry Logic Detail

```
Attempt 1: Immediate call
  └── On transient error → sleep 0.5s
Attempt 2: Retry
  └── On transient error → sleep 1.0s
Attempt 3: Final retry
  └── On transient error → raise StripeTransientError

Total worst-case latency: ~1.5s (plus Stripe response time)
```

The backoff formula is `_BASE_BACKOFF_SECONDS * (2 ** attempt)`:
- Attempt 0: 0.5s
- Attempt 1: 1.0s
- Attempt 2: 2.0s (but this is the final attempt, so we raise instead)

This is deliberately conservative. For a SaaS checkout flow, the user is waiting — we do not want to block for 30 seconds on retries. Three attempts with short backoff catches most transient blips. If Stripe is truly down, we fail fast and show "service temporarily unavailable."

---

## 8. File Structure

```
backend/
├── core/
│   └── billing/
│       ├── __init__.py
│       ├── config.py          # StripeSettings (pydantic-settings)
│       └── exceptions.py      # BillingError hierarchy
├── services/
│   ├── __init__.py
│   └── stripe_service.py      # StripeService class (this design)
├── dependencies/
│   ├── __init__.py
│   └── billing.py             # get_stripe_service() FastAPI dependency
├── models/
│   └── users.py               # Add billing columns (separate migration)
└── routers/
    └── billing.py             # HTTP endpoints (separate design doc)
```

---

## CRITICAL DECISIONS

### 1. Per-Request API Key, Not Global

**Decision:** Pass `api_key=self._api_key` to every Stripe SDK call instead of setting `stripe.api_key` globally.

**Why:** Setting `stripe.api_key` globally is the quickest path, but it creates a process-wide singleton that is impossible to override in tests without monkeypatching. Per-request keys let us inject test keys in test fixtures without risk of cross-contamination. This also prevents a hypothetical future multi-tenant scenario from leaking keys.

### 2. Fetch-on-Receive for subscription.updated

**Decision:** When handling `customer.subscription.updated`, the handler fetches the subscription from Stripe's API rather than trusting the event payload.

**Why:** Stripe does not guarantee event ordering. Two `subscription.updated` events can arrive out of order, and applying an older event's payload would regress the user's plan state. Fetching the current subscription from Stripe after receiving the event guarantees we always write the latest state. The cost is one extra API call per `subscription.updated` webhook, but at Parcel's scale (hundreds, not millions of subscribers) this is negligible.

### 3. Sync (time.sleep) Retries, Not Async

**Decision:** The retry logic in `_stripe_api_call` uses `time.sleep()` (blocking) rather than `asyncio.sleep()`.

**Why:** The Stripe Python SDK is synchronous. All `stripe.Customer.create()`, `stripe.Subscription.retrieve()`, etc. calls are blocking HTTP calls. Wrapping them in `asyncio.sleep()` would require running them in an executor, adding complexity without benefit. FastAPI handles this correctly: sync route functions run in a threadpool, and `time.sleep()` only blocks that thread. If Parcel ever migrates to the async Stripe SDK (`stripe.aio`), the retry logic should be refactored to use `asyncio.sleep()`.

### 4. State Machine Validation in subscription.updated Only

**Decision:** Only `_handle_subscription_updated` validates state transitions against `VALID_TRANSITIONS`. Other handlers (checkout_completed, subscription_created, subscription_deleted) do not.

**Why:** `subscription_created` and `checkout_completed` are initial state setters — there is no previous state to validate against. `subscription_deleted` is always terminal and should always be applied (even if the current state seems wrong — Stripe is authoritative). Only `subscription_updated` carries the risk of applying a stale intermediate state, which is where the state machine adds value.

### 5. client_reference_id for User Resolution in Checkout

**Decision:** Use `client_reference_id` (set to Parcel's user UUID during session creation) to resolve the user in `checkout.session.completed`, rather than looking up by email.

**Why:** Email is not a stable identifier — users can change their email. The `client_reference_id` is set by us at session creation time and is guaranteed to be the correct user UUID. This is the Stripe-recommended approach for linking sessions to internal user IDs.

### 6. Billing Columns on User Table (Not Separate Table)

**Decision:** Add `stripe_customer_id`, `stripe_subscription_id`, `plan`, `plan_status`, `current_period_end`, and `trial_ends_at` directly to the `users` table rather than creating a separate `user_subscriptions` table.

**Why:** Parcel has a 1:1 relationship between users and subscriptions (even Team plans are billed to one user). A separate table adds join complexity for every plan-gated query without providing meaningful normalization benefit. If Parcel later supports multiple subscriptions per user (e.g., add-ons), a separate table can be introduced then. For now, denormalization on `users` is simpler and faster.

### 7. No Celery / No Background Queue for Webhooks (v1)

**Decision:** Webhook events are processed synchronously within the HTTP request cycle. No task queue, no background workers.

**Why:** At Parcel's scale (hundreds of subscribers), webhook processing takes <100ms per event. Stripe's 20-second timeout is generous. Adding Celery or Redis would introduce infrastructure complexity (a new service to deploy, monitor, and scale on Railway) for a problem that does not yet exist. The webhook handler returns 200 to Stripe after processing. If processing starts taking >5s consistently, introduce a queue then. The `webhook_events` table (from the webhook reliability design) serves as a durable log for replay if needed.

### 8. No IP Allowlisting for Webhooks (v1)

**Decision:** Webhook security relies on signature verification alone, without IP allowlisting.

**Why:** Stripe's IP ranges change periodically, and Railway's reverse proxy architecture makes extracting the true client IP unreliable without careful `X-Forwarded-For` parsing. Signature verification is cryptographically strong and is the primary defense Stripe recommends. IP allowlisting is defense-in-depth that can be added later if needed, but the maintenance cost of keeping IPs in sync outweighs the marginal security benefit when signatures are already verified.

### 9. stripe Package Required at Runtime

**Decision:** The `stripe` Python package must be added to `requirements.txt`. It is not currently listed.

**Why:** The service imports `stripe` directly and uses `stripe.Customer.create()`, `stripe.Webhook.construct_event()`, etc. Add `stripe>=10.0.0` to `backend/requirements.txt`. The Stripe SDK handles HTTPS connections, retry headers, and API versioning internally.

### 10. Price ID Mapping via Environment Variables, Not Database

**Decision:** Stripe Price IDs are stored in environment variables (one per plan/interval), not in a database lookup table.

**Why:** Price IDs change only when you create new products in Stripe (a manual, infrequent operation). Storing them in env vars means they are version-controlled (via `.env.example`), deployment-scoped (different values for test vs live), and do not require database queries to resolve. If Parcel ever needs dynamic pricing (e.g., A/B testing prices), migrate to a database table then.
