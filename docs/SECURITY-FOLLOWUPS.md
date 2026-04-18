# Security Follow-ups — Lower Priority

Items identified during the 2026-04-16 security remediation that don't need immediate action but should be addressed before scaling.

---

## Shipped (2026-04-16)

- **#2 React Query Cache Keys** — `306698e` scoped all 50+ query keys by userId across 36 files
- **#3 CORS Header Tightening** — `65dc9ba` restricted methods/headers to actual frontend usage
- **#5 clerk_user_id Unique Constraint** — `fa7726f` verified: unique index `ix_users_clerk_user_id` exists at DB level, zero duplicates

## Shipped (2026-04-18)

- **H-1 Timing-safe API key comparison** — already fixed (prior session); `hmac.compare_digest` in `sequences.py:722`
- **H-2 IP hash salt fail-closed** — `0c9c78f` explicit RuntimeError for missing IP_HASH_SALT (was opaque KeyError)
- **H-3 Advisory lock parameterized** — already fixed (prior session); parameterized `:lock_key` in `webhooks/__init__.py:43`
- **F-1 Onboarding text** — `33d181e` "Pipeline" → "Properties" in welcome text
- **M-6 Security headers** — `e74f774` HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on all API responses + vercel.json for frontend

---

## HIGH — Wave 2

### 1. PostgreSQL RLS Policies (defense-in-depth)
**Effort:** 2-3 days
**File:** `backend/core/security/rls.py` (TODO on line 10)
Current RLS is application-level only (SQLAlchemy ORM event hook). Real database-level `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` would catch any bypasses from raw SQL, direct connections, or non-ORM operations.

---

## MEDIUM

### 4. SSE Stream Timeout
**Effort:** 1 hour
**File:** `backend/routers/analysis.py:626-634`
No explicit timeout on SSE streams. Add a 5-minute max and session validity check.

---

## LOW

### 8. A11y: Missing Description for DialogContent
**Effort:** 30 min
**File:** MetricTooltip or similar Radix Dialog usages
Console warning: "Missing Description or aria-describedby={undefined} for DialogContent". Add a Description child or aria-describedby to relevant Radix dialog usages.

### 9. CSP: Google Maps gen_204 Beacon
**Effort:** 30 min
**File:** `backend/main.py` (SecurityHeadersMiddleware)
CSP now configured (M-6, `e74f774`). Policy allows `https://*.googleapis.com` in connect-src and script-src. Monitor for gen_204 beacon violations in Chrome DevTools — loosen if needed.

### 6. Module-level Token Cache
**Effort:** 1 hour
**File:** `frontend/src/lib/api.ts:38-73`
`_clerkTokenCache` is module-level, not per-user. Mitigated by Clerk token lifecycle (refreshes every 50s) but could be scoped.

### 7. localStorage User Data
**Effort:** 1 hour
**File:** `frontend/src/stores/authStore.ts`
User profile stored in localStorage as plaintext JSON. Only contains non-sensitive data (name, email, tier) and JWT is NOT stored there. Consider using sessionStorage instead.

### 10. Safari Stream→Results Cache Hydration
**Effort:** Investigation
Safari private mode doesn't populate router state from the SSE stream the same way Chrome does. Currently masked by the scenario-ID fallback in loadFromAPI(). Post-launch: investigate and unify cache behavior.

---

## Post-launch growth experiments

### Card-required free trial (deferred from 2026-04-17)
Evaluated and deferred. Ship pure Steel-default for launch.
After 2-3 weeks of real conversion data, decide whether to
add an opt-in 7-day Carbon trial gated on credit card entry.

Design when revisited:
- Default: Steel (free, 3 analyses/month)
- Optional: "Try Carbon free for 7 days" with card required
- Stripe handles trial mechanism via trial_period_days on subscription
- Must include: clear "card required, cancel anytime" copy, in-app self-serve
  cancellation via Stripe customer portal, day-5 reminder email before conversion
- Metric to watch: Steel → Carbon conversion rate pre-experiment vs. during
- Config: `TRIAL_PERIOD_DAYS` in `backend/core/billing/config.py` is reserved for this
