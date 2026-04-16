# Tenant Isolation — Evidence Report

## Incident date: 2026-04-15
## Affected user: las***@gmail.com
## Report generated: 2026-04-15T23:30 UTC

---

## Summary verdict

**NO LEAK DETECTED** — The "preexisting data" is onboarding sample data created
by design 20 seconds after signup. The "bounced back to search" is a UX navigation
issue, not a server error. Zero rows from other users were found under this account.

Quick answers:

| Question | Answer |
|----------|--------|
| Does this user have other people's data attached to their row? | **No** |
| Is the analyze flow producing server errors for this user? | **No** — all requests returned 200 OK |
| Isolated or systemic? | **Systemic by design** — all onboarded users get sample data |
| Most likely root cause? | Onboarding sample data perceived as foreign data; "Analyze" button navigates to search form rather than running analysis |

---

## Section 1: User row

Single user row found. No duplicates.

| Field | Value |
|-------|-------|
| id | `f55d73fd-c9e6-...` |
| clerk_user_id | `user_3CP7eN...` |
| email | `las***@gmail.com` |
| created_at | **2026-04-15 17:50:47 UTC** |
| plan_tier | `free` |
| trial_ends_at | 2026-04-22 17:50:47 UTC (active, 7-day trial) |
| stripe_customer_id | NULL |

**Timing check**: `created_at` of 17:50:47 UTC falls within the reported ~17:30–19:00
UTC window. The user was created via the Clerk webhook (`user.created` handler in
`backend/routers/clerk_webhooks.py`). The trial period was set to 7 days from creation,
giving them effective Pro tier during the trial.

## Section 2: Row counts under this user_id

| Table | Column | Count | Notes |
|-------|--------|------:|-------|
| properties | created_by | 4 | 2 sample + 2 real |
| analysis_scenarios | created_by | 5 | 2 sample + 3 real |
| deals | user_id | 2 | auto-created by analysis flow |
| usage_records | user_id | 2 | analyses_per_month tracking |
| chat_messages | user_id | 0 | |
| contacts | created_by | 0 | |
| pipeline_entries | user_id | 0 | |
| portfolio_entries | user_id | 0 | |
| documents | user_id | 0 | |
| reports | created_by | 0 | |
| transactions | created_by | 0 | |
| All other user-scoped tables | | 0 | |

## Section 3: Sample data (counts > 0)

### Properties

| id (8 chars) | created_at | address | is_sample | is_deleted | Verdict |
|-------------|------------|---------|-----------|------------|---------|
| `fd40eb6e` | 17:51:07 | 613 N 14th St, Sheboygan, WI | **true** | **true** | Sample from 1st onboarding, later cleared |
| `34cd522a` | 17:51:37 | 3267 N Bartlett Ave, Milwaukee, WI | false | false | User-initiated analysis |
| `48572181` | 19:30:32 | 613 N 14th St, Sheboygan, WI | **true** | false | Sample from 2nd onboarding |
| `8a85355e` | 19:32:29 | 1645 S 12th St, Milwaukee, WI | false | false | User-initiated analysis |

**No misattributions.** All rows were created AFTER the user's `created_at` of 17:50:47.
The earliest row (17:51:07) is 20 seconds post-signup, which is consistent with the
onboarding persona selection flow that auto-creates sample data.

### Analysis Scenarios

| id (8 chars) | created_at | property | strategy | is_sample | Verdict |
|-------------|------------|----------|----------|-----------|---------|
| `3fc907eb` | 17:51:07 | fd40eb6e (Sheboygan) | buy_and_hold | **true** | Onboarding sample |
| `e9a95b9b` | 17:51:38 | 34cd522a (Milwaukee) | buy_and_hold | false | User analysis |
| `e3c691d8` | 17:51:57 | 34cd522a (Milwaukee) | buy_and_hold | false | User analysis (re-run) |
| `3955353b` | 19:30:32 | 48572181 (Sheboygan) | buy_and_hold | **true** | 2nd onboarding sample |
| `7e4d653d` | 19:32:30 | 8a85355e (Milwaukee) | buy_and_hold | false | User analysis |

All timestamps post-date user creation. No misattributions.

### Deals

| id (8 chars) | created_at | address | status | Verdict |
|-------------|------------|---------|--------|---------|
| `8a89f636` | 17:51:51 | 3267 N Bartlett Ave | draft | Auto-created by analysis flow |
| `4dc864d5` | 19:32:43 | 1645 S 12th St | draft | Auto-created by analysis flow |

Both auto-created by the `_auto_create_deal()` function during the analysis SSE stream.
Post-date user creation. No misattributions.

### Usage Records

Two `analyses_per_month` records, one at 17:51:38 and one at 19:32:30 — matching the
two non-sample analyses. Count=1 each. Correct behavior.

### Explanation of sample data

The onboarding flow (`backend/routers/onboarding.py`) creates sample Property +
AnalysisScenario records when a user selects their investor persona. These records
have `is_sample=True`. The user selected a persona twice (logs show two
`POST /api/onboarding/persona` requests), which is why there are two sets of sample
data (the first was soft-deleted via `_clear_sample_data()`).

This is **by design**, not a data leak. The sample data always belongs to the
requesting user and is seeded from hardcoded fixture data in
`backend/core/onboarding/sample_deals.py`.

## Section 4: Uniqueness constraints

| Check | Result |
|-------|--------|
| Duplicate clerk_user_ids | 3 NULL values (legacy test accounts with no Clerk link) — no non-NULL duplicates |
| clerk_user_id collision | `user_3CP7eN...` appears in exactly 1 user row |
| Email collision | `las***@gmail.com` appears in exactly 1 user row |

**No integrity issues found.**

## Section 5: Log analysis

Railway logs contained **181 lines** covering from the most recent container restart
through the current time. The logs **DO cover the incident window** — they include
requests from the affected user's session.

### Key findings from logs

**402 Payment Required errors are NOT from the affected user.** Two 402s appear at:

```
GET /api/analysis/quick/stream?address=3267%20N%20Bartlett%20Ave... → 402
POST /api/analysis/quick → 402
```

These are followed by a billing checkout for user `131f43aa-...` (a different account
with an expired trial and 6 analyses exceeding the free tier limit of 3). The 402s
are correct behavior for that user, not a bug.

**All requests from the affected user succeeded:**

```
POST /api/onboarding/persona → 200 OK (17:51)
GET /api/analysis/quick/stream (3267 N Bartlett Ave) → 200 OK (17:51)
GET /api/analysis/quick/stream (same address, dedup hit) → 200 OK (17:51)
POST /api/onboarding/persona → 200 OK (second persona selection)
GET /api/analysis/quick/stream (1645 S 12th St) → 200 OK (19:32)
```

**No errors found for this user:** No 4xx/5xx, no DetachedInstanceError, no SSE stream
closures, no Clerk JWT failures, no quota blocks, no exceptions.

**The "bounced back to search" is a frontend navigation issue:**

The "Analyze" button on `PropertyDetailPage.tsx:315` is a `<Link to="/analyze">` — it
navigates to the search form page, not to the analysis results. Similarly,
`PropertiesListPage.tsx:158` has `<Link to="/analyze">` labeled "Analyze Property".

When the user clicked "Analyze" on a property card, they were navigated to `/analyze`
(the search input form), which they perceived as being "bounced back to the search page."
This is the intended navigation but is confusing UX.

## Section 6: Analyze dedup cache scoping

The property dedup logic in `backend/core/property_data/service.py:126-144` is
**properly scoped by user_id**:

```python
def _find_existing_property(db, user_id, address_line1, zip_code):
    return db.query(Property).filter(
        Property.created_by == user_id,        # ← user_id IS in the key
        Property.address_line1 == address_line1,
        Property.zip_code == zip_code,
        Property.is_deleted == False,
    ).first()
```

- User ID is included in the dedup filter — no cross-tenant cache pollution
- `is_deleted == False` filter prevents dedup against soft-deleted sample data
- `force_refresh` parameter bypasses dedup entirely when set
- A dedup hit still creates a NEW AnalysisScenario (does not reuse old ones)

**No dedup-related isolation issues.**

## Section 7: Recent signups baseline

| uid (8) | created_at | props | deals | pipe | contacts | chat | scenarios |
|---------|------------|------:|------:|-----:|---------:|-----:|----------:|
| f55d73fd | 2026-04-15 17:50 | 4 | 2 | 0 | 0 | 0 | 5 |
| d3bee497 | 2026-04-09 04:13 | 19 | 10 | 1 | 0 | 0 | 21 |
| 73f9fdc9 | 2026-04-07 00:31 | 1 | 0 | 0 | 0 | 6 | 9 |
| 131f43aa | 2026-04-05 23:12 | 3 | 1 | 0 | 0 | 0 | 3 |
| 3f0bee9a | 2026-04-05 23:11 | 0 | 0 | 0 | 0 | 0 | 0 |
| 03bbbedf | 2026-04-05 23:10 | 0 | 0 | 0 | 0 | 0 | 0 |

**Sample property distribution across users:**

| uid (8) | sample_properties |
|---------|------------------:|
| d3bee497 | 16 |
| f55d73fd | 2 |
| 131f43aa | 2 |
| 73f9fdc9 | 1 |

Multiple users have sample properties — this is expected behavior from the onboarding
flow. Users with 0 properties (3f0bee9a, 03bbbedf) likely did not complete onboarding.

**No evidence of a systemic signup-seed bug.** All sample data is traceable to the
onboarding persona selection flow and marked with `is_sample=True`.

## Section 8: Seed / demo / webhook side effects

### Clerk webhook (`user.created`)

`backend/routers/clerk_webhooks.py:147-177` — Creates a minimal user row with only
`name`, `email`, `clerk_user_id`, and `role="investor"`. **No data insertion** beyond
the user row itself. No properties, deals, scenarios, or other resources are created.

If a user row with the same email already exists (legacy migration), the handler links
the Clerk ID to the existing row rather than creating a new one. This could theoretically
transfer ownership of legacy data, but no such collision occurred for this user.

### Onboarding flow

`backend/routers/onboarding.py` — `POST /api/onboarding/persona` creates:
- 1 Property with `is_sample=True`
- 1+ AnalysisScenario(s) with `is_sample=True`

Data comes from hardcoded fixtures in `backend/core/onboarding/sample_deals.py`.
Each persona maps to a specific sample deal. Re-selecting a persona soft-deletes
previous sample data first (`_clear_sample_data()`).

### Auto-archive

`backend/core/onboarding/auto_archive.py` — After 3 real (non-sample) properties are
created, all sample properties/scenarios are auto-soft-deleted. Not yet triggered for
this user (they have only 2 real properties).

### Demo seed script

`backend/scripts/seed_demo.py` — Manual CLI script for seeding a demo account
(`demo@parcel.app`). Requires manual execution. **Not triggered by signup or webhook.**
Not relevant to this incident.

---

## What this evidence suggests

The user's report of "preexisting data" is explained by the onboarding sample data
system: when the user selected an investor persona, the platform auto-created a sample
property and analysis scenario marked with `is_sample=True`. The user perceived this as
foreign data because it appeared in their account immediately after signup without them
having searched for it.

The "bounced back to search" issue is a UX navigation problem: the "Analyze" button on
property pages is a link to `/analyze` (the search form), not a "run analysis" action.
This is confusing when the user expects to analyze the property they're viewing.

## What we still don't know

1. **Which specific page/button did the user click?** We don't have frontend
   analytics for this session (PostHog key is not set in production per log line 40:
   `POSTHOG_API_KEY not set — telemetry disabled`). We're inferring from available
   navigation patterns.

2. **Did the user see another user's data in the UI?** The DB evidence says no — but
   if there was a brief client-side rendering glitch (e.g., stale React Query cache
   from a previous Clerk session), it wouldn't leave a server-side trace. Without
   frontend telemetry, we can't rule this out entirely.

3. **Why did the user report data that "looked" preexisting?** If the sample address
   (613 N 14th St, Sheboygan, WI) is a real property near them, they may have
   recognized it and assumed someone else had already analyzed it. Checking whether the
   sample addresses are geographically near the user's signup location could clarify.

4. **Container restart timing**: The logs start from a container restart, so we don't
   have pre-restart log history. However, all of the user's database activity falls
   within the log window, so coverage is adequate.
