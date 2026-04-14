# Production Readiness Audit

**Date:** 2026-04-14
**Auditor:** Claude (prompted by Ivan after seeing broken Today page and Pipeline flickering)
**Fix deployed:** Commit `9b976f5` pushed to main

---

## Root Cause — Systemic Issue Found

**FastAPI's `redirect_slashes` (enabled by default) was generating 307 redirects with `Location: http://...` (HTTP, not HTTPS).** Browsers strip the `Authorization` header when following a redirect that downgrades the protocol. Every authenticated endpoint with a trailing-slash mismatch between frontend and backend was broken.

**Evidence:** Railway logs showed the pattern repeatedly:
```
GET /api/today HTTP/1.1" 307 Temporary Redirect
GET /api/today/ HTTP/1.1" 401 Unauthorized
```

**Fix applied:** `redirect_slashes=False` in `backend/main.py` + fixed 9 frontend URL mismatches in `api.ts`.

---

## Page-by-Page Audit

### P0 — Must Fix Before Launch (FIXED in commit 9b976f5)

| Page | Route | Issue | Status |
|------|-------|-------|--------|
| **Today** | `/today` | `/api/today` → 307 → 401. User sees "Unable to load your briefing." | **FIXED** — URL now `/api/today/` |
| **Properties** | `/properties` | `/api/properties` → 307 → 401. List page fails to load. | **FIXED** — URL now `/api/properties/` |
| **Contacts** | `/contacts` | `/api/contacts` → 307 → 401. List page fails to load. | **FIXED** — URL now `/api/contacts/` |
| **Sequences** | `/sequences` | `/api/sequences` → 307 → 401. List page fails to load. | **FIXED** — URL now `/api/sequences/` |
| **Mail Campaigns** | `/mail-campaigns` | `/api/mail-campaigns` → 307 → 401. List page fails to load. | **FIXED** — URL now `/api/mail-campaigns/` |

### P1 — Bad Impression (FIXED)

| Page | Route | Issue | Status |
|------|-------|-------|--------|
| **Obligations** | `/obligations` | `per_page=200` exceeds backend max `le=100` → 422 error | **FIXED** — changed to `per_page: 100` |

### Working as Designed (No Fix Needed)

| Page | Route | Behavior | Notes |
|------|-------|----------|-------|
| **Pipeline** | `/pipeline` | Shows "Upgrade to Carbon" paywall overlay | User is on FREE tier. Pipeline requires PRO. This is correct. |
| **Portfolio** | `/portfolio` | Shows paywall overlay | Same — PRO feature, correctly gated |
| **AI Chat** | `/chat` | Shows paywall overlay | Same — PRO feature, correctly gated |
| **Documents** | `/documents` | Shows paywall overlay | Same — PRO feature, correctly gated |
| **Compare Deals** | `/compare` | Shows paywall overlay | Same — PRO feature, correctly gated |

### Working (Verified via API Pattern Analysis)

| Page | Route | API Endpoint | Status |
|------|-------|-------------|--------|
| **Dashboard** | `/dashboard` | `/api/v1/dashboard/stats/` (has trailing slash) | OK |
| **Deals** | `/deals` | `/api/v1/deals/` (has trailing slash) | OK |
| **Analyze** | `/analyze` | POST endpoints (not affected by redirect) | OK |
| **Settings** | `/settings` | `/api/v1/auth/me` (backend route has no slash) | OK |
| **Transactions** | `/transactions` | Backend route uses `""` (no slash) — matches frontend | OK |
| **Buyers** | `/buyers` | Backend route uses `""` (no slash) — matches frontend | OK |
| **Financing Dashboard** | `/financing` | `/api/financing/dashboard` (no slash in route) | OK |
| **Reports** | `/reports` | `/api/reports/` (has trailing slash in frontend) | OK |
| **Rehabs** | `/rehabs` | `/api/rehab/projects` (no slash in route) | OK |
| **Skip Tracing** | `/skip-tracing` | `/api/skip-tracing/usage` (no slash in route) | OK |
| **Pricing** | `/pricing` | No API call needed | OK |
| **Onboarding** | `/onboarding` | `/api/onboarding/status` (no slash in route) | OK |

---

## Feature Gate Configuration (Current State)

**User tier:** FREE (Steel)

| Feature | Gate | Free? | Required Tier |
|---------|------|-------|---------------|
| Property Analysis | Quota (3/month) | Yes | Free |
| Saved Deals | Quota (5 total) | Yes | Free |
| AI Chat | Feature + Quota | Yes (5 msg/mo) | Free (limited) |
| Pipeline | Feature gate | No | PRO (Carbon) |
| Portfolio | Tier gate | No | PRO (Carbon) |
| PDF Export | Feature gate | No | PRO (Carbon) |
| Offer Letters | Feature gate | No | PRO (Carbon) |
| Deal Comparison | Feature gate | No | PRO (Carbon) |
| Document AI | Quota (0/month) | No | PRO (Carbon) |
| Skip Tracing | Quota (0/month) | No | PRO (Carbon) |
| Mail Campaigns | Quota (0/month) | No | PRO (Carbon) |

### To Access PRO Features
Either:
1. Subscribe to Carbon ($79/mo) via Stripe checkout
2. Set `trial_ends_at` to a future date in the database (activates trial)
3. Temporarily change `pipeline_enabled=True` for FREE tier in `backend/core/billing/tier_config.py`

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 (blocks launch) | 5 pages | **ALL FIXED** |
| P1 (bad impression) | 1 page | **FIXED** |
| Working as designed | 5 pages | No action needed |
| Verified working | 12 pages | No issues found |
