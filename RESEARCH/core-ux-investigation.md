# Core UX Investigation — Parcel Product Loop Issues

> Date: April 6, 2026
> Status: Investigation complete, root causes identified

---

## Issue 1: Today Page — "Unable to load your briefing"

### What's actually happening

The `GET /api/today/` endpoint (backend/routers/today.py:79) queries 10+ database tables to build a daily briefing. The endpoint has **no top-level try/catch** — any unhandled exception in any of its 4 sub-builders propagates as a raw 500 error.

The frontend hook (`useToday()` in hooks/useToday.ts) uses React Query. When the backend returns 500, `isError` becomes true and TodayPage.tsx:60-77 renders the generic "Unable to load your briefing" message with no error details.

### Why it's happening

**Most likely root cause: `_build_portfolio_summary()` crashes on financing models.**

The function at today.py:183-343 has this flow:
1. Query all owned properties (safe — returns empty if none)
2. Loop through financing instruments per property (today.py:227-236)
3. Query obligations for balloon payments (today.py:297-307)
4. Query transactions for monthly actuals (today.py:311-332)

Steps 2-3 are wrapped in try/except but step 2 (`FinancingInstrument` loop at line 227) is NOT wrapped. If the `financing_instruments` table has a schema mismatch or the ORM model doesn't match the DB (e.g., a column was added in a migration but the DB hasn't been migrated), this crashes the entire endpoint.

**Secondary possible causes:**
- `_build_pipeline_summary()` (today.py:767-795) — does an unprotected join between `deals` and `pipeline_entries`. If either table has issues, 500.
- `strftime("%-d")` (today.py:96) — platform-dependent format specifier. May crash on Railway's Linux if locale isn't set. On macOS it works fine.
- Connection pool exhaustion — Railway's PostgreSQL connection limits could cause intermittent failures.

### What the user should experience

- If the briefing has no data, show the "New User" view with onboarding prompts
- If individual sections fail (tasks, financing, reports), skip them and show whatever succeeded
- If the entire endpoint fails, show the error message BUT include a one-line reason (e.g., "Server error — our team has been notified")
- The "Retry" button should work (and it does — it calls `refetch()` — the issue is the underlying data, not the retry logic)

### What it would take to fix

**Quick fix (30 min):** Wrap the entire `get_today()` endpoint body in try/except. Log the exception with `logger.exception()`. Return a minimal valid `TodayResponse` with empty arrays so the frontend renders an empty-but-functional page.

**Proper fix (2-3 hours):**
1. Wrap each sub-builder call in its own try/except at today.py:136-150
2. If `_build_portfolio_summary()` fails, return a zeroed-out portfolio (not crash the whole page)
3. If `_build_briefing_items()` fails, return empty briefing list
4. Add `logger.exception()` to every catch block (currently most use `logger.debug()` or bare `pass`)
5. Frontend: pass the error message to the UI instead of generic text

**Files:** backend/routers/today.py, frontend/src/pages/TodayPage.tsx

---

## Issue 2: Analysis Page — Wall of Red Error Text

### What's actually happening

The SSE stream endpoint (`GET /api/analysis/quick/stream` at analysis.py:381-567) has a catch-all exception handler at line 555-557:

```python
except Exception as e:
    logger.exception("SSE stream error")
    yield _sse("error", {"error": str(e), "code": "STREAM_ERROR"})
```

When an exception occurs (Pydantic ValidationError, SQLAlchemy error, provider failure), `str(e)` converts the full exception — including multi-line Pydantic field-by-field validation output — into a string and sends it to the frontend.

The frontend (AnalyzePage.tsx:166-167) takes this string and stores it as `step.detail`:
```typescript
case 'error':
  updateStep(1, 'failed', data.error || 'Error')
```

The loading state component (AnalysisLoadingState.tsx:98) then renders it as red text:
```typescript
step.status === 'failed' ? (step.detail || 'FAILED')
```

There is **no truncation, no sanitization, no user-friendly mapping.** A Pydantic ValidationError for PropertyResponse could be 20+ lines of technical output, all rendered in `text-[#F87171]` red.

### Why it's happening

**Specific failure for "1526 Indiana Ave":** The address is incomplete (no city, state, zip). The address parser may return a partial result. When RentCast is called with partial data, it may return empty/malformed results. When `PropertyResponse.model_validate(enrichment.property)` (analysis.py:456) runs on this incomplete data, Pydantic throws a `ValidationError` listing every missing/invalid field.

That ValidationError propagates to the generic catch at line 555, gets `str()`'d into a massive multi-line string, and gets piped to the frontend as a single error event.

**Additional factor — BRICKED_API_KEY is empty** (backend/.env:43: `BRICKED_API_KEY=`). The Bricked enrichment (analysis.py:476-521) returns gracefully with `status="failed"` and `error="BRICKED_API_KEY not configured"`. This is handled cleanly and is NOT the source of the wall of text. But it does mean the analysis lacks ARV/repair cost data, which could cause downstream issues.

### What the user should experience

- Address validation BEFORE submitting to the SSE stream: "Please include a city and state with the address"
- If the analysis fails mid-stream, show ONE line: "Analysis failed — try a more complete address" with a "Try Again" button
- Never show raw exception text, Pydantic validation details, or stack traces

### What it would take to fix

**Quick fix (1 hour):**
1. In the generic catch at analysis.py:555-557, sanitize the error message:
   ```python
   user_msg = "Analysis failed. Please try a more complete address (include city, state, and zip)."
   logger.exception("SSE stream error: %s", e)
   yield _sse("error", {"error": user_msg, "code": "STREAM_ERROR"})
   ```
2. In the frontend, cap error detail length at ~100 characters

**Proper fix (2-3 hours):**
1. Add address validation in the SSE endpoint BEFORE calling enrich_property — reject addresses without city/state
2. Wrap each `model_validate()` call (analysis.py:456, 529, 541) in its own try/except with a clean error message
3. Add a `_safe_error()` helper that maps exception types to user-friendly messages
4. Frontend: display errors in a styled card component, not as raw text in the step badge

**Files:** backend/routers/analysis.py (lines 456, 529, 541, 555-557), frontend/src/pages/analyze/AnalyzePage.tsx (line 167), frontend/src/pages/analyze/components/AnalysisLoadingState.tsx (line 98)

---

## Issue 3: No Address Autocomplete

### What's actually happening

The address input (AnalyzePage.tsx:263-272) is a plain `<input type="text">` with no autocomplete, no suggestions, no typeahead. When the user types "1526 Indiana Ave" and hits Analyze, it's sent verbatim to the backend.

### Why it's happening

No autocomplete infrastructure was ever built. The backend has Nominatim integration (address_parser.py:157-194) but only for single-result geocoding AFTER submission — not for real-time suggestions. There is no Google Places, Mapbox, or dedicated autocomplete endpoint.

### What the user should experience

As the user types, a dropdown appears with matching US addresses. Selecting one fills the full address (street, city, state, zip). This prevents the incomplete-address errors from Issue 2.

### What it would take to fix

**Option A: Google Places Autocomplete (recommended)**
- Add `@googlemaps/js-api-loader` to frontend
- Create an `AddressAutocomplete` component wrapping the Places Autocomplete widget
- Requires a Google Maps API key with Places API enabled (~$2.83 per 1000 requests at current pricing)
- Complexity: 2-3 hours frontend, no backend changes
- Ongoing cost: ~$3/mo at 1000 searches/mo

**Option B: Nominatim Search (free but limited)**
- Add a `/api/address/suggest?q=...` endpoint that calls Nominatim's search API
- Rate limited to 1 req/sec (Nominatim policy), which makes typeahead laggy
- Free, no API key needed
- Complexity: 2 hours (backend endpoint + frontend component)
- Quality: lower than Google Places — Nominatim doesn't autocomplete as well

**Option C: Mapbox Search (best quality, moderate cost)**
- Use Mapbox Search JS library in frontend
- Requires Mapbox access token
- 100,000 free requests/mo, then $5 per additional 1000
- Complexity: 2-3 hours
- Quality: very good, purpose-built for address search

**Recommendation:** Option A (Google Places) if budget allows. Option B (Nominatim) as free MVP with known UX limitations.

**Files:** frontend/src/pages/analyze/AnalyzePage.tsx (replace `<input>` with autocomplete component), potentially backend/routers/analysis.py (new suggest endpoint for Option B)

---

## Issue 4: Dashboard Shows 4 Properties but 0 Deals

### What's actually happening

The dashboard (Dashboard.tsx:270-273) shows two separate metrics from two separate data sources:

- **"Properties" (shows 4):** Comes from the onboarding endpoint (`GET /api/onboarding/status`), which counts `Property` records where `is_sample=False`
- **"Total Deals" (shows 0):** Comes from the dashboard endpoint (`GET /api/v1/dashboard/stats/`), which counts `Deal` records

These are **different database tables.** When a user analyzes an address via the SSE stream, `enrich_property()` (service.py:225-348) creates a `Property` + `AnalysisScenario` — but **does NOT create a `Deal` record.** Deal creation is a separate explicit action via `POST /api/v1/deals/`.

### Why it's happening

The architecture has a deliberate separation:
- **Property** = physical real estate (address, bedrooms, sqft, data sources)
- **AnalysisScenario** = one strategy's analysis on a property (inputs, outputs, risk score)
- **Deal** = a business decision to pursue a property (strategy, status, pipeline stage)

The SSE analysis flow creates Property + AnalysisScenario but stops there. Creating a Deal was designed as a conscious user action ("I want to track this") — not automatic.

**But for a new user doing their first analysis, this distinction is invisible.** They analyze a property, see results, close the tab, come back, and their dashboard shows 4 properties (including 3 samples) but 0 deals. The analysis they just did is "nowhere" from the dashboard's perspective.

### What the user should experience

**Option A (recommended):** After analysis completes, auto-create a Deal linked to the Property. This makes the dashboard metrics consistent. The analysis flow becomes: address → Property + Scenario + Deal. The user's work immediately appears in "Total Deals."

**Option B:** Remove "Total Deals" from the dashboard and show "Analyses" instead. Count AnalysisScenario records. This avoids the Deal/Property confusion entirely.

**Option C:** Add a prominent "Save as Deal" CTA on the analysis results page. After clicking, it creates the Deal record. But this requires a conscious extra step that new users won't know to take.

### What it would take to fix

**Option A — Auto-create Deal on analysis (recommended, 2-3 hours):**
1. In analysis.py's SSE stream, after the scenario is created and calculated, auto-create a `Deal` linked to the property
2. Update `enrich_property()` return value or add the Deal creation in the SSE handler at ~line 530
3. The Deal should have `status="draft"` and no pipeline entry (user can add to pipeline later)

**Files:** backend/routers/analysis.py, backend/core/property_data/service.py, backend/models/deals.py

### Additional discovery: Recent Activity items are NOT clickable

Dashboard.tsx:393-411 renders activity items as plain `<div>` elements. They have `hover:bg-[#0C0B0A]` styling (suggesting interactivity) but NO click handler, no `<Link>`, no `onClick`. The backend returns `entity_id` and `entity_type` in each activity item, but the frontend ignores these fields.

**Impact:** A user sees "Analyzed 613 N 14th St, Sheboygan, WI" in their activity feed but can't click it to navigate to that analysis. This breaks the product loop — there's no way to get back to a past analysis from the dashboard.

**Fix (1-2 hours):** Wrap each activity item in a `<Link>` that routes based on `entity_type`:
- `property_saved` / `analysis_completed` → `/analyze/results/${entity_id}`
- `deal_created` → `/analyze/deal/${entity_id}`
- `document_uploaded` → `/documents/${entity_id}`

**Files:** frontend/src/pages/Dashboard.tsx (lines 393-411)

---

## Issue 5: Previous Analysis (613 N 14th St) Not Findable

### What's actually happening

This is a consequence of Issues 4 and the activity item non-clickability:

1. The analysis created a Property + AnalysisScenario, but NOT a Deal → doesn't appear in "Deals"
2. The dashboard's "Recent Activity" shows the analysis but items aren't clickable → no navigation path
3. There's no "Recent Analyses" or "Your Properties" section on the dashboard → no browse UI
4. The Analyze page doesn't have a history/recent list → no way to find past work

### The product loop is broken

The expected flow is: Analyze → See Results → Come back later → Find results → Analyze more. Step 3 ("come back later and find results") has no path. The user's analysis exists in the database but is unreachable from any UI navigation.

### What it would take to fix

**Minimum viable fix (2-3 hours):**
1. Make activity items clickable (see Issue 4 additional discovery)
2. Add a "Recent Analyses" card to the dashboard showing the last 5 properties analyzed, each linking to `/analyze/results/${property_id}`

**Better fix (4-6 hours):**
1. All of the above
2. Add auto-Deal creation (Issue 4 Option A)
3. Add a "Your Analyses" or "Saved Properties" page accessible from the sidebar

**Files:** frontend/src/pages/Dashboard.tsx, frontend/src/components/layout/AppShell.tsx (sidebar nav), backend/routers/dashboard.py or backend/routers/properties.py (list endpoint)

---

## Summary: Priority Order

| # | Issue | Severity | Fix Time | Impact |
|---|-------|----------|----------|--------|
| 1 | **Analysis error wall** (raw exceptions shown to user) | Critical | 1 hour (quick), 3 hours (proper) | First-time users see technical garbage and never come back |
| 2 | **Today page crash** (briefing endpoint 500s) | Critical | 30 min (quick), 3 hours (proper) | Default landing page is broken for all users |
| 3 | **Past analysis unfindable** (no navigation path) | High | 2-3 hours | Users can't find their own work — product loop is broken |
| 4 | **Deal not auto-created** (property exists but no deal) | High | 2-3 hours | Dashboard metrics are confusing, analyses live in limbo |
| 5 | **Activity items not clickable** | Medium | 1-2 hours | Missed navigation opportunity, false affordance |
| 6 | **No address autocomplete** | Medium | 2-3 hours + API key | Causes incomplete address errors, bad UX vs competitors |

**Recommended sprint order:** 1 → 2 → 3+5 → 4 → 6
