# Stripe API Architecture for Parcel SaaS Billing

**Date:** 2026-03-28
**Scope:** Stripe integration strategy for Parcel — real estate deal analysis platform
**Stack context:** FastAPI + SQLAlchemy 2 + PostgreSQL (Railway) | React + TypeScript + Vite (Vercel)
**Current auth:** JWT via httpOnly cookies, refresh token rotation

---

## Table of Contents

1. [Checkout Sessions vs Elements vs Payment Links](#1-checkout-sessions-vs-elements-vs-payment-links)
2. [Customer Portal Configuration](#2-customer-portal-configuration)
3. [Subscription Lifecycle](#3-subscription-lifecycle)
4. [Stripe Billing vs Manual Charge Management](#4-stripe-billing-vs-manual-charge-management)
5. [Price Objects: Configuring Parcel's 4 Tiers](#5-price-objects-configuring-parcels-4-tiers)
6. [Subscription Schedules for Plan Changes](#6-subscription-schedules-for-plan-changes)
7. [Test Mode vs Live Mode Transition](#7-test-mode-vs-live-mode-transition)
8. [Stripe CLI for Local Webhook Testing](#8-stripe-cli-for-local-webhook-testing)
9. [Coupon and Promotion Code System](#9-coupon-and-promotion-code-system)
10. [Tax Collection (Stripe Tax)](#10-tax-collection-stripe-tax)
11. [Recommendations for Parcel](#recommendations-for-parcel)

---

## 1. Checkout Sessions vs Elements vs Payment Links

### Option A: Stripe Checkout Sessions (RECOMMENDED for Parcel)

Checkout Sessions are server-created, Stripe-hosted payment pages. The backend creates a session, returns a URL, and the frontend redirects to it.

**How it works:**
1. User clicks "Upgrade to Pro" in Parcel
2. Frontend calls `POST /api/v1/billing/checkout`
3. Backend creates a Stripe Checkout Session, returns the `session.url`
4. Frontend redirects to Stripe's hosted checkout page
5. After payment, Stripe redirects back to Parcel's success URL
6. Stripe fires `checkout.session.completed` webhook to backend

**FastAPI implementation:**

```python
# backend/routers/billing.py
import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/billing", tags=["billing"])

class CheckoutRequest(BaseModel):
    price_id: str   # e.g., "price_pro_monthly"
    annual: bool = False

@router.post("/checkout")
async def create_checkout_session(
    body: CheckoutRequest,
    current_user = Depends(get_current_user),
):
    """Create a Stripe Checkout Session for subscription signup."""
    stripe.api_key = settings.STRIPE_SECRET_KEY

    # Find or create Stripe customer
    stripe_customer_id = current_user.stripe_customer_id
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            metadata={"parcel_user_id": str(current_user.id)},
        )
        stripe_customer_id = customer.id
        # Persist to DB
        current_user.stripe_customer_id = stripe_customer_id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        mode="subscription",
        line_items=[{"price": body.price_id, "quantity": 1}],
        success_url=f"{settings.FRONTEND_URL}/settings?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/settings?billing=canceled",
        subscription_data={
            "trial_period_days": 14,  # 14-day Pro trial
            "metadata": {"parcel_user_id": str(current_user.id)},
        },
        allow_promotion_codes=True,  # Let users enter launch coupons
    )

    return {"checkout_url": session.url}
```

**Frontend redirect (React):**

```typescript
// frontend/src/lib/api.ts
export async function createCheckoutSession(priceId: string): Promise<string> {
  const res = await api.post('/billing/checkout', { price_id: priceId });
  return res.data.checkout_url;
}

// In a component:
const handleUpgrade = async (priceId: string) => {
  const url = await createCheckoutSession(priceId);
  window.location.href = url; // Full redirect to Stripe
};
```

**Pros for Parcel:**
- Zero PCI compliance burden — Stripe handles all card data
- Built-in support for 3D Secure, Apple Pay, Google Pay, Link
- Trial period support baked in (`trial_period_days: 14`)
- Promotion code field built into the UI
- Mobile-optimized out of the box
- Fastest to implement — no custom form UI needed
- SCA/Strong Customer Authentication handled automatically

**Cons:**
- User leaves Parcel briefly (mitigated by fast redirect back)
- Limited visual customization (Stripe brand colors, not Parcel's indigo #6366F1)

### Option B: Stripe Elements (Custom Payment Form)

Elements embeds Stripe's payment fields directly into Parcel's UI via `@stripe/react-stripe-js`.

```typescript
// Hypothetical — NOT recommended for Parcel v1
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

function PaymentForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await stripe!.confirmCardPayment(clientSecret, {
      payment_method: { card: elements!.getElement(CardElement)! },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={{ style: { base: { color: '#E2E8F0' } } }} />
      <button type="submit">Subscribe</button>
    </form>
  );
}
```

**Why NOT for Parcel v1:**
- Requires creating Subscription + PaymentIntent on backend, then confirming on frontend
- Must handle 3D Secure authentication flows manually
- Must build your own trial logic, promo code input, tax display
- More code to maintain — significant engineering overhead for same result
- Only worth it if Parcel needs a fully branded checkout experience

### Option C: Payment Links (No-Code)

Payment Links are static URLs created in Stripe Dashboard — no backend integration needed.

**Why NOT for Parcel:**
- Cannot dynamically pass `customer` ID (breaks user-to-subscription mapping)
- Cannot inject trial periods per user
- Cannot conditionally show/hide based on current plan
- Fine for a Gumroad-style product, wrong for a SaaS with user accounts

### Verdict

**Use Checkout Sessions.** They give Parcel the best balance of speed-to-implement, security, and feature completeness. Migrate to Elements only if/when Parcel needs a fully branded inline checkout (unlikely before $1M ARR).

---

## 2. Customer Portal Configuration

The Stripe Customer Portal is a hosted page where subscribers can self-manage their billing. It eliminates the need to build settings UI for payment method updates, plan changes, and invoice history.

### What Users Can Self-Manage

| Feature | Enable for Parcel? | Notes |
|---|---|---|
| Update payment method | YES | Reduces churn from expired cards |
| View invoice history | YES | Download receipts for tax purposes |
| Cancel subscription | YES | Set to cancel at period end, not immediately |
| Switch plans (upgrade/downgrade) | YES | Pro <-> Team, with proration |
| Pause subscription | NO | Not appropriate for SaaS — creates billing complexity |
| Update billing address | YES | Required if using Stripe Tax |
| Apply promotion codes | YES | Let users apply codes post-checkout |

### Dashboard Configuration

Configure at: `https://dashboard.stripe.com/test/settings/billing/portal`

Key settings:
- **Cancellation**: Set `cancellation_reason.enabled = true` to collect churn feedback
- **Proration**: Set `proration_behavior = "create_prorations"` for mid-cycle plan changes
- **Products**: Whitelist only the products/prices you want users to switch between

### Backend: Creating a Portal Session

```python
@router.post("/billing/portal")
async def create_portal_session(
    current_user = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for self-service billing management."""
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings",
    )
    return {"portal_url": session.url}
```

### Frontend: "Manage Billing" Button

```typescript
// In Settings page
const handleManageBilling = async () => {
  const res = await api.post('/billing/portal');
  window.location.href = res.data.portal_url;
};

// Button component
<Button onClick={handleManageBilling}>
  Manage Billing
</Button>
```

### Portal Configuration Object (API-based, optional)

If you need programmatic control instead of Dashboard config:

```python
stripe.billing_portal.Configuration.create(
    business_profile={
        "headline": "Manage your Parcel subscription",
        "privacy_policy_url": "https://useparcel.com/privacy",
        "terms_of_service_url": "https://useparcel.com/terms",
    },
    features={
        "subscription_update": {
            "enabled": True,
            "default_allowed_updates": ["price", "promotion_code"],
            "proration_behavior": "create_prorations",
            "products": [
                {
                    "product": "prod_parcel_pro",
                    "prices": ["price_pro_monthly", "price_pro_annual"],
                },
                {
                    "product": "prod_parcel_team",
                    "prices": ["price_team_monthly", "price_team_annual"],
                },
            ],
        },
        "subscription_cancel": {
            "enabled": True,
            "mode": "at_period_end",  # Don't cut off access immediately
            "cancellation_reason": {
                "enabled": True,
                "options": [
                    "too_expensive",
                    "missing_features",
                    "switched_service",
                    "unused",
                    "other",
                ],
            },
        },
        "payment_method_update": {"enabled": True},
        "invoice_history": {"enabled": True},
    },
)
```

---

## 3. Subscription Lifecycle

### State Machine

```
                    trial_period_days=14
signup ──► trialing ──────────────────────► active
                                              │
                                    payment fails
                                              │
                                              ▼
                                          past_due
                                              │
                              ┌───────────────┼───────────────┐
                        retries succeed    max retries      user cancels
                              │            exhausted              │
                              ▼                │                  ▼
                           active              ▼              canceled
                                           canceled
                                        (unpaid/expired)
```

### Key Subscription Statuses

| Status | Meaning | Parcel Action |
|---|---|---|
| `trialing` | Within 14-day trial, no charge yet | Full Pro access, show "X days left" banner |
| `active` | Paying, current period valid | Full access per plan tier |
| `past_due` | Payment failed, retrying | Show warning banner, keep access for grace period |
| `canceled` | User canceled or payment exhausted | Downgrade to Free tier immediately |
| `unpaid` | All retry attempts failed | Downgrade to Free tier |
| `incomplete` | Initial payment not yet confirmed | Do not grant access — wait for confirmation |
| `incomplete_expired` | Initial payment window expired | Treat as never subscribed |
| `paused` | Subscription paused (not using) | N/A — not enabling pause for Parcel |

### Webhook Events to Handle

These are the critical webhooks for the subscription lifecycle. The backend must handle each to keep Parcel's local `users.plan` column in sync with Stripe.

```python
# backend/routers/webhooks.py
from fastapi import APIRouter, Request, HTTPException
import stripe

router = APIRouter(tags=["webhooks"])

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db = Depends(get_db)):
    """Handle Stripe webhook events for subscription lifecycle."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        # User just subscribed — link Stripe subscription to Parcel user
        handle_checkout_completed(data, db)

    elif event_type == "customer.subscription.created":
        # Subscription object created (may still be trialing)
        handle_subscription_created(data, db)

    elif event_type == "customer.subscription.updated":
        # Plan change, status change, trial ending, etc.
        handle_subscription_updated(data, db)

    elif event_type == "customer.subscription.deleted":
        # Subscription fully canceled/expired
        handle_subscription_deleted(data, db)

    elif event_type == "customer.subscription.trial_will_end":
        # Fires 3 days before trial ends — send email reminder
        handle_trial_ending_soon(data, db)

    elif event_type == "invoice.payment_failed":
        # Payment retry failed — flag user, send dunning email
        handle_payment_failed(data, db)

    elif event_type == "invoice.payment_succeeded":
        # Successful payment — clear any past_due flags
        handle_payment_succeeded(data, db)

    elif event_type == "invoice.paid":
        # Invoice fully paid — update billing records
        handle_invoice_paid(data, db)

    return {"status": "ok"}
```

### Parcel User Table: Billing Columns

```python
# Additions to the users model
class User(Base):
    __tablename__ = "users"

    # ... existing columns ...

    # Stripe billing columns
    stripe_customer_id = Column(String, unique=True, nullable=True, index=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    plan = Column(String, default="free")  # free | pro | team
    plan_status = Column(String, default="active")  # active | trialing | past_due | canceled
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
```

### Subscription Status → Feature Access Mapping

```python
# backend/core/billing/access.py
from datetime import datetime, timezone

def get_effective_plan(user) -> str:
    """Determine what plan features a user should have access to."""
    if user.plan_status in ("active", "trialing"):
        return user.plan  # "pro" or "team"

    if user.plan_status == "past_due":
        # Grace period: keep access for 7 days after first failure
        if user.current_period_end and user.current_period_end > datetime.now(timezone.utc):
            return user.plan
        return "free"

    # canceled, unpaid, incomplete, incomplete_expired
    return "free"

# Usage in route dependencies
def require_plan(minimum: str):
    """FastAPI dependency that enforces minimum plan level."""
    plan_hierarchy = {"free": 0, "pro": 1, "team": 2}

    def checker(current_user = Depends(get_current_user)):
        effective = get_effective_plan(current_user)
        if plan_hierarchy.get(effective, 0) < plan_hierarchy[minimum]:
            raise HTTPException(
                status_code=403,
                detail=f"This feature requires the {minimum.title()} plan",
                headers={"X-Required-Plan": minimum},
            )
        return current_user
    return checker

# Example: protect offer letter route
@router.post("/deals/{deal_id}/offer-letter")
async def generate_offer_letter(
    deal_id: str,
    current_user = Depends(require_plan("pro")),
):
    ...
```

---

## 4. Stripe Billing vs Manual Charge Management

### Option A: Stripe Billing (RECOMMENDED)

Stripe Billing is Stripe's subscription engine. It manages the entire invoice-charge-retry cycle automatically.

**What Stripe Billing handles:**
- Invoice generation on each billing cycle
- Automatic payment collection on invoice finalization
- Smart retries on failed payments (configurable: up to 4 retries over 3 weeks)
- Proration calculations for mid-cycle plan changes
- Trial period management (auto-charges when trial ends)
- Subscription lifecycle state machine
- Tax calculation (with Stripe Tax add-on)
- Revenue recognition data (for accounting)

**Cost:** 0.5% of recurring billing volume (on top of standard 2.9% + $0.30 per charge).

At Parcel's scale:
- 100 Pro users @ $29/mo = $2,900 MRR → Billing fee = $14.50/mo
- 1,000 Pro users @ $29/mo = $29,000 MRR → Billing fee = $145/mo
- The 0.5% is negligible vs. engineering time saved

### Option B: Manual Charge Management

You would create `PaymentIntent` objects yourself on a cron schedule, handle retries, build dunning emails, track subscription state in your own DB, calculate prorations manually.

**Why NOT for Parcel:**
- Requires building everything Stripe Billing already does
- Must handle edge cases: timezone billing anchors, proration math, retry scheduling
- Must build dunning email system from scratch
- Must handle SCA/3DS authentication for saved cards
- Easily 2-4 weeks of engineering for a worse result
- No legitimate reason unless processing 100k+ subscriptions where 0.5% fee matters

### Verdict

**Use Stripe Billing.** The 0.5% fee is a rounding error. The engineering time saved is massive. Parcel will not outgrow Stripe Billing until well past $10M ARR.

---

## 5. Price Objects: Configuring Parcel's 4 Tiers

### Parcel Pricing Architecture

Based on the current landing page (`constants.ts`), Parcel has three visible tiers (Free, Pro, Team). The user's brief mentions a fourth tier (Starter at $29) — the current constants show Pro at $29 and Team at $99. Here is a configuration for all four tiers as specified:

```
Free:    $0/forever     — 5 deals/mo, basic pipeline, basic AI chat
Starter: $29/mo ($23/mo annual) — expanded limits, no document AI
Pro:     $69/mo ($55/mo annual) — unlimited deals, document AI, offer letters
Team:    $149/mo ($119/mo annual) — everything in Pro + 10 seats + shared pipeline
```

### Creating Products and Prices

```python
# scripts/stripe_setup.py — Run once to create Stripe catalog
import stripe

stripe.api_key = "sk_test_..."

# ─── Products ────────────────────────────────────────────────

prod_starter = stripe.Product.create(
    name="Parcel Starter",
    description="For investors getting started with deal analysis",
    metadata={"parcel_plan": "starter"},
)

prod_pro = stripe.Product.create(
    name="Parcel Pro",
    description="For active investors and agents — unlimited analysis",
    metadata={"parcel_plan": "pro"},
)

prod_team = stripe.Product.create(
    name="Parcel Team",
    description="For real estate teams and brokerages",
    metadata={"parcel_plan": "team"},
)

# ─── Prices (Monthly) ───────────────────────────────────────

price_starter_monthly = stripe.Price.create(
    product=prod_starter.id,
    unit_amount=2900,          # $29.00
    currency="usd",
    recurring={"interval": "month"},
    lookup_key="starter_monthly",
    metadata={"parcel_plan": "starter", "interval": "monthly"},
)

price_pro_monthly = stripe.Price.create(
    product=prod_pro.id,
    unit_amount=6900,          # $69.00
    currency="usd",
    recurring={"interval": "month"},
    lookup_key="pro_monthly",
    metadata={"parcel_plan": "pro", "interval": "monthly"},
)

price_team_monthly = stripe.Price.create(
    product=prod_team.id,
    unit_amount=14900,         # $149.00
    currency="usd",
    recurring={"interval": "month"},
    lookup_key="team_monthly",
    metadata={"parcel_plan": "team", "interval": "monthly"},
)

# ─── Prices (Annual — ~20% discount) ────────────────────────

price_starter_annual = stripe.Price.create(
    product=prod_starter.id,
    unit_amount=27600,         # $23.00/mo * 12 = $276.00/yr
    currency="usd",
    recurring={"interval": "year"},
    lookup_key="starter_annual",
    metadata={"parcel_plan": "starter", "interval": "annual"},
)

price_pro_annual = stripe.Price.create(
    product=prod_pro.id,
    unit_amount=66000,         # $55.00/mo * 12 = $660.00/yr
    currency="usd",
    recurring={"interval": "year"},
    lookup_key="pro_annual",
    metadata={"parcel_plan": "pro", "interval": "annual"},
)

price_team_annual = stripe.Price.create(
    product=prod_team.id,
    unit_amount=142800,        # $119.00/mo * 12 = $1,428.00/yr
    currency="usd",
    recurring={"interval": "year"},
    lookup_key="team_annual",
    metadata={"parcel_plan": "team", "interval": "annual"},
)

print("--- Stripe Catalog Created ---")
print(f"Starter Monthly: {price_starter_monthly.id}")
print(f"Starter Annual:  {price_starter_annual.id}")
print(f"Pro Monthly:     {price_pro_monthly.id}")
print(f"Pro Annual:      {price_pro_annual.id}")
print(f"Team Monthly:    {price_team_monthly.id}")
print(f"Team Annual:     {price_team_annual.id}")
```

### Price Model Decision: Flat-Rate vs Tiered vs Usage-Based

| Model | How It Works | Right for Parcel? |
|---|---|---|
| **Flat-rate** | Fixed $/mo per plan | YES — simple, predictable, aligns with RE investor expectations |
| **Tiered (graduated)** | Price changes at volume thresholds | NO — Parcel doesn't bill per-deal or per-seat (except Team) |
| **Tiered (volume)** | Entire quantity billed at one rate | NO — same reason |
| **Usage-based (metered)** | Bill per API call / unit consumed | FUTURE MAYBE — could meter AI chat messages or document uploads |

**Recommendation:** Start with flat-rate pricing. The only dimension that could benefit from usage-based billing is AI consumption (~$2/user/mo in Claude API costs), but this should be absorbed into the flat fee until Parcel has data on actual usage distributions.

### Handling the Free Tier

The Free tier does NOT need a Stripe Price object. Free users simply have `plan = "free"` in the database with no Stripe subscription. Feature gating is handled server-side.

```python
# No Stripe involvement for Free tier — just DB defaults
PLAN_LIMITS = {
    "free":    {"deals_per_month": 5,  "pipeline_max": 10, "doc_uploads": 0,  "ai_chat": True,  "offer_letters": False},
    "starter": {"deals_per_month": 25, "pipeline_max": 50, "doc_uploads": 0,  "ai_chat": True,  "offer_letters": False},
    "pro":     {"deals_per_month": -1, "pipeline_max": -1, "doc_uploads": 10, "ai_chat": True,  "offer_letters": True},
    "team":    {"deals_per_month": -1, "pipeline_max": -1, "doc_uploads": -1, "ai_chat": True,  "offer_letters": True},
}
# -1 means unlimited
```

### Team Pricing: Per-Seat Add-on (Future)

If Parcel eventually charges per-seat for Team, use `quantity` on the subscription item:

```python
# Creating a Team subscription with 5 seats
session = stripe.checkout.Session.create(
    mode="subscription",
    line_items=[{
        "price": "price_team_monthly",
        "quantity": 5,  # 5 seats * $149/mo = $745/mo? (adjust pricing)
    }],
    ...
)
```

This is not needed now since Team is flat $149/mo for up to 10 members, but the infrastructure supports it when needed.

---

## 6. Subscription Schedules for Plan Changes

When a user upgrades or downgrades, Stripe offers two approaches:

### Approach A: Immediate Change with Proration (RECOMMENDED for upgrades)

```python
@router.post("/billing/change-plan")
async def change_plan(
    body: ChangePlanRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db),
):
    """Change user's subscription plan (upgrade or downgrade)."""
    stripe.api_key = settings.STRIPE_SECRET_KEY
    subscription = stripe.Subscription.retrieve(current_user.stripe_subscription_id)

    # Get the current subscription item ID
    current_item = subscription["items"]["data"][0]

    updated = stripe.Subscription.modify(
        current_user.stripe_subscription_id,
        items=[{
            "id": current_item.id,
            "price": body.new_price_id,  # e.g., "price_pro_monthly"
        }],
        proration_behavior="create_prorations",  # Charge/credit difference immediately
        # For downgrades, use "none" and let it take effect at period end
    )

    # Update local DB
    current_user.plan = body.new_plan  # "starter", "pro", or "team"
    current_user.current_period_end = datetime.fromtimestamp(
        updated.current_period_end, tz=timezone.utc
    )
    db.commit()

    return {"status": "plan_changed", "new_plan": body.new_plan}
```

### Approach B: Scheduled Change at Period End (RECOMMENDED for downgrades)

For downgrades, it is better UX to let the user keep their current plan until the billing period ends, then switch.

```python
# Downgrade: takes effect at end of current period
updated = stripe.Subscription.modify(
    subscription_id,
    items=[{
        "id": current_item.id,
        "price": new_price_id,
    }],
    proration_behavior="none",                # No proration — user keeps current plan
    billing_cycle_anchor="unchanged",         # Don't reset billing date
)
# The price change takes effect on next invoice
```

### Approach C: Subscription Schedules (Complex, Not Needed Yet)

Stripe Subscription Schedules let you queue future changes — e.g., "switch to annual plan on Jan 1." This is overkill for Parcel v1.

```python
# Example — NOT recommended for initial implementation
schedule = stripe.SubscriptionSchedule.create(
    from_subscription=subscription_id,
)
stripe.SubscriptionSchedule.modify(
    schedule.id,
    phases=[
        {   # Current phase
            "items": [{"price": "price_pro_monthly", "quantity": 1}],
            "end_date": current_period_end,
        },
        {   # Future phase — switches to annual
            "items": [{"price": "price_pro_annual", "quantity": 1}],
            "iterations": 1,
        },
    ],
)
```

### Parcel's Plan Change Strategy

| Scenario | Behavior | Proration |
|---|---|---|
| Free → Starter/Pro/Team | New Checkout Session (first subscription) | N/A |
| Starter → Pro | Immediate upgrade, prorate charge | Yes — charge difference |
| Starter → Team | Immediate upgrade, prorate charge | Yes — charge difference |
| Pro → Team | Immediate upgrade, prorate charge | Yes — charge difference |
| Team → Pro | Downgrade at period end | No proration — keep Team until renewal |
| Pro → Starter | Downgrade at period end | No proration — keep Pro until renewal |
| Any → Free | Cancel at period end | No proration — keep access until renewal |
| Monthly → Annual | Immediate switch, prorate credit | Yes — credit remaining month |

---

## 7. Test Mode vs Live Mode Transition Checklist

Stripe maintains completely separate environments for test and live mode. All objects (customers, subscriptions, prices) are distinct.

### Pre-Launch Checklist

```
[ ] 1. PRODUCTS & PRICES
    [ ] Recreate all Products in live mode (or use Stripe Dashboard "Copy to live mode")
    [ ] Recreate all Prices in live mode — IDs will be different (price_live_xxx)
    [ ] Store price IDs in environment variables, NOT hardcoded
    [ ] Verify lookup_keys match between test and live

[ ] 2. WEBHOOK ENDPOINTS
    [ ] Create live webhook endpoint in Stripe Dashboard
    [ ] Point to production URL: https://api.useparcel.com/webhooks/stripe
    [ ] Subscribe to these events:
        - checkout.session.completed
        - customer.subscription.created
        - customer.subscription.updated
        - customer.subscription.deleted
        - customer.subscription.trial_will_end
        - invoice.payment_failed
        - invoice.payment_succeeded
        - invoice.paid
    [ ] Save live webhook signing secret to Railway env vars

[ ] 3. API KEYS
    [ ] Set STRIPE_SECRET_KEY to live key (sk_live_...) in Railway
    [ ] Set STRIPE_PUBLISHABLE_KEY to live key (pk_live_...) in Vercel env
    [ ] Set STRIPE_WEBHOOK_SECRET to live signing secret in Railway
    [ ] NEVER commit API keys to git — use env vars only
    [ ] Verify .env is in .gitignore

[ ] 4. CUSTOMER PORTAL
    [ ] Configure live Customer Portal in Dashboard
    [ ] Set branding (Parcel logo, colors)
    [ ] Configure allowed operations (same as test mode)
    [ ] Set return URL to production frontend

[ ] 5. ENVIRONMENT VARIABLE MAP
    Backend (Railway):
      STRIPE_SECRET_KEY=sk_live_...
      STRIPE_WEBHOOK_SECRET=whsec_...
      STRIPE_PRICE_STARTER_MONTHLY=price_...
      STRIPE_PRICE_STARTER_ANNUAL=price_...
      STRIPE_PRICE_PRO_MONTHLY=price_...
      STRIPE_PRICE_PRO_ANNUAL=price_...
      STRIPE_PRICE_TEAM_MONTHLY=price_...
      STRIPE_PRICE_TEAM_ANNUAL=price_...

    Frontend (Vercel):
      VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

[ ] 6. TESTING IN LIVE MODE
    [ ] Make a real $1 charge with a real card to verify end-to-end
    [ ] Verify webhook delivery in Stripe Dashboard > Webhooks > Events
    [ ] Refund the test charge

[ ] 7. COMPLIANCE
    [ ] Privacy policy mentions Stripe as payment processor
    [ ] Terms of service include subscription/refund terms
    [ ] PCI SAQ-A filed (if required — Checkout Sessions = minimal PCI scope)
```

### Environment-Based Configuration

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_PRICE_STARTER_MONTHLY: str
    STRIPE_PRICE_STARTER_ANNUAL: str
    STRIPE_PRICE_PRO_MONTHLY: str
    STRIPE_PRICE_PRO_ANNUAL: str
    STRIPE_PRICE_TEAM_MONTHLY: str
    STRIPE_PRICE_TEAM_ANNUAL: str

    @property
    def stripe_is_live(self) -> bool:
        return self.STRIPE_SECRET_KEY.startswith("sk_live_")

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 8. Stripe CLI for Local Webhook Testing

The Stripe CLI lets you forward webhook events from Stripe to your local FastAPI server during development.

### Installation

```bash
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Verify
stripe --version
```

### Authentication

```bash
stripe login
# Opens browser → authorize → press Enter in terminal
# Stores API key in ~/.config/stripe/config.toml
```

### Forwarding Webhooks to Local FastAPI

```bash
# Forward all events to your local backend
stripe listen --forward-to localhost:8000/webhooks/stripe

# Output:
# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
# (Use this as STRIPE_WEBHOOK_SECRET in .env for local dev)
```

### Triggering Test Events

```bash
# Trigger a checkout session completed event
stripe trigger checkout.session.completed

# Trigger subscription lifecycle events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger customer.subscription.trial_will_end
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded

# Trigger with specific data overrides
stripe trigger customer.subscription.updated \
  --override subscription:status=past_due
```

### Development Workflow

```bash
# Terminal 1: Run FastAPI backend
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2: Run Stripe CLI webhook forwarding
stripe listen --forward-to localhost:8000/webhooks/stripe

# Terminal 3: Trigger test events as needed
stripe trigger checkout.session.completed
```

### Filtering Events (Performance)

```bash
# Only forward the events Parcel cares about
stripe listen \
  --forward-to localhost:8000/webhooks/stripe \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.trial_will_end,invoice.payment_failed,invoice.payment_succeeded,invoice.paid
```

### Viewing Event Logs

```bash
# See recent events
stripe events list --limit 10

# Get details of a specific event
stripe events retrieve evt_1234567890

# Replay a specific event to your local server
stripe events resend evt_1234567890 --webhook-endpoint we_1234567890
```

---

## 9. Coupon and Promotion Code System

Coupons and promotion codes are separate objects in Stripe. A Coupon defines the discount logic; a Promotion Code is a user-facing code string that maps to a coupon.

### Creating Launch Coupons

```python
# scripts/create_launch_coupons.py
import stripe
stripe.api_key = "sk_test_..."

# ─── Coupon 1: 50% off first 3 months (launch promo) ────────

coupon_launch = stripe.Coupon.create(
    percent_off=50,
    duration="repeating",
    duration_in_months=3,
    name="Launch Special — 50% Off",
    metadata={"campaign": "launch_2026"},
)

# Create a human-readable promo code for it
promo_launch = stripe.PromotionCode.create(
    coupon=coupon_launch.id,
    code="LAUNCH50",
    max_redemptions=500,           # Cap at 500 uses
    expires_at=1756684800,         # Sept 1, 2026
    restrictions={
        "first_time_transaction": True,  # New customers only
    },
)

# ─── Coupon 2: 20% off forever (early adopter) ──────────────

coupon_early = stripe.Coupon.create(
    percent_off=20,
    duration="forever",
    name="Early Adopter — 20% Off Forever",
    metadata={"campaign": "early_adopter_2026"},
)

promo_early = stripe.PromotionCode.create(
    coupon=coupon_early.id,
    code="EARLYBIRD",
    max_redemptions=100,
    restrictions={
        "first_time_transaction": True,
        "minimum_amount": 2900,         # Minimum $29 (Starter plan)
        "minimum_amount_currency": "usd",
    },
)

# ─── Coupon 3: $10 off one month (referral) ─────────────────

coupon_referral = stripe.Coupon.create(
    amount_off=1000,               # $10.00
    currency="usd",
    duration="once",
    name="Referral Discount",
    metadata={"campaign": "referral"},
)

promo_referral = stripe.PromotionCode.create(
    coupon=coupon_referral.id,
    code="REFER10",
    max_redemptions=None,           # Unlimited
)

print(f"Launch promo:   {promo_launch.code} → {coupon_launch.id}")
print(f"Early adopter:  {promo_early.code} → {coupon_early.id}")
print(f"Referral:       {promo_referral.code} → {coupon_referral.id}")
```

### Enabling Promo Codes in Checkout

Already shown in section 1 — the key parameter:

```python
session = stripe.checkout.Session.create(
    ...
    allow_promotion_codes=True,  # Shows promo code input field in Checkout
)
```

Alternatively, apply a specific coupon server-side (e.g., from a referral link):

```python
session = stripe.checkout.Session.create(
    ...
    discounts=[{"coupon": coupon_referral.id}],
    # Note: cannot use both allow_promotion_codes AND discounts
)
```

### Coupon Duration Types

| Duration | Behavior | Use Case |
|---|---|---|
| `once` | Discount on first invoice only | Referral codes, one-time promos |
| `repeating` | Discount for N months | Launch promos ("50% off first 3 months") |
| `forever` | Discount on every invoice | Loyalty/early-adopter pricing |

### Tracking Coupon Performance

```python
# List all promotion codes with redemption counts
promos = stripe.PromotionCode.list(limit=100)
for p in promos.data:
    print(f"{p.code}: {p.times_redeemed} / {p.max_redemptions or 'unlimited'}")
```

---

## 10. Tax Collection (Stripe Tax)

### Does Parcel Need It?

**Short answer: Not at launch, but soon.**

**The legal landscape:**
- **US SaaS sales tax:** ~45 states now tax SaaS subscriptions. Nexus rules vary by state.
- **Economic nexus:** Most states trigger tax obligations at $100K revenue or 200 transactions in the state.
- **Parcel's situation:** Pre-launch, zero revenue, no nexus anywhere yet.

**When Parcel WILL need it:**
- Once Parcel hits ~$100K ARR or has 200+ paying customers in any single state
- If Parcel incorporates in a state that taxes SaaS (e.g., Texas, New York, Pennsylvania)
- Rule of thumb: implement tax collection before $500K ARR to avoid back-tax liability

### How Stripe Tax Works

Stripe Tax automatically calculates, collects, and reports tax on each transaction.

**Cost:** 0.5% of each transaction where tax is calculated (charged even if tax amount is $0).

At Parcel's scale:
- 500 subscribers * $50 avg/mo = $25,000 MRR → Stripe Tax fee = $125/mo
- This is worth it vs. hiring a tax accountant or using Avalara/TaxJar separately

### Enabling Stripe Tax (When Ready)

```python
# Add to Checkout Session creation
session = stripe.checkout.Session.create(
    ...
    automatic_tax={"enabled": True},
    # Stripe will collect billing address and calculate tax
    customer_update={
        "address": "auto",  # Auto-save address to customer
    },
)
```

```python
# Add to existing subscriptions
stripe.Subscription.modify(
    subscription_id,
    automatic_tax={"enabled": True},
)
```

### Tax Configuration Steps (When Ready)

```
[ ] Register for tax collection in your "home" state (where Parcel is incorporated)
[ ] In Stripe Dashboard > Tax > Settings, set your origin address
[ ] Add tax registrations for each state where you have nexus
[ ] Enable automatic_tax on all Checkout Sessions and Subscriptions
[ ] Set tax_behavior on Prices:
    - "exclusive": price + tax shown separately ($29 + $2.03 tax = $31.03)
    - "inclusive": tax included in price ($29 includes $1.87 tax)
    → Use "exclusive" — it's the US standard for SaaS
[ ] Update Price objects:
```

```python
# When ready, update prices to be tax-aware
price = stripe.Price.create(
    product=prod_pro.id,
    unit_amount=6900,
    currency="usd",
    recurring={"interval": "month"},
    tax_behavior="exclusive",      # Tax added on top of $69
    lookup_key="pro_monthly",
)
```

### Product Tax Codes

Stripe needs to know what you sell to apply the right tax rate:

```python
# SaaS product tax code
product = stripe.Product.create(
    name="Parcel Pro",
    tax_code="txcd_10103001",  # "Software as a Service (SaaS) - business use"
    ...
)
```

Key tax codes for SaaS:
- `txcd_10103001` — SaaS, business use (most Parcel users)
- `txcd_10103000` — SaaS, personal use
- `txcd_10000000` — General software (fallback)

---

## RECOMMENDATIONS FOR PARCEL

### Priority 1 — Implement First (Week 1-2)

1. **Use Stripe Checkout Sessions for all paid signups.** Do not build a custom payment form. Redirect users to Stripe-hosted checkout, handle the `checkout.session.completed` webhook to activate their subscription. This is 80% of the billing system in ~200 lines of backend code.

2. **Create 3 Products and 6 Prices** (Starter, Pro, Team x monthly/annual). Store all Price IDs in Railway environment variables. Use `lookup_key` on each Price for easy retrieval. Run the setup script once in test mode, then once in live mode.

3. **Add billing columns to the users table:** `stripe_customer_id`, `stripe_subscription_id`, `plan`, `plan_status`, `trial_ends_at`, `current_period_end`. This is a single Alembic migration.

4. **Build the webhook handler** (`POST /webhooks/stripe`). Handle these 7 events at minimum: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.payment_failed`, `invoice.payment_succeeded`. This keeps Parcel's DB in sync with Stripe as the source of truth.

5. **Wire up the 14-day Pro trial** by passing `subscription_data.trial_period_days=14` in the Checkout Session creation. No card required means the trial starts upon registration, and the Checkout Session is only presented when they decide to convert.

### Priority 2 — Implement Next (Week 3)

6. **Enable the Stripe Customer Portal** for self-service billing management. Configure it to allow: payment method updates, plan switching (with proration), cancellation at period end (with reason collection), and invoice history. Add a "Manage Billing" button to Parcel's Settings page that creates a portal session and redirects.

7. **Build the feature-gating middleware** (`require_plan` dependency). Map plan levels to feature limits (deals/month, pipeline capacity, document uploads, offer letters). Enforce server-side — never trust the frontend.

8. **Enable `allow_promotion_codes=True`** on all Checkout Sessions. Create 2-3 launch promo codes (LAUNCH50 for 50% off 3 months, EARLYBIRD for 20% off forever). These cost nothing to set up and are powerful for early acquisition.

### Priority 3 — Implement Later (Month 2+)

9. **Implement plan change logic** (upgrade = immediate proration, downgrade = end of period). Use `stripe.Subscription.modify()` with `proration_behavior` set appropriately based on direction. This can initially be done through the Customer Portal without any custom backend code.

10. **Add Stripe Tax when approaching $100K ARR.** Until then, the 0.5% per-transaction fee and compliance complexity are not worth it. When ready, set `automatic_tax.enabled=True` on Checkout Sessions and assign `tax_code="txcd_10103001"` (SaaS business use) to all Products.

11. **Set up Stripe CLI in the development workflow.** Add `stripe listen --forward-to localhost:8000/webhooks/stripe` to the dev startup instructions. This makes webhook testing frictionless during development.

12. **Monitor and iterate on dunning.** Configure Smart Retries in the Stripe Dashboard (Settings > Billing > Automatic collection). Start with Stripe's defaults (4 retries over ~3 weeks), then tune based on actual payment failure data. Add a `past_due` warning banner in Parcel's UI that links to the Customer Portal for payment method update.

### Architecture Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                         PARCEL FRONTEND                          │
│                        (Vercel / React)                          │
│                                                                  │
│  Pricing Page          Settings Page         Dashboard           │
│  ┌────────────┐       ┌──────────────┐      ┌───────────────┐   │
│  │ "Upgrade"  │       │ "Manage      │      │ Trial banner  │   │
│  │  button    │──┐    │  Billing"    │──┐   │ (X days left) │   │
│  └────────────┘  │    └──────────────┘  │   └───────────────┘   │
│                  │                      │                        │
└──────────────────┼──────────────────────┼────────────────────────┘
                   │                      │
                   ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                        PARCEL BACKEND                            │
│                     (Railway / FastAPI)                           │
│                                                                  │
│  POST /billing/checkout  POST /billing/portal   POST /webhooks/  │
│  ┌──────────────────┐   ┌─────────────────┐    stripe           │
│  │ Create Checkout  │   │ Create Portal   │    ┌──────────────┐ │
│  │ Session          │   │ Session         │    │ Handle events│ │
│  │ → return URL     │   │ → return URL    │    │ → update DB  │ │
│  └────────┬─────────┘   └────────┬────────┘    └──────┬───────┘ │
│           │                      │                     │         │
│           │              ┌───────┴────────┐            │         │
│           │              │  PostgreSQL    │◄───────────┘         │
│           │              │  users.plan    │                      │
│           │              │  users.status  │                      │
│           │              └────────────────┘                      │
└───────────┼──────────────────────────────────────────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                           STRIPE                                 │
│                                                                  │
│  Checkout Session ──► Subscription ──► Invoices ──► Webhooks     │
│  (hosted page)        (recurring)      (auto)       (to Parcel)  │
│                                                                  │
│  Customer Portal ──► Self-service plan/payment management        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Env Vars Needed (add to Railway + .env)

```
STRIPE_SECRET_KEY=sk_test_...        # sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...      # From Stripe Dashboard or CLI
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_ANNUAL=price_...
```

### Python Dependency

```
# Add to backend/requirements.txt
stripe>=8.0.0
```

### Files to Create

```
backend/routers/billing.py        — Checkout + Portal session endpoints
backend/routers/webhooks.py       — Stripe webhook handler
backend/core/billing/access.py    — Plan gating logic (get_effective_plan, require_plan)
backend/core/billing/constants.py — PLAN_LIMITS dict, plan hierarchy
scripts/stripe_setup.py           — One-time product/price/coupon creation
```
