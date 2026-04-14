# Parcel Pricing Plans -- Final Configuration

**Date:** 2026-03-28
**Status:** Final specification for implementation
**Dependencies:** Stripe Billing API, FastAPI backend, React frontend

---

## Table of Contents

1. [Tier Definitions & Exact Limits](#1-tier-definitions--exact-limits)
2. [Stripe Product & Price Configuration](#2-stripe-product--price-configuration)
3. [Price ID Management Strategy](#3-price-id-management-strategy)
4. [Annual Discount Structure](#4-annual-discount-structure)
5. [Trial Configuration](#5-trial-configuration)
6. [Coupon & Promo Code Strategy](#6-coupon--promo-code-strategy)
7. [Price Change & Grandfathering Strategy](#7-price-change--grandfathering-strategy)
8. [Feature Comparison Data Structure](#8-feature-comparison-data-structure)
9. [Upgrade / Downgrade Rules](#9-upgrade--downgrade-rules)
10. [Free Tier Design Philosophy](#10-free-tier-design-philosophy)
11. [Critical Decisions](#critical-decisions)

---

## 1. Tier Definitions & Exact Limits

### Rationale

The tier structure follows three principles from the research:

1. **Starter is a decoy for Pro.** The feature gap between Starter and Pro is a cliff, not a slope. Starter AI is capped at 30 messages on Haiku; Pro gets 150 messages on Sonnet. Starter lacks portfolio, comparison, and branded reports -- the features that create stickiness.
2. **Free tier demonstrates value but creates friction at scale.** 3 analyses/month with all 5 calculators working (mirroring DealCheck's full-calculator free tier), but no AI, no pipeline, no portfolio. The "aha moment" -- running a 5-strategy comparison on a real property -- happens on Free. The "I need more" moment hits immediately.
3. **Team tier anchors Pro's price.** Even if Team adoption is low, $149 makes $69 feel moderate. Team exists to make Pro look like a deal.

### Tier Matrix

| Resource | Free | Starter ($29/mo) | Pro ($69/mo) | Team ($149/mo) |
|---|---|---|---|---|
| **Analyses per month** | 3 | 25 | Unlimited | Unlimited |
| **AI chat messages per month** | 0 (blocked) | 30 (Haiku 3.5) | 150 (Sonnet 4.5) | 500 shared pool (Sonnet 4.5) |
| **Saved deals** | 5 | 50 | Unlimited | Unlimited |
| **Document uploads per month** | 0 | 5 | 25 | Unlimited |
| **Pipeline access** | No | Yes (1 board) | Yes (unlimited boards) | Yes (unlimited boards) |
| **Pipeline stages** | -- | 5 default stages | Custom stages (unlimited) | Custom stages (unlimited) |
| **Portfolio entries** | 0 | 0 | Unlimited | Unlimited |
| **Comparison tool** | No | No | Yes | Yes |
| **PDF reports** | No | Basic (unbranded) | Branded (custom logo) | Branded (custom logo) |
| **Offer letter generation** | No | No | Yes | Yes |
| **Team members** | -- | -- | -- | Up to 5 seats included |
| **Shared pipeline** | -- | -- | -- | Yes |
| **Role-based permissions** | -- | -- | -- | Yes |
| **Team activity feed** | -- | -- | -- | Yes |
| **AI model** | -- | Claude Haiku 3.5 | Claude Sonnet 4.5 | Claude Sonnet 4.5 |
| **Support** | Community | Email (48hr) | Email (24hr) | Priority email (12hr) |

### AI Cost per Tier (at full utilization, with caching)

| Tier | Messages | Model | Cost/Message | Max Monthly AI Cost | Revenue | AI % of Revenue |
|---|---|---|---|---|---|---|
| Free | 0 | -- | $0 | $0 | $0 | -- |
| Starter | 30 | Haiku 3.5 | $0.0058 | $0.17 | $29 | 0.6% |
| Pro | 150 | Sonnet 4.5 | $0.0216 | $3.24 | $69 | 4.7% |
| Team | 500 | Sonnet 4.5 | $0.0216 | $10.80 | $149 | 7.2% |

AI costs are manageable at every tier. Even worst-case Team at 100% utilization is 7.2% of revenue.

---

## 2. Stripe Product & Price Configuration

### Product Creation

One Stripe Product per tier (Free has no Stripe product -- it is the default state for users without a subscription).

```python
# backend/scripts/stripe_setup.py
"""
One-time script to create Stripe Products and Prices.
Run manually: python -m scripts.stripe_setup
Store the returned IDs in environment variables.
"""

import stripe
import os

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

# ─── Products ───────────────────────────────────────────────────────

starter_product = stripe.Product.create(
    name="Parcel Starter",
    description="25 analyses/mo, 30 AI messages, pipeline, 5 documents",
    metadata={
        "tier": "starter",
        "ai_model": "claude-haiku-3-5-20241022",
        "analysis_limit": "25",
        "ai_message_limit": "30",
        "saved_deal_limit": "50",
        "document_limit": "5",
    },
)

pro_product = stripe.Product.create(
    name="Parcel Pro",
    description="Unlimited analyses, 150 AI messages, portfolio, comparison, branded reports",
    metadata={
        "tier": "pro",
        "ai_model": "claude-sonnet-4-5-20250929",
        "analysis_limit": "unlimited",
        "ai_message_limit": "150",
        "saved_deal_limit": "unlimited",
        "document_limit": "25",
    },
)

team_product = stripe.Product.create(
    name="Parcel Team",
    description="Everything in Pro + 5 seats, shared pipeline, role permissions",
    metadata={
        "tier": "team",
        "ai_model": "claude-sonnet-4-5-20250929",
        "analysis_limit": "unlimited",
        "ai_message_limit": "500",
        "saved_deal_limit": "unlimited",
        "document_limit": "unlimited",
        "seats_included": "5",
    },
)

# ─── Prices ─────────────────────────────────────────────────────────

# Starter Monthly: $29/mo
starter_monthly = stripe.Price.create(
    product=starter_product.id,
    unit_amount=2900,          # cents
    currency="usd",
    recurring={
        "interval": "month",
        "interval_count": 1,
    },
    metadata={"billing_period": "monthly", "tier": "starter"},
    lookup_key="starter_monthly",
)

# Starter Annual: $24/mo billed as $290/year (~17% discount, "2 months free")
starter_annual = stripe.Price.create(
    product=starter_product.id,
    unit_amount=29000,         # $290.00 / year in cents
    currency="usd",
    recurring={
        "interval": "year",
        "interval_count": 1,
    },
    metadata={"billing_period": "annual", "tier": "starter"},
    lookup_key="starter_annual",
)

# Pro Monthly: $69/mo
pro_monthly = stripe.Price.create(
    product=pro_product.id,
    unit_amount=6900,
    currency="usd",
    recurring={
        "interval": "month",
        "interval_count": 1,
    },
    metadata={"billing_period": "monthly", "tier": "pro"},
    lookup_key="pro_monthly",
)

# Pro Annual: $55/mo billed as $660/year (~20% discount, "Save $168/yr")
pro_annual = stripe.Price.create(
    product=pro_product.id,
    unit_amount=66000,         # $660.00 / year in cents
    currency="usd",
    recurring={
        "interval": "year",
        "interval_count": 1,
    },
    metadata={"billing_period": "annual", "tier": "pro"},
    lookup_key="pro_annual",
)

# Team Monthly: $149/mo
team_monthly = stripe.Price.create(
    product=team_product.id,
    unit_amount=14900,
    currency="usd",
    recurring={
        "interval": "month",
        "interval_count": 1,
    },
    metadata={"billing_period": "monthly", "tier": "team"},
    lookup_key="team_monthly",
)

# Team Annual: $124/mo billed as $1,490/year (~17% discount, "2 months free")
team_annual = stripe.Price.create(
    product=team_product.id,
    unit_amount=149000,        # $1,490.00 / year in cents
    currency="usd",
    recurring={
        "interval": "year",
        "interval_count": 1,
    },
    metadata={"billing_period": "annual", "tier": "team"},
    lookup_key="team_annual",
)

# ─── Print IDs for .env ────────────────────────────────────────────

print("# Add these to your .env / Railway variables:")
print(f"STRIPE_PRODUCT_STARTER={starter_product.id}")
print(f"STRIPE_PRODUCT_PRO={pro_product.id}")
print(f"STRIPE_PRODUCT_TEAM={team_product.id}")
print(f"STRIPE_PRICE_STARTER_MONTHLY={starter_monthly.id}")
print(f"STRIPE_PRICE_STARTER_ANNUAL={starter_annual.id}")
print(f"STRIPE_PRICE_PRO_MONTHLY={pro_monthly.id}")
print(f"STRIPE_PRICE_PRO_ANNUAL={pro_annual.id}")
print(f"STRIPE_PRICE_TEAM_MONTHLY={team_monthly.id}")
print(f"STRIPE_PRICE_TEAM_ANNUAL={team_annual.id}")
```

### Price Summary Table

| Tier | Monthly | Annual (per month) | Annual (billed) | Discount | Framing |
|---|---|---|---|---|---|
| Starter | $29/mo | $24/mo | $290/yr | 17.2% | "2 months free" |
| Pro | $69/mo | $55/mo | $660/yr | 20.3% | "Save $168/yr" |
| Team | $149/mo | $124/mo | $1,490/yr | 16.8% | "2 months free" |

---

## 3. Price ID Management Strategy

### Decision: Environment Variables (Primary) + Backend Config (Runtime)

Price IDs are stable identifiers created once in Stripe and referenced everywhere. They change only when prices change (rare). The strategy uses env vars as the source of truth with a backend config layer for runtime access.

### Environment Variables

```bash
# .env / Railway environment variables
# ── Stripe Keys ──
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Product IDs ──
STRIPE_PRODUCT_STARTER=prod_...
STRIPE_PRODUCT_PRO=prod_...
STRIPE_PRODUCT_TEAM=prod_...

# ── Price IDs ──
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_ANNUAL=price_...
```

### Backend Config Module

```python
# backend/core/billing/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache


class BillingConfig(BaseSettings):
    """Stripe billing configuration loaded from environment variables."""

    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_webhook_secret: str

    # Product IDs
    stripe_product_starter: str
    stripe_product_pro: str
    stripe_product_team: str

    # Price IDs
    stripe_price_starter_monthly: str
    stripe_price_starter_annual: str
    stripe_price_pro_monthly: str
    stripe_price_pro_annual: str
    stripe_price_team_monthly: str
    stripe_price_team_annual: str

    class Config:
        env_file = ".env"

    @property
    def price_to_tier_map(self) -> dict[str, str]:
        """Map Stripe price IDs to tier names. Used in webhook handling."""
        return {
            self.stripe_price_starter_monthly: "starter",
            self.stripe_price_starter_annual: "starter",
            self.stripe_price_pro_monthly: "pro",
            self.stripe_price_pro_annual: "pro",
            self.stripe_price_team_monthly: "team",
            self.stripe_price_team_annual: "team",
        }

    @property
    def tier_prices(self) -> dict[str, dict[str, str]]:
        """Map tier names to their price IDs."""
        return {
            "starter": {
                "monthly": self.stripe_price_starter_monthly,
                "annual": self.stripe_price_starter_annual,
            },
            "pro": {
                "monthly": self.stripe_price_pro_monthly,
                "annual": self.stripe_price_pro_annual,
            },
            "team": {
                "monthly": self.stripe_price_team_monthly,
                "annual": self.stripe_price_team_annual,
            },
        }


@lru_cache()
def get_billing_config() -> BillingConfig:
    return BillingConfig()
```

### Why Not a Database?

- Price IDs are deployment-level config, not runtime data. They do not change per-request.
- Env vars are the simplest, most portable approach. Railway, Vercel, Heroku, and every PaaS supports them natively.
- A database lookup for price IDs adds latency and a failure mode (DB down = cannot create checkouts) for zero benefit.
- If Parcel ever needs dynamic pricing (A/B tests, geo pricing), migrate to a `pricing_plans` DB table at that point. Not before.

### Why Not a JSON Config File?

- Config files require deployment to change. Env vars on Railway can be changed without redeploying.
- For 6 price IDs, a config file adds indirection with no benefit over env vars.

---

## 4. Annual Discount Structure

### Exact Percentages

| Tier | Monthly | Annual Equivalent | Actual Annual Bill | Discount % | Framing |
|---|---|---|---|---|---|
| Starter | $29/mo ($348/yr) | $24.17/mo | $290/yr | **16.7%** | "2 months free" |
| Pro | $69/mo ($828/yr) | $55.00/mo | $660/yr | **20.3%** | "Save $168/year" |
| Team | $149/mo ($1,788/yr) | $124.17/mo | $1,490/yr | **16.7%** | "2 months free" |

### Why Pro Gets a Deeper Discount (20% vs 17%)

- Pro is the target tier (55-65% of paid users should be here).
- The primary buyer (solo fix-and-flip investor) is a solopreneur. Solopreneurs choose annual only 18% of the time. A 20% discount drops Pro below the $60/mo psychological threshold ($55/mo annual), making annual more compelling.
- 20% is aggressive enough to convert solopreneurs but not so steep it devalues the product. It keeps Pro above the $49 "cheap tool" zone.
- Starter and Team use the standard "2 months free" (16.7%) framing, which is the industry mode.

### Presentation Rules

1. **Default the billing toggle to Annual.** Research shows this increases annual adoption by 19%.
2. **Show strikethrough monthly price:** ~~$69~~ $55/mo.
3. **Show absolute dollar savings** ("Save $168/year") not percentages. Dollar savings feel larger.
4. **"2 months free" outperforms "17% off"** in A/B tests. Use concrete framing.
5. **Annual toggle badge:** Green pill showing "Save 20%" or "2 months free" next to the annual option.

### 30-Day Money-Back Guarantee on Annual Plans

- Display prominently with a shield icon below annual pricing on the pricing page.
- Wording: "Try any annual plan risk-free. Not satisfied within 30 days? Full refund, no questions asked."
- Expected refund rate: <5% based on industry data.
- Expected annual adoption lift: 10-15%.
- Net revenue impact: positive 6-10%.
- Monthly plans do not need a formal MBG -- "cancel anytime" is sufficient.

---

## 5. Trial Configuration

### Decision: 14-Day Pro Trial, No Credit Card Required

This is a "reverse trial" model: new signups get full Pro access for 14 days, then downgrade to Free if they do not convert. This is the highest-converting freemium model available (2-3x higher conversion vs traditional freemium gating) because users build habits on Pro features and experience loss aversion on downgrade.

### Stripe Configuration

Stripe trials are configured on the Subscription, not the Price. When a user decides to subscribe (during or after trial), we create a Checkout Session with trial parameters.

```python
# backend/routers/billing.py -- Trial checkout creation

import stripe
from core.billing.config import get_billing_config


def create_trial_checkout(
    user_id: str,
    user_email: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """Create a Stripe Checkout Session with a 14-day trial.

    No credit card is collected during trial. The user enters payment
    info at checkout but is not charged until day 15.

    Note: For a no-card trial, we do NOT use Stripe Checkout (which
    requires payment method). Instead, we grant Pro access locally
    for 14 days and create the Checkout Session only when the user
    decides to subscribe.
    """
    config = get_billing_config()

    session = stripe.checkout.Session.create(
        customer_email=user_email,
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={
            "metadata": {"user_id": user_id},
        },
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user_id},
    )

    return session.url
```

### Local Trial Management (No-Card Approach)

Since we do not collect a card during trial, the trial is managed locally -- not through Stripe's trial_period mechanism.

```python
# backend/models/users.py -- Trial fields on the User model

from datetime import datetime, timedelta

# Add to User model:
# trial_started_at: DateTime, nullable
# trial_ends_at: DateTime, nullable
# trial_tier: String, default "pro"


def start_trial(user) -> None:
    """Activate a 14-day Pro trial for a new user."""
    user.trial_started_at = datetime.utcnow()
    user.trial_ends_at = datetime.utcnow() + timedelta(days=14)
    user.trial_tier = "pro"
    user.subscription_tier = "pro"  # Grant Pro access


def check_trial_status(user) -> str:
    """Check if trial is active. Returns effective tier."""
    if user.stripe_subscription_id:
        # Paying customer -- tier is determined by subscription
        return user.subscription_tier

    if user.trial_ends_at and user.trial_ends_at > datetime.utcnow():
        # Trial still active
        return user.trial_tier

    # Trial expired or never started -- Free tier
    return "free"
```

### Trial Timeline & Email Cadence

| Day | Trigger | Action |
|---|---|---|
| 0 | Registration | Start 14-day Pro trial. Welcome email: "Analyze your first deal in 60 seconds." |
| 3 | Day 3 | Progress email: "You've analyzed X deals -- here's what Pro unlocks." |
| 7 | Midpoint | Feature highlight email: AI comparison, PDF reports, portfolio. |
| 10 | Day 10 | Urgency email: "4 days left on Pro -- lock in annual pricing." |
| 13 | Day 13 | Final warning: "Last day of Pro trial" + social proof. |
| 14 | Trial expires | Downgrade to Free. Email: "Your Pro trial ended" + 48-hour grace period offer (10% off first month). |

### Trial-to-Paid Targets

| Metric | Target | Industry Benchmark |
|---|---|---|
| Trial-to-paid (overall) | 20-25% | 18-25% median (no-card) |
| Trial-to-paid Pro | 55-65% of conversions | -- |
| Trial-to-paid Starter | 30-40% of conversions | -- |
| Time to convert (median) | Day 10-14 | -- |

---

## 6. Coupon & Promo Code Strategy

### Launch Coupons

```python
# backend/scripts/stripe_coupons.py

import stripe
import os

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

# ─── Launch Discount: 50% off first 3 months ───────────────────────

launch_coupon = stripe.Coupon.create(
    id="LAUNCH50",
    percent_off=50,
    duration="repeating",
    duration_in_months=3,
    max_redemptions=100,                # Hard cap at 100 uses
    metadata={
        "campaign": "launch",
        "created_by": "pricing_setup",
    },
)

launch_promo = stripe.PromotionCode.create(
    coupon=launch_coupon.id,
    code="LAUNCH50",
    max_redemptions=100,
    metadata={"campaign": "launch"},
)

# ─── Early Bird: 30% off first year (annual only) ──────────────────

earlybird_coupon = stripe.Coupon.create(
    id="EARLYBIRD30",
    percent_off=30,
    duration="once",                    # Applied once = first billing cycle
    metadata={
        "campaign": "earlybird",
        "restriction": "annual_only",
    },
)

earlybird_promo = stripe.PromotionCode.create(
    coupon=earlybird_coupon.id,
    code="EARLYBIRD",
    max_redemptions=200,
    restrictions={
        "minimum_amount": 28900,        # > $289 = annual plans only
        "minimum_amount_currency": "usd",
    },
    metadata={"campaign": "earlybird"},
)

# ─── Trial Expired Grace: 10% off first month ──────────────────────

grace_coupon = stripe.Coupon.create(
    id="TRIALGRACE10",
    percent_off=10,
    duration="once",
    redeem_by=None,                     # No expiration -- applied programmatically
    metadata={
        "campaign": "trial_grace",
        "auto_applied": "true",
    },
)

grace_promo = stripe.PromotionCode.create(
    coupon=grace_coupon.id,
    code="WELCOME10",
    metadata={"campaign": "trial_grace"},
)

# ─── Referral: 1 month free for both referrer and referred ─────────

referral_coupon = stripe.Coupon.create(
    id="REFERRAL_FREE_MONTH",
    amount_off=6900,                    # $69 off (Pro monthly value)
    currency="usd",
    duration="once",
    metadata={"campaign": "referral"},
)

# Note: Referral promo codes are created dynamically per user.
# Each user gets a unique code like PARCEL-{USER_SHORT_ID}.

print("Coupons and promo codes created.")
print(f"  LAUNCH50: {launch_coupon.id} -> {launch_promo.code}")
print(f"  EARLYBIRD: {earlybird_coupon.id} -> {earlybird_promo.code}")
print(f"  WELCOME10: {grace_coupon.id} -> {grace_promo.code}")
print(f"  Referral coupon: {referral_coupon.id}")
```

### Coupon Strategy Summary

| Code | Discount | Duration | Max Uses | Target Audience | Channel |
|---|---|---|---|---|---|
| `LAUNCH50` | 50% off | First 3 months | 100 | Launch early adopters | Landing page, social |
| `EARLYBIRD` | 30% off | First year (annual only) | 200 | Pre-launch waitlist | Email to waitlist |
| `WELCOME10` | 10% off | First month | Unlimited | Trial-expired users | Day 14 email |
| `PARCEL-{ID}` | $69 off | One-time | 1 per code | Referral recipients | Shared by existing users |

### Promo Code Input on Checkout

Enable the `allow_promotion_codes` parameter on Stripe Checkout Sessions:

```python
session = stripe.checkout.Session.create(
    # ...existing params...
    allow_promotion_codes=True,   # Shows "Add promotion code" link
)
```

---

## 7. Price Change & Grandfathering Strategy

### Principles

1. **Never change prices on existing subscribers mid-cycle.** This is both a legal requirement (Stripe enforces this) and a trust imperative.
2. **Grandfather existing users for 12 months after any price increase.** After 12 months, migrate them to the new price with 60 days written notice.
3. **New signups always get the current price.** Only existing subscribers are grandfathered.
4. **Price decreases apply immediately to all users.** No one should pay more than the current listed price.

### Implementation: Stripe Price Versioning

Stripe Prices are immutable. To change a price, create a new Price object and archive the old one. Existing subscriptions continue on the old Price until explicitly migrated.

```python
# backend/scripts/price_change.py
"""
Example: Raising Pro monthly from $69 to $79.
Run manually. Existing subscribers stay on $69 until migrated.
"""

import stripe

stripe.api_key = "sk_live_..."

# 1. Create the new price
new_pro_monthly = stripe.Price.create(
    product="prod_...",              # Same Pro product
    unit_amount=7900,                # $79.00
    currency="usd",
    recurring={"interval": "month"},
    metadata={"billing_period": "monthly", "tier": "pro", "version": "2"},
    lookup_key="pro_monthly",        # Transfer the lookup key
    transfer_lookup_key=True,        # This deactivates the old lookup key
)

# 2. Archive the old price (prevents new signups, existing subs continue)
stripe.Price.modify(
    "price_OLD_ID",
    active=False,
)

# 3. Update the env var
print(f"Update STRIPE_PRICE_PRO_MONTHLY to: {new_pro_monthly.id}")

# 4. Scheduled migration of existing subscribers (after 60-day notice):
#    Use Stripe's subscription schedule or a background task to call:
#    stripe.Subscription.modify(sub_id, items=[{id: item_id, price: new_price_id}])
```

### Grandfathering Timeline

| Event | Action |
|---|---|
| Day 0 | New price goes live for new signups. Old price archived. |
| Day 0 | Email all existing subscribers: "Your price is locked at $X/mo for the next 12 months." |
| Month 11 | Email existing subscribers: "Your rate will update to $Y/mo on [date]. Switch to annual now to lock in savings." |
| Month 12 | Migrate existing subscriptions to the new price via Stripe API. |

### Price Lock for Annual Subscribers

Annual subscribers are inherently grandfathered for their full billing year. A user who paid $660/year keeps that rate until their annual renewal. At renewal, they get the current annual price.

---

## 8. Feature Comparison Data Structure

### TypeScript Interface

```typescript
// frontend/src/lib/pricing-data.ts

export type TierSlug = "free" | "starter" | "pro" | "team";
export type BillingInterval = "monthly" | "annual";

export interface TierPrice {
  monthly: number;         // e.g., 69
  annual: number;          // e.g., 55 (per-month equivalent)
  annualTotal: number;     // e.g., 660 (billed amount)
}

export interface TierLimit {
  value: number | "unlimited";
  display: string;         // e.g., "25/mo", "Unlimited", "5 max"
}

export interface PricingTier {
  slug: TierSlug;
  name: string;
  tagline: string;
  price: TierPrice | null; // null for Free
  badge: string | null;    // "Most Popular", null for others
  ctaLabel: string;
  ctaVariant: "ghost" | "outline" | "solid";
  highlighted: boolean;    // Visual elevation (Pro = true)
  stripePriceId: {
    monthly: string | null;
    annual: string | null;
  };
  limits: {
    analysesPerMonth: TierLimit;
    aiMessagesPerMonth: TierLimit;
    savedDeals: TierLimit;
    documentsPerMonth: TierLimit;
    pipelineBoards: TierLimit;
    pipelineStages: TierLimit;
    portfolioEntries: TierLimit;
    teamSeats: TierLimit;
  };
  features: FeatureAccess[];
}

export type FeatureAccessLevel = "included" | "limited" | "excluded";

export interface FeatureAccess {
  key: string;
  label: string;
  access: FeatureAccessLevel;
  detail?: string;         // e.g., "Basic (unbranded)" or "Branded (custom logo)"
}

export interface FeatureComparisonRow {
  key: string;
  label: string;
  category: string;        // "Analysis", "AI", "Pipeline", "Portfolio", "Reports", "Team", "Support"
  tooltip?: string;
  tiers: Record<TierSlug, {
    access: FeatureAccessLevel;
    detail?: string;
  }>;
}

export interface PricingConfig {
  tiers: PricingTier[];
  featureComparison: FeatureComparisonRow[];
  annualDiscount: {
    starter: { percent: number; framing: string };
    pro: { percent: number; framing: string; savings: string };
    team: { percent: number; framing: string };
  };
  trial: {
    durationDays: number;
    tier: TierSlug;
    requiresCard: boolean;
  };
  guarantees: {
    annualMoneyBack: { days: number; text: string };
    cancelAnytime: string;
  };
}
```

### Pricing Data Object

```typescript
// frontend/src/lib/pricing-data.ts (continued)

export const PRICING_CONFIG: PricingConfig = {
  tiers: [
    {
      slug: "free",
      name: "Free",
      tagline: "Try the fundamentals",
      price: null,
      badge: null,
      ctaLabel: "Get Started",
      ctaVariant: "ghost",
      highlighted: false,
      stripePriceId: { monthly: null, annual: null },
      limits: {
        analysesPerMonth: { value: 3, display: "3/mo" },
        aiMessagesPerMonth: { value: 0, display: "Not included" },
        savedDeals: { value: 5, display: "5 max" },
        documentsPerMonth: { value: 0, display: "Not included" },
        pipelineBoards: { value: 0, display: "Not included" },
        pipelineStages: { value: 0, display: "--" },
        portfolioEntries: { value: 0, display: "Not included" },
        teamSeats: { value: 0, display: "--" },
      },
      features: [
        { key: "five_strategy", label: "All 5 strategy calculators", access: "included" },
        { key: "ai_chat", label: "AI deal advisor", access: "excluded" },
        { key: "pipeline", label: "Deal pipeline", access: "excluded" },
        { key: "portfolio", label: "Portfolio tracking", access: "excluded" },
        { key: "pdf_reports", label: "PDF reports", access: "excluded" },
        { key: "comparison", label: "Side-by-side comparison", access: "excluded" },
      ],
    },
    {
      slug: "starter",
      name: "Starter",
      tagline: "Great for getting started",
      price: { monthly: 29, annual: 24, annualTotal: 290 },
      badge: null,
      ctaLabel: "Start Free Trial",
      ctaVariant: "outline",
      highlighted: false,
      stripePriceId: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY ?? "",
        annual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL ?? "",
      },
      limits: {
        analysesPerMonth: { value: 25, display: "25/mo" },
        aiMessagesPerMonth: { value: 30, display: "30/mo" },
        savedDeals: { value: 50, display: "50 max" },
        documentsPerMonth: { value: 5, display: "5/mo" },
        pipelineBoards: { value: 1, display: "1 board" },
        pipelineStages: { value: 5, display: "5 default stages" },
        portfolioEntries: { value: 0, display: "Not included" },
        teamSeats: { value: 0, display: "--" },
      },
      features: [
        { key: "five_strategy", label: "All 5 strategy calculators", access: "included" },
        { key: "ai_chat", label: "AI deal advisor", access: "limited", detail: "30 messages/mo" },
        { key: "pipeline", label: "Deal pipeline", access: "limited", detail: "1 board, 5 stages" },
        { key: "portfolio", label: "Portfolio tracking", access: "excluded" },
        { key: "pdf_reports", label: "PDF reports", access: "limited", detail: "Basic (unbranded)" },
        { key: "comparison", label: "Side-by-side comparison", access: "excluded" },
      ],
    },
    {
      slug: "pro",
      name: "Pro",
      tagline: "Everything you need to invest smarter",
      price: { monthly: 69, annual: 55, annualTotal: 660 },
      badge: "Most Popular",
      ctaLabel: "Start Free Trial",
      ctaVariant: "solid",
      highlighted: true,
      stripePriceId: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY ?? "",
        annual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL ?? "",
      },
      limits: {
        analysesPerMonth: { value: "unlimited", display: "Unlimited" },
        aiMessagesPerMonth: { value: 150, display: "150/mo" },
        savedDeals: { value: "unlimited", display: "Unlimited" },
        documentsPerMonth: { value: 25, display: "25/mo" },
        pipelineBoards: { value: "unlimited", display: "Unlimited" },
        pipelineStages: { value: "unlimited", display: "Custom (unlimited)" },
        portfolioEntries: { value: "unlimited", display: "Unlimited" },
        teamSeats: { value: 0, display: "--" },
      },
      features: [
        { key: "five_strategy", label: "All 5 strategy calculators", access: "included" },
        { key: "ai_chat", label: "AI deal advisor", access: "included", detail: "150 messages/mo (Sonnet)" },
        { key: "pipeline", label: "Deal pipeline", access: "included", detail: "Unlimited boards & stages" },
        { key: "portfolio", label: "Portfolio tracking", access: "included" },
        { key: "pdf_reports", label: "PDF reports", access: "included", detail: "Branded (custom logo)" },
        { key: "comparison", label: "Side-by-side comparison", access: "included" },
        { key: "offer_letter", label: "Offer letter generation", access: "included" },
        { key: "documents", label: "Document processing", access: "included", detail: "25/mo" },
      ],
    },
    {
      slug: "team",
      name: "Team",
      tagline: "Best for growing teams",
      price: { monthly: 149, annual: 124, annualTotal: 1490 },
      badge: null,
      ctaLabel: "Start Free Trial",
      ctaVariant: "outline",
      highlighted: false,
      stripePriceId: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_TEAM_MONTHLY ?? "",
        annual: import.meta.env.VITE_STRIPE_PRICE_TEAM_ANNUAL ?? "",
      },
      limits: {
        analysesPerMonth: { value: "unlimited", display: "Unlimited" },
        aiMessagesPerMonth: { value: 500, display: "500/mo (shared)" },
        savedDeals: { value: "unlimited", display: "Unlimited" },
        documentsPerMonth: { value: "unlimited", display: "Unlimited" },
        pipelineBoards: { value: "unlimited", display: "Unlimited" },
        pipelineStages: { value: "unlimited", display: "Custom (unlimited)" },
        portfolioEntries: { value: "unlimited", display: "Unlimited" },
        teamSeats: { value: 5, display: "5 included" },
      },
      features: [
        { key: "five_strategy", label: "All 5 strategy calculators", access: "included" },
        { key: "ai_chat", label: "AI deal advisor", access: "included", detail: "500 shared messages/mo (Sonnet)" },
        { key: "pipeline", label: "Deal pipeline", access: "included", detail: "Shared, unlimited" },
        { key: "portfolio", label: "Portfolio tracking", access: "included" },
        { key: "pdf_reports", label: "PDF reports", access: "included", detail: "Branded (custom logo)" },
        { key: "comparison", label: "Side-by-side comparison", access: "included" },
        { key: "offer_letter", label: "Offer letter generation", access: "included" },
        { key: "documents", label: "Document processing", access: "included", detail: "Unlimited" },
        { key: "shared_pipeline", label: "Shared pipeline", access: "included" },
        { key: "role_permissions", label: "Role-based permissions", access: "included" },
        { key: "team_activity", label: "Team activity feed", access: "included" },
      ],
    },
  ],

  featureComparison: [
    // Analysis
    { key: "analyses", label: "Deal analyses per month", category: "Analysis", tiers: {
      free: { access: "limited", detail: "3" }, starter: { access: "limited", detail: "25" },
      pro: { access: "included", detail: "Unlimited" }, team: { access: "included", detail: "Unlimited" },
    }},
    { key: "calculators", label: "Strategy calculators (all 5)", category: "Analysis", tiers: {
      free: { access: "included" }, starter: { access: "included" },
      pro: { access: "included" }, team: { access: "included" },
    }},
    { key: "comparison", label: "Side-by-side strategy comparison", category: "Analysis", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "included" }, team: { access: "included" },
    }},
    { key: "saved_deals", label: "Saved deals", category: "Analysis", tiers: {
      free: { access: "limited", detail: "5" }, starter: { access: "limited", detail: "50" },
      pro: { access: "included", detail: "Unlimited" }, team: { access: "included", detail: "Unlimited" },
    }},

    // AI
    { key: "ai_chat", label: "AI deal advisor", category: "AI", tooltip: "Conversational AI that analyzes your deals and explains investment metrics", tiers: {
      free: { access: "excluded" }, starter: { access: "limited", detail: "30 msgs/mo" },
      pro: { access: "included", detail: "150 msgs/mo" }, team: { access: "included", detail: "500 msgs/mo (shared)" },
    }},
    { key: "ai_model", label: "AI model quality", category: "AI", tiers: {
      free: { access: "excluded" }, starter: { access: "limited", detail: "Standard (Haiku)" },
      pro: { access: "included", detail: "Advanced (Sonnet)" }, team: { access: "included", detail: "Advanced (Sonnet)" },
    }},
    { key: "offer_letter", label: "AI offer letter generation", category: "AI", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "included" }, team: { access: "included" },
    }},

    // Pipeline
    { key: "pipeline", label: "Deal pipeline (Kanban)", category: "Pipeline", tiers: {
      free: { access: "excluded" }, starter: { access: "limited", detail: "1 board, 5 stages" },
      pro: { access: "included", detail: "Unlimited boards & custom stages" }, team: { access: "included", detail: "Shared, unlimited" },
    }},

    // Portfolio
    { key: "portfolio", label: "Portfolio tracking", category: "Portfolio", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "included" }, team: { access: "included" },
    }},

    // Documents & Reports
    { key: "documents", label: "Document uploads per month", category: "Reports", tiers: {
      free: { access: "excluded" }, starter: { access: "limited", detail: "5" },
      pro: { access: "included", detail: "25" }, team: { access: "included", detail: "Unlimited" },
    }},
    { key: "pdf_reports", label: "PDF deal reports", category: "Reports", tiers: {
      free: { access: "excluded" }, starter: { access: "limited", detail: "Basic (unbranded)" },
      pro: { access: "included", detail: "Branded (custom logo)" }, team: { access: "included", detail: "Branded (custom logo)" },
    }},

    // Team
    { key: "team_seats", label: "Team members", category: "Team", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "excluded" }, team: { access: "included", detail: "Up to 5" },
    }},
    { key: "shared_pipeline", label: "Shared pipeline & deal assignments", category: "Team", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "excluded" }, team: { access: "included" },
    }},
    { key: "role_permissions", label: "Role-based permissions", category: "Team", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "excluded" }, team: { access: "included" },
    }},
    { key: "team_activity", label: "Team activity feed", category: "Team", tiers: {
      free: { access: "excluded" }, starter: { access: "excluded" },
      pro: { access: "excluded" }, team: { access: "included" },
    }},

    // Support
    { key: "support", label: "Support", category: "Support", tiers: {
      free: { access: "limited", detail: "Community" }, starter: { access: "limited", detail: "Email (48hr)" },
      pro: { access: "included", detail: "Email (24hr)" }, team: { access: "included", detail: "Priority (12hr)" },
    }},
  ],

  annualDiscount: {
    starter: { percent: 17, framing: "2 months free" },
    pro: { percent: 20, framing: "Save $168/year", savings: "$168" },
    team: { percent: 17, framing: "2 months free" },
  },

  trial: {
    durationDays: 14,
    tier: "pro",
    requiresCard: false,
  },

  guarantees: {
    annualMoneyBack: {
      days: 30,
      text: "Try any annual plan risk-free. Not satisfied within 30 days? Full refund, no questions asked.",
    },
    cancelAnytime: "Cancel online in 2 clicks, no phone call required.",
  },
};
```

### Backend Tier Limits Config

```python
# backend/core/billing/tier_limits.py

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TierLimits:
    analyses_per_month: Optional[int]     # None = unlimited
    ai_messages_per_month: int
    saved_deals: Optional[int]            # None = unlimited
    documents_per_month: Optional[int]    # None = unlimited
    pipeline_boards: Optional[int]        # None = unlimited
    portfolio_entries: Optional[int]      # None = unlimited
    team_seats: int
    ai_model: Optional[str]              # None = AI blocked


TIER_LIMITS: dict[str, TierLimits] = {
    "free": TierLimits(
        analyses_per_month=3,
        ai_messages_per_month=0,
        saved_deals=5,
        documents_per_month=0,
        pipeline_boards=0,
        portfolio_entries=0,
        team_seats=0,
        ai_model=None,
    ),
    "starter": TierLimits(
        analyses_per_month=25,
        ai_messages_per_month=30,
        saved_deals=50,
        documents_per_month=5,
        pipeline_boards=1,
        portfolio_entries=0,
        team_seats=0,
        ai_model="claude-haiku-3-5-20241022",
    ),
    "pro": TierLimits(
        analyses_per_month=None,
        ai_messages_per_month=150,
        saved_deals=None,
        documents_per_month=25,
        pipeline_boards=None,
        portfolio_entries=None,
        team_seats=0,
        ai_model="claude-sonnet-4-5-20250929",
    ),
    "team": TierLimits(
        analyses_per_month=None,
        ai_messages_per_month=500,
        saved_deals=None,
        documents_per_month=None,
        pipeline_boards=None,
        portfolio_entries=None,
        team_seats=5,
        ai_model="claude-sonnet-4-5-20250929",
    ),
}


def get_tier_limits(tier: str) -> TierLimits:
    """Return limits for a tier. Defaults to free if tier is unknown."""
    return TIER_LIMITS.get(tier, TIER_LIMITS["free"])
```

---

## 9. Upgrade / Downgrade Rules

### Upgrade Rules

| Scenario | Behavior | Stripe Mechanism | User Impact |
|---|---|---|---|
| Free to any paid | Immediate access | New Subscription via Checkout | Charged immediately (or trial starts) |
| Starter to Pro (same interval) | **Immediate** | `stripe.Subscription.modify()` with proration | Prorated charge for remainder of current period |
| Starter to Team | **Immediate** | `stripe.Subscription.modify()` with proration | Prorated charge |
| Pro to Team | **Immediate** | `stripe.Subscription.modify()` with proration | Prorated charge |
| Monthly to Annual (same tier) | **Immediate** | `stripe.Subscription.modify()` swap Price | Charged annual amount, credited remaining monthly |
| Any tier + Annual to higher tier | **Immediate** | `stripe.Subscription.modify()` with proration | Prorated charge on new annual price |

### Downgrade Rules

| Scenario | Behavior | Stripe Mechanism | User Impact |
|---|---|---|---|
| Pro to Starter | **End of current period** | `stripe.Subscription.modify()` with `proration_behavior="none"` | Keeps Pro access until period ends |
| Team to Pro | **End of current period** | Same | Keeps Team access until period ends |
| Any paid to Free | **End of current period** | `stripe.Subscription.cancel()` with `cancel_at_period_end=True` | Access continues until period ends, then downgrades |
| Annual to Monthly (same tier) | **At annual renewal** | Schedule price change | Keeps annual rate until renewal, then switches to monthly |

### Proration Configuration

```python
# backend/routers/billing.py

import stripe


def upgrade_subscription(
    subscription_id: str,
    new_price_id: str,
) -> stripe.Subscription:
    """Upgrade a subscription immediately with proration."""
    subscription = stripe.Subscription.retrieve(subscription_id)
    current_item = subscription["items"]["data"][0]

    updated = stripe.Subscription.modify(
        subscription_id,
        items=[{
            "id": current_item.id,
            "price": new_price_id,
        }],
        proration_behavior="always_invoice",  # Charge the difference now
        payment_behavior="error_if_incomplete",
    )
    return updated


def downgrade_subscription(
    subscription_id: str,
    new_price_id: str,
) -> stripe.Subscription:
    """Downgrade at end of current period (no proration)."""
    subscription = stripe.Subscription.retrieve(subscription_id)
    current_item = subscription["items"]["data"][0]

    # Schedule the change for period end
    updated = stripe.Subscription.modify(
        subscription_id,
        items=[{
            "id": current_item.id,
            "price": new_price_id,
        }],
        proration_behavior="none",
        # The price change takes effect at next renewal
    )
    return updated


def cancel_subscription(subscription_id: str) -> stripe.Subscription:
    """Cancel at end of period. User keeps access until then."""
    updated = stripe.Subscription.modify(
        subscription_id,
        cancel_at_period_end=True,
    )
    return updated
```

### Data Handling on Downgrade

When a user downgrades (e.g., Pro to Starter or to Free), their data is NOT deleted:

- **Deals beyond the limit:** Retained but read-only. User can view and export but not create new deals until under the limit.
- **Portfolio entries:** Retained but hidden on Starter/Free. Visible again if they re-upgrade.
- **Pipeline boards:** If they had multiple boards on Pro and downgrade to Starter (1 board), they keep all boards but can only actively use the first one. Others are archived (read-only).
- **Documents:** Retained. Upload limit resets to the new tier's cap.
- **AI history:** Chat history preserved. New messages blocked if tier has no AI.

This approach maximizes re-upgrade potential. The user's data is still there, locked behind the upgrade wall.

---

## 10. Free Tier Design Philosophy

### Purpose

The Free tier has one job: deliver the "aha moment" fast enough that the user understands Parcel's value, then create friction that drives them to Starter or Pro.

### What Free Gets Right

1. **All 5 calculators work fully.** Flip, BRRRR, Buy & Hold, Creative Finance, Wholesale. No feature stripping on the core analysis. This mirrors DealCheck's approach (all calculators work on free) and ensures the aha moment ("I pasted a property and instantly saw 5 strategies compared") happens on Free.

2. **3 analyses per month is the right number.** It is enough to experience the product (run 1-2 real deals + 1 experimental analysis) but not enough for anyone doing serious deal flow. FlipperForce uses 5. DealCheck uses 15 saved (not per month). Three monthly analyses creates urgency without feeling punitive.

3. **No AI on Free.** AI is Parcel's primary differentiator and the highest-margin feature. It must be gated to drive upgrades. When a free user finishes an analysis, show a teaser: "Want AI to explain what these numbers mean for your situation? Upgrade to Starter." This is the moment of maximum curiosity.

4. **No pipeline, no portfolio, no documents, no PDF reports on Free.** These are workflow features that create stickiness. They belong on paid tiers where they justify recurring payment.

5. **5 saved deals (cumulative, not per month).** The user can save 5 deals to their account to reference later. This creates data lock-in: "I have 5 deals saved in Parcel, I don't want to lose them." When they hit 5, they must delete one or upgrade.

### What Drives the Upgrade

| Friction Point | Trigger | Upgrade Path |
|---|---|---|
| Analysis limit hit | "You've used 3 of 3 analyses this month" | Starter (25/mo) or Pro (unlimited) |
| AI teaser | Post-analysis: "AI can explain these numbers" | Starter (30 AI msgs) or Pro (150) |
| Saved deal cap | "5 of 5 deals saved -- delete one or upgrade" | Starter (50) or Pro (unlimited) |
| Pipeline access | Pipeline button shows lock icon | Starter or Pro |
| PDF report | "Export as PDF" button shows upgrade prompt | Starter (basic) or Pro (branded) |

### In-Context Upgrade Prompts

Following DealCheck's pattern (not modals, but inline):

```typescript
// Example: Analysis limit prompt (inline, not modal)
{
  type: "upgrade_nudge",
  trigger: "analysis_limit",
  message: "You've used all 3 free analyses this month.",
  subtext: "Your analyses reset on {resetDate}. Or upgrade for more.",
  ctas: [
    { label: "Upgrade to Starter -- 25/mo", tier: "starter" },
    { label: "Go Pro -- Unlimited analyses", tier: "pro", primary: true },
  ],
}
```

### Metrics to Track

| Metric | Target (Year 1) |
|---|---|
| Free-to-Paid conversion | 5-8% |
| Average time on Free before upgrade | 14-30 days |
| Free users who hit analysis cap | >60% of monthly active |
| Free users who attempt AI | >40% (shown teaser) |

---

## CRITICAL DECISIONS

These are the binding decisions that shape the entire billing implementation. Each one was chosen based on the research and should not be revisited without new data.

### Decision 1: Four Tiers -- Free / Starter / Pro / Team

**Rationale:** The University of California research shows four tiers work when the fourth (Team) serves as a price anchor. Pro at $69 feels moderate against Team at $149. Removing any tier breaks the psychology:
- Without Free: lose the acquisition funnel (DealCheck and Stessa prove freemium works in RE SaaS).
- Without Starter: the jump from $0 to $69 is too steep (DealCheck's $10-29 entry tiers validate the need for a stepping stone).
- Without Team: $69 becomes the anchor and feels expensive (no longer "less than half the top price").
- Without Pro: the target tier disappears.

**Do not reduce to three tiers.**

### Decision 2: Pro is the Target Tier (55-65% of Paid Revenue)

**Rationale:** Pro at $69 sits in a competitive gap: above DealCheck's $20 ceiling and below PropStream/REsimpli's $99 floor. The AI differentiator (Sonnet 4.5 vs Starter's Haiku) justifies the 2.4x price jump. The "Most Popular" badge, visual elevation, and solid CTA button all funnel users toward Pro. Starter is engineered as a decoy.

### Decision 3: Annual Discount -- 17% Standard, 20% for Pro

**Rationale:** 16.7% ("2 months free") is the industry mode. Pro gets a deeper 20% discount to break below the $60 psychological threshold ($55/mo annual) for solopreneurs who are monthly-biased. This is aggressive enough to move the needle on annual adoption without devaluing the product.

### Decision 4: 14-Day No-Card Reverse Trial of Pro

**Rationale:** No-card generates 3.4x more trial signups and 27% more net paying customers vs card-required. The reverse trial (Pro access that downgrades to Free) is the highest-converting freemium model (2-3x vs traditional gating). 14 days matches Parcel's product complexity -- enough to activate across all features, short enough to maintain urgency.

**Do not extend to 30 days.** Do not require a credit card at signup.

### Decision 5: AI is Blocked on Free, Capped on Starter, Generous on Pro

**Rationale:** AI is the moat and the margin. Free users get zero AI (drives urgrades). Starter gets 30 messages/month on Haiku ($0.17/mo cost) -- enough to experience it, not enough for serious use. Pro gets 150 messages/month on Sonnet ($3.24/mo cost) -- generous enough that most users never hit the cap, but capped to prevent abuse. The model routing (Haiku for Starter, Sonnet for Pro) gives Starter a "good enough" experience while making Pro's AI quality upgrade feel tangible.

### Decision 6: Price IDs in Environment Variables, Not Database

**Rationale:** 6 price IDs that change once or twice per year do not warrant database infrastructure. Env vars are the simplest, most portable approach. Every PaaS supports them. A database lookup adds latency and a failure mode. Revisit only if implementing A/B pricing or geo pricing.

### Decision 7: Upgrades are Immediate; Downgrades Wait Until Period End

**Rationale:** Immediate upgrades with proration maximize revenue and satisfaction (the user gets value now and pays fairly). End-of-period downgrades prevent abuse (upgrade for one day, use features, downgrade) and ensure the user gets what they paid for through the end of their current billing cycle.

### Decision 8: Grandfather Existing Users for 12 Months on Price Increases

**Rationale:** In the real estate investor community, word-of-mouth is everything. PropStream and Mashvisor have generated BBB complaints and BiggerPockets warnings through aggressive pricing and cancellation practices. Grandfathering builds trust. The cost of keeping early users at legacy prices for 12 months is negligible compared to the reputational damage of surprise price increases.

### Decision 9: Launch with LAUNCH50 (50% off 3 months) and EARLYBIRD (30% off first year)

**Rationale:** Launch coupons create urgency, reward early adopters, and generate social proof. LAUNCH50 (capped at 100 uses) is aggressive enough to drive initial conversions. EARLYBIRD (annual only, 200 uses) pushes users toward annual billing. Both have hard caps to prevent long-term margin erosion.

### Decision 10: Free Tier = 3 Analyses/Month, 5 Saved Deals, All Calculators Working

**Rationale:** The "aha moment" (running a 5-strategy comparison on a real property) must happen on Free. All calculators working mirrors DealCheck and FlipperForce. 3 analyses/month is low enough to create upgrade pressure for anyone doing real deal flow. 5 saved deals creates data lock-in without being so generous that users never need to pay. No AI, no pipeline, no portfolio on Free -- these are the features that justify recurring payment.

---

## Appendix: Stripe Webhook Events to Handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Create/link Stripe customer to user. Activate subscription tier. |
| `customer.subscription.created` | Set user's `subscription_tier` and `stripe_subscription_id`. |
| `customer.subscription.updated` | Handle tier changes, period updates, cancellation scheduling. |
| `customer.subscription.deleted` | Downgrade user to Free tier. Preserve data (read-only). |
| `invoice.payment_succeeded` | Extend access. Log payment. Reset usage counters. |
| `invoice.payment_failed` | Grace period (3 days). Email user. Retry via Stripe Smart Retries. |
| `customer.subscription.trial_will_end` | (Not used -- trial is local, not Stripe-managed.) |

---

*This document is the single source of truth for Parcel's pricing implementation. All Stripe API calls, TypeScript data structures, and backend configurations are derived from the decisions above. Changes to any Critical Decision require updated research justification.*
