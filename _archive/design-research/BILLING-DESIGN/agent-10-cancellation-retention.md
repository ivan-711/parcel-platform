# Cancellation & Retention System Design for Parcel

> Design document — March 2026
> Covers: cancellation flow, save offers, pause subscription, downgrade behavior,
> win-back emails, reactivation, churn analytics, involuntary churn, backend API, frontend UI
>
> References:
> - `BILLING-RESEARCH/agent-07-churn-prevention.md` (churn signals, save flow benchmarks, dunning, win-back)
> - `BILLING-RESEARCH/agent-09-paywall-ux.md` (downgrade data policy, plan management page)

---

## Table of Contents

1. [Cancellation Flow](#1-cancellation-flow)
2. [Save Offers by Cancellation Reason](#2-save-offers-by-cancellation-reason)
3. [Pause Subscription Feature](#3-pause-subscription-feature)
4. [Downgrade Behavior](#4-downgrade-behavior)
5. [Cancellation Confirmation Email](#5-cancellation-confirmation-email)
6. [Win-Back Email Sequence](#6-win-back-email-sequence)
7. [Reactivation Flow](#7-reactivation-flow)
8. [Churn Feedback Analytics](#8-churn-feedback-analytics)
9. [Voluntary vs Involuntary Churn Handling](#9-voluntary-vs-involuntary-churn-handling)
10. [Backend: Cancellation API & Save Offer Logic](#10-backend-cancellation-api--save-offer-logic)
11. [Frontend: Cancellation Modal, Reason Survey, Save Offer UI](#11-frontend-cancellation-modal-reason-survey-save-offer-ui)
12. [Critical Decisions](#critical-decisions)

---

## 1. Cancellation Flow

### Overview

The cancellation experience is a five-step flow designed to retain users without resorting
to dark patterns. The user can always complete cancellation within three clicks if they
ignore every save offer. This complies with the FTC "click to cancel" rule (effective 2025)
and maintains trust.

```
Settings > Billing
    |
    v
"Cancel subscription" button (visible in DangerZone section)
    |
    v
Step 1: Reason Survey (single-select + optional free text)
    |
    v
Step 2: Targeted Save Offer (dynamic based on reason)
    |  --- user accepts offer --> subscription continues, flow ends
    |  --- user declines ---v
    v
Step 3: Pause Offer (always available regardless of reason)
    |  --- user accepts pause --> subscription paused, flow ends
    |  --- user declines ---v
    v
Step 4: Downgrade Confirmation (show data impact, confirm)
    |  --- user confirms --> subscription canceled at period end
    |  --- user cancels --> back to billing, flow ends
    v
Step 5: Post-Cancellation
    - Confirmation email sent
    - Win-back sequence begins (7d delay)
    - User downgraded to Free at period end
    - Data enters read-only grace period
```

### Design Principles

1. **Cancellation must be easy to find.** The button lives in Settings > Billing, clearly
   labeled "Cancel subscription." No hidden menus, no redirect to support chat.

2. **Never require a phone call.** The entire flow is self-serve within the modal. An
   optional "Talk to us" link is provided but never required.

3. **Always downgrade to Free, never hard-delete.** When a paid subscription ends, the
   user lands on the Free tier with their data preserved. This keeps win-back potential alive
   and costs Parcel nothing (Free users have minimal resource consumption).

4. **Log everything.** Every step of the cancellation flow is tracked: reason selected,
   save offer shown, save offer accepted/declined, pause offered, pause accepted/declined,
   final confirmation. This feeds the churn analytics dashboard.

5. **One modal, multi-step.** The entire flow happens inside a single modal (shadcn Dialog
   on desktop, Sheet side="bottom" on mobile). The user never leaves `/settings/billing`.
   Steps transition with Framer Motion AnimatePresence for smooth feel.

---

## 2. Save Offers by Cancellation Reason

Each cancellation reason triggers a specific, targeted save offer. The offer is shown once.
If declined, the user proceeds to the pause offer (Step 3). Save offers are never shown
again for the same subscription period (tracked in `cancellation_save_offers` table).

### Reason-to-Offer Matrix

| Reason | Offer | Stripe Implementation | Success Metric |
|--------|-------|-----------------------|----------------|
| "Too expensive" | 20% discount for 3 months | Apply coupon `RETENTION_20_3MO` to subscription | Acceptance rate target: 25-35% |
| "Not using it enough" | Pause for 1-3 months (user picks duration) | `stripe.subscriptions.update(pause_collection)` | Acceptance rate target: 30-40% |
| "Missing features I need" | Show roadmap highlights + 1 free month | Apply coupon `RETENTION_FREE_1MO` | Acceptance rate target: 15-20% |
| "Found a different tool" | Concierge onboarding call + 1 month free | Apply coupon + create Calendly booking | Acceptance rate target: 10-15% |
| "Temporary project ended" | Pause for 1-3 months | Same as "not using it enough" | Acceptance rate target: 35-45% |
| "Too hard to use" | 15-min onboarding call + 2-week extension | Extend trial/period + Calendly booking | Acceptance rate target: 15-25% |
| "Other" | Generic: switch to annual and save 20% | Show annual pricing comparison | Acceptance rate target: 10-15% |

### Offer Copy

**"Too expensive" offer:**
```
Title: "How about a lighter price?"
Body:  "We'd love to keep you on Parcel. Here's 20% off your plan
        for the next 3 months — that's {discounted_price}/mo instead
        of {current_price}/mo."
CTA:   "Accept 20% discount"
Secondary: "No thanks, continue canceling"
```

**"Not using it enough" offer:**
```
Title: "Take a break instead?"
Body:  "Pause your subscription for up to 3 months. Your data stays
        safe, no billing during the pause, and you can resume anytime.
        We'll send a reminder before it reactivates."
Options: [1 month] [2 months] [3 months]  (radio group)
CTA:   "Pause my subscription"
Secondary: "No thanks, continue canceling"
```

**"Missing features" offer:**
```
Title: "We're building fast"
Body:  "Here's what's coming to Parcel in the next 90 days:"
        - [Feature 1 from roadmap]
        - [Feature 2 from roadmap]
        - [Feature 3 from roadmap]
       "Stay for 1 month free while we ship these updates."
CTA:   "Stay for 1 free month"
Secondary: "These don't solve my problem — continue canceling"
Free-text: "What feature would keep you?" (textarea, optional)
```

**"Found a different tool" offer:**
```
Title: "Let us earn you back"
Body:  "We'd love to understand what the other tool does better.
        Book a free 15-minute call with our team — we'll personally
        help set up your workflow and show you features you might
        have missed. Plus, your next month is on us."
CTA:   "Book a call + get 1 month free"
Secondary: "No thanks, continue canceling"
Free-text: "Which tool are you switching to?" (input, optional — critical competitive data)
```

**"Temporary project ended" offer:**
```
Title: "Pause instead of canceling?"
Body:  "Since your project wrapped up, you can freeze your plan for
        1-3 months. When your next deal comes along, everything will
        be right where you left it — pipeline, analyses, documents."
Options: [1 month] [2 months] [3 months]
CTA:   "Pause my subscription"
Secondary: "No thanks, continue canceling"
```

**"Too hard to use" offer:**
```
Title: "Let us help"
Body:  "We're sorry Parcel hasn't been easy to use. Book a free
        15-minute walkthrough with our team — we'll get you set up
        properly. We'll also extend your current plan by 2 weeks."
CTA:   "Book a walkthrough"
Secondary: "No thanks, continue canceling"
```

### Save Offer Rules

- A user can only receive **one discount save offer per 12-month period**. If they
  accepted a discount last quarter and are trying to cancel again, skip straight to the
  pause offer. This prevents "cancel-to-discount" gaming.
- Pause offers have no cooldown since pausing is a neutral action.
- All accepted offers are logged in `cancellation_save_offers` with timestamps.
- The roadmap content in the "missing features" offer is pulled from a CMS or config
  file, not hardcoded, so it stays current.

---

## 3. Pause Subscription Feature

### How Pause Works

Pausing a subscription stops billing while preserving the user's data and plan. When the
pause ends, billing resumes automatically at the same rate and plan.

### Stripe Implementation

Stripe natively supports subscription pausing via the `pause_collection` parameter:

```python
# Backend: Pause a subscription
stripe.Subscription.modify(
    subscription_id,
    pause_collection={
        "behavior": "void",           # Don't invoice during pause
        "resumes_at": resume_timestamp # Unix timestamp when pause ends
    }
)
```

- `behavior: "void"` means no invoices are generated during the pause period.
- `resumes_at` is calculated as: `now + (pause_months * 30 days)`.
- When the pause ends, Stripe automatically resumes billing. No cron job needed.

### Pause Durations

| Duration | Resume Date | Use Case |
|----------|-------------|----------|
| 1 month | 30 days from now | "Taking a short break" |
| 2 months | 60 days from now | "Between projects" |
| 3 months | 90 days from now | "Seasonal investor, off-season" |

Maximum pause: 3 months. After 3 months, the user must either reactivate or cancel.
This prevents indefinite pauses that tie up resources without revenue.

### User Experience During Pause

- **Login:** User can still log in and access their data in **read-only mode**.
  They can view deals, pipeline, documents, and reports. They cannot create new
  analyses, upload documents, or modify pipeline cards.
- **Dashboard:** Shows a prominent banner: "Your subscription is paused until {date}.
  Resume anytime to unlock full access."
- **Resume early:** A "Resume subscription" button is always visible. Clicking it
  calls `stripe.Subscription.modify(pause_collection="")` to remove the pause.
- **Billing page:** Shows status as "Paused" with resume date and early-resume CTA.

### Pause Notifications

| Timing | Channel | Content |
|--------|---------|---------|
| Pause confirmed | Email | "Your Parcel subscription is paused until {date}" |
| 7 days before resume | Email | "Your Parcel subscription resumes in 7 days" |
| 3 days before resume | Email + in-app | "Resuming in 3 days — your card ending in {last4} will be charged {amount}" |
| Resume day | Email | "Welcome back! Your Parcel subscription is active again" |

### Backend Webhook Handling

```python
# Handle pause-related webhook events
@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    event = stripe.Webhook.construct_event(...)

    if event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        if sub.get("pause_collection"):
            # Subscription was paused
            await update_subscription_status(
                stripe_subscription_id=sub["id"],
                status="paused",
                paused_until=sub["pause_collection"]["resumes_at"]
            )
        elif not sub.get("pause_collection") and previous_was_paused:
            # Subscription was resumed (pause removed)
            await update_subscription_status(
                stripe_subscription_id=sub["id"],
                status="active"
            )
```

---

## 4. Downgrade Behavior

### What Happens When a Paid User Cancels (or Subscription Expires)

When cancellation is confirmed, the subscription is set to `cancel_at_period_end` in
Stripe. The user retains full paid access until their current billing period ends. After
that, they are downgraded to the Free tier.

### Data Policy: Read-Only Grace Period

All data above Free tier limits enters a **30-day read-only grace period**. After 30 days,
the data is not deleted but remains in cold storage — the user can reactivate their paid
plan at any time to regain full access.

| Data Type | Free Limit | What Happens to Excess |
|-----------|-----------|------------------------|
| Deal analyses | 5/month | Existing analyses remain viewable and exportable. Cannot create new analyses until at or below 5/month. |
| Pipeline deals | 10 active | All pipeline deals remain visible. Cannot add new deals. Can delete or archive deals to get under limit. Can move existing deals between stages. |
| Documents | 0 uploads/month | Previously uploaded documents remain viewable and downloadable. No new uploads allowed. |
| PDF reports | Previously generated | All existing reports remain downloadable. Cannot generate new reports (Pro feature). |
| AI chat | Basic only | Chat history preserved. Access limited to Free-tier AI (basic responses, no deep analysis). |
| Shared deal links | N/A on Free | Existing shared links remain active for 30 days post-downgrade, then auto-expire. |
| Offer letters | Pro feature | Existing letters remain viewable/downloadable. Cannot generate new ones. |
| Team members | N/A on Free | Team members lose access. Owner retains all data. Team members see "Your team plan has ended" on login. |

### Downgrade Confirmation Screen (Step 4 of Cancellation Flow)

Before final confirmation, the user sees a personalized impact summary showing their
actual data counts:

```
Title: "Here's what changes on the Free plan"

Impact summary:
  Your data:
    - 47 deal analyses (all preserved, read-only)
    - 12 active pipeline deals (limit: 10 — cannot add new deals)
    - 8 uploaded documents (all preserved, no new uploads)
    - 3 active shared links (expire in 30 days)

  Features you'll lose:
    x  Unlimited deal analyses (limited to 5/month)
    x  AI deep analysis & chat
    x  PDF report generation
    x  Document AI processing
    x  Offer letter generator
    x  Deal sharing links

  What stays:
    +  All your existing data (read-only for items above limit)
    +  Basic calculator access (5 analyses/month)
    +  Pipeline (up to 10 deals)
    +  Your account and login

  "Your data is always safe. Upgrade anytime to restore full access."

  [ ] "I understand my data will be preserved but some features will be locked"
      (checkbox required to enable confirm button)

  [Go back]  [Confirm cancellation]  (destructive variant, disabled until checkbox)
```

### Technical Implementation

The downgrade takes effect via Stripe's `cancel_at_period_end` flag:

```python
# Set subscription to cancel at end of current period
stripe.Subscription.modify(
    subscription_id,
    cancel_at_period_end=True
)
```

The backend webhook listener handles `customer.subscription.deleted` to actually
update the user's plan to "free":

```python
if event["type"] == "customer.subscription.deleted":
    sub = event["data"]["object"]
    user = await get_user_by_stripe_customer_id(sub["customer"])
    await downgrade_user_to_free(
        user_id=user.id,
        downgraded_at=datetime.utcnow(),
        grace_period_ends_at=datetime.utcnow() + timedelta(days=30)
    )
    await send_cancellation_confirmation_email(user)
    await schedule_winback_sequence(user)
```

---

## 5. Cancellation Confirmation Email

Sent immediately when the subscription is confirmed for cancellation (not when it
actually ends — the user should know immediately that their request was processed).

### Email Content

```
Subject: "Your Parcel subscription has been canceled"

Hi {first_name},

We've canceled your {plan_name} subscription. You'll still have full access
until {period_end_date}, and after that your account will switch to our
Free plan.

Here's what you keep:
  - All {deal_count} of your deal analyses (read-only)
  - Your pipeline with {pipeline_count} deals
  - {document_count} uploaded documents

Here's what you'll lose after {period_end_date}:
  - Unlimited analyses (limited to 5/month)
  - AI deep analysis
  - PDF report generation
  - Document processing

Changed your mind? You can reactivate anytime before {period_end_date}
and nothing changes:

  [Reactivate my subscription]  -->  /settings/billing?action=reactivate

We'd also love to hear what we could do better:
  [Share feedback]  -->  /feedback?source=cancellation

Your data is safe. We never delete your work.

— The Parcel team
```

### Win-Back Hook

The email includes two hooks:
1. **Reactivate CTA** — links to `/settings/billing?action=reactivate` which auto-opens
   the reactivation dialog on the billing page.
2. **Feedback link** — routes to a lightweight feedback form. Responses feed into the
   churn analytics system.

---

## 6. Win-Back Email Sequence

Six-email sequence targeting churned users at carefully spaced intervals. Each email
has a distinct strategy, escalating from empathy to discount to data-based urgency.

### Sequence Timeline

| Day | Email | Strategy | Offer |
|-----|-------|----------|-------|
| 7 | "We miss you already" | Empathy + light product update | None (pure goodwill) |
| 30 | "Here's what's new on Parcel" | Product update, new features shipped | 20% off for 2 months |
| 60 | "Your {deal_count} analyses are waiting" | Data-based emotional pull | 30% off for 3 months |
| 90 | "Investors are closing deals on Parcel" | Social proof + FOMO | Free month to try again |
| 180 | "Parcel has changed a lot" | Major product update pitch | 40% off annual plan |
| 365 | "One last thing" | Final re-engagement or sunset | Best offer: 50% off annual |

### Email Details

**Day 7 — "We miss you already"**
```
Subject: "Your Parcel data is safe"

No sales pitch. Just a genuine note:
- Confirm their data is preserved
- Mention 1-2 features shipped recently
- "If you ever want to come back, everything is right where you left it."
- No discount, no CTA to resubscribe (builds trust)
- Soft link: "See what's new" -> /changelog
```

**Day 30 — "Here's what's new"**
```
Subject: "{first_name}, here's what we've built since you left"

- 3-4 bullet points of new features/improvements
- Specifically address common cancellation reasons in product terms
  ("We made the pipeline faster" if UX was a reason, etc.)
- Offer: "Come back for 20% off your first 2 months"
- CTA: [Reactivate with 20% off] -> /reactivate?offer=WINBACK_20_2MO&uid={uid}
- Unsubscribe link (required, plus it builds trust)
```

**Day 60 — "Your analyses are waiting"**
```
Subject: "Your {deal_count} deal analyses miss you"

- Lead with their actual data: "{deal_count} analyses, {pipeline_count}
  pipeline deals, last active {last_active_date}"
- "The market has moved since you left — time to run new numbers?"
- Offer: "30% off for 3 months"
- CTA: [Reactivate with 30% off] -> /reactivate?offer=WINBACK_30_3MO&uid={uid}
```

**Day 90 — "Investors are closing deals"**
```
Subject: "Parcel investors analyzed {total_platform_deals} deals this month"

- Anonymized social proof: platform-wide deal volume
- Brief testimonial or case study snippet
- Offer: "Your first month is on us — no commitment"
- CTA: [Get 1 free month] -> /reactivate?offer=WINBACK_FREE_1MO&uid={uid}
```

**Day 180 — "Parcel has changed"**
```
Subject: "Parcel 2.0 — worth another look"

- Major product update framing (even if incremental)
- Screenshot or GIF of new features
- Offer: "40% off an annual plan"
- CTA: [See new Parcel + 40% off annual] -> /reactivate?offer=WINBACK_40_ANNUAL&uid={uid}
```

**Day 365 — "One last thing"**
```
Subject: "We'd love to have you back, {first_name}"

- Brief, respectful, final attempt
- Best offer: 50% off annual plan
- If no response, user is moved to "sunset" segment — no more win-back emails
- CTA: [Come back for 50% off] -> /reactivate?offer=WINBACK_50_ANNUAL&uid={uid}
- "If you'd rather not hear from us, no worries — [unsubscribe]"
```

### Implementation Notes

- Win-back emails are managed via a scheduled job system (e.g., Celery beat, or a
  lightweight cron + database queue). Each cancellation creates rows in a
  `winback_schedule` table with send dates.
- Emails stop immediately if the user reactivates (check subscription status before send).
- All win-back offer codes are single-use Stripe coupons tied to the user's customer ID.
- Track: email sent, email opened, link clicked, reactivated (with/without offer).
- Expected win-back rate: 8-12% within 90 days (industry benchmark for SMB SaaS).

---

## 7. Reactivation Flow

### One-Click Resubscribe from Win-Back Email

Win-back emails contain a deep link with an encoded offer:

```
/reactivate?offer=WINBACK_30_3MO&uid={signed_user_id}
```

The `uid` is a signed token (HMAC-SHA256 with server secret) — not a raw user ID — to
prevent URL tampering.

### Reactivation Flow

```
User clicks email CTA
    |
    v
/reactivate?offer=...&uid=...
    |
    +-- Not logged in --> redirect to /login?next=/reactivate&offer=...&uid=...
    +-- Logged in --> continue
    |
    v
ReactivationPage
    - Shows: "Welcome back, {name}!"
    - Shows: offer details ("30% off for 3 months on the Pro plan")
    - Shows: data summary ("Your 23 analyses and 8 pipeline deals are ready")
    - Shows: pricing comparison (original price vs discounted price)
    - CTA: "Reactivate Pro at {discounted_price}/mo"
    |
    v
POST /api/v1/billing/reactivate
    body: { offer_code: "WINBACK_30_3MO", plan: "pro", cycle: "monthly" }
    |
    +-- If user has existing Stripe customer --> create new subscription with coupon
    +-- If payment method on file --> charge immediately, activate
    +-- If no payment method --> redirect to Stripe Checkout with coupon pre-applied
    |
    v
Subscription active
    - Redirect to /dashboard
    - Show welcome-back success overlay
    - Toast: "Welcome back! Your Pro plan is active."
```

### Reactivation from Billing Page

Users can also reactivate from `/settings/billing` without an offer:

- If subscription is `cancel_at_period_end` (still in paid period): "Undo cancellation"
  button calls `stripe.Subscription.modify(cancel_at_period_end=False)`.
- If subscription has already ended (user is on Free): "Upgrade" buttons on the pricing
  table (same as new upgrade flow).
- If subscription is paused: "Resume now" button removes pause.

### Backend Endpoint

```python
@router.post("/api/v1/billing/reactivate")
async def reactivate_subscription(
    body: ReactivateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reactivate a canceled or expired subscription, optionally with a win-back offer.
    """
    # Validate offer code
    offer = None
    if body.offer_code:
        offer = await validate_winback_offer(body.offer_code, current_user.id)
        if not offer:
            raise HTTPException(400, "This offer has expired or already been used")

    # Check if user has a Stripe customer ID
    if not current_user.stripe_customer_id:
        raise HTTPException(400, "No billing account found — use /billing/checkout")

    # Check if there's an existing subscription that can be un-canceled
    existing_sub = stripe.Subscription.list(
        customer=current_user.stripe_customer_id,
        status="active",
        limit=1
    )
    if existing_sub.data and existing_sub.data[0].cancel_at_period_end:
        # Undo the pending cancellation
        stripe.Subscription.modify(
            existing_sub.data[0].id,
            cancel_at_period_end=False,
            coupon=offer.stripe_coupon_id if offer else None
        )
        await mark_offer_used(offer) if offer else None
        return {"status": "reactivated", "plan": body.plan}

    # No active subscription — create a new one via Checkout
    price_id = get_stripe_price_id(body.plan, body.cycle)
    session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        discounts=[{"coupon": offer.stripe_coupon_id}] if offer else [],
        success_url=f"{APP_URL}/settings/billing?reactivated=true",
        cancel_url=f"{APP_URL}/settings/billing",
    )
    await mark_offer_used(offer) if offer else None
    return {"checkout_url": session.url}
```

---

## 8. Churn Feedback Analytics

### Data Collection Points

Every interaction in the cancellation flow generates an event:

| Event | Data Collected |
|-------|---------------|
| `cancellation_started` | user_id, plan, tenure_months, timestamp |
| `cancellation_reason_selected` | user_id, reason_code, free_text (optional) |
| `save_offer_shown` | user_id, offer_type, offer_value |
| `save_offer_accepted` | user_id, offer_type |
| `save_offer_declined` | user_id, offer_type |
| `pause_offer_shown` | user_id |
| `pause_offer_accepted` | user_id, pause_duration_months |
| `pause_offer_declined` | user_id |
| `cancellation_confirmed` | user_id, plan, tenure_months, mrr_lost |
| `cancellation_aborted` | user_id, abort_step (1-4) |
| `winback_email_sent` | user_id, sequence_day, offer_code |
| `winback_email_opened` | user_id, sequence_day |
| `winback_link_clicked` | user_id, sequence_day, offer_code |
| `reactivation_completed` | user_id, plan, offer_code, source |

### Database Schema

```sql
-- Cancellation events log
CREATE TABLE cancellation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,       -- e.g., 'reason_selected', 'save_offer_declined'
    plan VARCHAR(20) NOT NULL,             -- plan at time of event
    reason_code VARCHAR(50),               -- only for reason_selected events
    reason_text TEXT,                       -- free-text elaboration
    offer_type VARCHAR(50),                -- e.g., 'discount_20_3mo', 'pause_2mo'
    offer_accepted BOOLEAN,
    metadata JSONB DEFAULT '{}',           -- flexible extra data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cancel_events_user ON cancellation_events(user_id);
CREATE INDEX idx_cancel_events_type ON cancellation_events(event_type);
CREATE INDEX idx_cancel_events_reason ON cancellation_events(reason_code);
CREATE INDEX idx_cancel_events_date ON cancellation_events(created_at);

-- Win-back schedule
CREATE TABLE winback_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    sequence_day INT NOT NULL,             -- 7, 30, 60, 90, 180, 365
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    offer_code VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, sent, canceled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_winback_user ON winback_schedule(user_id);
CREATE INDEX idx_winback_scheduled ON winback_schedule(scheduled_for, status);

-- Save offer tracking (for cooldown enforcement)
CREATE TABLE cancellation_save_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    offer_type VARCHAR(50) NOT NULL,
    offer_value VARCHAR(100),              -- e.g., "20% off 3 months"
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_coupon_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_save_offers_user ON cancellation_save_offers(user_id, created_at);
```

### Analytics Queries

**Churn reasons breakdown (last 30 days):**
```sql
SELECT
    reason_code,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM cancellation_events
WHERE event_type = 'reason_selected'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY reason_code
ORDER BY count DESC;
```

**Save offer effectiveness:**
```sql
SELECT
    offer_type,
    COUNT(*) FILTER (WHERE offer_accepted = true) as accepted,
    COUNT(*) FILTER (WHERE offer_accepted = false) as declined,
    ROUND(
        COUNT(*) FILTER (WHERE offer_accepted = true)::numeric /
        NULLIF(COUNT(*), 0) * 100, 1
    ) as acceptance_rate
FROM cancellation_events
WHERE event_type IN ('save_offer_accepted', 'save_offer_declined')
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY offer_type
ORDER BY acceptance_rate DESC;
```

**Monthly churn trend:**
```sql
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as cancellations,
    COUNT(*) FILTER (WHERE reason_code = 'too_expensive') as price_churn,
    COUNT(*) FILTER (WHERE reason_code = 'not_using') as engagement_churn,
    COUNT(*) FILTER (WHERE reason_code = 'found_alternative') as competitive_churn,
    COUNT(*) FILTER (WHERE reason_code = 'missing_features') as feature_churn
FROM cancellation_events
WHERE event_type = 'cancellation_confirmed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

**Win-back funnel:**
```sql
SELECT
    sequence_day,
    COUNT(*) as sent,
    COUNT(opened_at) as opened,
    COUNT(clicked_at) as clicked,
    ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as open_rate,
    ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(opened_at), 0) * 100, 1) as click_rate
FROM winback_schedule
WHERE status = 'sent'
  AND scheduled_for >= NOW() - INTERVAL '90 days'
GROUP BY sequence_day
ORDER BY sequence_day;
```

### Surfacing Trends

The admin dashboard (future) should display:
1. **Churn reasons pie chart** — updated weekly, shows percentage breakdown.
2. **Save offer effectiveness bar chart** — acceptance rate per offer type.
3. **Monthly churn trend line** — overall and by reason category.
4. **Win-back funnel** — conversion at each email in the sequence.
5. **Alerts** — if any single churn reason exceeds 40% share, flag it for product review.

For the MVP, these queries can be run manually via a SQL dashboard (e.g., Metabase,
which is free and self-hosted). The admin UI can come later.

---

## 9. Voluntary vs Involuntary Churn Handling

### Definitions

| Type | Cause | % of Total Churn | Recovery Strategy |
|------|-------|-------------------|-------------------|
| **Voluntary** | User actively cancels | ~60-65% | Save offers, pause, win-back emails |
| **Involuntary** | Failed payment, expired card | ~35-40% | Dunning, smart retry, pre-expiration alerts |

### Involuntary Churn: Dunning Sequence

Handled primarily by Stripe with custom email layers:

```
Day 0: Payment fails
  - Stripe: automatic retry (Smart Retries enabled)
  - Email: "Your payment didn't go through — update your card"
  - In-app: yellow banner on all pages with link to billing

Day 3: Second retry
  - Email: "Your Parcel access is at risk — update payment method"
  - In-app: orange banner, more urgent copy

Day 7: Third retry
  - Email: "Last chance — your plan downgrades in 3 days"
  - In-app: red banner with countdown

Day 10: Final retry + grace period ends
  - If all retries fail: downgrade to Free
  - Email: "Your plan has been downgraded — reactivate anytime"
  - In-app: "Reactivate Pro" CTA replaces the dunning banner
  - Do NOT hard-cancel. Downgrade to Free. Preserve all data.

Day 14: Follow-up
  - Email: "We saved your data — update your card to restore Pro access"
```

### Pre-Dunning: Card Expiration Alerts

```
7 days before card expires:
  Email: "Your card ending in {last4} expires on {exp_date}. Update it
          to avoid any interruption to your Parcel Pro access."
  CTA: [Update payment method] -> Stripe Customer Portal

3 days before card expires:
  In-app toast: "Your payment method expires soon. Update to avoid service
                 interruption."
  CTA: "Update card" -> Stripe Customer Portal
```

### Stripe Configuration

Enable in Stripe Dashboard (zero code):
- **Smart Retries**: ML-optimized retry timing (recovers ~10-15% more failures)
- **Automatic card updater**: Stripe contacts card networks to get updated card
  numbers when cards are renewed (recovers ~10-15% of failures automatically)
- **Grace period**: Set to 10 days in Stripe Billing settings

### Backend Implementation

```python
@router.post("/api/v1/billing/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)

    match event["type"]:
        case "invoice.payment_failed":
            invoice = event["data"]["object"]
            attempt_count = invoice["attempt_count"]
            customer_id = invoice["customer"]
            user = await get_user_by_stripe_customer(customer_id, db)

            # Log the failure
            await log_payment_failure(user.id, attempt_count, db)

            # Send appropriate dunning email based on attempt count
            if attempt_count == 1:
                await send_dunning_email(user, "gentle_reminder")
                await set_user_dunning_status(user.id, "past_due_gentle", db)
            elif attempt_count == 2:
                await send_dunning_email(user, "urgent_warning")
                await set_user_dunning_status(user.id, "past_due_urgent", db)
            elif attempt_count >= 3:
                await send_dunning_email(user, "final_notice")
                await set_user_dunning_status(user.id, "past_due_final", db)

        case "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            customer_id = invoice["customer"]
            user = await get_user_by_stripe_customer(customer_id, db)

            # Clear dunning status
            await set_user_dunning_status(user.id, None, db)

            # If this was a recovery from past_due, send relief email
            if user.dunning_status:
                await send_email(user, "payment_recovered")

        case "customer.subscription.deleted":
            sub = event["data"]["object"]
            customer_id = sub["customer"]
            user = await get_user_by_stripe_customer(customer_id, db)

            # Determine if voluntary or involuntary
            cancellation_type = (
                "involuntary" if sub.get("cancellation_details", {}).get("reason") == "payment_failed"
                else "voluntary"
            )

            await downgrade_user_to_free(user.id, db)
            await log_cancellation_event(
                user_id=user.id,
                event_type="cancellation_confirmed",
                metadata={"type": cancellation_type, "plan": sub["plan"]["nickname"]},
                db=db
            )

            if cancellation_type == "involuntary":
                await send_email(user, "involuntary_downgrade")
            # Voluntary cancellations already sent confirmation in Step 4

            await schedule_winback_sequence(user.id, db)
```

### Dunning Banner Component

```typescript
// In-app dunning banner — shown when user.dunning_status is set
// Rendered in AppShell between Topbar and <main>, same position as TrialBanner

interface DunningBannerProps {
  status: "past_due_gentle" | "past_due_urgent" | "past_due_final"
  daysUntilDowngrade: number
}

const DUNNING_CONFIG = {
  past_due_gentle: {
    bg: "bg-accent-warning/10",
    border: "border-accent-warning/20",
    icon: "AlertTriangle",
    iconColor: "text-accent-warning",
    message: "Your last payment didn't go through. Update your payment method to avoid interruption.",
  },
  past_due_urgent: {
    bg: "bg-accent-danger/10",
    border: "border-accent-danger/20",
    icon: "AlertTriangle",
    iconColor: "text-accent-danger",
    message: "Payment past due. Update your card within {days} days or your plan will be downgraded.",
  },
  past_due_final: {
    bg: "bg-accent-danger/15",
    border: "border-accent-danger/30",
    icon: "XCircle",
    iconColor: "text-accent-danger",
    message: "Final notice: your plan downgrades in {days} days. Update payment now.",
  },
} as const
```

---

## 10. Backend: Cancellation API & Save Offer Logic

### API Endpoints

```python
# backend/routers/billing.py

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta
import stripe

from database import get_db
from routers.auth import get_current_user
from models import User, CancellationEvent, CancellationSaveOffer, WinbackSchedule

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# ─── Schemas ───────────────────────────────────────────────────────

class CancellationReasonRequest(BaseModel):
    reason_code: Literal[
        "too_expensive",
        "not_using",
        "missing_features",
        "found_alternative",
        "temporary_project",
        "too_hard",
        "other",
    ]
    reason_text: Optional[str] = Field(None, max_length=1000)
    competitor_name: Optional[str] = Field(None, max_length=200)

class SaveOfferResponse(BaseModel):
    offer_type: str
    offer_title: str
    offer_body: str
    offer_cta: str
    offer_value: Optional[str] = None  # e.g., "20% off for 3 months"
    pause_options: Optional[list[int]] = None  # [1, 2, 3] for pause durations
    show_roadmap: bool = False
    show_calendly: bool = False
    roadmap_items: Optional[list[str]] = None

class AcceptSaveOfferRequest(BaseModel):
    offer_type: str
    pause_months: Optional[int] = Field(None, ge=1, le=3)
    feature_request: Optional[str] = Field(None, max_length=1000)

class ConfirmCancellationRequest(BaseModel):
    acknowledged: bool  # User confirmed they understand the impact

class CancellationImpactResponse(BaseModel):
    deal_count: int
    pipeline_count: int
    document_count: int
    shared_link_count: int
    team_member_count: int
    current_plan: str
    period_end: str
    features_lost: list[str]

class ReactivateRequest(BaseModel):
    plan: Literal["starter", "pro", "team"]
    cycle: Literal["monthly", "annual"]
    offer_code: Optional[str] = None

class PauseRequest(BaseModel):
    months: int = Field(ge=1, le=3)


# ─── Save Offer Logic ────────────────────────────────────────────

SAVE_OFFERS: dict[str, dict] = {
    "too_expensive": {
        "offer_type": "discount_20_3mo",
        "offer_title": "How about a lighter price?",
        "offer_body": "We'd love to keep you on Parcel. Here's 20% off your plan for the next 3 months.",
        "offer_cta": "Accept 20% discount",
        "offer_value": "20% off for 3 months",
        "stripe_coupon_id": "RETENTION_20_3MO",
        "show_roadmap": False,
        "show_calendly": False,
    },
    "not_using": {
        "offer_type": "pause",
        "offer_title": "Take a break instead?",
        "offer_body": "Pause your subscription for up to 3 months. Your data stays safe, no billing during the pause, and you can resume anytime.",
        "offer_cta": "Pause my subscription",
        "pause_options": [1, 2, 3],
        "show_roadmap": False,
        "show_calendly": False,
    },
    "missing_features": {
        "offer_type": "free_month_roadmap",
        "offer_title": "We're building fast",
        "offer_body": "Here's what's coming to Parcel in the next 90 days. Stay for 1 month free while we ship these updates.",
        "offer_cta": "Stay for 1 free month",
        "offer_value": "1 month free",
        "stripe_coupon_id": "RETENTION_FREE_1MO",
        "show_roadmap": True,
        "show_calendly": False,
    },
    "found_alternative": {
        "offer_type": "concierge_free_month",
        "offer_title": "Let us earn you back",
        "offer_body": "Book a free 15-minute call with our team — we'll personally help set up your workflow and show you features you might have missed. Plus, your next month is on us.",
        "offer_cta": "Book a call + get 1 month free",
        "offer_value": "Concierge call + 1 month free",
        "stripe_coupon_id": "RETENTION_FREE_1MO",
        "show_roadmap": False,
        "show_calendly": True,
    },
    "temporary_project": {
        "offer_type": "pause",
        "offer_title": "Pause instead of canceling?",
        "offer_body": "Since your project wrapped up, freeze your plan for 1-3 months. When your next deal comes along, everything will be right where you left it.",
        "offer_cta": "Pause my subscription",
        "pause_options": [1, 2, 3],
        "show_roadmap": False,
        "show_calendly": False,
    },
    "too_hard": {
        "offer_type": "onboarding_extension",
        "offer_title": "Let us help",
        "offer_body": "We're sorry Parcel hasn't been easy to use. Book a free 15-minute walkthrough with our team — we'll get you set up properly and extend your plan by 2 weeks.",
        "offer_cta": "Book a walkthrough",
        "offer_value": "Walkthrough + 2 week extension",
        "show_roadmap": False,
        "show_calendly": True,
    },
    "other": {
        "offer_type": "annual_switch",
        "offer_title": "Save with annual billing?",
        "offer_body": "Switch to annual billing and save 20% — that's 2 months free every year.",
        "offer_cta": "Switch to annual",
        "offer_value": "20% off with annual billing",
        "show_roadmap": False,
        "show_calendly": False,
    },
}

# Roadmap items — update these regularly from a config or CMS
ROADMAP_ITEMS = [
    "Market data integration with live comps and rental rates",
    "Bulk deal import from CSV and PropStream",
    "Mobile app for on-the-go analysis",
    "Automated deal alerts based on your criteria",
]


# ─── Endpoints ────────────────────────────────────────────────────

@router.get("/cancellation/impact", response_model=CancellationImpactResponse)
async def get_cancellation_impact(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns what the user will lose if they cancel.
    Called when the cancellation modal opens to populate Step 4.
    """
    deal_count = db.query(Deal).filter(
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None)
    ).count()

    pipeline_count = db.query(PipelineCard).filter(
        PipelineCard.user_id == current_user.id,
        PipelineCard.deleted_at.is_(None)
    ).count()

    document_count = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None)
    ).count()

    shared_link_count = db.query(SharedDeal).filter(
        SharedDeal.user_id == current_user.id,
        SharedDeal.expires_at > datetime.utcnow()
    ).count()

    team_member_count = 0
    if current_user.team_id:
        team_member_count = db.query(User).filter(
            User.team_id == current_user.team_id,
            User.id != current_user.id
        ).count()

    # Determine features lost based on current plan
    features_lost_map = {
        "starter": [
            "15 analyses/month (limited to 5)",
            "Advanced AI chat",
        ],
        "pro": [
            "Unlimited analyses (limited to 5/month)",
            "AI deep analysis & chat",
            "PDF report generation",
            "Document AI processing",
            "Offer letter generator",
            "Deal sharing links",
        ],
        "team": [
            "Unlimited analyses (limited to 5/month)",
            "AI deep analysis & chat",
            "PDF report generation",
            "Document AI processing",
            "Offer letter generator",
            "Deal sharing links",
            "Team access for {n} members".format(n=team_member_count),
            "Shared pipeline",
            "Team analytics",
        ],
    }

    subscription = stripe.Subscription.retrieve(current_user.stripe_subscription_id)

    return CancellationImpactResponse(
        deal_count=deal_count,
        pipeline_count=pipeline_count,
        document_count=document_count,
        shared_link_count=shared_link_count,
        team_member_count=team_member_count,
        current_plan=current_user.plan,
        period_end=datetime.fromtimestamp(subscription.current_period_end).isoformat(),
        features_lost=features_lost_map.get(current_user.plan, []),
    )


@router.post("/cancellation/reason", response_model=SaveOfferResponse)
async def submit_cancellation_reason(
    body: CancellationReasonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 1: User selects a reason. Returns the targeted save offer for Step 2.
    Also logs the cancellation reason event.
    """
    # Log the reason event
    event = CancellationEvent(
        user_id=current_user.id,
        event_type="reason_selected",
        plan=current_user.plan,
        reason_code=body.reason_code,
        reason_text=body.reason_text,
        metadata={"competitor_name": body.competitor_name} if body.competitor_name else {},
    )
    db.add(event)

    # Check if user already received a discount offer in the last 12 months
    recent_discount = db.query(CancellationSaveOffer).filter(
        CancellationSaveOffer.user_id == current_user.id,
        CancellationSaveOffer.accepted == True,
        CancellationSaveOffer.offer_type.in_(["discount_20_3mo", "free_month_roadmap", "concierge_free_month"]),
        CancellationSaveOffer.created_at >= datetime.utcnow() - timedelta(days=365),
    ).first()

    offer_config = SAVE_OFFERS.get(body.reason_code, SAVE_OFFERS["other"])

    # If they recently accepted a discount, skip discount offers and go to pause
    is_discount_offer = offer_config["offer_type"] in ["discount_20_3mo", "free_month_roadmap", "concierge_free_month"]
    if recent_discount and is_discount_offer:
        offer_config = SAVE_OFFERS["not_using"]  # Fall back to pause offer

    # Log that a save offer was shown
    db.add(CancellationEvent(
        user_id=current_user.id,
        event_type="save_offer_shown",
        plan=current_user.plan,
        offer_type=offer_config["offer_type"],
    ))
    db.commit()

    # Calculate discounted price for display
    offer_value = offer_config.get("offer_value")
    if offer_config["offer_type"] == "discount_20_3mo":
        current_price = {"starter": 29, "pro": 69, "team": 149}.get(current_user.plan, 0)
        discounted = round(current_price * 0.8)
        offer_value = f"${discounted}/mo for 3 months (was ${current_price}/mo)"

    return SaveOfferResponse(
        offer_type=offer_config["offer_type"],
        offer_title=offer_config["offer_title"],
        offer_body=offer_config["offer_body"],
        offer_cta=offer_config["offer_cta"],
        offer_value=offer_value,
        pause_options=offer_config.get("pause_options"),
        show_roadmap=offer_config["show_roadmap"],
        show_calendly=offer_config["show_calendly"],
        roadmap_items=ROADMAP_ITEMS if offer_config["show_roadmap"] else None,
    )


@router.post("/cancellation/accept-offer")
async def accept_save_offer(
    body: AcceptSaveOfferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 2 (accept path): User accepts the save offer.
    Applies the discount/pause and cancels the cancellation flow.
    """
    offer_config = None
    for config in SAVE_OFFERS.values():
        if config["offer_type"] == body.offer_type:
            offer_config = config
            break

    if not offer_config:
        raise HTTPException(400, "Invalid offer type")

    subscription_id = current_user.stripe_subscription_id
    if not subscription_id:
        raise HTTPException(400, "No active subscription found")

    # Apply the offer based on type
    if body.offer_type == "discount_20_3mo":
        stripe.Subscription.modify(
            subscription_id,
            coupon=offer_config["stripe_coupon_id"],
        )

    elif body.offer_type == "pause":
        if not body.pause_months:
            raise HTTPException(400, "pause_months required for pause offers")
        resume_at = int((datetime.utcnow() + timedelta(days=body.pause_months * 30)).timestamp())
        stripe.Subscription.modify(
            subscription_id,
            pause_collection={"behavior": "void", "resumes_at": resume_at},
        )

    elif body.offer_type == "free_month_roadmap":
        stripe.Subscription.modify(
            subscription_id,
            coupon=offer_config["stripe_coupon_id"],
        )

    elif body.offer_type == "concierge_free_month":
        stripe.Subscription.modify(
            subscription_id,
            coupon=offer_config["stripe_coupon_id"],
        )
        # The Calendly booking is handled client-side via the Calendly URL

    elif body.offer_type == "onboarding_extension":
        # Extend the current period by 2 weeks
        current_sub = stripe.Subscription.retrieve(subscription_id)
        new_end = current_sub.current_period_end + (14 * 86400)  # 14 days in seconds
        stripe.Subscription.modify(
            subscription_id,
            trial_end=new_end,
            proration_behavior="none",
        )

    elif body.offer_type == "annual_switch":
        # Switch to annual billing
        current_sub = stripe.Subscription.retrieve(subscription_id)
        annual_price_id = get_annual_price_id(current_user.plan)
        stripe.Subscription.modify(
            subscription_id,
            items=[{"id": current_sub["items"]["data"][0].id, "price": annual_price_id}],
            proration_behavior="create_prorations",
        )

    # Log acceptance
    db.add(CancellationEvent(
        user_id=current_user.id,
        event_type="save_offer_accepted",
        plan=current_user.plan,
        offer_type=body.offer_type,
        offer_accepted=True,
    ))
    db.add(CancellationSaveOffer(
        user_id=current_user.id,
        offer_type=body.offer_type,
        offer_value=offer_config.get("offer_value", ""),
        accepted=True,
        stripe_coupon_id=offer_config.get("stripe_coupon_id"),
    ))

    # Log optional feature request
    if body.feature_request:
        db.add(CancellationEvent(
            user_id=current_user.id,
            event_type="feature_request",
            plan=current_user.plan,
            reason_text=body.feature_request,
        ))

    db.commit()

    return {"status": "offer_accepted", "offer_type": body.offer_type}


@router.post("/cancellation/decline-offer")
async def decline_save_offer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 2 (decline path): User declines the save offer.
    Logs the decline. Frontend advances to Step 3 (pause offer).
    """
    db.add(CancellationEvent(
        user_id=current_user.id,
        event_type="save_offer_declined",
        plan=current_user.plan,
        offer_accepted=False,
    ))
    db.commit()
    return {"status": "offer_declined", "next_step": "pause_offer"}


@router.post("/cancellation/pause")
async def pause_subscription(
    body: PauseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 3 (accept path): User chooses to pause instead of cancel.
    """
    subscription_id = current_user.stripe_subscription_id
    if not subscription_id:
        raise HTTPException(400, "No active subscription found")

    resume_at = int((datetime.utcnow() + timedelta(days=body.months * 30)).timestamp())

    stripe.Subscription.modify(
        subscription_id,
        pause_collection={"behavior": "void", "resumes_at": resume_at},
    )

    db.add(CancellationEvent(
        user_id=current_user.id,
        event_type="pause_offer_accepted",
        plan=current_user.plan,
        metadata={"pause_months": body.months},
    ))
    db.commit()

    # Send pause confirmation email
    await send_pause_confirmation_email(
        user=current_user,
        resume_date=datetime.utcfromtimestamp(resume_at),
    )

    return {
        "status": "paused",
        "resume_date": datetime.utcfromtimestamp(resume_at).isoformat(),
    }


@router.post("/cancellation/confirm")
async def confirm_cancellation(
    body: ConfirmCancellationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 4: Final confirmation. Sets subscription to cancel at period end.
    """
    if not body.acknowledged:
        raise HTTPException(400, "You must acknowledge the cancellation impact")

    subscription_id = current_user.stripe_subscription_id
    if not subscription_id:
        raise HTTPException(400, "No active subscription found")

    # Set to cancel at end of current billing period
    subscription = stripe.Subscription.modify(
        subscription_id,
        cancel_at_period_end=True,
    )

    # Log the cancellation
    db.add(CancellationEvent(
        user_id=current_user.id,
        event_type="cancellation_confirmed",
        plan=current_user.plan,
        metadata={
            "period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            "type": "voluntary",
        },
    ))
    db.commit()

    # Send confirmation email
    await send_cancellation_confirmation_email(current_user, subscription)

    # Schedule win-back email sequence
    await schedule_winback_sequence(current_user.id, db)

    return {
        "status": "cancellation_scheduled",
        "effective_date": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
    }


@router.post("/cancellation/undo")
async def undo_cancellation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Undo a pending cancellation (before the period ends).
    """
    subscription_id = current_user.stripe_subscription_id
    if not subscription_id:
        raise HTTPException(400, "No active subscription found")

    subscription = stripe.Subscription.retrieve(subscription_id)
    if not subscription.cancel_at_period_end:
        raise HTTPException(400, "Subscription is not pending cancellation")

    stripe.Subscription.modify(subscription_id, cancel_at_period_end=False)

    # Cancel scheduled win-back emails
    db.query(WinbackSchedule).filter(
        WinbackSchedule.user_id == current_user.id,
        WinbackSchedule.status == "pending",
    ).update({"status": "canceled"})

    db.add(CancellationEvent(
        user_id=current_user.id,
        event_type="cancellation_undone",
        plan=current_user.plan,
    ))
    db.commit()

    return {"status": "cancellation_reversed"}


@router.post("/reactivate")
async def reactivate_subscription(
    body: ReactivateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reactivate a canceled or expired subscription, optionally with a win-back offer.
    """
    # Validate offer code if provided
    coupon_id = None
    if body.offer_code:
        offer = await validate_winback_offer(body.offer_code, current_user.id, db)
        if not offer:
            raise HTTPException(400, "This offer has expired or already been used")
        coupon_id = offer.stripe_coupon_id

    customer_id = current_user.stripe_customer_id
    if not customer_id:
        raise HTTPException(400, "No billing account found — use /billing/checkout instead")

    # Check for existing subscription that can be un-canceled
    subscriptions = stripe.Subscription.list(customer=customer_id, limit=1)
    if subscriptions.data:
        sub = subscriptions.data[0]
        if sub.status == "active" and sub.cancel_at_period_end:
            # Undo pending cancellation
            stripe.Subscription.modify(sub.id, cancel_at_period_end=False)
            if coupon_id:
                stripe.Subscription.modify(sub.id, coupon=coupon_id)
            await mark_offer_used(body.offer_code, current_user.id, db) if body.offer_code else None

            # Cancel win-back sequence
            db.query(WinbackSchedule).filter(
                WinbackSchedule.user_id == current_user.id,
                WinbackSchedule.status == "pending",
            ).update({"status": "canceled"})

            db.add(CancellationEvent(
                user_id=current_user.id,
                event_type="reactivation_completed",
                plan=body.plan,
                metadata={"source": "reactivate_endpoint", "offer_code": body.offer_code},
            ))
            db.commit()

            return {"status": "reactivated", "plan": body.plan}

    # No active subscription — create new one via Checkout
    price_id = get_stripe_price_id(body.plan, body.cycle)
    checkout_params = {
        "customer": customer_id,
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{APP_URL}/settings/billing?reactivated=true",
        "cancel_url": f"{APP_URL}/settings/billing",
    }
    if coupon_id:
        checkout_params["discounts"] = [{"coupon": coupon_id}]

    session = stripe.checkout.Session.create(**checkout_params)

    await mark_offer_used(body.offer_code, current_user.id, db) if body.offer_code else None

    return {"checkout_url": session.url}


# ─── Helpers ──────────────────────────────────────────────────────

async def schedule_winback_sequence(user_id: str, db: Session):
    """Create the win-back email schedule entries."""
    now = datetime.utcnow()
    sequence = [
        (7, None),
        (30, "WINBACK_20_2MO"),
        (60, "WINBACK_30_3MO"),
        (90, "WINBACK_FREE_1MO"),
        (180, "WINBACK_40_ANNUAL"),
        (365, "WINBACK_50_ANNUAL"),
    ]
    for day, offer_code in sequence:
        db.add(WinbackSchedule(
            user_id=user_id,
            sequence_day=day,
            scheduled_for=now + timedelta(days=day),
            offer_code=offer_code,
            status="pending",
        ))
    db.commit()


async def validate_winback_offer(offer_code: str, user_id: str, db: Session):
    """Check if a win-back offer is valid and unused."""
    schedule = db.query(WinbackSchedule).filter(
        WinbackSchedule.user_id == user_id,
        WinbackSchedule.offer_code == offer_code,
        WinbackSchedule.status == "sent",
    ).first()
    if not schedule:
        return None

    # Map offer codes to Stripe coupon IDs
    coupon_map = {
        "WINBACK_20_2MO": "WINBACK_20_2MO",
        "WINBACK_30_3MO": "WINBACK_30_3MO",
        "WINBACK_FREE_1MO": "WINBACK_FREE_1MO",
        "WINBACK_40_ANNUAL": "WINBACK_40_ANNUAL",
        "WINBACK_50_ANNUAL": "WINBACK_50_ANNUAL",
    }

    class OfferInfo:
        def __init__(self, stripe_coupon_id):
            self.stripe_coupon_id = stripe_coupon_id

    return OfferInfo(coupon_map.get(offer_code, offer_code))


async def mark_offer_used(offer_code: str, user_id: str, db: Session):
    """Mark a win-back offer as used."""
    db.query(WinbackSchedule).filter(
        WinbackSchedule.user_id == user_id,
        WinbackSchedule.offer_code == offer_code,
    ).update({"status": "used"})
    db.commit()


def get_stripe_price_id(plan: str, cycle: str) -> str:
    """Map plan + cycle to Stripe Price ID. Configured via env vars."""
    import os
    key = f"STRIPE_PRICE_{plan.upper()}_{cycle.upper()}"
    price_id = os.getenv(key)
    if not price_id:
        raise HTTPException(500, f"Missing Stripe price configuration: {key}")
    return price_id


def get_annual_price_id(plan: str) -> str:
    """Get the annual price ID for a given plan."""
    return get_stripe_price_id(plan, "annual")
```

### Environment Variables Required

```bash
# Stripe Price IDs (set in Railway environment)
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_ANNUAL=price_xxx

# Stripe Coupon IDs (create these in Stripe Dashboard)
# RETENTION_20_3MO    — 20% off, 3-month duration, repeating
# RETENTION_FREE_1MO  — 100% off, 1-month duration, once
# WINBACK_20_2MO      — 20% off, 2-month duration, repeating
# WINBACK_30_3MO      — 30% off, 3-month duration, repeating
# WINBACK_FREE_1MO    — 100% off, 1-month duration, once
# WINBACK_40_ANNUAL   — 40% off, forever (annual plans only)
# WINBACK_50_ANNUAL   — 50% off, forever (annual plans only)

# Calendly link for concierge/onboarding calls
CALENDLY_BOOKING_URL=https://calendly.com/parcel-team/onboarding
```

---

## 11. Frontend: Cancellation Modal, Reason Survey, Save Offer UI

### Component Architecture

```
CancellationFlow (orchestrator)
  ├── Step 1: CancellationReasonStep
  ├── Step 2: SaveOfferStep
  ├── Step 3: PauseOfferStep
  ├── Step 4: ConfirmCancellationStep
  └── Step 5: CancellationSuccessStep
```

All steps render inside a single modal (shadcn Dialog on desktop, Sheet on mobile).
Transitions between steps use Framer Motion AnimatePresence with a horizontal slide.

### Full Component Implementation

```tsx
// frontend/src/components/billing/CancellationFlow.tsx

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CircleDollarSign,
  Lightbulb,
  Pause,
  Search,
  Timer,
  HelpCircle,
  X,
  Sparkles,
  Lock,
  FileText,
  MessageSquare,
  Upload,
  Users,
  Link2,
} from "lucide-react"
import { api } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────

type CancellationReason =
  | "too_expensive"
  | "not_using"
  | "missing_features"
  | "found_alternative"
  | "temporary_project"
  | "too_hard"
  | "other"

type Step = "reason" | "save_offer" | "pause_offer" | "confirm" | "success"

interface SaveOffer {
  offer_type: string
  offer_title: string
  offer_body: string
  offer_cta: string
  offer_value: string | null
  pause_options: number[] | null
  show_roadmap: boolean
  show_calendly: boolean
  roadmap_items: string[] | null
}

interface CancellationImpact {
  deal_count: number
  pipeline_count: number
  document_count: number
  shared_link_count: number
  team_member_count: number
  current_plan: string
  period_end: string
  features_lost: string[]
}

interface CancellationFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCanceled: () => void
}

// ─── Reason Options ───────────────────────────────────────────────

const REASONS: { value: CancellationReason; label: string; icon: typeof AlertTriangle }[] = [
  { value: "too_expensive", label: "It's too expensive", icon: CircleDollarSign },
  { value: "not_using", label: "I'm not using it enough", icon: Timer },
  { value: "missing_features", label: "Missing features I need", icon: Lightbulb },
  { value: "found_alternative", label: "Found a different tool", icon: Search },
  { value: "temporary_project", label: "My project ended", icon: Calendar },
  { value: "too_hard", label: "It's too hard to use", icon: HelpCircle },
  { value: "other", label: "Other reason", icon: HelpCircle },
]

// ─── Slide Animation ──────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

// ─── Main Component ───────────────────────────────────────────────

export function CancellationFlow({ open, onOpenChange, onCanceled }: CancellationFlowProps) {
  const [step, setStep] = useState<Step>("reason")
  const [direction, setDirection] = useState(1)
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null)
  const [reasonText, setReasonText] = useState("")
  const [competitorName, setCompetitorName] = useState("")
  const [saveOffer, setSaveOffer] = useState<SaveOffer | null>(null)
  const [pauseMonths, setPauseMonths] = useState(1)
  const [acknowledged, setAcknowledged] = useState(false)
  const [featureRequest, setFeatureRequest] = useState("")

  // Fetch cancellation impact data
  const { data: impact } = useQuery<CancellationImpact>({
    queryKey: ["cancellation-impact"],
    queryFn: () => api.get("/api/v1/billing/cancellation/impact"),
    enabled: open,
  })

  // Submit reason and get save offer
  const submitReason = useMutation({
    mutationFn: (data: { reason_code: CancellationReason; reason_text?: string; competitor_name?: string }) =>
      api.post("/api/v1/billing/cancellation/reason", data),
    onSuccess: (data: SaveOffer) => {
      setSaveOffer(data)
      goTo("save_offer")
    },
  })

  // Accept save offer
  const acceptOffer = useMutation({
    mutationFn: (data: { offer_type: string; pause_months?: number; feature_request?: string }) =>
      api.post("/api/v1/billing/cancellation/accept-offer", data),
    onSuccess: () => {
      goTo("success")
    },
  })

  // Decline save offer
  const declineOffer = useMutation({
    mutationFn: () => api.post("/api/v1/billing/cancellation/decline-offer", {}),
    onSuccess: () => {
      goTo("pause_offer")
    },
  })

  // Pause subscription
  const pauseSubscription = useMutation({
    mutationFn: (months: number) =>
      api.post("/api/v1/billing/cancellation/pause", { months }),
    onSuccess: () => {
      goTo("success")
    },
  })

  // Confirm cancellation
  const confirmCancellation = useMutation({
    mutationFn: () =>
      api.post("/api/v1/billing/cancellation/confirm", { acknowledged: true }),
    onSuccess: () => {
      onCanceled()
      goTo("success")
    },
  })

  const goTo = useCallback((nextStep: Step) => {
    const order: Step[] = ["reason", "save_offer", "pause_offer", "confirm", "success"]
    const currentIdx = order.indexOf(step)
    const nextIdx = order.indexOf(nextStep)
    setDirection(nextIdx > currentIdx ? 1 : -1)
    setStep(nextStep)
  }, [step])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset state after close animation
    setTimeout(() => {
      setStep("reason")
      setSelectedReason(null)
      setReasonText("")
      setCompetitorName("")
      setSaveOffer(null)
      setPauseMonths(1)
      setAcknowledged(false)
      setFeatureRequest("")
    }, 300)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] bg-app-surface border-border-subtle p-0 overflow-hidden">
        {/* Progress indicator */}
        <div className="flex gap-1 px-6 pt-6">
          {["reason", "save_offer", "pause_offer", "confirm"].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                step === s || ["save_offer", "pause_offer", "confirm", "success"].indexOf(step) >
                  ["reason", "save_offer", "pause_offer", "confirm"].indexOf(s)
                  ? "bg-accent-primary"
                  : "bg-app-elevated"
              )}
            />
          ))}
        </div>

        {/* Step content with AnimatePresence */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="px-6 pb-6"
            >
              {/* ─── Step 1: Reason Survey ─────────────────── */}
              {step === "reason" && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-text-primary">
                      We're sorry to see you go
                    </DialogTitle>
                    <p className="text-sm text-text-secondary mt-1">
                      Help us improve by sharing why you're leaving.
                    </p>
                  </DialogHeader>

                  <div className="space-y-2">
                    {REASONS.map((reason) => {
                      const Icon = reason.icon
                      return (
                        <button
                          key={reason.value}
                          type="button"
                          onClick={() => setSelectedReason(reason.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-150 text-left",
                            selectedReason === reason.value
                              ? "border-accent-primary bg-accent-primary/5 text-text-primary"
                              : "border-border-subtle bg-transparent text-text-secondary hover:border-border-default hover:text-text-primary"
                          )}
                        >
                          <Icon size={18} className={cn(
                            selectedReason === reason.value ? "text-accent-primary" : "text-text-muted"
                          )} />
                          <span className="text-sm">{reason.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Conditional free-text fields */}
                  {selectedReason === "found_alternative" && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-text-muted">Which tool? (optional)</label>
                      <input
                        type="text"
                        value={competitorName}
                        onChange={(e) => setCompetitorName(e.target.value)}
                        placeholder="e.g., DealCheck, PropStream"
                        className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-app-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      />
                    </div>
                  )}

                  {(selectedReason === "other" || selectedReason === "missing_features") && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-text-muted">
                        {selectedReason === "missing_features" ? "What feature would keep you?" : "Tell us more"} (optional)
                      </label>
                      <textarea
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        rows={2}
                        placeholder="Your feedback helps us improve..."
                        className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-app-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={handleClose}>
                      Never mind
                    </Button>
                    <Button
                      onClick={() => {
                        if (!selectedReason) return
                        submitReason.mutate({
                          reason_code: selectedReason,
                          reason_text: reasonText || undefined,
                          competitor_name: competitorName || undefined,
                        })
                      }}
                      disabled={!selectedReason || submitReason.isPending}
                      className="bg-accent-primary hover:bg-accent-primary/90"
                    >
                      {submitReason.isPending ? "..." : "Continue"}
                      <ArrowRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Step 2: Save Offer ────────────────────── */}
              {step === "save_offer" && saveOffer && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-text-primary">
                      {saveOffer.offer_title}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-5 space-y-4">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {saveOffer.offer_body}
                    </p>

                    {saveOffer.offer_value && (
                      <div className="flex items-center gap-2 text-sm font-medium text-accent-primary">
                        <Sparkles size={16} />
                        <span>{saveOffer.offer_value}</span>
                      </div>
                    )}

                    {/* Roadmap items for "missing features" */}
                    {saveOffer.show_roadmap && saveOffer.roadmap_items && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                          Coming soon
                        </p>
                        {saveOffer.roadmap_items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check size={14} className="text-accent-success mt-0.5 shrink-0" />
                            <span className="text-sm text-text-secondary">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pause duration selector */}
                    {saveOffer.pause_options && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs text-text-muted">Pause duration:</p>
                        <div className="flex gap-2">
                          {saveOffer.pause_options.map((months) => (
                            <button
                              key={months}
                              type="button"
                              onClick={() => setPauseMonths(months)}
                              className={cn(
                                "flex-1 py-2 rounded-lg border text-sm font-medium transition-all duration-150",
                                pauseMonths === months
                                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                                  : "border-border-subtle text-text-secondary hover:border-border-default"
                              )}
                            >
                              {months} {months === 1 ? "month" : "months"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feature request textarea for "missing features" */}
                    {saveOffer.show_roadmap && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-text-muted">What feature would keep you? (optional)</label>
                        <textarea
                          value={featureRequest}
                          onChange={(e) => setFeatureRequest(e.target.value)}
                          rows={2}
                          placeholder="Tell us what you need..."
                          className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-app-bg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                        />
                      </div>
                    )}

                    {/* Calendly link for "found alternative" and "too hard" */}
                    {saveOffer.show_calendly && (
                      <a
                        href={import.meta.env.VITE_CALENDLY_URL ?? "https://calendly.com/parcel-team/onboarding"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-accent-primary hover:underline"
                      >
                        <Calendar size={14} />
                        Book your free call
                      </a>
                    )}
                  </div>

                  <div className="flex justify-between gap-3 pt-2">
                    <Button variant="ghost" onClick={() => goTo("reason")}>
                      <ArrowLeft size={16} className="mr-1" />
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => declineOffer.mutate()}
                        disabled={declineOffer.isPending}
                        className="text-text-secondary"
                      >
                        No thanks
                      </Button>
                      <Button
                        onClick={() => {
                          acceptOffer.mutate({
                            offer_type: saveOffer.offer_type,
                            pause_months: saveOffer.pause_options ? pauseMonths : undefined,
                            feature_request: featureRequest || undefined,
                          })
                        }}
                        disabled={acceptOffer.isPending}
                        className="bg-accent-primary hover:bg-accent-primary/90"
                      >
                        {acceptOffer.isPending ? "..." : saveOffer.offer_cta}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 3: Pause Offer ───────────────────── */}
              {step === "pause_offer" && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-text-primary">
                      How about a pause?
                    </DialogTitle>
                    <p className="text-sm text-text-secondary mt-1">
                      Pause your subscription instead of canceling. Your data stays safe,
                      no charges during the pause, and you can resume anytime.
                    </p>
                  </DialogHeader>

                  <div className="rounded-xl border border-border-subtle bg-app-elevated p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
                        <Pause size={20} className="text-accent-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Pause your plan</p>
                        <p className="text-xs text-text-muted">Pick how long you need a break</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {[1, 2, 3].map((months) => (
                        <button
                          key={months}
                          type="button"
                          onClick={() => setPauseMonths(months)}
                          className={cn(
                            "flex-1 py-3 rounded-lg border text-sm font-medium transition-all duration-150",
                            pauseMonths === months
                              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                              : "border-border-subtle text-text-secondary hover:border-border-default"
                          )}
                        >
                          {months} {months === 1 ? "month" : "months"}
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-text-muted space-y-1">
                      <p>During the pause:</p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        <li>No charges to your card</li>
                        <li>All your data is preserved</li>
                        <li>Read-only access to your analyses and pipeline</li>
                        <li>We'll email you 7 days before it resumes</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 pt-2">
                    <Button variant="ghost" onClick={() => goTo("save_offer")}>
                      <ArrowLeft size={16} className="mr-1" />
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => goTo("confirm")}
                        className="text-text-secondary"
                      >
                        Skip, cancel instead
                      </Button>
                      <Button
                        onClick={() => pauseSubscription.mutate(pauseMonths)}
                        disabled={pauseSubscription.isPending}
                        className="bg-accent-primary hover:bg-accent-primary/90"
                      >
                        {pauseSubscription.isPending ? "Pausing..." : `Pause for ${pauseMonths} ${pauseMonths === 1 ? "month" : "months"}`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 4: Confirm Cancellation ──────────── */}
              {step === "confirm" && impact && (
                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <AlertTriangle size={20} className="text-accent-warning" />
                      Confirm cancellation
                    </DialogTitle>
                  </DialogHeader>

                  <div className="rounded-xl border border-accent-warning/20 bg-accent-warning/5 p-4 space-y-3">
                    <p className="text-sm font-medium text-text-primary">Your data</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: FileText, label: "Deal analyses", value: impact.deal_count },
                        { icon: ArrowRight, label: "Pipeline deals", value: impact.pipeline_count },
                        { icon: Upload, label: "Documents", value: impact.document_count },
                        { icon: Link2, label: "Shared links", value: impact.shared_link_count },
                      ].filter(item => item.value > 0).map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-2 text-sm text-text-secondary">
                          <Icon size={14} className="text-text-muted shrink-0" />
                          <span className="font-mono text-text-primary">{value}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                      {impact.team_member_count > 0 && (
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Users size={14} className="text-text-muted shrink-0" />
                          <span className="font-mono text-text-primary">{impact.team_member_count}</span>
                          <span>Team members (lose access)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-primary">Features you'll lose</p>
                    <div className="space-y-1.5">
                      {impact.features_lost.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm">
                          <X size={14} className="text-accent-danger shrink-0" />
                          <span className="text-text-secondary">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border-subtle bg-app-elevated p-3">
                    <p className="text-xs text-text-muted">
                      Your subscription continues until{" "}
                      <span className="font-mono text-text-primary">
                        {new Date(impact.period_end).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      . After that, you'll be on the Free plan. Your data is preserved
                      in read-only mode — upgrade anytime to restore full access.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded border-border-subtle bg-app-elevated text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="text-sm text-text-secondary">
                      I understand my data will be preserved but some features will be locked
                    </span>
                  </label>

                  <div className="flex justify-between gap-3 pt-2">
                    <Button variant="ghost" onClick={() => goTo("pause_offer")}>
                      <ArrowLeft size={16} className="mr-1" />
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={handleClose}>
                        Keep my plan
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => confirmCancellation.mutate()}
                        disabled={!acknowledged || confirmCancellation.isPending}
                      >
                        {confirmCancellation.isPending ? "Canceling..." : "Confirm cancellation"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Step 5: Success/Confirmation ──────────── */}
              {step === "success" && (
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto">
                    <Check size={32} className="text-accent-primary" />
                  </div>

                  {/* Dynamic message based on outcome */}
                  {saveOffer && acceptOffer.isSuccess ? (
                    <>
                      <DialogTitle className="text-lg font-semibold text-text-primary">
                        Great, you're all set!
                      </DialogTitle>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">
                        {saveOffer.offer_type === "pause"
                          ? `Your subscription is paused for ${pauseMonths} ${pauseMonths === 1 ? "month" : "months"}. We'll email you before it resumes.`
                          : `Your ${saveOffer.offer_value} has been applied. Enjoy Parcel!`}
                      </p>
                    </>
                  ) : pauseSubscription.isSuccess ? (
                    <>
                      <DialogTitle className="text-lg font-semibold text-text-primary">
                        Your plan is paused
                      </DialogTitle>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">
                        No charges for {pauseMonths} {pauseMonths === 1 ? "month" : "months"}.
                        Your data is safe and you can resume anytime.
                      </p>
                    </>
                  ) : (
                    <>
                      <DialogTitle className="text-lg font-semibold text-text-primary">
                        Subscription canceled
                      </DialogTitle>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">
                        You'll have full access until the end of your current billing period.
                        Your data is safe on the Free plan — come back anytime.
                      </p>
                    </>
                  )}

                  <Button onClick={handleClose} className="bg-accent-primary hover:bg-accent-primary/90">
                    Done
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Integration Point in Settings/Billing

```tsx
// In the billing page component (e.g., frontend/src/pages/settings/BillingPage.tsx)

import { useState } from "react"
import { CancellationFlow } from "@/components/billing/CancellationFlow"
import { useQueryClient } from "@tanstack/react-query"

export default function BillingPage() {
  const [showCancelFlow, setShowCancelFlow] = useState(false)
  const queryClient = useQueryClient()

  return (
    <div>
      {/* ... other billing page content ... */}

      {/* Danger Zone */}
      <div className="rounded-xl border border-accent-danger/20 bg-app-surface p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Cancel subscription</h3>
          <p className="text-sm text-text-secondary mt-1">
            Your plan will be downgraded to Free at the end of your current billing period.
            Your data is always preserved.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowCancelFlow(true)}
          className="border-accent-danger/30 text-accent-danger hover:bg-accent-danger/5"
        >
          Cancel subscription
        </Button>
      </div>

      <CancellationFlow
        open={showCancelFlow}
        onOpenChange={setShowCancelFlow}
        onCanceled={() => {
          queryClient.invalidateQueries({ queryKey: ["billing-status"] })
          queryClient.invalidateQueries({ queryKey: ["me"] })
        }}
      />
    </div>
  )
}
```

### Mobile Adaptation

On screens below the `md` breakpoint, the Dialog should be replaced with a Sheet
(side="bottom") for thumb-friendly interaction:

```tsx
// Responsive wrapper — use in CancellationFlow
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Dialog, DialogContent } from "@/components/ui/dialog"

function ResponsiveModal({ open, onOpenChange, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const isMobile = useMediaQuery("(max-width: 767px)")

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-app-surface border-border-subtle">
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-app-surface border-border-subtle p-0 overflow-hidden">
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

---

## CRITICAL DECISIONS

These decisions require explicit sign-off before implementation begins. Each has significant
product, revenue, or legal implications.

### 1. Discount Offer Amount: 20% vs 50%

**Options:**
- **20% off for 3 months** (conservative) -- Lower revenue hit, tests the waters. The
  research document (agent-07) suggests 50% for 2 months, but this is aggressive for a $29-$69 product.
- **50% off for 2 months** (aggressive) -- Higher save rate but trains users to cancel for discounts.

**Recommendation:** Start with 20% off for 3 months. This is cheaper for Parcel in absolute
terms ($41.40 discount on Pro over 3 months vs $69 on 50% for 2 months) while still being
meaningful. If acceptance rate is below 15% after 60 days, escalate to 30%.

**Decision needed:** What discount level to launch with.

---

### 2. Discount Cooldown Period

**Options:**
- **12-month cooldown** -- User cannot receive another discount save offer for 12 months
  after accepting one. Prevents "cancel-to-discount" gaming.
- **6-month cooldown** -- More lenient but higher risk of gaming.
- **No cooldown** -- Maximum save rate but guarantees some users will exploit it.

**Recommendation:** 12-month cooldown for discount offers. No cooldown for pause offers
(pausing is not a revenue loss, just a delay). If a user tries to cancel again within 12
months of accepting a discount, they skip straight to the pause offer.

**Decision needed:** Cooldown duration.

---

### 3. Pause Duration Limit

**Options:**
- **3 months maximum** (recommended) -- Aligns with real estate seasonality (off-season
  is typically 2-3 months). 40-60% of paused users reactivate (per research).
- **6 months maximum** -- More lenient for portfolio-only investors but risks indefinite
  pause abuse.
- **1 month maximum** -- Too restrictive; does not cover real estate seasonality.

**Recommendation:** 3 months. A user who needs more than 3 months off is effectively
churned and should be in the win-back email sequence, not paused.

**Decision needed:** Maximum pause duration.

---

### 4. Read-Only Grace Period Duration

**Options:**
- **30 days** (recommended) -- Industry standard. Enough time for the user to export data
  or decide to reactivate. After 30 days, data stays in the database but is hidden behind
  the upgrade gate.
- **90 days** -- More generous but delays the "loss aversion" pressure that drives reactivation.
- **Indefinite** -- All data always accessible on Free plan (just cannot create new items
  above limits). No pressure to reactivate.

**Recommendation:** Indefinite read-only for existing data. There is no marginal cost to
Parcel for storing old deal analyses. Keeping data always accessible maximizes win-back
potential (the "your 23 analyses are waiting" email only works if they can actually see
them). The limits only apply to creating new content.

**Decision needed:** Whether to use a time-limited grace period or indefinite read-only.

---

### 5. Win-Back Discount Escalation

**Options:**
- **Escalating offers** (20% -> 30% -> free month -> 40% -> 50%) -- Maximizes eventual
  win-back rate but the final 50% offer is deep.
- **Flat offer** (same 20% in every email) -- Simpler, no escalation abuse.
- **No discounts in win-back** (product-only messaging) -- Purest but lowest conversion.

**Recommendation:** Escalating offers as designed in Section 6. The 50% annual offer at
Day 365 is a last resort for users who are essentially lost anyway. The expected recovery
from these deep discounts at 365 days is very small in absolute terms.

**Decision needed:** Confirm the escalation schedule.

---

### 6. Team Plan Cancellation: Who Can Cancel?

**Options:**
- **Only the owner** can cancel the team plan. Team members cannot.
- **Any admin** can cancel (if RBAC roles are implemented).

**Recommendation:** Only the account owner (the person who entered the payment method)
can cancel. Team members see a "Contact your team admin to manage billing" message
instead of the cancel button. This is standard SaaS practice and prevents accidental
or unauthorized cancellations.

**Decision needed:** Confirm owner-only cancellation.

---

### 7. Involuntary Churn: Grace Period Length

**Options:**
- **10 days** (recommended) -- 4-6 retry attempts, 3 escalating emails, then downgrade.
  Matches industry standard.
- **7 days** -- Faster but may miss users who are traveling or between paychecks.
- **14 days** -- More lenient but delays revenue loss recognition.

**Recommendation:** 10 days with Stripe Smart Retries enabled. This gives 4+ automatic
retries at ML-optimized times plus 3 custom dunning emails. Target: recover 50-70% of
failed payments within this window.

**Decision needed:** Grace period before involuntary downgrade.

---

### 8. Should Cancellation Require the Reason Survey?

**Options:**
- **Required** (recommended) -- The reason survey is mandatory to proceed to Step 2.
  This is not a dark pattern because it is a single click on a radio button, not a
  free-text form. The FTC rule allows brief survey steps as long as they do not
  unreasonably delay cancellation.
- **Optional** -- Skip button available. Higher completion rate but weaker data.

**Recommendation:** Required. The data from the reason survey is the most valuable output
of the entire cancellation system. Without it, save offers cannot be targeted, churn
analytics are blind, and product decisions lack signal. One radio click is not a burden.

**Decision needed:** Required vs optional reason selection.

---

### 9. Stripe Coupons: Create via API or Dashboard?

**Options:**
- **Dashboard** (recommended for launch) -- Manually create the 7-8 coupon codes in the
  Stripe Dashboard. Simpler, no code needed, easy to audit.
- **API** -- Programmatically create coupons. More flexible but adds complexity.

**Recommendation:** Create coupons in the Stripe Dashboard at launch. The coupon IDs are
referenced by name in the backend code (`RETENTION_20_3MO`, `WINBACK_30_3MO`, etc.).
Coupons rarely change. Move to API-managed coupons only if the number of offers exceeds
~15 or if offers need to be personalized per-user.

**Decision needed:** Confirm dashboard-created coupons for launch.

---

### 10. Win-Back Email Provider

**Options:**
- **Transactional email service** (SendGrid, Postmark, Resend) -- Same service used for
  auth emails (password reset, etc.). Win-back emails are sent by a cron job that reads
  from `winback_schedule`. Simple, unified.
- **Marketing automation** (Customer.io, Loops) -- Purpose-built for drip sequences.
  Better open/click tracking, easier to edit sequences without deploys, A/B test
  subject lines. Costs $50-150/month.
- **Stripe Billing emails** -- Stripe can send basic dunning emails but cannot handle
  win-back sequences or custom offers.

**Recommendation:** Use the transactional email provider (likely Resend or SendGrid) for
the MVP. The win-back sequence is only 6 emails over 365 days -- a cron job + database
table is sufficient. Migrate to Customer.io or Loops once email volume justifies the cost
(~500+ active win-back sequences).

**Decision needed:** Email provider for win-back sequence.
