# Trial Management System — Complete Design

> Parcel — Real Estate Deal Analysis SaaS
> Date: 2026-03-28
> Model: 14-day Pro trial, no credit card required, reverse trial (downgrade to Free)
> Tiers: Free ($0) | Starter ($29/mo) | Pro ($69/mo) | Team ($149/mo)

---

## Table of Contents

1. [Trial State Machine](#1-trial-state-machine)
2. [Trial Start Logic](#2-trial-start-logic)
3. [Trial Countdown UI](#3-trial-countdown-ui)
4. [Trial Expiration & Downgrade](#4-trial-expiration--downgrade)
5. [Trial Extension Logic](#5-trial-extension-logic)
6. [Re-Trial Policy](#6-re-trial-policy)
7. [Trial-to-Paid Conversion Tracking](#7-trial-to-paid-conversion-tracking)
8. [A/B Test Hooks](#8-ab-test-hooks)
9. [Demo Account Interaction](#9-demo-account-interaction)
10. [Backend Implementation](#10-backend-implementation)
11. [Frontend Implementation](#11-frontend-implementation)
12. [Critical Decisions](#12-critical-decisions)

---

## 1. Trial State Machine

### State Diagram

```
                         ┌──────────────────────────────────────────────┐
                         │              REGISTRATION                    │
                         └──────────────┬───────────────────────────────┘
                                        │
                                        │ POST /auth/register
                                        │ • Create user row
                                        │ • Set trial_ends_at = now + 14d
                                        │ • Set plan = 'pro_trial'
                                        │ • Create Stripe customer (async)
                                        ▼
                         ┌──────────────────────────────────────────────┐
                         │           ACTIVE_TRIAL                       │
                         │  plan = 'pro_trial'                          │
                         │  trial_ends_at > now                         │
                         │  Full Pro feature access                     │
                         └──┬────────────┬────────────┬─────────────────┘
                            │            │            │
                  Day 11+   │   Any day  │   Day 14   │
                  (4 days   │            │   (or      │
                   left)    │            │   cron)    │
                            ▼            ▼            ▼
              ┌──────────────────┐  ┌─────────┐  ┌───────────────────────┐
              │  TRIAL_EXPIRING  │  │CONVERTED│  │   TRIAL_EXPIRED       │
              │  plan='pro_trial'│  │         │  │   plan = 'free'       │
              │  Amber/red UI    │  │         │  │   trial_ended = true  │
              │  Urgency banners │  │         │  │   Feature locks on    │
              └────────┬─────────┘  │         │  └───────┬───────────────┘
                       │            │         │          │
                       │  Converts  │         │          │ Converts
                       ├───────────►│         │          ├──────────►┐
                       │            │         │          │           │
                       │  Expires   │         │          │           │
                       ├────────────┼─────────┼──►───────┘           │
                       │            │         │                      │
                       │            ▼         │                      ▼
                       │  ┌──────────────────┐│          ┌──────────────────┐
                       │  │    CONVERTED     ││          │    CONVERTED     │
                       │  │ plan = paid tier ││          │ plan = paid tier │
                       │  │ stripe_sub_id set││          │ stripe_sub_id set│
                       │  └──────────────────┘│          └──────────────────┘
                       │                      │
                       │                      │
                       │  No conversion       │
                       │  after 90 days       │
                       ▼                      │
              ┌──────────────────┐            │
              │    FREE_USER     │            │
              │  plan = 'free'   │            │
              │  trial_ended     │            │
              │  No trial UI     │            │
              │  Win-back target │            │
              └──────────────────┘            │
                       │                      │
                       │  Converts anytime    │
                       └──────────────────────┘
```

### State Definitions

| State | `plan` column | `trial_ends_at` | `stripe_subscription_id` | Behavior |
|-------|--------------|-----------------|--------------------------|----------|
| `active_trial` | `pro_trial` | Future date | `NULL` | Full Pro access. Countdown visible after Day 7. |
| `trial_expiring` | `pro_trial` | 1-4 days away | `NULL` | Full Pro access. Amber/red countdown. Urgency modals. |
| `trial_expired` | `free` | Past date | `NULL` | Downgraded. Feature locks active. Inline upgrade CTAs. |
| `converted` | `starter`/`pro`/`team` | Any (irrelevant) | Set | Full paid access. No trial UI. |
| `free_user` | `free` | Past date (>90d) | `NULL` | Settled free user. No trial urgency, only usage-based nudges. |

**The `trial_expiring` state is computed, not stored.** It is derived at read time: `plan == 'pro_trial' AND trial_ends_at - now <= 4 days`. This avoids a cron job just to flip a status column.

### Transition Events

| From | To | Trigger |
|------|-----|---------|
| `active_trial` | `trial_expiring` | Computed: `trial_ends_at - now <= 4d` |
| `active_trial` | `converted` | Stripe `checkout.session.completed` webhook |
| `trial_expiring` | `converted` | Stripe `checkout.session.completed` webhook |
| `trial_expiring` | `trial_expired` | Cron: `trial_ends_at < now AND plan = 'pro_trial'` |
| `trial_expired` | `converted` | Stripe `checkout.session.completed` webhook |
| `trial_expired` | `free_user` | Computed: `trial_ends_at + 90d < now` (for analytics only) |
| `free_user` | `converted` | Stripe `checkout.session.completed` webhook |

---

## 2. Trial Start Logic

### What Happens at Registration

The registration endpoint (`POST /auth/register`) performs these steps in order:

```python
# backend/routers/auth.py — register endpoint modifications

@router.post("/register", response_model=AuthSuccessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSuccessResponse:
    """Register a new user with a 14-day Pro trial."""

    if is_reserved_email(body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "This email is reserved", "code": "EMAIL_RESERVED"},
        )

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Email already in use", "code": "EMAIL_ALREADY_EXISTS"},
        )

    # --- NEW: Calculate trial end date ---
    trial_duration = get_trial_duration(body.email)  # A/B hook (see Section 8)
    trial_ends_at = datetime.utcnow() + timedelta(days=trial_duration)

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        plan="pro_trial",            # NEW
        trial_ends_at=trial_ends_at, # NEW
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # --- NEW: Create Stripe customer asynchronously ---
    # Fire-and-forget: do NOT block registration on Stripe.
    # The customer ID is needed later at checkout, not now.
    enqueue_task("create_stripe_customer", user_id=str(user.id), email=user.email, name=user.name)

    _set_auth_cookies(response, str(user.id))
    return AuthSuccessResponse(user=UserResponse.model_validate(user))
```

### Stripe Customer Creation (Async Worker)

```python
# backend/tasks/stripe_tasks.py

import stripe
from sqlalchemy.orm import Session
from database import get_db_session
from models.users import User


def create_stripe_customer(user_id: str, email: str, name: str) -> None:
    """Create a Stripe Customer object and save the ID to the user row.

    Runs asynchronously after registration. If Stripe is down, the customer
    will be created lazily at checkout time instead.
    """
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "parcel_user_id": user_id,
                "source": "registration",
            },
        )

        with get_db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.stripe_customer_id = customer.id
                db.commit()

    except stripe.StripeError as e:
        # Log but do not fail. Customer will be created at checkout if missing.
        logger.warning(f"Stripe customer creation failed for user {user_id}: {e}")
```

### Why Create the Stripe Customer at Registration (Not at Checkout)?

1. **Checkout is faster.** When the user clicks "Upgrade," we already have a `stripe_customer_id`. We create a Checkout Session referencing the existing customer instead of creating one on the fly.
2. **Analytics linkage.** Stripe's dashboard shows the customer from Day 1, even during trial. We can attach metadata, track events, and see the full lifecycle.
3. **No credit card.** Creating a Stripe Customer does NOT require payment info. It is a free metadata object.
4. **Graceful degradation.** If the async task fails, we create the customer lazily at checkout. No user-facing impact.

### Trial Duration Configuration

```python
# backend/core/billing/trial.py

from datetime import datetime, timedelta

# Default trial: 14 days
DEFAULT_TRIAL_DAYS = 14

# Extended trial for win-back (see Section 6)
RETRIAL_DAYS = 7

# Maximum admin-grantable extension
MAX_EXTENSION_DAYS = 30


def get_trial_duration(email: str) -> int:
    """Return the trial duration in days for a new registration.

    Checks A/B test assignment first, then falls back to default.
    """
    ab_variant = get_ab_variant("trial_length", email)
    if ab_variant:
        return int(ab_variant)  # e.g., "14" or "21"
    return DEFAULT_TRIAL_DAYS


def compute_trial_state(user) -> str:
    """Derive the current trial state from user fields.

    Returns one of: 'active_trial', 'trial_expiring', 'trial_expired',
    'converted', 'free_user', or 'no_trial' (demo/admin users).
    """
    if user.plan in ("starter", "pro", "team"):
        return "converted"

    if user.plan == "pro_trial":
        if user.trial_ends_at is None:
            return "no_trial"
        remaining = (user.trial_ends_at - datetime.utcnow()).total_seconds()
        if remaining > 4 * 86400:
            return "active_trial"
        if remaining > 0:
            return "trial_expiring"
        # trial_ends_at is in the past but plan wasn't flipped yet (race/cron delay)
        return "trial_expired"

    if user.plan == "free":
        if user.trial_ends_at and user.trial_ends_at < datetime.utcnow():
            days_since = (datetime.utcnow() - user.trial_ends_at).days
            if days_since > 90:
                return "free_user"
            return "trial_expired"
        return "free_user"

    return "no_trial"
```

---

## 3. Trial Countdown UI

### API Response Shape

Every authenticated response that returns user data includes trial metadata. The `/auth/me` endpoint already returns `UserResponse` — we extend it:

```python
# backend/schemas/auth.py — additions

class TrialInfo(BaseModel):
    """Trial state included in every authenticated user response."""
    state: str                      # 'active_trial' | 'trial_expiring' | 'trial_expired' | 'converted' | 'free_user'
    days_remaining: int | None      # None if converted or no trial
    trial_ends_at: datetime | None  # ISO timestamp
    plan: str                       # 'pro_trial' | 'free' | 'starter' | 'pro' | 'team'
    features: dict                  # Feature availability map (see below)


class UserResponse(BaseModel):
    """Public representation of a user."""
    id: uuid.UUID
    name: str
    email: str
    role: str
    team_id: Optional[uuid.UUID]
    created_at: datetime
    trial: TrialInfo                # NEW

    model_config = {"from_attributes": True}
```

### Feature Availability Map

The `trial.features` dict tells the frontend exactly what is available without hardcoding limits client-side:

```python
# backend/core/billing/features.py

PLAN_FEATURES = {
    "pro_trial": {
        "analyses_per_month": -1,       # -1 = unlimited
        "ai_messages_per_month": -1,
        "pipeline_deals": -1,
        "pdf_exports_per_month": -1,
        "document_uploads": -1,
        "comparison_dimensions": 6,
        "portfolio_access": "full",
        "chat_history_days": -1,
    },
    "free": {
        "analyses_per_month": 3,
        "ai_messages_per_month": 5,
        "pipeline_deals": 5,
        "pdf_exports_per_month": 0,
        "document_uploads": 5,
        "comparison_dimensions": 2,
        "portfolio_access": "view_only",
        "chat_history_days": 7,
    },
    "starter": {
        "analyses_per_month": 25,
        "ai_messages_per_month": 50,
        "pipeline_deals": 25,
        "pdf_exports_per_month": 10,
        "document_uploads": 25,
        "comparison_dimensions": 6,
        "portfolio_access": "full",
        "chat_history_days": 90,
    },
    "pro": {
        "analyses_per_month": -1,
        "ai_messages_per_month": -1,
        "pipeline_deals": -1,
        "pdf_exports_per_month": -1,
        "document_uploads": -1,
        "comparison_dimensions": 6,
        "portfolio_access": "full",
        "chat_history_days": -1,
    },
    "team": {
        "analyses_per_month": -1,
        "ai_messages_per_month": -1,
        "pipeline_deals": -1,
        "pdf_exports_per_month": -1,
        "document_uploads": -1,
        "comparison_dimensions": 6,
        "portfolio_access": "full",
        "chat_history_days": -1,
    },
}


def get_features(plan: str) -> dict:
    """Return the feature map for a plan."""
    return PLAN_FEATURES.get(plan, PLAN_FEATURES["free"])
```

### Frontend Countdown Component

```tsx
// frontend/src/components/billing/TrialBanner.tsx

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { TrialInfo } from "@/types/auth";

interface TrialBannerProps {
  trial: TrialInfo;
}

/**
 * Persistent trial countdown shown in the sidebar/topbar.
 *
 * Visibility rules:
 * - Hidden for converted users (no trial UI needed)
 * - Hidden for demo account
 * - Muted gray text for days 1-10
 * - Amber text + icon for days 4-2
 * - Red text + pulse for day 1 and day 0
 * - After expiry: "Trial ended" with upgrade CTA
 */
export function TrialBanner({ trial }: TrialBannerProps) {
  if (trial.state === "converted" || trial.state === "no_trial") {
    return null;
  }

  const isExpiring = trial.state === "trial_expiring";
  const isExpired = trial.state === "trial_expired" || trial.state === "free_user";
  const days = trial.days_remaining ?? 0;

  // Determine urgency level
  const urgency: "none" | "low" | "medium" | "high" | "expired" =
    isExpired ? "expired" :
    days <= 1 ? "high" :
    days <= 4 ? "medium" :
    "none";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        urgency === "none"    && "bg-surface text-muted-foreground",
        urgency === "medium"  && "bg-amber-500/10 text-amber-400",
        urgency === "high"    && "bg-red-500/10 text-red-400 animate-pulse",
        urgency === "expired" && "bg-red-500/10 text-red-400",
      )}
      role="status"
      aria-live="polite"
    >
      {!isExpired && (
        <>
          <span className="font-mono tabular-nums">{days}</span>
          <span>{days === 1 ? "day" : "days"} left on Pro trial</span>
        </>
      )}

      {isExpired && (
        <span>Pro trial ended</span>
      )}

      <Link
        to="/pricing"
        className={cn(
          "ml-auto text-xs font-semibold underline-offset-2 hover:underline",
          urgency === "expired" ? "text-indigo-400" : "text-indigo-400/80",
        )}
      >
        {isExpired ? "Upgrade" : "See plans"}
      </Link>
    </div>
  );
}
```

### Where the Banner Lives

The `TrialBanner` renders inside `AppShell.tsx`, below the sidebar navigation and above the user profile section. On mobile, it renders as a slim bar at the top of the content area.

```
Desktop sidebar layout:
┌─────────────────────┐
│  Logo               │
│  ─────────────────  │
│  Dashboard          │
│  Analyze            │
│  Pipeline           │
│  Portfolio          │
│  Chat               │
│  Documents          │
│  Compare            │
│  ─────────────────  │
│  ┌───────────────┐  │ ← TrialBanner lives here
│  │ 7 days left   │  │
│  │ on Pro trial → │  │
│  └───────────────┘  │
│  ─────────────────  │
│  User profile       │
│  Settings           │
└─────────────────────┘
```

### Progressive Urgency Schedule

| Day | Banner Style | Additional UI | Email |
|-----|-------------|---------------|-------|
| 1-7 | Muted gray, sidebar only | None | Day 0: Welcome. Day 3: Feature highlight. Day 7: Mid-trial summary. |
| 8-10 | Still muted, sidebar | Toast on login (Day 10): "4 days left" | Day 10: Urgency + annual discount |
| 11-12 | Amber text, sidebar | Dismissible modal on login (Day 12): loss summary | Day 12: "What you'll lose" comparison |
| 13 | Red text, sidebar | Persistent yellow banner top of dashboard | Day 13: "Last day + 20% off first month" |
| 14 | Red pulse, sidebar | Full-screen interstitial (one-time): accomplishment summary + upgrade CTA | Day 14: "Trial ended — data is safe" |
| 15+ | "Trial ended" static | Locked features show inline "Unlock" buttons | Day 17: Win-back #1 |

---

## 4. Trial Expiration & Downgrade

### Exact Downgrade Behavior

When `trial_ends_at` passes, the expiration cron job (see Section 10) sets `plan = 'free'`. The following changes take effect:

#### Features Locked on Downgrade

| Feature | Pro Trial | After Downgrade (Free) | User Experience |
|---------|-----------|----------------------|-----------------|
| Deal analyses | Unlimited | 3/month | 4th analysis shows upgrade modal. Usage resets on calendar month. |
| AI chat | Unlimited | 5 messages/month | 6th message: tease pattern (show first 100 chars, blur rest). |
| Pipeline deals | Unlimited | 5 visible | Deals 6+ hidden with "Upgrade to see N more deals" row. |
| PDF export | Unlimited | Locked (0) | Blur preview of generated PDF. "Upgrade to download." |
| Document uploads | Unlimited | 5 total | Upload button disabled after 5. Existing docs remain viewable. |
| Comparison | 6 dimensions | 2 dimensions | Dims 3-6 locked with lock icon. "Upgrade for full comparison." |
| Portfolio | Full access | View-only aggregate | Individual property metrics blurred. Aggregate value visible. |
| Chat history | Unlimited | 7 days | Messages older than 7 days archived. "Upgrade to access history." |

#### What Happens to Data Above Free Limits

**Critical rule: NEVER delete or hide user-created data. Restrict creation of NEW data and access to PREMIUM features.**

| Data Type | Behavior on Downgrade |
|-----------|----------------------|
| Deal analyses (>3 this month) | All remain viewable (read-only). User cannot create analysis #4 until next month or upgrade. |
| Pipeline deals (>5) | First 5 visible. Remainder shown as count: "and 3 more deals (upgrade to manage)." Deals are NOT deleted — they remain in the DB and reappear on upgrade. |
| AI chat history (>7 days) | Messages still exist. Older messages show: "Upgrade to view messages before [date]." |
| PDF reports | Previously generated reports remain. User cannot generate new ones. |
| Documents (>5) | All viewable. Cannot upload new ones. |
| Portfolio entries | All visible in aggregate. Individual metrics blurred on Free. |

### Downgrade Database Operations

```python
# backend/core/billing/downgrade.py

from datetime import datetime
from sqlalchemy.orm import Session
from models.users import User


def downgrade_expired_trial(user: User, db: Session) -> None:
    """Transition a user from pro_trial to free.

    Called by the expiration cron job. Does NOT delete any user data.
    Only changes the plan field and records the transition.
    """
    user.plan = "free"
    user.trial_ended_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.commit()

    # Emit event for analytics / email triggers
    emit_event(
        user_id=str(user.id),
        event_type="trial_expired",
        metadata={
            "trial_started_at": user.created_at.isoformat(),
            "trial_ended_at": user.trial_ended_at.isoformat(),
            "deals_analyzed": count_user_deals(user.id, db),
            "ai_messages_sent": count_user_chat_messages(user.id, db),
            "pipeline_deals": count_pipeline_entries(user.id, db),
        },
    )
```

### Full-Screen Expiration Interstitial (One-Time)

Shown exactly once, the first time a user logs in after trial expiration:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              Your Pro Trial Has Ended                        │
│                                                              │
│  Here's what you accomplished:                               │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │     12     │  │      8     │  │      3     │             │
│  │   Deals    │  │  AI Chats  │  │  Pipeline  │             │
│  │  Analyzed  │  │  Sessions  │  │   Deals    │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  KEEPING (Free)         │  LOSING                    │    │
│  │  ✓ 3 analyses/mo        │  ✗ Unlimited analyses      │    │
│  │  ✓ 5 pipeline deals     │  ✗ AI deal chat            │    │
│  │  ✓ Basic dashboard      │  ✗ PDF reports             │    │
│  │  ✓ All your data (safe) │  ✗ Strategy comparison     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Upgrade to keep everything                          │    │
│  │                                                      │    │
│  │  [Starter $29/mo]  [■ Pro $69/mo ■]  [Team $149/mo] │    │
│  │                     Most Popular                     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  First month 20% off: use code KEEPGOING             │    │
│  │  Offer valid for 48 hours                            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│                  [Continue on Free Plan]                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Usage Tracking for Limit Enforcement

```python
# backend/core/billing/usage.py

from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from models.deals import Deal
from models.chat_messages import ChatMessage


def get_monthly_analysis_count(user_id: str, db: Session) -> int:
    """Count analyses created this calendar month."""
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return db.query(func.count(Deal.id)).filter(
        Deal.user_id == user_id,
        Deal.created_at >= month_start,
    ).scalar() or 0


def get_monthly_chat_count(user_id: str, db: Session) -> int:
    """Count AI chat messages sent this calendar month."""
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.created_at >= month_start,
        ChatMessage.role == "user",  # Only count user messages, not AI responses
    ).scalar() or 0


def check_usage_limit(user, feature: str, db: Session) -> dict:
    """Check if a user has hit their plan limit for a feature.

    Returns:
        {
            "allowed": bool,
            "current": int,
            "limit": int,          # -1 = unlimited
            "plan": str,
            "upgrade_message": str | None,
        }
    """
    from core.billing.features import get_features

    features = get_features(user.plan)
    limit = features.get(feature)

    if limit == -1:
        return {"allowed": True, "current": 0, "limit": -1, "plan": user.plan, "upgrade_message": None}

    # Map feature names to count functions
    counters = {
        "analyses_per_month": lambda: get_monthly_analysis_count(str(user.id), db),
        "ai_messages_per_month": lambda: get_monthly_chat_count(str(user.id), db),
        "pipeline_deals": lambda: db.query(func.count()).filter_by(user_id=user.id).scalar() or 0,
    }

    current = counters.get(feature, lambda: 0)()

    if current >= limit:
        messages = {
            "analyses_per_month": f"You've used {current} of {limit} free analyses this month. Upgrade for unlimited.",
            "ai_messages_per_month": f"You've used {current} of {limit} AI messages this month. Upgrade for full access.",
            "pipeline_deals": f"Free plan supports {limit} pipeline deals. Upgrade to manage unlimited deals.",
        }
        return {
            "allowed": False,
            "current": current,
            "limit": limit,
            "plan": user.plan,
            "upgrade_message": messages.get(feature, "Upgrade to continue."),
        }

    return {"allowed": True, "current": current, "limit": limit, "plan": user.plan, "upgrade_message": None}
```

---

## 5. Trial Extension Logic

### Admin Extension Endpoint

```python
# backend/routers/admin.py

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.billing.trial import MAX_EXTENSION_DAYS
from core.security.jwt import get_current_user
from database import get_db
from models.users import User

router = APIRouter(prefix="/admin", tags=["admin"])


class ExtendTrialRequest(BaseModel):
    user_id: str
    days: int  # 1 to MAX_EXTENSION_DAYS
    reason: str  # "support_request" | "onboarding_help" | "win_back" | "bug_compensation" | "other"


class ExtendTrialResponse(BaseModel):
    user_id: str
    new_trial_ends_at: datetime
    days_added: int
    total_trial_days: int


@router.post("/extend-trial", response_model=ExtendTrialResponse)
async def extend_trial(
    body: ExtendTrialRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExtendTrialResponse:
    """Extend a user's trial. Admin-only endpoint.

    Rules:
    - Only users with plan='pro_trial' or plan='free' (recently expired trial) can be extended.
    - Maximum extension: MAX_EXTENSION_DAYS (30 days).
    - Already-paying users cannot be given a trial extension.
    - Extension is additive: if 3 days remain, adding 7 gives 10 days.
    """
    # TODO: Replace with proper admin role check when RBAC is built
    ADMIN_EMAILS = {"ivan@parceldesk.io"}
    if current_user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    if body.days < 1 or body.days > MAX_EXTENSION_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extension must be 1-{MAX_EXTENSION_DAYS} days",
        )

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.plan in ("starter", "pro", "team"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot extend trial for a paying user",
        )

    # Calculate new trial end
    now = datetime.utcnow()
    if user.trial_ends_at and user.trial_ends_at > now:
        # Trial still active: extend from current end
        new_end = user.trial_ends_at + timedelta(days=body.days)
    else:
        # Trial expired: extend from now
        new_end = now + timedelta(days=body.days)

    # Restore plan to pro_trial if it was downgraded
    user.plan = "pro_trial"
    user.trial_ends_at = new_end
    user.updated_at = now
    db.commit()

    total_days = (new_end - user.created_at).days

    # Log for audit trail
    emit_event(
        user_id=str(user.id),
        event_type="trial_extended",
        metadata={
            "days_added": body.days,
            "reason": body.reason,
            "extended_by": str(current_user.id),
            "new_trial_ends_at": new_end.isoformat(),
        },
    )

    return ExtendTrialResponse(
        user_id=str(user.id),
        new_trial_ends_at=new_end,
        days_added=body.days,
        total_trial_days=total_days,
    )
```

### Extension Scenarios

| Scenario | Action | Example |
|----------|--------|---------|
| User asks for more time (support) | Extend 7 days | "I've been traveling, haven't had time" |
| User hit a bug during trial | Extend 3-7 days | Compensation for lost time |
| High-value lead (many deals analyzed) | Extend 7-14 days | Founder outreach: "Take more time" |
| Win-back re-trial (see Section 6) | Grant 7-day re-trial | Day 55 email offer |
| Onboarding help needed | Extend 3-5 days | User booked an onboarding call |

---

## 6. Re-Trial Policy

### Rules

1. **A user can receive ONE re-trial in their lifetime.** This prevents abuse.
2. **Re-trial is 7 days** (not 14). Shorter to maintain urgency.
3. **Re-trial eligibility window: 30-90 days after original trial expiration.** Before 30 days: too soon, the original trial memory is fresh. After 90 days: too stale, they've moved on.
4. **Re-trial requires action**: the user must click a link in the Day 55 win-back email or an in-app CTA. It is never automatic.
5. **Churned paid users (cancelled subscription) do NOT get a re-trial.** They already converted once. They get win-back discount offers instead.
6. **Re-trial restores full Pro access** for the 7-day period.

### Database Tracking

```python
# On the User model:
retrial_granted_at = Column(DateTime, nullable=True, default=None)
# If not None, a re-trial has already been used. Never grant another.
```

### Re-Trial Endpoint

```python
# backend/routers/billing.py

@router.post("/retrial")
async def activate_retrial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Activate a 7-day re-trial for an eligible user.

    Eligibility:
    - Current plan is 'free'
    - Original trial ended 30-90 days ago
    - No previous re-trial granted
    - Never been a paid subscriber
    """
    if current_user.plan != "free":
        raise HTTPException(status_code=400, detail="Re-trial only available for Free users")

    if current_user.retrial_granted_at is not None:
        raise HTTPException(status_code=400, detail="Re-trial already used")

    if current_user.stripe_subscription_id is not None:
        raise HTTPException(status_code=400, detail="Re-trial not available for former paid users")

    if current_user.trial_ends_at is None:
        raise HTTPException(status_code=400, detail="No prior trial found")

    days_since_trial = (datetime.utcnow() - current_user.trial_ends_at).days
    if days_since_trial < 30:
        raise HTTPException(status_code=400, detail="Re-trial available after 30 days")
    if days_since_trial > 90:
        raise HTTPException(status_code=400, detail="Re-trial offer has expired")

    # Grant re-trial
    current_user.plan = "pro_trial"
    current_user.trial_ends_at = datetime.utcnow() + timedelta(days=RETRIAL_DAYS)
    current_user.retrial_granted_at = datetime.utcnow()
    db.commit()

    emit_event(
        user_id=str(current_user.id),
        event_type="retrial_activated",
        metadata={"days": RETRIAL_DAYS, "days_since_original_trial": days_since_trial},
    )

    return {"message": "Your 7-day Pro trial has been reactivated", "trial_ends_at": current_user.trial_ends_at.isoformat()}
```

---

## 7. Trial-to-Paid Conversion Tracking

### Events to Track

Every conversion funnel step is recorded in the `user_events` table:

```sql
-- Core conversion events
INSERT INTO user_events (user_id, event_type, event_metadata) VALUES
  -- Trial lifecycle
  (uid, 'trial_started',     '{"plan": "pro_trial", "duration_days": 14}'),
  (uid, 'trial_expiring',    '{"days_remaining": 4}'),
  (uid, 'trial_expired',     '{"deals_analyzed": 8, "ai_messages": 12}'),
  (uid, 'retrial_activated', '{"days": 7}'),

  -- Conversion funnel
  (uid, 'pricing_page_viewed',        '{"source": "trial_banner"}'),
  (uid, 'checkout_started',           '{"plan": "pro", "billing": "monthly"}'),
  (uid, 'checkout_completed',         '{"plan": "pro", "billing": "monthly", "amount_cents": 6900}'),
  (uid, 'checkout_abandoned',         '{"plan": "pro", "step": "payment_info"}'),

  -- Upgrade prompts
  (uid, 'upgrade_prompt_shown',       '{"location": "analysis_limit", "feature": "analyses_per_month"}'),
  (uid, 'upgrade_prompt_clicked',     '{"location": "analysis_limit"}'),
  (uid, 'upgrade_prompt_dismissed',   '{"location": "analysis_limit"}'),

  -- Trial-specific
  (uid, 'trial_interstitial_shown',   '{}'),
  (uid, 'trial_interstitial_action',  '{"action": "upgrade" | "continue_free"}');
```

### Conversion Attribution Query

```sql
-- Trial-to-paid conversion rate by signup week cohort
SELECT
    date_trunc('week', u.created_at) AS cohort_week,
    COUNT(DISTINCT u.id) AS trial_starts,
    COUNT(DISTINCT CASE
        WHEN u.plan IN ('starter', 'pro', 'team') THEN u.id
    END) AS converted,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN u.plan IN ('starter', 'pro', 'team') THEN u.id END)
        / NULLIF(COUNT(DISTINCT u.id), 0), 1
    ) AS conversion_pct,
    -- Median days to convert
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (
            (SELECT MIN(e.created_at) FROM user_events e
             WHERE e.user_id = u.id AND e.event_type = 'checkout_completed')
            - u.created_at
        )) / 86400.0
    ) FILTER (WHERE u.plan IN ('starter', 'pro', 'team')) AS median_days_to_convert
FROM users u
WHERE u.created_at >= now() - INTERVAL '12 weeks'
  AND u.email NOT LIKE '%@parcel.app'  -- Exclude system accounts
GROUP BY cohort_week
ORDER BY cohort_week;
```

### Conversion by Trial State at Checkout

```sql
-- Where in the trial lifecycle do users convert?
SELECT
    CASE
        WHEN e.event_metadata->>'days_remaining' IS NOT NULL
        THEN
            CASE
                WHEN (e.event_metadata->>'days_remaining')::int > 7 THEN 'early_trial (8-14 days left)'
                WHEN (e.event_metadata->>'days_remaining')::int > 3 THEN 'mid_trial (4-7 days left)'
                WHEN (e.event_metadata->>'days_remaining')::int > 0 THEN 'late_trial (1-3 days left)'
                ELSE 'post_trial'
            END
        ELSE 'unknown'
    END AS conversion_window,
    COUNT(*) AS conversions,
    ROUND(AVG((e.event_metadata->>'amount_cents')::int / 100.0), 2) AS avg_revenue
FROM user_events e
WHERE e.event_type = 'checkout_completed'
GROUP BY conversion_window
ORDER BY conversions DESC;
```

### Stripe Webhook Handler for Conversion

```python
# backend/routers/webhooks.py

@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks for subscription lifecycle events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session["customer"]
        subscription_id = session.get("subscription")

        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            # Map Stripe price ID to plan name
            plan = map_stripe_price_to_plan(session)

            # Record the conversion
            was_trial = user.plan == "pro_trial"
            previous_plan = user.plan

            user.plan = plan
            user.stripe_subscription_id = subscription_id
            user.converted_at = datetime.utcnow()
            db.commit()

            emit_event(
                user_id=str(user.id),
                event_type="checkout_completed",
                metadata={
                    "plan": plan,
                    "previous_plan": previous_plan,
                    "was_trial": was_trial,
                    "billing_interval": session.get("metadata", {}).get("billing_interval", "monthly"),
                    "amount_cents": session.get("amount_total", 0),
                    "stripe_subscription_id": subscription_id,
                    "days_since_signup": (datetime.utcnow() - user.created_at).days,
                    "days_remaining_in_trial": max(0, (user.trial_ends_at - datetime.utcnow()).days) if user.trial_ends_at else None,
                },
            )

    elif event["type"] == "customer.subscription.deleted":
        # Handle cancellation (user churned)
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]

        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = "free"
            user.stripe_subscription_id = None
            user.churned_at = datetime.utcnow()
            db.commit()

            emit_event(
                user_id=str(user.id),
                event_type="subscription_cancelled",
                metadata={
                    "previous_plan": user.plan,
                    "lifetime_days": (datetime.utcnow() - (user.converted_at or user.created_at)).days,
                },
            )

    return {"status": "ok"}
```

---

## 8. A/B Test Hooks

### Framework

A/B tests use deterministic hashing of the user's email against experiment names. No external service required. Assignments are stable (same email always gets same variant) and can be overridden.

```python
# backend/core/billing/ab_testing.py

import hashlib
from typing import Optional

# Active experiments
EXPERIMENTS = {
    "trial_length": {
        "variants": {"14": 50, "21": 50},  # variant_name: weight (must sum to 100)
        "description": "14-day vs 21-day Pro trial",
        "active": False,  # Set True to activate
    },
    "trial_features": {
        "variants": {"full_pro": 50, "limited_pro": 50},
        "description": "Full Pro vs Limited Pro (no portfolio) during trial",
        "active": False,
    },
    "expiry_message": {
        "variants": {"loss_framing": 50, "gain_framing": 50},
        "description": "Loss-framed vs gain-framed trial expiry messaging",
        "active": False,
    },
    "trial_discount": {
        "variants": {"no_discount": 34, "10_pct": 33, "20_pct": 33},
        "description": "No discount vs 10% vs 20% off first month at trial end",
        "active": False,
    },
}


def get_ab_variant(experiment: str, email: str) -> Optional[str]:
    """Deterministically assign a user to an A/B test variant.

    Uses MD5 hash of (experiment + email) to produce a stable 0-99 bucket.
    Returns None if experiment is not active.
    """
    exp = EXPERIMENTS.get(experiment)
    if not exp or not exp["active"]:
        return None

    # Deterministic bucket: MD5(experiment:email) mod 100
    hash_input = f"{experiment}:{email.lower()}"
    bucket = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) % 100

    # Walk through variants and assign based on cumulative weight
    cumulative = 0
    for variant, weight in exp["variants"].items():
        cumulative += weight
        if bucket < cumulative:
            return variant

    # Fallback to first variant (should not happen if weights sum to 100)
    return list(exp["variants"].keys())[0]


def get_all_assignments(email: str) -> dict[str, Optional[str]]:
    """Return all active experiment assignments for a user.

    Included in the API response so the frontend can render accordingly.
    """
    return {
        name: get_ab_variant(name, email)
        for name, exp in EXPERIMENTS.items()
        if exp["active"]
    }
```

### Experiment: Trial Length (14 vs 21 Days)

```python
# In register endpoint:
trial_duration = get_trial_duration(body.email)
# Returns 14 or 21 based on A/B assignment

# In user_events:
emit_event(user_id, "trial_started", {
    "duration_days": trial_duration,
    "ab_trial_length": get_ab_variant("trial_length", body.email),
})
```

Analysis query:

```sql
SELECT
    e.event_metadata->>'ab_trial_length' AS variant,
    COUNT(DISTINCT e.user_id) AS trial_starts,
    COUNT(DISTINCT CASE
        WHEN u.plan IN ('starter', 'pro', 'team') THEN e.user_id
    END) AS converted,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN u.plan IN ('starter', 'pro', 'team') THEN e.user_id END)
        / NULLIF(COUNT(DISTINCT e.user_id), 0), 1
    ) AS conversion_pct
FROM user_events e
JOIN users u ON u.id = e.user_id
WHERE e.event_type = 'trial_started'
  AND e.event_metadata->>'ab_trial_length' IS NOT NULL
GROUP BY variant;
```

### Experiment: Expiry Messaging Variants

The frontend reads `trial.ab_experiments.expiry_message` and swaps copy:

| Variant | Banner Copy | Interstitial Headline |
|---------|------------|----------------------|
| `loss_framing` | "In 3 days, you lose unlimited AI chat, PDF reports, and pipeline access" | "Here's what you'll lose" |
| `gain_framing` | "You've analyzed 8 deals and had 12 AI conversations. Keep the momentum." | "Here's what you've built" |

### API Shape for A/B Assignments

```python
class TrialInfo(BaseModel):
    state: str
    days_remaining: int | None
    trial_ends_at: datetime | None
    plan: str
    features: dict
    ab_experiments: dict  # NEW: e.g., {"expiry_message": "loss_framing", "trial_discount": "20_pct"}
```

---

## 9. Demo Account Interaction

### Rules

The demo account (`demo@parcel.app`) must be completely isolated from trial/billing logic:

1. **Demo user NEVER sees trial UI.** The `TrialBanner` component checks `is_demo` and renders nothing.
2. **Demo user has no `trial_ends_at`.** The field is `NULL`.
3. **Demo user's `plan` is `pro`** (not `pro_trial`). They have permanent Pro access.
4. **Demo user is excluded from all billing queries** — conversion cohorts, churn analysis, A/B tests.
5. **Demo user cannot access billing/pricing/checkout pages.** Route guard redirects to dashboard.
6. **Demo user's `/auth/me` response includes `is_demo: true`** so the frontend can branch globally.

### Implementation

```python
# backend/core/billing/trial.py — add demo check

def compute_trial_state(user) -> str:
    """Derive trial state. Returns 'no_trial' for demo users."""
    from core.demo import is_demo_user

    if is_demo_user(user):
        return "no_trial"

    # ... rest of state machine logic
```

```tsx
// frontend/src/components/billing/TrialBanner.tsx
export function TrialBanner({ trial }: TrialBannerProps) {
  // Demo users and converted users: no banner
  if (trial.state === "converted" || trial.state === "no_trial") {
    return null;
  }
  // ...
}
```

```python
# backend/schemas/auth.py — UserResponse includes demo flag

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    team_id: Optional[uuid.UUID]
    created_at: datetime
    trial: TrialInfo
    is_demo: bool  # NEW: True only for demo@parcel.app
```

---

## 10. Backend Implementation

### Database Schema Changes

```sql
-- Migration: add trial and billing columns to users table

ALTER TABLE users ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'pro_trial';
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN trial_ended_at TIMESTAMP;          -- When the trial actually expired
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN converted_at TIMESTAMP;            -- When they first paid
ALTER TABLE users ADD COLUMN churned_at TIMESTAMP;              -- When subscription was cancelled
ALTER TABLE users ADD COLUMN retrial_granted_at TIMESTAMP;      -- NULL = never used re-trial

-- Indexes
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_trial_ends_at ON users(trial_ends_at) WHERE plan = 'pro_trial';
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- User events table for analytics
CREATE TABLE user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_type_created ON user_events(event_type, created_at);
CREATE INDEX idx_user_events_user_type ON user_events(user_id, event_type);
```

### SQLAlchemy Model Updates

```python
# backend/models/users.py — add billing columns

class User(TimestampMixin, Base):
    """A registered user of the Parcel platform."""

    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(UserRole, nullable=False, default="investor")
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    email_notifications = Column(Boolean, nullable=False, default=True, server_default="true")

    # --- Billing / Trial ---
    plan = Column(String(20), nullable=False, default="pro_trial")
    trial_ends_at = Column(DateTime, nullable=True)
    trial_ended_at = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    converted_at = Column(DateTime, nullable=True)
    churned_at = Column(DateTime, nullable=True)
    retrial_granted_at = Column(DateTime, nullable=True)

    # Relationships
    deals = relationship("Deal", back_populates="user", foreign_keys="Deal.user_id")
    team_memberships = relationship("TeamMember", back_populates="user", foreign_keys="TeamMember.user_id")
    pipeline_entries = relationship("PipelineEntry", back_populates="user", foreign_keys="PipelineEntry.user_id")
    documents = relationship("Document", back_populates="user", foreign_keys="Document.user_id")
    chat_messages = relationship("ChatMessage", back_populates="user")
    portfolio_entries = relationship("PortfolioEntry", back_populates="user", foreign_keys="PortfolioEntry.user_id")
```

### Trial Check Middleware

A FastAPI dependency that computes the user's trial state and injects it into every request. This is NOT a blocking middleware — it enriches the user object; it does not reject requests.

```python
# backend/core/billing/middleware.py

from datetime import datetime
from fastapi import Depends
from sqlalchemy.orm import Session

from core.billing.features import get_features
from core.billing.trial import compute_trial_state
from core.billing.ab_testing import get_all_assignments
from core.demo import is_demo_user
from core.security.jwt import get_current_user
from database import get_db
from models.users import User


class TrialContext:
    """Computed trial state attached to the request."""

    def __init__(self, user: User):
        self.state = compute_trial_state(user)
        self.plan = user.plan
        self.features = get_features(user.plan)
        self.is_demo = is_demo_user(user)
        self.ab_experiments = {} if self.is_demo else get_all_assignments(user.email)

        if user.trial_ends_at and user.trial_ends_at > datetime.utcnow():
            self.days_remaining = max(0, (user.trial_ends_at - datetime.utcnow()).days)
            self.trial_ends_at = user.trial_ends_at
        elif user.trial_ends_at:
            self.days_remaining = 0
            self.trial_ends_at = user.trial_ends_at
        else:
            self.days_remaining = None
            self.trial_ends_at = None

    def to_dict(self) -> dict:
        return {
            "state": self.state,
            "days_remaining": self.days_remaining,
            "trial_ends_at": self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            "plan": self.plan,
            "features": self.features,
            "ab_experiments": self.ab_experiments,
        }


def get_trial_context(
    current_user: User = Depends(get_current_user),
) -> TrialContext:
    """FastAPI dependency that provides computed trial context."""
    return TrialContext(current_user)
```

### Feature Gate Dependency

For endpoints that need to enforce plan limits (e.g., creating an analysis, sending a chat message):

```python
# backend/core/billing/gates.py

from functools import wraps
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.billing.usage import check_usage_limit
from core.demo import is_demo_user
from core.security.jwt import get_current_user
from database import get_db
from models.users import User


def require_feature(feature: str):
    """FastAPI dependency factory that gates a route behind a plan feature.

    Usage:
        @router.post("/deals/analyze")
        async def analyze_deal(
            ...,
            _gate: None = Depends(require_feature("analyses_per_month")),
        ):
    """
    async def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> None:
        # Demo user bypasses all limits
        if is_demo_user(current_user):
            return

        result = check_usage_limit(current_user, feature, db)
        if not result["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": result["upgrade_message"],
                    "code": "PLAN_LIMIT_REACHED",
                    "current": result["current"],
                    "limit": result["limit"],
                    "plan": result["plan"],
                    "feature": feature,
                },
            )

    return _check
```

### Expiration Cron Job

Runs every 15 minutes. Finds users whose trial has expired but whose `plan` column has not been flipped yet.

```python
# backend/tasks/trial_expiration.py

"""
Cron job: check for expired trials and downgrade them.

Schedule: every 15 minutes via Railway cron, APScheduler, or Celery beat.
Command: python -m tasks.trial_expiration
"""

import logging
from datetime import datetime

from sqlalchemy.orm import Session
from database import get_db_session
from models.users import User
from core.billing.downgrade import downgrade_expired_trial

logger = logging.getLogger(__name__)


def expire_trials() -> int:
    """Find and downgrade all expired trial users.

    Returns the count of users downgraded.
    """
    with get_db_session() as db:
        expired_users = db.query(User).filter(
            User.plan == "pro_trial",
            User.trial_ends_at < datetime.utcnow(),
        ).all()

        count = 0
        for user in expired_users:
            try:
                downgrade_expired_trial(user, db)
                count += 1
                logger.info(f"Trial expired for user {user.id} ({user.email})")
            except Exception as e:
                logger.error(f"Failed to expire trial for user {user.id}: {e}")
                db.rollback()

        return count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = expire_trials()
    logger.info(f"Expired {count} trial(s)")
```

### Railway Cron Configuration

```toml
# railway.toml (or Railway dashboard cron settings)

[cron]
trial_expiration = "*/15 * * * *"  # Every 15 minutes
command = "python -m tasks.trial_expiration"
```

If Railway cron is not available, use APScheduler inside the FastAPI process:

```python
# backend/main.py — add scheduler on startup

from apscheduler.schedulers.background import BackgroundScheduler
from tasks.trial_expiration import expire_trials

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(expire_trials, "interval", minutes=15)
    scheduler.start()
```

---

## 11. Frontend Implementation

### Trial State in Auth Store

```typescript
// frontend/src/types/auth.ts

export interface TrialInfo {
  state: "active_trial" | "trial_expiring" | "trial_expired" | "converted" | "free_user" | "no_trial";
  days_remaining: number | null;
  trial_ends_at: string | null;  // ISO timestamp
  plan: string;
  features: PlanFeatures;
  ab_experiments: Record<string, string>;
}

export interface PlanFeatures {
  analyses_per_month: number;    // -1 = unlimited
  ai_messages_per_month: number;
  pipeline_deals: number;
  pdf_exports_per_month: number;
  document_uploads: number;
  comparison_dimensions: number;
  portfolio_access: "full" | "view_only";
  chat_history_days: number;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  team_id: string | null;
  created_at: string;
  trial: TrialInfo;
  is_demo: boolean;
}
```

### Feature Gate Hook

```typescript
// frontend/src/hooks/useFeatureGate.ts

import { useAuthStore } from "@/stores/auth";

interface GateResult {
  allowed: boolean;
  limit: number;
  plan: string;
  upgradeMessage: string | null;
}

/**
 * Check if the current user's plan allows a specific feature.
 * Does NOT check usage counts (that's server-side).
 * Used for UI-level gating: hiding buttons, showing lock icons, etc.
 */
export function useFeatureGate(feature: keyof PlanFeatures): GateResult {
  const user = useAuthStore((s) => s.user);

  if (!user || user.is_demo) {
    return { allowed: true, limit: -1, plan: "pro", upgradeMessage: null };
  }

  const value = user.trial.features[feature];
  const plan = user.trial.plan;

  if (value === -1) {
    return { allowed: true, limit: -1, plan, upgradeMessage: null };
  }

  if (value === 0) {
    return {
      allowed: false,
      limit: 0,
      plan,
      upgradeMessage: `This feature requires a paid plan. Upgrade to unlock.`,
    };
  }

  // For numeric limits, the actual usage check happens server-side.
  // Client-side, we know the limit exists but can't enforce it precisely.
  return { allowed: true, limit: value, plan, upgradeMessage: null };
}
```

### Upgrade Prompt Component

```tsx
// frontend/src/components/billing/UpgradePrompt.tsx

import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  feature: string;
  message: string;
  /** "inline" = small text link. "card" = bordered card with CTA. "modal" = dialog. */
  variant?: "inline" | "card" | "modal";
}

/**
 * Contextual upgrade prompt shown when a user hits a plan limit.
 * Adapts to the 403 response from the backend:
 * { "error": "...", "code": "PLAN_LIMIT_REACHED", "current": 3, "limit": 3 }
 */
export function UpgradePrompt({ feature, message, variant = "card" }: UpgradePromptProps) {
  if (variant === "inline") {
    return (
      <span className="text-xs text-muted-foreground">
        <Lock className="inline h-3 w-3 mr-1" />
        {message}{" "}
        <Link to="/pricing" className="text-indigo-400 underline underline-offset-2">
          Upgrade
        </Link>
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Lock className="h-4 w-4 text-indigo-400" />
        {message}
      </div>
      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <Link to="/pricing">See Plans</Link>
        </Button>
      </div>
    </div>
  );
}
```

### Trial Expiration Interstitial Page

```tsx
// frontend/src/components/billing/TrialExpiredInterstitial.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

/**
 * Full-screen interstitial shown ONCE after trial expiration.
 * Tracks display via localStorage key 'trial_interstitial_shown'.
 */
export function TrialExpiredInterstitial() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.trial.state !== "trial_expired") return;
    if (user.is_demo) return;

    const key = `trial_interstitial_shown_${user.id}`;
    if (localStorage.getItem(key)) return;

    setVisible(true);
    localStorage.setItem(key, "true");

    // Track event
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "trial_interstitial_shown" }),
    });
  }, [user]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="mx-4 max-w-lg rounded-xl border border-white/10 bg-[#0F0F1A] p-8 shadow-2xl"
        >
          <h2 className="text-xl font-semibold text-foreground">
            Your Pro Trial Has Ended
          </h2>

          {/* Usage stats would be rendered here from user.trial or a separate API call */}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-400">Keeping (Free)</h4>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>3 analyses/month</li>
                <li>5 pipeline deals</li>
                <li>All your data (safe)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-400">Losing</h4>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>Unlimited analyses</li>
                <li>AI deal chat</li>
                <li>PDF reports</li>
                <li>Strategy comparison</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link to="/pricing">Upgrade to Keep Everything</Link>
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setVisible(false)}
            >
              Continue on Free Plan
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 12. CRITICAL DECISIONS

These decisions require explicit sign-off before implementation begins. Each has trade-offs that affect revenue, user experience, and engineering effort.

---

### Decision 1: Create Stripe Customer at Registration or at Checkout?

**Recommendation: At registration (async).**

| Option | Pros | Cons |
|--------|------|------|
| At registration (async) | Faster checkout. Analytics from Day 1. No user-facing latency. | Orphaned Stripe customers for users who never convert (~80%). |
| At checkout (lazy) | No orphans. Simpler registration. | Slower checkout. No Stripe analytics during trial. |

Orphaned customers are free in Stripe and can be cleaned up quarterly. The checkout speed and analytics benefits outweigh the cleanup cost.

**Decision needed: Confirm async-at-registration approach.**

---

### Decision 2: Trial Duration — Fixed 14 Days or A/B Test from Day 1?

**Recommendation: Ship with 14 days. Enable the A/B test hook but keep it inactive until there are 500+ signups.**

14 days is validated by research (see agent-05, Section 4) for moderate-complexity products. Testing 21 days requires enough volume to reach statistical significance (~500 users per variant). Running the test too early produces noisy results and delays the baseline.

**Decision needed: Confirm 14-day default. Agree to wait for volume before activating the test.**

---

### Decision 3: What Exactly Gets Locked on Free Downgrade?

The proposed limits (Section 4) are:

| Feature | Free Limit |
|---------|-----------|
| Analyses/month | 3 |
| AI messages/month | 5 |
| Pipeline deals (visible) | 5 |
| PDF exports | 0 (locked) |
| Document uploads | 5 |
| Comparison dimensions | 2 of 6 |
| Portfolio | View-only (aggregate) |
| Chat history | 7 days |

**Tension:** Too generous = no upgrade pressure. Too restrictive = users feel punished and leave.

The research recommends that Free should be useful enough to keep users in the ecosystem but constrained enough that power users hit walls quickly. The proposed limits target "casual evaluator" usage — a user looking at 2-3 properties per month can function on Free. Anyone doing real deal flow hits limits within a week.

**Decision needed: Approve these specific limits or adjust.**

---

### Decision 4: Should the Cron Job Run Inside the FastAPI Process or as a Separate Worker?

| Option | Pros | Cons |
|--------|------|------|
| APScheduler in-process | No extra Railway service. Simple. Works today. | Runs on every web worker replica (needs locking). Couples cron to web server lifecycle. |
| Separate Railway cron service | Clean separation. No locking needed. Scales independently. | Extra Railway service cost (~$5/mo). Slightly more infra complexity. |

**Recommendation: Start with APScheduler in-process.** Use a PostgreSQL advisory lock to prevent duplicate execution across replicas. Migrate to a separate service when there are more scheduled tasks (dunning, win-back emails, health score computation).

```python
# Advisory lock pattern for in-process scheduler:
def expire_trials_with_lock():
    with get_db_session() as db:
        # pg_try_advisory_lock returns True if lock acquired
        acquired = db.execute(text("SELECT pg_try_advisory_lock(1001)")).scalar()
        if not acquired:
            return  # Another replica is handling this
        try:
            expire_trials()
        finally:
            db.execute(text("SELECT pg_advisory_unlock(1001)"))
```

**Decision needed: Confirm in-process approach for MVP.**

---

### Decision 5: Re-Trial Policy — Allow It or Not?

**Recommendation: Allow, with strict limits.**

Arguments for:
- The Day 55 win-back email with a 7-day re-trial offer is one of the highest-converting win-back tactics (research: 5-15% of recipients take it).
- Users who come back and re-trial have seen the product before — their conversion rate on the second trial is typically 2x the first.
- It costs nothing (no credit card, no Stripe charge) and the user's data is already in the system.

Arguments against:
- Could be abused: users might learn they can just wait and get another free trial. The 30-90 day window and one-time-only limit prevent this.
- Adds code complexity.

The one-time-only rule is the key safeguard. If a user uses their re-trial and still doesn't convert, they are done. No more free rides. From that point, they get discount offers only.

**Decision needed: Approve the one-time 7-day re-trial within 30-90 day window.**

---

### Decision 6: Should the Free Tier Exist at All, or Hard-Lock After Trial?

**Recommendation: Keep the Free tier (reverse trial model).**

Research is unambiguous: reverse trials (trial -> downgrade to free) convert 15-40% higher than hard trial expirations (trial -> locked out). The Free tier:
- Keeps users in the funnel for future conversion
- Preserves their data as a switching cost
- Allows word-of-mouth from users who haven't paid yet
- Provides a large user base for social proof metrics ("10,000+ investors use Parcel")

Hard-locking after trial is appropriate only for enterprise products with sales teams. Parcel is self-serve PLG.

**Decision needed: Confirm the reverse trial / Free tier model.**

---

### Decision 7: Where Should Trial State Live — User Table or Separate Subscriptions Table?

| Option | Pros | Cons |
|--------|------|------|
| Columns on `users` table | Simple. One query. No joins. Fast. | Table gets wide. Mixing auth and billing concerns. |
| Separate `subscriptions` table | Clean separation. Can track subscription history (upgrades, downgrades, pauses). Future-proof. | Extra join on every authenticated request. More migration work. |

**Recommendation: Start with columns on `users` for MVP.** The trial lifecycle is simple enough (one trial per user, one plan at a time). When we add subscription pausing, plan changes, and billing history, migrate to a `subscriptions` table. The A/B test hooks and conversion tracking go in `user_events`, which is already a separate table.

**Decision needed: Confirm users-table approach for MVP, with planned migration.**

---

### Decision 8: 48-Hour Grace Period Discount — Yes or No?

The trial expiration interstitial includes: "Upgrade in the next 48 hours and get your first month at 20% off (code KEEPGOING)."

| Concern | Analysis |
|---------|----------|
| Revenue impact | 20% off $69 = $55.20 first month. If it converts even 3% more users, net positive. |
| Anchoring risk | Could train users to wait for discounts. Mitigated by making it one-time and time-limited. |
| Implementation | Stripe Coupon object, auto-applied at checkout if within 48 hours of trial expiry. |

**Recommendation: Yes, offer the 48-hour discount.** It captures users at their highest loss-aversion moment. The one-time constraint prevents conditioning. Track conversion rate with and without the discount via the `trial_discount` A/B test.

**Decision needed: Approve the 48-hour 20% discount at trial expiration.**

---

### Summary of Decisions Needed

| # | Decision | Recommendation | Impact |
|---|----------|---------------|--------|
| 1 | Stripe customer timing | Registration (async) | Checkout speed, analytics |
| 2 | Trial duration | 14 days, A/B test later | Conversion rate |
| 3 | Free tier limits | As proposed in table | Upgrade pressure vs retention |
| 4 | Cron architecture | In-process with advisory lock | Infra simplicity |
| 5 | Re-trial policy | One-time 7-day within 30-90d window | Win-back conversion |
| 6 | Free tier existence | Keep (reverse trial model) | Funnel health |
| 7 | Trial state storage | Users table for MVP | Engineering speed |
| 8 | Grace period discount | 48-hour 20% off at expiry | Conversion at critical moment |

---

*End of trial management design. All code is implementation-ready and references existing Parcel patterns (auth.py, models/users.py, core/demo). Research citations from agents 05, 06, 07, and 08 are incorporated throughout.*
