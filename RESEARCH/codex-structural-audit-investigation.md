# Codex Structural Audit — Investigation Report

> Investigated: April 5, 2026
> Source: Codex GPT-5.4/xhigh structural review
> Methodology: Read every referenced file, ran tsc, traced code paths

---

## Finding 1: Frontend TypeScript Build Failure

**Status: CONFIRMED**
**Severity: Medium (no runtime crashes, all are strict-type or unused-import issues)**

`npx tsc --noEmit` produces **166 error lines** across **31 files**. `npx vite build` passes because Vite uses esbuild (strips types, no checking).

### Error Categories

| Category | Count | Runtime Risk | Example |
|---|---|---|---|
| TS6133: Unused imports/variables | 27 | None | `'useMemo' declared but never read` |
| TS2322: Lucide icon type mismatch | 10 | None | `ForwardRefExoticComponent` vs narrow `ComponentType<{size?: number}>` |
| TS2352: Unsafe `as` casts | 5 | Low | `PipelineCard as Record<string, unknown>` |
| TS2339: Missing properties | 5 | **Medium** | `.items` on `RehabProject[]`, `.data` on `PropertyListResponse` |
| TS2341: Private property access | 3 | None | `AnimationController.ctx` in SpiralBackground |
| TS6196: Unused type imports | 3 | None | `'PLUS_FEATURES' declared but never used` |
| TS2345: Wrong argument types | 2 | **Medium** | `TraceAddressRequest` missing `compliance_acknowledged` |

### Errors That Could Cause Runtime Issues

1. **SkipTracingPage.tsx** — `TraceAddressRequest` missing `compliance_acknowledged` field (already fixed in adversarial review)
2. **RehabsPage.tsx** — accessing `.items` on a plain array response (would fail at runtime if code path is hit)
3. **PropertyDetailPage.tsx** — accessing `.data` on `PropertyListResponse` (wrong response shape)
4. **CashFlowBreakdown.tsx** — useMemo dependency array typing

### Files with Errors

`ComparisonRadar.tsx`, `command-palette.tsx`, `ConversationThread.tsx`, `StatusBadge.tsx`, `document-detail.tsx`, `AddInstrumentModal.tsx`, `RecordPaymentModal.tsx`, `FeatureSection.tsx`, `HeroSection.tsx`, `HowItWorks.tsx`, `SpiralBackground.tsx`, `landing-utils.ts`, `deal-card.tsx`, `SkipTraceResultCard.tsx`, `TodayCashFlowChart.tsx`, `api.ts`, `Dashboard.tsx`, `PricingPage.tsx`, `AnalyzePage.tsx`, `CashFlowBreakdown.tsx`, `StrategyComparison.tsx`, `BuyerDetailPage.tsx`, `FinancingDashboardPage.tsx`, `ObligationsPage.tsx`, `CampaignBuilderPage.tsx`, `PropertyDetailPage.tsx`, `RehabDetailPage.tsx`, `RehabsPage.tsx`, `SharedReportPage.tsx`, `SkipTracingPage.tsx`, `TransactionsPage.tsx`

**Root cause:** No CI step runs `tsc --noEmit`. Vite's esbuild transpiler strips types without checking them.

**Recommended fix:** Add `npx tsc --noEmit` to CI. Fix the 5 real bugs first (TS2339/TS2345), then clean up unused imports. ~2 hours.

---

## Finding 2: Auth Half-Migration (Clerk + Legacy)

**Status: CONFIRMED**
**Severity: High (SSE auth gap + no CSRF + no token revocation)**

### Authentication Flow Map

| Path | Clerk Bearer | Legacy Cookie | Notes |
|---|---|---|---|
| `api.ts` requests | Primary (cached token) | Fallback (`credentials: include`) | Dual-mode works |
| `chat-stream.ts` SSE | **MISSING** | Only (`credentials: include`) | Breaks if Clerk-only |
| `AnalyzePage.tsx` SSE | **MISSING** | Only (`credentials: include`) | Same gap |
| Login/Register | N/A | Sets httpOnly cookie | Legacy only |
| Refresh | N/A | Cookie-only | No Bearer support |

### Key Issues

1. **SSE skips Bearer token**: `chat-stream.ts` (lines 23-29) and `AnalyzePage.tsx` SSE use `credentials: 'include'` but never set `Authorization` header. If a user authenticates via Clerk only (no legacy cookie), SSE endpoints fail silently.

2. **No CSRF protection**: No CSRF tokens, no `Sec-Fetch-*` header validation, no Origin checking on state-changing endpoints (`/login`, `/register`, `/refresh`). CORS is configured but `SameSite=None` in production allows cross-site cookie use.

3. **No token revocation**: Logout (auth.py:156-166) deletes cookies but doesn't invalidate the JWT. A captured token remains valid until natural expiry (15 min access, 7 days refresh). No server-side token blacklist.

4. **ClerkProviderWrapper** (auth/ClerkProviderWrapper.tsx): Simple wrapper — renders `ClerkProvider` if `VITE_CLERK_PUBLISHABLE_KEY` is set, otherwise renders children directly. Does NOT fetch tokens — that's delegated to authStore.

5. **`get_current_user()`** (jwt.py) accepts BOTH Clerk Bearer and legacy cookie JWT. Clerk is tried first (from `Authorization` header), then falls back to `access_token` cookie. This dual-mode works but creates maintenance surface.

**Root cause:** Clerk was added as an overlay on the legacy JWT system without fully migrating all auth touchpoints. SSE endpoints were missed.

**Recommended fix:** Add `...getAuthHeaders()` to SSE fetch calls. Add CSRF token for cookie-based auth. ~3 hours.

---

## Finding 3: dealId vs propertyId Route Confusion

**Status: CONFIRMED — CRITICAL BUG**
**Severity: Critical (multiple navigation paths send wrong ID, causing 404s or wrong data)**

### Route Definitions (App.tsx)

- `/analyze/results/:propertyId` → `AnalysisResultsPage` (expects property ID)
- `/analyze/deal/:dealId` → `ResultsPage` (legacy, expects deal ID)

### Navigation Paths That Send Wrong ID

| Source | Navigation Target | ID Sent | Expected | Bug? |
|---|---|---|---|---|
| `AnalyzePage.tsx:179` | `/analyze/results/${property.id}` | property ID | property ID | OK |
| `useDeals.ts:24` | `/analyze/results/${deal.id}` | **deal ID** | property ID | **BUG** |
| `deal-card.tsx:134` (deals list) | `/analyze/results/${deal.id}` | **deal ID** | property ID | **BUG** |
| `command-palette.tsx:312` | `/analyze/results/${deal.id}` | **deal ID** | property ID | **BUG** |
| `Dashboard.tsx` | `/analyze` | N/A | N/A | OK |

### Impact

When user clicks a deal from the pipeline, deals list, or command palette, `AnalysisResultsPage` receives a deal ID but calls `api.properties.get(propertyId)` — this returns a 404 or wrong property. The `DealListItem` type has no `property_id` field, so the fix requires either:
- Adding `property_id` to deal responses and using it for navigation
- Or redirecting through the deal's associated property

**Root cause:** Two parallel concepts (deals and properties) with separate ID spaces. Deals reference properties but the navigation shortcuts skip the indirection.

**Recommended fix:** Add `property_id` to `DealListItem` type and backend response. Update all navigation to use `deal.property_id`. ~2 hours.

---

## Finding 4: SSE Analysis Stale State Bug

**Status: CONFIRMED — React stale closure bug**
**Severity: High (successful analysis can dump user back to input)**

### The Bug

In `AnalyzePage.tsx`, `startStream()` is a `useCallback` with dependency `[navigate]`. Inside it, `handleSSEEvent` is defined as a closure that captures `partialResult` at the time `startStream()` was created.

```
startStream() created with partialResult = null
  → SSE starts streaming
  → enrichment event → setPartialResult({...}) updates state
  → scenario event → setPartialResult({...}) updates state
  → complete event fires → reads partialResult → STILL NULL (stale closure)
  → falls back to setState('input') → user sees input page, not results
```

The `complete` handler at ~line 156 checks `if (partialResult)` but reads the value from the closure, not the current state. Since `partialResult` was `null` when the callback was created, the `complete` handler always sees `null`.

### Failure Mode

User enters an address → analysis runs → data streams in → "complete" fires → user gets dumped back to the input form instead of seeing results. The analysis actually succeeded but the navigation never happened.

**Root cause:** Classic React stale closure. `partialResult` is not in the `useCallback` dependency array, and `setPartialResult` updates state but doesn't update the captured closure variable.

**Recommended fix:** Use a ref (`useRef`) to track the latest partialResult alongside the state, or restructure to use the ref in the complete handler. ~1 hour.

---

## Finding 5: Existing-Property Reanalysis Data Loss

**Status: CONFIRMED**
**Severity: High (repeat analyses get empty scenarios)**

### The Bug

In `service.py`, `_build_data_sources()` (line 69) stores provenance metadata:
```python
sources[field_name] = {
    "source": "rentcast",
    "timestamp": "2026-04-05T...",
    "confidence": "single_source",
}
```

It does NOT store a `"value"` key.

But the duplicate-property path (line ~200) tries to read `src["value"]`:
```python
if isinstance(src, dict) and "value" in src:  # Always False
    val = src["value"]
    if field_name == "estimated_value" and val:
        scenario.purchase_price = val
```

Since `"value"` is never in `data_sources`, the condition always fails. Re-analysis of an existing property creates a new scenario with empty `purchase_price`, `monthly_rent`, `after_repair_value`, and `repair_cost`.

### Impact

First analysis: full data. Second analysis of same address: empty scenario, no metrics, broken charts.

**Root cause:** `_build_data_sources()` was designed for provenance tracking only, but the duplicate path assumed it stored actual values.

**Recommended fix:** Either store values in `data_sources` or copy fields from the existing property/scenario directly. ~1 hour.

---

## Finding 6: Blocking I/O in Async SSE Route

**Status: CONFIRMED**
**Severity: Critical under load (single-user fine, 10+ users breaks)**

### Blocking Calls in `async def event_stream()`

| Call | File | Method | Blocks For |
|---|---|---|---|
| `parse_address()` | address_parser.py:97 | `urlopen()` sync | 1-2s (geocoding) |
| `enrich_property()` → `_fetch_rentcast()` | rentcast.py:57 | `urlopen()` sync | 2-5s |
| `enrich_with_bricked()` | bricked.py:138 | `httpx.Client()` sync | 15-30s |
| `_run_calculator_on_scenario()` | analysis.py:487 | CPU-bound sync | <100ms |

The SSE endpoint is `async def` but all provider calls are sync, blocking the FastAPI event loop. During a Bricked call (15-30s), ALL other async operations on that worker process are frozen.

**Note:** `bricked.py` already has an async version (`fetch_property_analysis_async` using `httpx.AsyncClient`) at line 191 — it's just not used in the SSE path.

**Impact:** Works fine with 1 user. With 10 concurrent analyses, response times spike to 30s+ for all users as sync calls serialize on the event loop.

**Recommended fix:** Wrap sync calls in `asyncio.to_thread()` or use the existing async Bricked client. ~2 hours.

---

## Finding 7: Background Job Silent No-Op

**Status: PARTIALLY CONFIRMED (resolved now that Redis is configured)**
**Severity: Was Critical, now Low**

### How It Works

`tasks/__init__.py` checks `REDIS_URL`. If missing:
- No Dramatiq broker is initialized
- All task actors become `_NoopActor` instances
- `.send()` only logs a warning and returns
- No error is raised to callers

`documents.py` and `reports.py` call `.send()` without checking broker status. They return success responses ("processing", "generating") even when no worker will ever process the job.

### Current Status

Redis IS now configured (`REDIS_URL` is set in `.env`), so the broker initializes and tasks are enqueued. However:
- The Dramatiq worker process (`Procfile: worker: ...dramatiq core.tasks...`) must be running separately
- If only the web process runs (no worker), jobs are enqueued to Redis but never consumed

**Recommended fix:** Add a `/health/worker` endpoint that checks broker connectivity. Add a UI indicator when jobs are pending but no worker is consuming. ~2 hours.

---

## Finding 8: Report View Counting + Chunker Bug

**Status: PARTIALLY CONFIRMED**
**Severity: Low (view counting edge case) + Medium (chunker oversized chunks)**

### View Counting

In `reports.py:354-362`, the shared report endpoint checks if the viewer is the report owner:
```python
payload = verify_token(token)
if payload and str(payload.get("sub")) == str(report.created_by):
    should_count = False
```

`verify_token()` returns a dict with `sub` (user ID string). The comparison `payload.get("sub") == str(report.created_by)` is correct — both are UUID strings. The exception handler catches verification failures gracefully. **Codex's claim that `verify_token()` returns a user-id string is wrong** — it returns a claims dict.

**Minor issue:** If the cookie is expired/invalid, the exception is caught and `should_count` stays True, so the owner's views get counted when their session expires. Low impact.

### Chunker

In `chunker.py`, `_split_sentences()` returns the full text as a single element when no sentence boundaries exist. If that text exceeds `chunk_size`, it creates one oversized chunk with no splitting.

`test_chunker.py` has 7 test cases but **none test text without punctuation**.

**Recommended fix:** Add a hard-split fallback (split on word boundaries at chunk_size). Add test case. ~1 hour.

---

## Finding 9: random.py Shadowing stdlib

**Status: CONFIRMED**
**Severity: Medium (can break any backend code importing `random` from repo root)**

File: `/Users/ivanflores/parcel-platform/random.py`

This is a scratch utility file (markdown/HTML table parser for decoding grid messages). It contains `decode_message_from_markdown_url()`, `decode_message_from_html()`, and `TableParser`.

When running Python from the repo root directory (e.g., `cd parcel-platform && python -c "import random"`), this file shadows Python's stdlib `random` module. Any code that does `import random` would get the grid decoder instead of `random.randint()`, `random.choice()`, etc.

**Current impact:** Limited — backend code runs from `backend/` subdirectory, not repo root. But `cd parcel-platform && python backend/some_script.py` would break.

**Recommended fix:** Delete or rename the file. ~1 minute.

---

## Summary

| Finding | Status | Severity | Effort |
|---|---|---|---|
| 1. tsc failures | Confirmed | Medium | 2h |
| 2. Auth half-migration | Confirmed | High | 3h |
| 3. dealId vs propertyId | **Confirmed — Critical** | Critical | 2h |
| 4. SSE stale state | **Confirmed — Critical** | High | 1h |
| 5. Reanalysis data loss | Confirmed | High | 1h |
| 6. Blocking I/O in SSE | **Confirmed — Critical** | Critical (at scale) | 2h |
| 7. Background job no-op | Partially (resolved with Redis) | Low (now) | 2h |
| 8. View counting + chunker | Partially confirmed | Low + Medium | 1h |
| 9. random.py shadowing | Confirmed | Medium | 1min |

**Top 3 to fix immediately:**
1. **Finding 3** — dealId/propertyId navigation sends wrong ID everywhere
2. **Finding 4** — SSE stale closure dumps users back to input after successful analysis
3. **Finding 6** — Blocking sync calls in async SSE will break under concurrent load
