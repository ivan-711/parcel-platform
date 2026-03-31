from datetime import datetime

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.billing.tier_config import Tier, TierLimits, TIER_LIMITS
from core.security.jwt import get_current_user
from database import get_db


def is_demo_user(user) -> bool:
    """Check if user is the demo account."""
    return getattr(user, "email", "") == "demo@parcel.app"


def get_effective_tier(user) -> Tier:
    """Determine user's effective tier, including trial status."""
    if is_demo_user(user):
        return Tier.PRO

    tier = Tier.from_str(user.plan_tier or "free")

    # Active trial upgrades free users to Pro
    if tier == Tier.FREE and user.trial_ends_at:
        if user.trial_ends_at > datetime.utcnow():
            return Tier.PRO

    return tier


def get_tier_limits(user) -> TierLimits:
    """Get the limits for the user's effective tier."""
    return TIER_LIMITS[get_effective_tier(user)]


def require_tier(minimum: Tier):
    """FastAPI dependency: require user to be on at least `minimum` tier."""

    def _dependency(current_user=Depends(get_current_user)):
        effective = get_effective_tier(current_user)
        if effective < minimum:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": f"This feature requires the {minimum.name.title()} plan or higher.",
                    "code": "TIER_REQUIRED",
                    "required_tier": minimum.name.lower(),
                    "current_tier": effective.name.lower(),
                    "upgrade_url": "/pricing",
                },
            )
        return None

    return _dependency


def require_feature(feature_name: str):
    """FastAPI dependency: require a boolean feature to be enabled for user's tier."""

    def _dependency(current_user=Depends(get_current_user)):
        limits = get_tier_limits(current_user)
        if not getattr(limits, feature_name, False):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "This feature is not available on your current plan.",
                    "code": "FEATURE_GATED",
                    "feature": feature_name,
                    "current_tier": get_effective_tier(current_user).name.lower(),
                    "upgrade_url": "/pricing",
                },
            )
        return None

    return _dependency


def require_quota(metric_name: str):
    """FastAPI dependency: check metered usage against tier limit."""

    def _dependency(
        current_user=Depends(get_current_user), db: Session = Depends(get_db)
    ):
        limits = get_tier_limits(current_user)
        limit_value = getattr(limits, metric_name, None)

        # None = unlimited
        if limit_value is None:
            return None

        current_count = _get_usage_count(current_user.id, metric_name, db)

        if current_count >= limit_value:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": f"You've reached your {metric_name.replace('_', ' ')} limit for this billing period.",
                    "code": "QUOTA_EXCEEDED",
                    "metric": metric_name,
                    "current": current_count,
                    "limit": limit_value,
                    "current_tier": get_effective_tier(current_user).name.lower(),
                    "upgrade_url": "/pricing",
                },
            )
        return None

    return _dependency


def _get_usage_count(user_id, metric: str, db: Session) -> int:
    """Count usage records for the current billing period."""
    from models.usage_records import UsageRecord

    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # For "saved_deals" metric, count total deals (not per-period)
    if metric == "saved_deals":
        from models.deals import Deal

        return db.query(Deal).filter(Deal.user_id == user_id).count()

    return (
        db.query(UsageRecord)
        .filter(
            UsageRecord.user_id == user_id,
            UsageRecord.metric == metric,
            UsageRecord.period_start >= period_start,
        )
        .count()
    )


def record_usage(user_id, metric: str, db: Session) -> None:
    """Record a usage event. Call AFTER the business action succeeds."""
    from models.usage_records import UsageRecord

    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    db.add(
        UsageRecord(
            user_id=user_id,
            metric=metric,
            period_start=period_start,
        )
    )
    # Do NOT commit — caller's transaction handles it
