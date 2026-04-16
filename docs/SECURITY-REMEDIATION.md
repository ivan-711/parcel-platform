# Security Remediation Report

**Date:** 2026-04-16
**Trigger:** User lasette04@gmail.com reported "preexisting data" and "Analyze" button bouncing to search
**Verdict:** NO DATA BREACH. See details below.

---

## TL;DR

1. **Was there an actual breach?** No. The "preexisting data" was onboarding sample data created by design 20 seconds after signup. Zero rows from other users were found under this account.
2. **Fixes shipped:** Clerk webhook identity bug fixed, RLS defense-in-depth added to 6 files, Analyze button now analyzes the current property, sample data is visually distinguished with badges and a dismissable banner.
3. **Residual risk:** None for the reported issue. Lower-priority hardening items logged in SECURITY-FOLLOWUPS.md.

---

## Phase 1 — NULL-clerk_user_id Data Assessment

Queried production database for users with `clerk_user_id IS NULL`. Found 3 rows:

| ID (8 chars) | Email | Data Rows | Classification |
|---|---|---|---|
| `03bbbedf` | test@test.com | 0 | EMPTY |
| `3f0bee9a` | test@test.com | 0 | EMPTY |
| `73f9fdc9` | codex.audit+...@example.com | 17 | DEMO (reserved domain) |

**Conclusion:** No REAL-DATA-LATENT rows exist. All NULL-clerk rows are test/development accounts. The Phase 2 webhook fix neutralizes the risk going forward regardless.

---

## Phase 2 — Clerk Webhook Identity Bug Fix

### Before
`backend/routers/clerk_webhooks.py:159-166` — `_handle_user_created()` looked up existing users by email. If a legacy row with matching email had `clerk_user_id IS NULL`, the webhook would link the new Clerk ID to that row, transferring any legacy data.

### After
Identity is keyed on `clerk_user_id` exclusively:
1. If a row with this `clerk_user_id` exists → update (idempotent replay)
2. If a legacy row with matching email exists (`clerk_user_id IS NULL`) → rename the legacy email to `orphan+<id>@parcel.local` and create a fresh row for the new signup
3. If no collision → create a new row

### Tests added
- `test_creates_new_user_with_clerk_id` — happy path
- `test_idempotent_on_duplicate_event` — replay safety
- `test_does_not_link_to_null_clerk_row_with_matching_email` — core security invariant
- `test_skips_when_email_belongs_to_different_clerk_user` — graceful collision handling
- `test_extracts_primary_email` — email parsing
- `test_falls_back_to_first_email` — fallback parsing
- `test_returns_none_for_empty` — edge case

All 7 tests pass.

---

## Phase 3 — Tenant Isolation Audit

### Methodology
Three parallel audit agents examined:
1. All 30+ backend router files for query scoping
2. Frontend API client, React Query hooks, stores, and auth flow
3. Background Dramatiq workers, SSE streams, Redis usage, and caching

### Results

**Backend routers (30+ files): ALL CLEAN**
Every authenticated endpoint uses `get_current_user`. Every query filters by `user_id`/`created_by`. Every GET-by-id filters by BOTH id AND user_id. Every INSERT sets user_id from current_user. Every UPDATE/DELETE includes user_id in WHERE.

**RLS listener: REGISTERED** at `backend/database.py:22-23`

### Findings

| # | Severity | Finding | File | Status |
|---|----------|---------|------|--------|
| 1 | MEDIUM | Background workers missing RLS context | core/tasks/*.py | FIXED |
| 2 | MEDIUM | SSE stream thread sessions missing RLS | routers/analysis.py:450, :536 | FIXED |
| 3 | LOW | Webhook handlers don't set RLS | clerk_webhooks.py, webhooks/ | Acceptable |
| 4 | INFO | React Query cache keys not user-scoped | frontend | Mitigated by logout |

### Clean areas
- All 30+ routers: proper tenant scoping on every endpoint
- Property dedup: scoped by user_id in SQL
- Billing/quota: scoped by user_id
- Shared/public endpoints: use share_token + status checks
- Onboarding: scoped by current_user.id

---

## Phase 4 — Tenant Isolation Fixes

### Fix 1: RLS context in background workers
Added `set_rls_context(db, owner_id)` after `SessionLocal()` in:
- `backend/core/tasks/document_processing.py` — both `process_document_metadata()` and `process_document_embeddings()`
- `backend/core/tasks/pdf_generation.py` — `generate_report_pdf()`
- `backend/core/tasks/skip_trace_batch.py` — `process_skip_trace_batch()`
- `backend/core/tasks/mail_campaign.py` — `send_mail_campaign()` and `check_mail_delivery()`

### Fix 2: RLS context in SSE stream threads
Added `set_rls_context(thread_db, current_user.id)` in:
- `backend/routers/analysis.py:450` — `_enrich_sync()` thread
- `backend/routers/analysis.py:536` — `_bricked_sync()` thread

---

## Phase 5 — UX Fixes and Sample Data Hygiene

### 5.1 Analyze button fix
- `PropertyDetailPage.tsx`: "Analyze" button now passes `?address=<full address>` to the analyze page
- `AnalyzePage.tsx`: Added auto-dispatch — when `?address=` is present, auto-populates and starts analysis on mount

### 5.2 Sample data visual treatment
- `SampleBadge` added to `AnalysisResultsPage.tsx` property header
- Already present on: PropertiesListPage, PropertyDetailPage, Pipeline deal-card

### 5.3 Onboarding banner
- Added `onboarding_banner_dismissed_at` column to users table (migration: `u1v2w3x4y5z6`)
- Added `POST /api/onboarding/dismiss-banner` endpoint
- Added dismissable banner to PropertiesListPage: "We added sample deals to show you around..."
- Added "Hide Samples" toggle to PropertiesListPage filter bar

### 5.4 d3bee497 sample accumulation
**Root cause confirmed:** User had 15 soft-deleted + 1 active sample properties. The 15 accumulated from repeated persona re-selections (each selection soft-deletes old samples, creates new ones). Auto-archive threshold was met (3 real properties) but the remaining active sample was created after archive ran.

**Fix:** `_clear_sample_data()` in `onboarding.py` now hard-deletes previously soft-deleted samples before soft-deleting active ones. Prevents unbounded accumulation.

---

## Phase 6 — Verification

### Test results
- Backend: 175 passed, 2 pre-existing failures (unrelated `/api/today` route)
- Frontend: `tsc --noEmit` clean, `vite build` succeeds in 5.18s
- Webhook tests: 7/7 passed

### Smoke test checklist
- [ ] Create fresh Clerk account → verify sample data has SAMPLE badge
- [ ] Verify onboarding banner appears and is dismissable
- [ ] Click "Analyze" from PropertyDetailPage → verify auto-starts analysis on that property
- [ ] Verify "Hide Samples" toggle filters sample properties from list
- [ ] Open second browser profile → verify no cross-tenant data visibility
