import logging
import time
from datetime import datetime
from typing import Optional

import stripe
from sqlalchemy.orm import Session

from core.billing.config import get_stripe_settings
from core.billing.exceptions import (
    BillingError,
    CustomerNotFoundError,
    StripeCardError,
    StripeInvalidRequestError,
    StripeTransientError,
    SubscriptionNotFoundError,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [0.5, 1.0, 2.0]


def _stripe_call(fn, *args, **kwargs):
    """Execute a Stripe API call with retry logic for transient errors."""
    settings = get_stripe_settings()
    kwargs.setdefault("api_key", settings.STRIPE_SECRET_KEY)

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except stripe.error.RateLimitError as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
                logger.warning(
                    "Stripe rate limit, retry %d/%d", attempt + 1, MAX_RETRIES
                )
        except stripe.error.APIConnectionError as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
                logger.warning(
                    "Stripe connection error, retry %d/%d", attempt + 1, MAX_RETRIES
                )
        except stripe.error.CardError as e:
            raise StripeCardError(str(e), decline_code=e.code)
        except stripe.error.InvalidRequestError as e:
            raise StripeInvalidRequestError(str(e))
        except stripe.error.AuthenticationError as e:
            raise BillingError(
                f"Stripe authentication failed: {e}", code="STRIPE_AUTH_ERROR"
            )
        except stripe.error.StripeError as e:
            raise BillingError(f"Stripe error: {e}", code="BILLING_ERROR")

    raise StripeTransientError(
        f"Stripe API failed after {MAX_RETRIES} retries: {last_error}"
    )


def get_or_create_customer(db: Session, user) -> str:
    """Get or create a Stripe customer for the user. Returns stripe_customer_id."""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = _stripe_call(
        stripe.Customer.create,
        email=user.email,
        name=user.name,
        metadata={"parcel_user_id": str(user.id)},
    )

    user.stripe_customer_id = customer.id
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("Created Stripe customer %s for user %s", customer.id, user.id)
    return customer.id


def create_checkout_session(db: Session, user, plan: str, interval: str) -> str:
    """Create a Stripe Checkout Session. Returns the checkout URL."""
    settings = get_stripe_settings()
    customer_id = get_or_create_customer(db, user)
    price_id = settings.get_price_id(plan, interval)

    session = _stripe_call(
        stripe.checkout.Session.create,
        mode="subscription",
        customer=customer_id,
        client_reference_id=str(user.id),
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={
            "metadata": {
                "parcel_user_id": str(user.id),
                "parcel_plan": plan,
            },
        },
        allow_promotion_codes=True,
        success_url=f"{settings.FRONTEND_URL}/pricing?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/pricing",
    )

    logger.info(
        "Created checkout session %s for user %s, plan=%s/%s",
        session.id,
        user.id,
        plan,
        interval,
    )
    return session.url


def create_portal_session(user) -> str:
    """Create a Stripe Customer Portal session. Returns the portal URL."""
    if not user.stripe_customer_id:
        raise CustomerNotFoundError(str(user.id))

    settings = get_stripe_settings()
    session = _stripe_call(
        stripe.billing_portal.Session.create,
        customer=user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings",
    )

    return session.url


def cancel_subscription(
    db: Session, user, immediately: bool = False, reason: Optional[str] = None
) -> dict:
    """Cancel the user's active subscription."""
    from models.subscriptions import Subscription

    sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user.id,
            Subscription.status.in_(["active", "trialing", "past_due"]),
        )
        .first()
    )

    if not sub or not sub.stripe_subscription_id:
        raise SubscriptionNotFoundError(str(user.id))

    if immediately:
        _stripe_call(
            stripe.Subscription.cancel,
            sub.stripe_subscription_id,
        )
        sub.status = "canceled"
        sub.canceled_at = datetime.utcnow()
        sub.ended_at = datetime.utcnow()
        sub.cancel_reason = reason
        user.plan_tier = "free"
    else:
        _stripe_call(
            stripe.Subscription.modify,
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
            metadata={"cancel_reason": reason or ""},
        )
        sub.cancel_at_period_end = True
        sub.canceled_at = datetime.utcnow()
        sub.cancel_reason = reason

    db.commit()

    cancel_at = None
    if not immediately and sub.current_period_end:
        cancel_at = sub.current_period_end

    logger.info(
        "Canceled subscription %s for user %s (immediate=%s)",
        sub.stripe_subscription_id,
        user.id,
        immediately,
    )

    return {
        "status": "canceled" if immediately else "cancel_at_period_end",
        "cancel_at": cancel_at,
    }


def get_subscription_status(db: Session, user) -> Optional[dict]:
    """Get the current subscription details for a user."""
    from models.subscriptions import Subscription

    sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user.id,
            Subscription.status.in_(["active", "trialing", "past_due"]),
        )
        .order_by(Subscription.created_at.desc())
        .first()
    )

    if not sub:
        return None

    # Derive interval from period length
    interval = None
    if sub.current_period_start and sub.current_period_end:
        days = (sub.current_period_end - sub.current_period_start).days
        interval = "annual" if days > 60 else "monthly"

    return {
        "status": sub.status,
        "plan_tier": sub.plan_tier,
        "current_period_start": sub.current_period_start,
        "current_period_end": sub.current_period_end,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "interval": interval,
    }


def sync_subscription_from_stripe(db: Session, stripe_subscription_id: str) -> None:
    """Fetch latest subscription state from Stripe and update local DB.

    Used by webhook handlers to ensure consistency regardless of event ordering.
    """
    from models.subscriptions import Subscription

    stripe_sub = _stripe_call(stripe.Subscription.retrieve, stripe_subscription_id)

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_subscription_id)
        .first()
    )

    if sub:
        sub.status = stripe_sub.status
        sub.plan_tier = _resolve_plan_from_subscription(stripe_sub)
        sub.current_period_start = datetime.utcfromtimestamp(
            stripe_sub.current_period_start
        )
        sub.current_period_end = datetime.utcfromtimestamp(
            stripe_sub.current_period_end
        )
        sub.cancel_at_period_end = stripe_sub.cancel_at_period_end
        if stripe_sub.canceled_at:
            sub.canceled_at = datetime.utcfromtimestamp(stripe_sub.canceled_at)
        if stripe_sub.ended_at:
            sub.ended_at = datetime.utcfromtimestamp(stripe_sub.ended_at)
        db.commit()


def _resolve_plan_from_subscription(stripe_sub) -> str:
    """Determine the Parcel plan from a Stripe subscription object."""
    settings = get_stripe_settings()
    price_map = settings.price_to_plan_map

    # Check subscription metadata first
    plan = stripe_sub.metadata.get("parcel_plan")
    if plan:
        # Legacy mapping for subscriptions created before tier renames
        _legacy = {"starter": "pro", "plus": "pro", "team": "business",
                    "carbon": "pro", "titanium": "business"}
        return _legacy.get(plan, plan)

    # Fall back to price ID lookup
    if stripe_sub.items and stripe_sub.items.data:
        price_id = stripe_sub.items.data[0].price.id
        plan = price_map.get(price_id)
        if plan:
            return plan

    logger.warning(
        "Could not resolve plan for subscription %s, defaulting to 'free'",
        stripe_sub.id,
    )
    return "free"
