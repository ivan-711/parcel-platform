# Pricing model questions — open for post-launch data

Written 2026-04-18. Decision-log for open questions about Parcel's monetization model. Pre-launch speculation is cheap; post-launch data (30+ days, real users) is accurate. Answer these with data, not gut.

## Current state

Steel (free) allows 3 analyses/month, 5 AI messages/month, 5 saved deals (lifetime), and gates Pipeline, Portfolio, PDF export, offer letters, and deal comparison. All monthly quotas reset on the 1st of each calendar month UTC — not billing cycle, not rolling window (see `docs/QUOTA-RESET-BEHAVIOR.md`). Carbon ($79/mo) unlocks unlimited analyses. Titanium ($149/mo) adds team seats and higher metered limits. Per-analysis variable cost for a free user is ~$0.07-0.11 (3 RentCast calls at $0.02 each + 1 Claude Sonnet narrative at ~$0.01-0.05). Bricked.ai comps ($0.43/call) are gated to paid tiers.

## Open questions

### Q1: Should free-tier analyses reset monthly or be lifetime-capped?

**Current:** 3 analyses per calendar month, resetting on the 1st.
**Why it might be wrong:** No competitor with a permanent free tier uses monthly reset. DealCheck caps at 15 simultaneous properties (delete one to free a slot). Zilculator caps at 2 lifetime. Rehab Valuator Lite is unlimited. Monthly reset is a SaaS pattern borrowed from API products, not deal-analysis tools. A first-time investor analyzing 1 deal/month may never hit the cap — meaning the reset mechanism is invisible and the quota feels arbitrary when they do hit it on their 4th deal.
**Why it might be right:** Monthly reset gives churned free users a reason to return. It creates a predictable re-engagement loop: hit cap → wait → return → maybe convert. Lifetime caps create a one-time decision point ("I'm done with the free tier forever") with no second chance. Monthly also aligns with how users think about budgets.
**Measure:** Free-user return rate in month 2+. Do users who hit quota in month 1 come back in month 2? If >30% return and >5% of returners convert, monthly reset is generating value. If <10% return, the reset is invisible.
**Reversal cost:** HIGH. 11+ backend files hardcode `now.replace(day=1)`. Existing `usage_records` have monthly `period_start` values that would need migration. Monthly→lifetime is possible but requires a data migration and copy sweep across 4+ frontend files. Safer to launch with monthly and change later than the reverse.

### Q2: Is the conversion funnel instrumented enough to answer Q1?

**Current:** Zero. No PostHog event fires when the QuotaExceededModal appears, when a user clicks "Upgrade to Carbon," or when checkout completes. The backend has `track_event()` infrastructure (50+ feature events) and the frontend has PostHog loaded — but billing events fall into a black hole. `usage_records` tracks successful actions but not the rejection moment. No `first_quota_hit_timestamp`, no `upgrade_source` attribution, no cohort segmentation.
**Why this matters now:** Every other question in this doc requires conversion data to answer. Without instrumentation, 30 days of real users produces 30 days of silence. This is the only gap worth closing before May 12.
**What to add (5 events, ~2h):** (1) `quota_exceeded_shown` when modal renders (frontend), (2) `upgrade_clicked` with source attribution (frontend), (3) `checkout_completed` in webhook handler (backend), (4) `subscription_canceled` in webhook handler (backend), (5) `pricing_page_viewed` with referrer (frontend). All infrastructure exists — just unwired.

### Q3: Does Steel's 19-dimension complexity hurt conversion?

**Current:** A free user must internalize 7 metered quotas (3 non-zero, 4 zero), 6 boolean feature gates, and meta-info (reset schedule, upgrade path, trial eligibility) — 19 distinct concepts. The pricing page shows 5 features. The quota modal mentions different ones. DealCheck's free tier has 3 dimensions (properties, comps, photos). Zilculator has 1 (properties).
**Why it might be wrong:** Most of Steel's complexity is invisible (4 quotas are zero, 5 features are locked). But when a user bumps into a gate they didn't know existed — "I can't export a PDF?" — it feels like a trap, not a tier.
**Why it might be right:** The 5-item pricing page list is simple enough. Invisible gates only matter if users try to use them, and the modal explains the path forward.
**Measure:** Distribution of `FEATURE_GATED` vs `QUOTA_EXCEEDED` 402s. If >40% of paywalls are feature gates (not quota), users are hitting walls they didn't expect from the pricing page — and the page needs clearer communication, not necessarily fewer gates.

## What to instrument before launch

1. `quota_exceeded_shown` — fire in QuotaExceededModal on render, with `metric`, `current`, `limit`, `days_since_signup`
2. `upgrade_clicked` — fire on "Upgrade to Carbon" button, with `source` (modal/pricing/nav/trial-banner)
3. `checkout_completed` — fire in Stripe webhook handler, with `previous_tier`, `new_tier`, `trial_converted`
4. `subscription_canceled` — fire in webhook handler, with `tier`, `tenure_days`
5. `pricing_page_viewed` — fire on mount, with `referrer`, `current_tier`

## What NOT to change before launch

Do not change the reset model, quota limits, tier count, or pricing before collecting 30+ days of real conversion data. The reversal cost of monthly→lifetime is high (data migration, 15+ files, user comms). The reversal cost of launching monthly and deciding later is near-zero — you just stop resetting. Current copy is accurate. Current economics are sustainable at scale ($0.07-0.11/free analysis). Ship what you have, instrument it, then decide.

## Bug found during research

Landing page `PricingSection.tsx` shows Titanium direct mail as "50/mo" but `tier_config.py` and `PricingPage.tsx` both say 100/mo. One of these is stale.

## Decision review trigger

Revisit this doc after 30 days post-launch with >=100 free signups AND the 5 instrumentation events above shipping. Without both conditions, the data isn't actionable.
