"""Billing router — checkout, portal, cancel, and status endpoints."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.billing.stripe_service import (
    cancel_subscription,
    create_checkout_session,
    create_portal_session,
    get_subscription_status,
)
from core.billing.tier_gate import get_effective_tier, get_tier_limits, is_demo_user, _get_usage_count
from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.subscriptions import Subscription
from models.users import User
from schemas.billing import (
    BillingStatusResponse,
    CancelRequest,
    CancelResponse,
    CheckoutRequest,
    CheckoutResponse,
    PortalResponse,
    UsageMetricResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


def _reject_demo(user: User) -> None:
    """Raise 403 if the user is the demo account."""
    if is_demo_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Billing is not available for the demo account", "code": "DEMO_ACCOUNT"},
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def checkout(
    request: Request,
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    """Create a Stripe Checkout session for subscribing to a paid plan."""
    _reject_demo(current_user)

    # Block if user already has an active subscription
    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status.in_(["active", "trialing", "past_due"]),
        )
        .first()
    )
    if active_sub:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "You already have an active subscription. Use the customer portal to change plans.",
                "code": "ALREADY_SUBSCRIBED",
            },
        )

    url = create_checkout_session(db, current_user, body.plan.value, body.interval.value)
    return CheckoutResponse(checkout_url=url)


@router.post("/portal", response_model=PortalResponse, status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def portal(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortalResponse:
    """Create a Stripe Customer Portal session for managing billing."""
    _reject_demo(current_user)

    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "No billing account found. Subscribe to a plan first.",
                "code": "NO_STRIPE_CUSTOMER",
            },
        )

    url = create_portal_session(current_user)
    return PortalResponse(portal_url=url)


@router.post("/cancel", response_model=CancelResponse, status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def cancel(
    request: Request,
    body: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CancelResponse:
    """Cancel the current subscription."""
    _reject_demo(current_user)

    result = cancel_subscription(db, current_user, body.immediate, body.reason)

    if result["status"] == "canceled":
        message = "Your subscription has been canceled immediately."
    else:
        message = "Your subscription will be canceled at the end of the current billing period."

    return CancelResponse(
        status=result["status"],
        cancel_at=result["cancel_at"],
        message=message,
    )


@router.get("/status", response_model=BillingStatusResponse, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def billing_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingStatusResponse:
    """Get the authenticated user's billing status, plan, and usage."""
    _reject_demo(current_user)

    effective_tier = get_effective_tier(current_user)
    sub_status = get_subscription_status(db, current_user)
    limits = get_tier_limits(current_user)

    trial_active = bool(
        current_user.trial_ends_at and current_user.trial_ends_at > datetime.utcnow()
    )

    # Compute next period reset (first of next month)
    now = datetime.utcnow()
    if now.month == 12:
        resets_at = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        resets_at = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Build usage metrics
    metrics_config = [
        ("analyses_per_month", "Analyses", True),
        ("ai_messages_per_month", "AI Messages", True),
        ("document_uploads_per_month", "Document Uploads", True),
        ("saved_deals", "Saved Deals", False),  # not per-period
    ]

    usage: list[UsageMetricResponse] = []
    for metric_name, display_name, is_periodic in metrics_config:
        limit_value = getattr(limits, metric_name, None)
        current = _get_usage_count(current_user.id, metric_name, db)
        warning = False
        if limit_value is not None and limit_value > 0:
            warning = current >= limit_value * 0.8

        usage.append(
            UsageMetricResponse(
                metric=metric_name,
                display_name=display_name,
                current=current,
                limit=limit_value,
                resets_at=resets_at if is_periodic else None,
                warning=warning,
            )
        )

    return BillingStatusResponse(
        plan=effective_tier.name.lower(),
        status=sub_status["status"] if sub_status else None,
        interval=sub_status.get("interval") if sub_status else None,
        current_period_end=sub_status["current_period_end"] if sub_status else None,
        cancel_at_period_end=sub_status["cancel_at_period_end"] if sub_status else False,
        trial_ends_at=current_user.trial_ends_at,
        trial_active=trial_active,
        usage=usage,
    )
