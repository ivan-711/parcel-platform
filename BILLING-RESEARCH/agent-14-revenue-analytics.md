# Revenue Analytics & Metrics Infrastructure Research
## Parcel — Real Estate Deal Analysis SaaS

**Date:** 2026-03-28
**Context:** Solo-founder SaaS (FastAPI + PostgreSQL + React/TS), Stripe billing, 4 tiers (Free $0 / Starter $29 / Pro $69 / Team $149), 14-day Pro trial on signup

---

## Table of Contents

1. [Core SaaS Metrics — Formulas & Calculations](#1-core-saas-metrics)
2. [Revenue Recognition](#2-revenue-recognition)
3. [Cohort Analysis Design](#3-cohort-analysis-design)
4. [Founder Analytics Dashboard](#4-founder-analytics-dashboard)
5. [Stripe Built-In vs Custom Analytics](#5-stripe-built-in-vs-custom)
6. [Event Tracking for Billing Analytics](#6-event-tracking)
7. [Funnel Metrics](#7-funnel-metrics)
8. [Expansion & Contraction MRR](#8-expansion-contraction-mrr)
9. [Revenue Forecasting](#9-revenue-forecasting)
10. [Alerting & Anomaly Detection](#10-alerting)
11. [Tools Comparison](#11-tools-comparison)
12. [Database Queries — SQL Examples](#12-sql-queries)
13. [Recommendations for Parcel](#13-recommendations)

---

## 1. Core SaaS Metrics

### Monthly Recurring Revenue (MRR)

MRR is the normalized monthly revenue from all active subscriptions.

```
MRR = SUM(monthly_price) for all active subscriptions

# For annual plans (if added later):
MRR_annual_sub = annual_price / 12
```

MRR is the single most important number. Every other metric derives from it.

**MRR Components (the "MRR waterfall"):**

| Component | Definition |
|-----------|-----------|
| New MRR | Revenue from brand-new customers this month |
| Expansion MRR | Revenue increase from existing customers upgrading |
| Contraction MRR | Revenue decrease from existing customers downgrading |
| Churned MRR | Revenue lost from customers who cancelled |
| Reactivation MRR | Revenue from previously churned customers returning |

```
Net New MRR = New MRR + Expansion MRR + Reactivation MRR
            - Contraction MRR - Churned MRR
```

### Annual Recurring Revenue (ARR)

```
ARR = MRR x 12
```

ARR is only meaningful once Parcel reaches ~$10K MRR. Before that, MRR is the metric to watch.

### Churn Rate

Two distinct churn rates matter:

**Logo churn (customer churn):**
```
Customer Churn Rate = (Customers lost in period / Customers at start of period) x 100

# Example: 5 cancellations / 200 customers = 2.5% monthly churn
```

**Revenue churn (MRR churn):**
```
Gross MRR Churn Rate = Churned MRR / MRR at start of period x 100
Net MRR Churn Rate = (Churned MRR + Contraction MRR - Expansion MRR) / MRR at start of period x 100
```

Net negative churn (expansion exceeds churn) is the holy grail. For Parcel this would mean upgrades from Starter->Pro->Team outpace cancellations.

**Benchmarks:** Healthy B2B SaaS targets <5% monthly logo churn, <2% monthly MRR churn. Early-stage will be higher; anything under 8% monthly is acceptable pre-PMF.

### Customer Lifetime Value (LTV)

```
LTV = ARPU / Monthly Churn Rate

# Or more precisely:
LTV = ARPU x Gross Margin / Monthly Churn Rate
```

For Parcel (software, minimal COGS beyond API costs):
```
Gross Margin ≈ 85-90% (after Stripe fees 2.9%+30¢, Claude API costs, hosting)

# Example:
ARPU = $45/mo (blended across tiers)
Churn = 5%/mo
LTV = $45 x 0.87 / 0.05 = $783
```

### Customer Acquisition Cost (CAC)

```
CAC = Total Sales & Marketing Spend / New Customers Acquired

# For solo founder, include:
# - Ad spend (Google, Facebook, etc.)
# - Content creation costs
# - Tools (email marketing, etc.)
# - Imputed value of Ivan's time on marketing
```

**LTV:CAC ratio target:** 3:1 or higher. Below 1:1 means losing money on every customer.

### Average Revenue Per User (ARPU)

```
ARPU = MRR / Total Active Paying Customers

# Segmented ARPU is more useful:
ARPU_starter = $29 (fixed, unless usage billing added)
ARPU_pro = $69
ARPU_team = $149
Blended_ARPU = MRR / paying_customer_count
```

Track blended ARPU over time. If it rises, customers are upgrading. If it falls, you're attracting lower-tier customers or experiencing downgrades.

---

## 2. Revenue Recognition

### When to Count Revenue

For a subscription SaaS, there are two models:

**Cash basis (recommended for early stage):**
- Count revenue when Stripe confirms payment succeeded
- Stripe `invoice.paid` webhook = revenue recognized
- Simple, matches bank account, legally sufficient for small companies

**Accrual basis (required at scale / for investors):**
- Revenue recognized ratably over the service period
- $69 Pro monthly: $69 recognized in the month of service
- Annual plans (if added): $828/year recognized as $69/month over 12 months
- Creates deferred revenue liability on balance sheet

**Recommendation for Parcel now:** Cash basis. Use Stripe's `invoice.paid` webhook as the single source of truth. Transition to accrual when pursuing Series A or when revenue exceeds ~$500K ARR.

### Handling Edge Cases

| Scenario | Revenue Treatment |
|----------|-------------------|
| 14-day trial (no card) | $0 — no revenue until conversion |
| Trial converts to paid | Revenue starts on first successful charge |
| Mid-cycle upgrade | Stripe prorates; count net amount on `invoice.paid` |
| Refund issued | Negative revenue entry on refund date |
| Failed payment, retried, succeeds | Revenue on successful retry date |
| Failed payment, dunning exhausted | No revenue; subscription marked churned |

---

## 3. Cohort Analysis Design

### Monthly Signup Cohorts

Group users by the month they signed up. Track two things per cohort over time:

**Retention cohort (logo):**
```
Month 0: 100% (signup month)
Month 1: 72% still active
Month 2: 65%
Month 3: 61%
...
```

**Revenue cohort (MRR per cohort):**
```
Month 0: $2,900 (100 users, some on trial, some paid)
Month 1: $2,100 (some churned, some upgraded)
Month 2: $2,350 (expansion from upgrades outpaces churn — good sign)
...
```

### Retention Curve Shape

The ideal retention curve flattens. Plot:

```
Y-axis: % of cohort retained (or % of cohort MRR retained)
X-axis: Months since signup (0, 1, 2, ... 12)
```

A curve that keeps dropping linearly = no product-market fit.
A curve that flattens at ~60-70% after month 3 = healthy retention floor.
A revenue curve that rises over time = net negative churn (expansion).

### Cohort Table Layout (for dashboard)

```
              M0     M1     M2     M3     M4     M5
Jan 2026    100%    72%    65%    61%    59%    58%
Feb 2026    100%    68%    62%    57%    55%
Mar 2026    100%    74%    66%    60%
Apr 2026    100%    70%    63%
May 2026    100%    71%
Jun 2026    100%

Cell color: green (>70%), yellow (50-70%), red (<50%)
```

---

## 4. Founder Analytics Dashboard

### Daily Glance Dashboard (what Ivan opens every morning)

**Row 1 — The Big 4 KPIs:**

| Card | Value | Trend |
|------|-------|-------|
| MRR | $4,830 | +8.2% vs last month |
| Active Subscribers | 87 | +12 this month |
| Trial Conversions (this month) | 23/41 = 56% | vs 48% last month |
| Net New MRR | +$367 | breakdown: +$580 new, +$138 expansion, -$351 churn |

**Row 2 — MRR Waterfall Chart:**

Bar chart showing last 6 months of MRR with stacked components:
- Green bars: New MRR + Expansion MRR
- Red bars: Churned MRR + Contraction MRR
- Line overlay: Net MRR trend

**Row 3 — Two panels side by side:**

Left panel — "Revenue by Plan" (stacked area chart):
```
Starter (blue): $1,160 (40 users)
Pro (indigo): $2,484 (36 users)
Team (purple): $1,192 (8 users, includes 3 seats avg)
```

Right panel — "This Month's Activity" (live feed):
```
10:23 AM  john@acme.com upgraded Starter → Pro (+$40)
09:15 AM  sarah@realty.com started trial
Yesterday  mike@invest.co churned from Starter (-$29)
Yesterday  team@bigfirm.com added seat to Team (+$149)
```

**Row 4 — Funnel snapshot (horizontal bar):**
```
Visitors:    1,240  ████████████████████████████████ 100%
Signups:       142  ████████████                      11.5%
Trial Start:    98  ████████                           7.9%
Trial→Paid:     41  ████                               3.3%
Month 3 Ret:    28  ███                                2.3%
```

**Row 5 — Alerts & Action Items:**
```
⚠ 3 payments failed in last 24h (retry scheduled)
⚠ Churn rate trending up: 6.1% vs 4.8% 30d avg
✓ Trial conversion rate improved 8pts this month
```

---

## 5. Stripe Built-In vs Custom Analytics

### What Stripe Dashboard Gives You (Free)

Stripe's built-in analytics covers:
- **MRR** (current + historical chart)
- **Subscriber count** by status (active, trialing, past_due, canceled)
- **Churn rate** (basic monthly calculation)
- **Revenue by plan** breakdown
- **Failed payment** tracking + Smart Retries
- **Revenue Recovery** metrics (dunning success rate)
- **Geographic distribution** of customers

**Stripe Revenue Recognition** (Stripe's paid add-on, ~0.25% of revenue):
- Accrual-basis revenue waterfall
- ASC 606 compliant reporting
- Useful only when preparing for audit/fundraise

### What Stripe Dashboard Does NOT Give You

| Gap | Why It Matters |
|-----|---------------|
| Cohort retention curves | Need to correlate signup date with subscription status over time |
| Funnel (visitor → signup → trial → paid) | Stripe only sees post-signup; needs frontend analytics |
| Feature usage vs plan | Can't see which features drive upgrades |
| LTV by acquisition channel | Stripe doesn't know how users found Parcel |
| Custom ARPU segmentation | Limited to plan-level, no custom dimensions |
| Trial engagement scoring | Can't predict which trials will convert |
| Expansion MRR attribution | Knows upgrade happened, not why |

### Verdict

Stripe covers ~60% of billing metrics out of the box. The remaining 40% — cohort analysis, funnel metrics, feature-usage correlation, and predictive analytics — requires either a third-party tool or custom implementation.

---

## 6. Event Tracking for Billing Analytics

### Critical Events to Capture

**Billing events (from Stripe webhooks):**

```python
# Webhook events to listen for:
BILLING_EVENTS = [
    "customer.subscription.created",     # New subscription (incl trial start)
    "customer.subscription.updated",     # Plan change, status change
    "customer.subscription.deleted",     # Subscription cancelled
    "invoice.paid",                      # Successful payment
    "invoice.payment_failed",            # Failed payment attempt
    "invoice.upcoming",                  # 3 days before next charge
    "charge.refunded",                   # Refund issued
    "customer.subscription.trial_will_end",  # 3 days before trial expires
]
```

**Application events (from frontend + backend):**

```python
# User behavior events to store:
APPLICATION_EVENTS = [
    # Acquisition funnel
    "page.landing_visited",              # UTM params, referrer
    "auth.signup_completed",             # Registration
    "auth.login",                        # Session start

    # Trial engagement (predictive of conversion)
    "deal.analyzed",                     # Ran a deal analysis
    "deal.saved",                        # Saved deal to portfolio
    "report.generated",                  # Generated PDF report
    "pipeline.deal_moved",              # Used pipeline feature
    "chat.message_sent",                # Used AI chat
    "compare.deals_compared",           # Used comparison feature

    # Conversion signals
    "billing.upgrade_clicked",           # Clicked upgrade CTA
    "billing.checkout_started",          # Opened Stripe checkout
    "billing.plan_changed",             # Confirmed plan change

    # Retention signals
    "session.started",                   # Daily active usage
    "feature.limit_hit",                # Hit free tier limit (upgrade prompt)
]
```

### Event Schema

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_name VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}',      -- flexible payload
    session_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Denormalized for fast queries
    event_date DATE GENERATED ALWAYS AS (created_at::date) STORED
);

CREATE INDEX idx_events_user_date ON analytics_events(user_id, event_date);
CREATE INDEX idx_events_name_date ON analytics_events(event_name, event_date);
```

**Example event payloads:**

```json
// Deal analyzed
{
  "event_name": "deal.analyzed",
  "properties": {
    "strategy": "brrrr",
    "plan": "pro_trial",
    "session_number": 3
  }
}

// Plan changed
{
  "event_name": "billing.plan_changed",
  "properties": {
    "from_plan": "starter",
    "to_plan": "pro",
    "mrr_delta": 40,
    "trigger": "feature_limit"
  }
}
```

---

## 7. Funnel Metrics

### The Full Parcel Funnel

```
Stage              | Metric                  | Benchmark Target
-------------------|-------------------------|------------------
Visitor            | Unique visitors/mo      | —
  → Signup         | Visitor→Signup rate     | 3-8%
Signup             | Total signups/mo        | —
  → Trial Start    | Signup→Trial rate       | 80-95% (auto-trial)
Trial Active       | Trials running          | —
  → Trial Convert  | Trial→Paid rate         | 15-25% (no card)
                   |                         | 40-60% (card upfront)
Paid Month 1       | First payment received  | —
  → Month 3 Ret    | 3-month retention       | 70-80%
  → Month 12 Ret   | 12-month retention      | 50-65%
```

Since Parcel uses a no-card-required trial, the critical conversion point is **Trial → Paid**. Industry data shows no-card trials convert at 15-25% vs 40-60% for card-upfront, but generate 2-3x more trial starts. The math usually favors no-card for early-stage when optimizing for learning and funnel volume.

### Trial Health Metrics

Track these during the 14-day trial window:

```
Trial Engagement Score = weighted sum of:
  - Deals analyzed (weight: 3)
  - PDF reports generated (weight: 2)
  - Pipeline deals moved (weight: 2)
  - AI chat messages sent (weight: 1)
  - Logins in first 7 days (weight: 1)
  - Days active / 14 (weight: 2)
```

Segment trial users by engagement score:
- **Hot (score > 15):** High-touch follow-up, personal email from Ivan
- **Warm (score 5-15):** Automated email sequence highlighting unused features
- **Cold (score < 5):** "We noticed you haven't tried X yet" nudge email

### Trial Conversion Timing

Most conversions happen in two windows:
1. **Days 1-3:** Immediate value recognition (the "aha moment")
2. **Days 12-14:** Deadline urgency before trial expires

If Parcel sees a gap in the middle, add a Day 7 engagement email showcasing a feature they haven't tried.

---

## 8. Expansion & Contraction MRR

### Tracking Plan Movements

Every subscription change generates an MRR delta:

```
Expansion Events:
  Free → Starter:    +$29    (conversion, counted as New MRR)
  Free → Pro:        +$69    (conversion, counted as New MRR)
  Starter → Pro:     +$40    (upgrade, counted as Expansion MRR)
  Starter → Team:    +$120   (upgrade)
  Pro → Team:        +$80    (upgrade)
  Team: +1 seat:     +$149   (seat expansion — if per-seat)

Contraction Events:
  Pro → Starter:     -$40    (downgrade)
  Team → Pro:        -$80    (downgrade)
  Team: -1 seat:     -$149   (seat contraction)
```

### Quick Ratio

The SaaS Quick Ratio measures growth efficiency:

```
Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)

Benchmarks:
  > 4.0  = Excellent (hyper-growth)
  2.0-4.0 = Good (healthy growth)
  1.0-2.0 = Concerning (growth is fragile)
  < 1.0  = Shrinking (losing more than gaining)
```

### What Drives Expansion in Parcel

Given the plan structure:
- **Starter → Pro:** Triggered by hitting analysis limits, wanting AI chat, or needing PDF reports
- **Pro → Team:** Triggered by needing team collaboration features
- **Seat expansion (Team):** More team members onboarded

Track `feature.limit_hit` events correlated with subsequent upgrades to identify the strongest expansion triggers.

---

## 9. Revenue Forecasting

### Method 1: Simple Linear Projection

```
Projected MRR(month+n) = Current MRR + (Avg Net New MRR per month x n)

# Example:
Current MRR: $4,830
Avg Net New MRR (last 3 months): +$350/mo
Projected MRR in 6 months: $4,830 + ($350 x 6) = $6,930
Projected ARR in 6 months: $83,160
```

Weakness: assumes constant growth rate. Breaks down as base grows.

### Method 2: Growth Rate Projection

```
Projected MRR(month+n) = Current MRR x (1 + monthly_growth_rate)^n

# Example:
Current MRR: $4,830
Monthly growth rate: 8%
Projected MRR in 6 months: $4,830 x 1.08^6 = $7,664
Projected MRR in 12 months: $4,830 x 1.08^12 = $12,164
```

More realistic for early-stage SaaS where growth compounds.

### Method 3: Cohort-Based Projection (Most Accurate)

Project each cohort's contribution independently:

```
For each past cohort:
  Revenue(month+n) = cohort_size x ARPU x retention_rate(age=n)
  (where retention_rate comes from the cohort retention curve)

For future cohorts (estimated signups):
  Revenue(month+n) = projected_new_signups x trial_conversion_rate x ARPU x retention_rate(age=0..n)

Total Projected MRR = SUM(all cohort contributions)
```

This naturally accounts for churn decay per cohort and is the gold standard for forecasting. However, it requires at least 3-6 months of cohort data to produce meaningful retention curves.

### Recommendation for Parcel

- **Now (pre-launch to ~$5K MRR):** Use Method 2 (growth rate). Simple, directionally correct.
- **After 6 months of data:** Switch to Method 3 (cohort-based). Build a simple spreadsheet or query that sums per-cohort projected revenue.

---

## 10. Alerting & Anomaly Detection

### Alerts to Implement (Priority Order)

**P0 — Revenue-threatening (alert immediately, Slack/SMS):**

| Alert | Trigger | Action |
|-------|---------|--------|
| Payment failure spike | >3 failures in 1 hour (or >2x daily avg) | Check Stripe status, card network issues |
| Stripe webhook down | No webhook received in 1 hour during business hours | Verify webhook endpoint, check Railway logs |
| Mass cancellation | >3 cancellations in 24 hours (early stage threshold) | Investigate: outage? competitor launch? billing bug? |

**P1 — Trend alerts (daily digest email):**

| Alert | Trigger |
|-------|---------|
| Churn rate rising | Monthly churn > 1.5x trailing 3-month average |
| Trial conversion dropping | Weekly conversion rate < 50% of trailing average |
| ARPU declining | Monthly ARPU down >10% from prior month |
| Net New MRR negative | More revenue lost than gained this month |

**P2 — Informational (weekly summary):**

| Alert | Trigger |
|-------|---------|
| MRR milestone | Crossed $1K, $5K, $10K, $25K, $50K, $100K |
| Cohort retention plateau | Latest cohort retention > prior cohort at same age |
| Expansion MRR exceeds churn | Net negative churn achieved |

### Failed Payment / Dunning Monitoring

Stripe Smart Retries handles most retry logic, but track:

```
Involuntary Churn Rate = Subscriptions lost to failed payments / Total subscriptions
Target: < 2% of total subscriptions per month

Recovery Rate = Successfully retried payments / Total failed payments
Stripe Smart Retries typically recover 10-15% of failures
```

If involuntary churn exceeds 3%, consider adding:
- Pre-dunning email ("Your card on file expires soon")
- In-app banner for past_due subscriptions
- Grace period before cancellation (Stripe's default: 3 retries over ~2 weeks)

---

## 11. Tools Comparison

### Stripe Dashboard (Free)

**Pros:** Zero setup, real-time, integrated with payments, handles MRR/churn basics.
**Cons:** No cohort analysis, no funnel data, no feature-usage correlation, limited export.
**Cost:** Free with Stripe.

### Baremetrics

**Pros:** Beautiful dashboards, forecasting, cohort analysis, dunning (Recover product), email digests.
**Cons:** Expensive for early-stage ($108/mo at $10K MRR, scales with revenue), limited customization.
**Cost:** $108/mo (up to $10K MRR), $158/mo (up to $50K MRR).
**Verdict:** Overpriced for a solo founder pre-$10K MRR. Good to add at $25K+ MRR.

### ChartMogul

**Pros:** Best cohort analysis, MRR movements visualization, multiple data sources, API.
**Cons:** UI is analytics-focused (not action-oriented), learning curve.
**Cost:** Free up to $10K MRR ("Launch" plan), $100/mo for Scale plan.
**Verdict:** Strong contender. Free tier covers Parcel's needs for the first year. Best-in-class cohort analysis.

### ProfitWell (now Paddle)

**Pros:** Was free forever, excellent benchmarking against similar companies, churn reduction tools.
**Cons:** Acquired by Paddle in 2022; increasingly bundled with Paddle Billing, uncertain Stripe integration future.
**Cost:** Free for core metrics (if still available post-Paddle acquisition).
**Verdict:** Uncertain roadmap. Not recommended for new integration.

### Custom-Built (PostgreSQL queries + internal dashboard)

**Pros:** Full control, no additional cost, integrated with product data, can correlate feature usage with revenue.
**Cons:** Development time (Ivan's most scarce resource), maintenance burden, no benchmarking.
**Cost:** Engineering time only.
**Verdict:** Build the 20% that covers 80% of needs: MRR calculation, plan distribution, churn tracking. Use ChartMogul free tier for cohort analysis.

### Recommended Stack for Parcel

```
Phase 1 (Launch → $5K MRR):
  - Stripe Dashboard (free) for real-time billing metrics
  - ChartMogul free tier for cohort analysis
  - 3-5 custom SQL queries for founder dashboard
  - Simple Slack alerts via Stripe webhooks

Phase 2 ($5K → $25K MRR):
  - Add custom analytics events table (see Section 6)
  - Build internal founder dashboard with cohort retention + funnel
  - Keep ChartMogul for cross-referencing

Phase 3 ($25K+ MRR):
  - Evaluate Baremetrics or full ChartMogul Scale plan
  - Add forecasting model (cohort-based)
  - Consider Metabase or Grafana for self-serve dashboards
```

---

## 12. Database Queries — SQL Examples

### Assumed Billing Schema

```sql
-- Core billing tables (created by your Stripe sync)

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL,           -- 'free', 'starter', 'pro', 'team'
    status VARCHAR(50) NOT NULL,         -- 'active', 'trialing', 'past_due', 'canceled', 'incomplete'
    mrr_cents INTEGER NOT NULL DEFAULT 0, -- MRR in cents (2900, 6900, 14900)
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,     -- 'created', 'upgraded', 'downgraded', 'canceled', 'reactivated'
    from_plan VARCHAR(50),
    to_plan VARCHAR(50),
    mrr_delta_cents INTEGER NOT NULL DEFAULT 0,  -- positive for growth, negative for churn
    stripe_event_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,         -- 'paid', 'open', 'void', 'uncollectible'
    paid_at TIMESTAMPTZ,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subs_status ON subscriptions(status);
CREATE INDEX idx_subs_plan ON subscriptions(plan);
CREATE INDEX idx_sub_events_date ON subscription_events(created_at);
CREATE INDEX idx_sub_events_type ON subscription_events(event_type);
CREATE INDEX idx_invoices_paid ON invoices(paid_at);
```

### Query: Current MRR

```sql
SELECT
    SUM(mrr_cents) / 100.0 AS mrr_dollars,
    COUNT(*) AS active_subscribers
FROM subscriptions
WHERE status IN ('active', 'past_due')  -- include past_due; they're still "subscribed"
  AND plan != 'free';
```

### Query: MRR by Plan

```sql
SELECT
    plan,
    COUNT(*) AS subscribers,
    SUM(mrr_cents) / 100.0 AS plan_mrr,
    ROUND(AVG(mrr_cents) / 100.0, 2) AS avg_revenue_per_user
FROM subscriptions
WHERE status IN ('active', 'past_due')
  AND plan != 'free'
GROUP BY plan
ORDER BY plan_mrr DESC;
```

### Query: Monthly MRR Trend (Last 12 Months)

```sql
WITH months AS (
    SELECT generate_series(
        date_trunc('month', NOW() - INTERVAL '11 months'),
        date_trunc('month', NOW()),
        '1 month'
    )::date AS month
),
monthly_mrr AS (
    SELECT
        m.month,
        COALESCE(SUM(
            CASE WHEN s.status IN ('active', 'past_due')
                 AND s.created_at <= (m.month + INTERVAL '1 month' - INTERVAL '1 second')
                 AND (s.canceled_at IS NULL OR s.canceled_at > m.month + INTERVAL '1 month')
                 AND s.plan != 'free'
            THEN s.mrr_cents ELSE 0 END
        ), 0) / 100.0 AS mrr
    FROM months m
    CROSS JOIN subscriptions s
    GROUP BY m.month
)
SELECT month, mrr
FROM monthly_mrr
ORDER BY month;
```

### Query: MRR Waterfall (Net New MRR Components)

```sql
SELECT
    date_trunc('month', created_at)::date AS month,
    SUM(CASE WHEN event_type = 'created' AND from_plan IS NULL
             THEN mrr_delta_cents ELSE 0 END) / 100.0 AS new_mrr,
    SUM(CASE WHEN event_type = 'upgraded'
             THEN mrr_delta_cents ELSE 0 END) / 100.0 AS expansion_mrr,
    SUM(CASE WHEN event_type = 'reactivated'
             THEN mrr_delta_cents ELSE 0 END) / 100.0 AS reactivation_mrr,
    SUM(CASE WHEN event_type = 'downgraded'
             THEN ABS(mrr_delta_cents) ELSE 0 END) / 100.0 AS contraction_mrr,
    SUM(CASE WHEN event_type = 'canceled'
             THEN ABS(mrr_delta_cents) ELSE 0 END) / 100.0 AS churned_mrr,
    SUM(mrr_delta_cents) / 100.0 AS net_new_mrr
FROM subscription_events
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', created_at)
ORDER BY month;
```

### Query: Monthly Logo Churn Rate

```sql
WITH monthly_counts AS (
    SELECT
        date_trunc('month', se.created_at)::date AS month,
        COUNT(CASE WHEN se.event_type = 'canceled' THEN 1 END) AS churned,
        (SELECT COUNT(*) FROM subscriptions s2
         WHERE s2.status IN ('active', 'past_due', 'trialing')
           AND s2.plan != 'free'
           AND s2.created_at < date_trunc('month', se.created_at)
        ) AS start_of_month_count
    FROM subscription_events se
    WHERE se.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY date_trunc('month', se.created_at)
)
SELECT
    month,
    churned,
    start_of_month_count,
    ROUND(churned * 100.0 / NULLIF(start_of_month_count, 0), 2) AS churn_rate_pct
FROM monthly_counts
ORDER BY month;
```

### Query: Cohort Retention Table

```sql
WITH cohorts AS (
    SELECT
        user_id,
        date_trunc('month', created_at)::date AS cohort_month
    FROM users
    WHERE created_at >= NOW() - INTERVAL '6 months'
),
cohort_activity AS (
    SELECT
        c.cohort_month,
        EXTRACT(MONTH FROM AGE(date_trunc('month', s.current_period_start), c.cohort_month))::int AS month_number,
        COUNT(DISTINCT c.user_id) AS active_users
    FROM cohorts c
    JOIN subscriptions s ON s.user_id = c.user_id
    WHERE s.status IN ('active', 'past_due')
      AND s.plan != 'free'
    GROUP BY c.cohort_month, month_number
),
cohort_sizes AS (
    SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
    FROM cohorts
    GROUP BY cohort_month
)
SELECT
    ca.cohort_month,
    cs.cohort_size,
    ca.month_number,
    ca.active_users,
    ROUND(ca.active_users * 100.0 / cs.cohort_size, 1) AS retention_pct
FROM cohort_activity ca
JOIN cohort_sizes cs ON cs.cohort_month = ca.cohort_month
WHERE ca.month_number >= 0
ORDER BY ca.cohort_month, ca.month_number;
```

### Query: Trial Conversion Rate

```sql
SELECT
    date_trunc('month', trial_start)::date AS trial_month,
    COUNT(*) AS trials_started,
    COUNT(CASE WHEN status = 'active' AND plan != 'free' THEN 1 END) AS converted,
    ROUND(
        COUNT(CASE WHEN status = 'active' AND plan != 'free' THEN 1 END) * 100.0
        / NULLIF(COUNT(*), 0), 1
    ) AS conversion_rate_pct
FROM subscriptions
WHERE trial_start IS NOT NULL
  AND trial_end < NOW()  -- only count completed trials
GROUP BY date_trunc('month', trial_start)
ORDER BY trial_month;
```

### Query: ARPU Trend

```sql
SELECT
    date_trunc('month', i.paid_at)::date AS month,
    SUM(i.amount_cents) / 100.0 AS total_revenue,
    COUNT(DISTINCT i.user_id) AS paying_users,
    ROUND(SUM(i.amount_cents) / 100.0 / NULLIF(COUNT(DISTINCT i.user_id), 0), 2) AS arpu
FROM invoices i
WHERE i.status = 'paid'
  AND i.paid_at >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', i.paid_at)
ORDER BY month;
```

### Query: Customer LTV (Realized, Per Cohort)

```sql
WITH cohort_revenue AS (
    SELECT
        date_trunc('month', u.created_at)::date AS cohort_month,
        u.id AS user_id,
        COALESCE(SUM(i.amount_cents), 0) / 100.0 AS lifetime_revenue
    FROM users u
    LEFT JOIN invoices i ON i.user_id = u.id AND i.status = 'paid'
    GROUP BY cohort_month, u.id
)
SELECT
    cohort_month,
    COUNT(user_id) AS cohort_size,
    ROUND(AVG(lifetime_revenue), 2) AS avg_ltv,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lifetime_revenue), 2) AS median_ltv,
    MAX(lifetime_revenue) AS max_ltv
FROM cohort_revenue
GROUP BY cohort_month
ORDER BY cohort_month;
```

### Query: Quick Ratio (Monthly)

```sql
WITH monthly AS (
    SELECT
        date_trunc('month', created_at)::date AS month,
        SUM(CASE WHEN event_type IN ('created') AND mrr_delta_cents > 0
                 THEN mrr_delta_cents ELSE 0 END) / 100.0 AS new_mrr,
        SUM(CASE WHEN event_type = 'upgraded'
                 THEN mrr_delta_cents ELSE 0 END) / 100.0 AS expansion_mrr,
        SUM(CASE WHEN event_type = 'reactivated'
                 THEN mrr_delta_cents ELSE 0 END) / 100.0 AS reactivation_mrr,
        ABS(SUM(CASE WHEN event_type = 'canceled'
                     THEN mrr_delta_cents ELSE 0 END)) / 100.0 AS churned_mrr,
        ABS(SUM(CASE WHEN event_type = 'downgraded'
                     THEN mrr_delta_cents ELSE 0 END)) / 100.0 AS contraction_mrr
    FROM subscription_events
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY date_trunc('month', created_at)
)
SELECT
    month,
    new_mrr, expansion_mrr, reactivation_mrr, churned_mrr, contraction_mrr,
    ROUND(
        (new_mrr + expansion_mrr + reactivation_mrr)
        / NULLIF(churned_mrr + contraction_mrr, 0), 2
    ) AS quick_ratio
FROM monthly
ORDER BY month;
```

### Query: Daily Active Subscribers (Time Series for Charting)

```sql
WITH dates AS (
    SELECT generate_series(
        (NOW() - INTERVAL '30 days')::date,
        NOW()::date,
        '1 day'
    )::date AS day
)
SELECT
    d.day,
    COUNT(DISTINCT s.user_id) AS active_subscribers,
    SUM(s.mrr_cents) / 100.0 AS daily_mrr_snapshot
FROM dates d
JOIN subscriptions s ON
    s.created_at::date <= d.day
    AND (s.canceled_at IS NULL OR s.canceled_at::date > d.day)
    AND s.status IN ('active', 'past_due')
    AND s.plan != 'free'
GROUP BY d.day
ORDER BY d.day;
```

### Query: Failed Payments & Recovery

```sql
SELECT
    date_trunc('week', i.created_at)::date AS week,
    COUNT(*) FILTER (WHERE i.status = 'open') AS still_open,
    COUNT(*) FILTER (WHERE i.status = 'paid' AND i.paid_at > i.created_at + INTERVAL '1 day') AS recovered,
    COUNT(*) FILTER (WHERE i.status = 'uncollectible') AS failed_permanently,
    COUNT(*) AS total_attempts,
    ROUND(
        COUNT(*) FILTER (WHERE i.status = 'paid') * 100.0 / NULLIF(COUNT(*), 0), 1
    ) AS recovery_rate_pct
FROM invoices i
WHERE i.created_at >= NOW() - INTERVAL '3 months'
  AND i.amount_cents > 0
GROUP BY date_trunc('week', i.created_at)
ORDER BY week;
```

---

## 13. RECOMMENDATIONS FOR PARCEL

### Phase 1: Launch Essentials (Week 1-2 of billing integration)

**1. Store all Stripe webhook events raw.**
Create a `stripe_events` table that logs every webhook payload as JSONB. This is your audit trail and lets you rebuild any metric retroactively. Cost: ~20 lines of code, negligible storage.

```sql
CREATE TABLE stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Build the `subscriptions` and `subscription_events` tables exactly as shown in Section 12.** These two tables are the foundation for every metric. Populate them from Stripe webhooks. Do not try to query Stripe's API on-demand for analytics -- it's slow and rate-limited.

**3. Use Stripe Dashboard as your primary analytics tool.** It's free, requires zero engineering, and covers MRR, subscriber count, churn, and failed payments. Resist building a custom dashboard until you have at least 50 paying customers.

**4. Set up ChartMogul free tier.** Connect it to Stripe (one-click integration). It automatically calculates MRR, churn, LTV, cohort retention, and ARPU with proper methodology. Free up to $10K MRR. This gives you cohort analysis that Stripe Dashboard lacks.

**5. Implement three Slack alerts via Stripe webhooks:**
- `invoice.payment_failed` -- "Payment failed for {email} on {plan}"
- `customer.subscription.deleted` -- "Churn: {email} cancelled {plan} (was paying ${amount}/mo)"
- `customer.subscription.updated` where plan changed -- "Upgrade: {email} moved {from} -> {to}"

This gives Ivan real-time awareness without checking any dashboard.

### Phase 2: Growth Intelligence ($1K-$10K MRR)

**6. Add the `analytics_events` table for product usage tracking.** Track the events listed in Section 6. This unlocks the ability to correlate feature usage with conversion and retention -- the most actionable insight for a solo founder.

**7. Build a single "Founder Pulse" page inside the Parcel admin.** Do not build a full analytics dashboard. Build one page with:
- Current MRR (single number, big font)
- MRR waterfall chart (last 6 months, using the Section 12 query)
- Trial conversion rate (this month vs last month)
- Churn rate (this month vs trailing 3-month average)
- Five most recent subscription events (live feed)

This takes ~4 hours to build with Recharts components already in the codebase.

**8. Implement trial engagement scoring.** Use the formula from Section 7. Send a personal email (from Ivan's address, not a no-reply) to "Hot" trial users on Day 3. This single tactic consistently produces 20-40% higher trial conversion rates for early-stage SaaS.

**9. Track expansion triggers.** Log which feature limit or CTA led to each upgrade. Store `trigger` in the `subscription_events.properties`. After 50 upgrades, analyze the top 3 triggers and double down on those upgrade paths in the UI.

### Phase 3: Scale & Forecast ($10K+ MRR)

**10. Build cohort-based revenue forecasting.** Once you have 6+ months of cohort data, implement the Method 3 forecast from Section 9. This becomes critical for cash flow planning (when can Ivan hire?) and for investor conversations.

**11. Implement automated anomaly detection.** Use the P0/P1 alerts from Section 10. At scale, shift from Slack notifications to a proper monitoring system. A simple approach: run a daily cron job that compares today's metrics against trailing averages and fires alerts on significant deviations (>2 standard deviations).

**12. Evaluate whether to keep ChartMogul or build custom.** At $10K+ MRR, ChartMogul's free tier ends. Decision: pay $100/mo for ChartMogul Scale, or invest 2-3 days building custom cohort queries (Section 12 provides the templates). If Parcel needs custom dimensions (e.g., retention by acquisition channel, LTV by property strategy analyzed), custom wins.

### Anti-Patterns to Avoid

**13. Do not build analytics infrastructure before you have 20 paying customers.** Stripe Dashboard + ChartMogul free tier is sufficient. Every hour spent on analytics tooling pre-PMF is an hour not spent on the product.

**14. Do not use a separate analytics database (Redshift, BigQuery, etc.) until >$50K MRR.** PostgreSQL on Railway handles analytics queries on billing data trivially at Parcel's scale. A single `subscriptions` table with 10,000 rows returns any query in <50ms.

**15. Do not implement real-time MRR calculation.** Recalculate MRR daily via a cron job or on-demand when the dashboard loads. Real-time MRR adds complexity (webhook ordering, race conditions) with zero practical benefit -- no decision changes based on whether MRR is $4,830 or $4,859 at 2:47 PM.

**16. Do not track vanity metrics.** Total signups, page views, and "registered users" feel good but don't inform decisions. Focus on: MRR, trial conversion rate, monthly churn rate, and Quick Ratio. Four numbers tell you everything.

### Priority Summary

| Priority | Action | Effort | When |
|----------|--------|--------|------|
| P0 | Store raw Stripe webhooks | 2 hours | Week 1 |
| P0 | Build subscriptions + subscription_events tables | 4 hours | Week 1 |
| P0 | Stripe Dashboard as primary analytics | 0 hours | Day 1 |
| P1 | ChartMogul free tier | 1 hour | Week 1 |
| P1 | Slack alerts (3 webhooks) | 2 hours | Week 1 |
| P2 | Analytics events table + tracking | 6 hours | Month 2 |
| P2 | Founder Pulse dashboard page | 4 hours | Month 2 |
| P2 | Trial engagement scoring + emails | 4 hours | Month 2 |
| P3 | Expansion trigger analysis | 2 hours | Month 4 |
| P3 | Cohort-based forecasting | 6 hours | Month 6+ |
| P3 | Anomaly detection cron | 3 hours | Month 6+ |

**Total Phase 1 effort: ~9 hours.** That's one focused day to have a complete billing analytics foundation that scales to $10K MRR without additional investment.

---

*End of research document.*
