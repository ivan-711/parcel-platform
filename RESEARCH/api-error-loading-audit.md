# API, Error Handling, Loading States & Empty States Audit

> Date: 2026-03-02
> Scope: All files in `frontend/src/` — pages, hooks, components, lib
> Auditor: Claude (frontend reliability audit)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Part 1: API Client Audit](#part-1-api-client-audit)
3. [Part 2: React Query Usage Audit](#part-2-react-query-usage-audit)
4. [Part 3: Loading States](#part-3-loading-states)
5. [Part 4: Empty States](#part-4-empty-states)
6. [Part 5: Error States](#part-5-error-states)
7. [Summary Tables](#summary-tables)
8. [Prioritized Fix List](#prioritized-fix-list)

---

## Executive Summary

The Parcel Platform frontend has a **solid foundation** for API handling, loading, and error states. The API client (`api.ts`) is well-structured with 401 interception, and most pages use skeleton screens for loading (compliant with design rules). However, the audit uncovered **19 distinct issues** across the categories below:

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 (Critical)** | 2 | Issues that will cause crashes or data loss |
| **P1 (High)** | 5 | Issues that degrade UX significantly or mask errors |
| **P2 (Medium)** | 7 | Issues that are suboptimal but functional |
| **P3 (Low)** | 5 | Minor improvements and hardening |

---

## Part 1: API Client Audit

**File:** `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts`

### 1.1 Error Handling

**HTTP errors: GOOD.** Both `request()` and `requestPublic()` check `res.ok` and throw a structured error message extracted from the response JSON body. If the body can't be parsed, a fallback `"Unknown error"` is used.

**Network errors: PARTIAL.** The `fetch()` call is not wrapped in a try/catch, meaning if the user is offline or DNS fails, the raw `TypeError: Failed to fetch` will propagate. This is **not caught or transformed** into a user-friendly message.

| ID | Issue | Severity | Line | Recommendation |
|----|-------|----------|------|----------------|
| API-1 | No network error wrapping in `request()` or `requestPublic()` | P2 | 37, 62 | Wrap `fetch()` in try/catch, rethrow as a user-friendly `"Network error — check your connection"` message. This helps React Query `error.message` display something useful. |

### 1.2 401 Handling

**GOOD.** Line 43-46: On 401, `clearAuth()` is called via Zustand, which removes `parcel_user` from localStorage and sets `isAuthenticated: false`. The `ProtectedRoute` wrapper in `App.tsx` will then redirect to `/login`. The error `"Session expired"` is also thrown so callers can react.

**Edge case:** `requestPublic()` does NOT handle 401 (line 61-76). This is correct since public endpoints (login, register, forgot-password, shared deal) should never return 401 for auth reasons.

| ID | Issue | Severity | Line | Recommendation |
|----|-------|----------|------|----------------|
| — | No issue | — | — | 401 handling is correct |

### 1.3 Response Type Validation

**WEAK.** The `request<T>` function uses `res.json() as Promise<T>` (line 57). This is a TypeScript-only cast — there is **no runtime validation** that the response matches the expected type `T`. If the backend returns a different shape (e.g., during a breaking API change), the frontend will silently pass bad data to components.

| ID | Issue | Severity | Line | Recommendation |
|----|-------|----------|------|----------------|
| API-2 | No runtime response validation | P3 | 57 | Consider adding Zod schemas for critical endpoints (dashboard stats, deals list) to catch shape mismatches early. Not urgent but adds resilience. |

### 1.4 Retry Logic

**NONE at the API level.** The `request()` function does not implement retries. However, React Query's default `retry: 3` with exponential backoff handles this at the hook level, which is the correct pattern.

| ID | Issue | Severity | Line | Recommendation |
|----|-------|----------|------|----------------|
| — | No issue | — | — | React Query handles retries appropriately |

### 1.5 Race Conditions

**204 body parsing: GOOD.** Line 53-55 correctly returns `{} as T` for 204 No Content, avoiding the `body stream already read` error.

**Concurrent mutations:** No request deduplication is in place, but React Query's mutation state (`isPending`) is used on most buttons to disable during flight. One exception:

| ID | Issue | Severity | Line | Recommendation |
|----|-------|----------|------|----------------|
| API-3 | `handleBulkDelete` in MyDeals fires `Promise.all` with parallel DELETE calls — no deduplication if user double-clicks | P3 | MyDeals.tsx:108-121 | The `isDeleting` state guards the button but the AlertDialog OK button does not check `isDeleting` before calling `handleBulkDelete`. Add `disabled={isDeleting}` to the AlertDialogAction (already there on line 415). Actually this IS guarded — not an issue. |

### 1.6 Chat Streaming

**File:** `/Users/ivanflores/parcel-platform/frontend/src/lib/chat-stream.ts`

**GOOD.** Uses fetch + ReadableStream (not EventSource) which is correct for POST requests. Has AbortController support. Handles SSE chunk boundaries with a rolling buffer. Properly releases the reader lock in `finally`.

| ID | Issue | Severity | Line | Recommendation |
|----|-------|----------|------|----------------|
| API-4 | `chat-stream.ts` does not handle 401 — if the session expires mid-chat, the user gets `"HTTP 401"` instead of being redirected to login | P2 | chat-stream.ts:30 | Check `res.status === 401` before throwing, and call `useAuthStore.getState().clearAuth()` like `request()` does. |

---

## Part 2: React Query Usage Audit

### Complete Hook Inventory

#### Queries (useQuery)

| # | Hook/Location | Query Key | `staleTime` | `enabled` | Error Handled? | Loading Handled? |
|---|---------------|-----------|-------------|-----------|----------------|------------------|
| 1 | `useDashboard` | `['dashboard-stats']` | 30s | default (always) | Yes (Dashboard.tsx:170) | Yes (skeleton, :152) |
| 2 | `useDeals` | `['deals', filters]` | 30s | default | Yes (MyDeals.tsx:282) | Yes (skeleton, :295) |
| 3 | `useDeal` | `['deals', dealId]` | default (0) | `!!dealId` | **NO** | Yes (skeleton, ResultsPage:106) |
| 4 | `usePortfolio` | `['portfolio']` | 30s | default | **NO** | Yes (skeleton, :416) |
| 5 | Activity query | `['activity']` | 60s | default | **NO** | Yes (skeleton, Dashboard:368) |
| 6 | Pipeline query | `['pipeline']` | default (0) | default | Yes (PipelineError) | Yes (column-skeleton) |
| 7 | Documents query | `['documents', page]` | default (0) | default | **NO** | Yes (SkeletonList) |
| 8 | Document detail | `['document', selectedId]` | default (0) | `!!selectedId` | **NO** (partial — handles `failed` status but not query error) | Yes (custom skeleton) |
| 9 | Chat history | `['chat-history', ...]` | Infinity | default | **NO** | Yes (skeleton bubbles) |
| 10 | User profile (Settings) | `['me']` | default (0) | default | **NO** | Yes (skeleton) |
| 11 | Notification prefs | `['notification-preferences']` | default (0) | default | **NO** | **NO** |
| 12 | Shared deal | `['share', dealId]` | default (0) | `!!dealId` | Yes (ErrorState) | Yes (LoadingState) |
| 13 | Offer letter | `['offer-letter', dealId]` | 0 | `isOpen && !!dealId` | Yes (with retry) | Yes (skeleton) |
| 14 | Command palette deals | `['command-palette-deals', search]` | 60s | `open && search.length > 0` | **NO** | Yes ("Searching...") |
| 15 | Compare page all deals | `['deals', {per_page:100}]` | 30s | default | Yes (inline in select) | Yes (skeleton) |
| 16 | Compare deal A | `['deals', dealAId]` | default (0) | `!!dealAId` | **NO** (inherits from useDeal) | Yes (skeleton) |
| 17 | Compare deal B | `['deals', dealBId]` | default (0) | `!!dealBId` | **NO** | Yes |

#### Mutations (useMutation)

| # | Hook/Location | Success Callback | Error Callback |
|---|---------------|------------------|----------------|
| 1 | `useLogin` | `setAuth + navigate` | **NO** (error shown via `login.error`) |
| 2 | `useRegister` | `setAuth + navigate` | **NO** (error shown via `register.error`) |
| 3 | `useLogout` | `clearAuth + navigate` | `clearAuth + navigate` (good) |
| 4 | `useCreateDeal` | `navigate to results` | **NO** (no error handling) |
| 5 | `useAddToPipeline` | `invalidateQueries` | **NO** (handled inline in ResultsPage) |
| 6 | `useUpdateDeal` | `invalidateQueries` | **NO** (handled inline in ResultsPage) |
| 7 | Delete deal (MyDeals) | `invalidate + toast` | `toast.error` (good) |
| 8 | Delete deal (ResultsPage) | `toast + navigate` | `toast.error` (good) |
| 9 | Pipeline updateStage | `invalidate + clear local` | `invalidate + rollback` (good) |
| 10 | Pipeline remove | `invalidate + clear local` | `invalidate + rollback` (good) |
| 11 | Document upload | `invalidate + toast` | `toast.error` (good) |
| 12 | Document delete | `invalidate + toast` | `toast.error` (good) |
| 13 | Portfolio add | `invalidate + toast` | `toast.error` (good) |
| 14 | Portfolio edit | `invalidate + toast` | `toast.error` (good) |
| 15 | Close deal | `toast + invalidate` | `setSubmitError` (good) |
| 16 | Profile update | `toast + sync store` | `setProfileMsg error` (good) |
| 17 | Password update | `toast + clear fields` | `setPasswordMsg error` (good) |
| 18 | Notification update | `invalidate + saved state` | `setNotifError` (good) |

### Specific Issues Found

| ID | Issue | Severity | File:Line | Recommendation |
|----|-------|----------|-----------|----------------|
| RQ-1 | `useDeal` has no `isError` handling — `ResultsPage` shows skeleton forever if API returns error | P0 | ResultsPage.tsx:106 | The condition `if (isLoading \|\| !deal)` lumps together loading and error. If the API fails, `isLoading` becomes false, `deal` is undefined, so user sees **infinite skeleton**. Must destructure `isError` and show error UI. |
| RQ-2 | `usePortfolio` has no error handling — `PortfolioPage` shows skeleton forever on error | P1 | PortfolioPage.tsx:416 | Same pattern as RQ-1. `if (isLoading)` returns skeleton, but if the query fails, the page proceeds with `data = undefined`, `summary = undefined`, `entries = []`. User sees an apparently working but empty page with no error indication. |
| RQ-3 | Activity query in Dashboard has no `isError` handling | P2 | Dashboard.tsx:116-120 | If activity fails, the section just shows nothing (no error, no loading). Silent failure. |
| RQ-4 | Documents page has no `isError` handling | P1 | DocumentsPage.tsx:71 | If documents list fails to load, the page shows nothing. No error message, no retry. |
| RQ-5 | Document detail `useQuery` has no error handling for query-level errors | P2 | document-detail.tsx:269 | The component handles `doc.status === 'failed'` (backend processing error) but NOT query-level errors (network failure, 500). If `useQuery` errors, `isLoading` = false, `doc` = undefined, and the component returns `null` (line 315), which is a blank panel. |
| RQ-6 | Settings page `useQuery(['me'])` has no error handling | P2 | SettingsPage.tsx:32 | If the profile fetch fails, `isLoading` becomes false, `user` is undefined, and the form renders with empty strings. The user can't tell there was an error. |
| RQ-7 | Settings notification prefs query has no loading or error handling | P2 | SettingsPage.tsx:52 | The switch defaults to `false` via `notifPrefs?.email_notifications ?? false`. If the request fails, user sees unchecked switch with no error. |
| RQ-8 | Chat history query has no error handling | P3 | ChatPage.tsx:110 | If history fails to load, the chat just shows the empty state, which is acceptable since chat is still functional. Low priority. |
| RQ-9 | `useCreateDeal` mutation has no `onError` callback | P1 | useDeals.ts:20-26 | If deal creation fails (e.g., server validation error), nothing happens. The user is stuck on the form with no feedback. The form submit button should show the error. |
| RQ-10 | Compare page: individual deal fetches have no error handling | P2 | ComparePage.tsx:75-76 | If either `useDeal(dealAId)` or `useDeal(dealBId)` errors, the comparison table just shows "---" placeholders. No error message. |
| RQ-11 | `QueryClient` created with no `defaultOptions` | P2 | App.tsx:31 | The QueryClient has no global error handler, no default staleTime, no retry configuration. Defaults are OK but setting `retry: 2` and a global `onError` would improve resilience. |
| RQ-12 | Command palette: deals query fetches ALL deals (`api.deals.list()`) instead of passing search term | P3 | command-palette.tsx:129 | The query ignores `debouncedSearch` and fetches the full list, then filters client-side. This works but wastes bandwidth. The `q` param should be passed. |

---

## Part 3: Loading States

| Page | Loading Type | Matches Layout? | Compliant? | Notes |
|------|-------------|-----------------|------------|-------|
| **Dashboard** | 4 SkeletonCards + 2 SkeletonCards | Yes (matches KPI grid + sections) | GOOD | |
| **MyDeals** | 6 SkeletonCards in 3-column grid | Yes (matches deal card grid) | GOOD | |
| **Pipeline** | Column-skeleton in each column | Yes (matches Kanban columns) | GOOD | Shimmer animation is custom CSS, not a spinner |
| **ResultsPage** | 4 SkeletonCards + 2 SkeletonCards | Yes (matches KPI row + content) | GOOD | |
| **AnalyzerFormPage** | N/A (no data fetching) | N/A | GOOD | Static form, no loading state needed |
| **StrategySelectPage** | N/A (no data fetching) | N/A | GOOD | Static content |
| **PortfolioPage** | 4 SkeletonCards + 2 SkeletonCards | Yes | GOOD | |
| **ChatPage** | Skeleton bubbles (alternating) | Yes (matches chat bubble layout) | GOOD | Nice touch with alternating left/right |
| **DocumentsPage** | SkeletonList (3 rows) | Yes (matches doc list rows) | GOOD | |
| **Document Detail** | Custom skeleton (2 blocks) | Yes | GOOD | |
| **SettingsPage** | 2 SkeletonCards | Yes (matches form sections) | GOOD | |
| **ShareDealPage** | Full custom LoadingState | Yes (matches loaded layout) | GOOD | |
| **ComparePage** | 1 SkeletonCard | Partial (only 1 card vs full table) | MINOR | Could match table layout better |
| **Login** | N/A (button shows "Signing in...") | N/A | GOOD | |
| **Register** | N/A (button shows "Creating...") | N/A | GOOD | |
| **ForgotPassword** | N/A (button shows "Sending...") | N/A | GOOD | |
| **ResetPassword** | N/A (button shows "Resetting...") | N/A | GOOD | |
| **Landing** | N/A (lazy-load fallback) | — | GOOD | Uses PageFallback from App.tsx |
| **NotFound** | N/A (static) | N/A | GOOD | |
| **OfferLetterModal** | Skeleton lines (8 lines) | Yes | GOOD | |

| ID | Issue | Severity | File | Recommendation |
|----|-------|----------|------|----------------|
| LS-1 | Compare page shows only 1 SkeletonCard during loading — should show skeleton table matching the comparison layout | P3 | ComparePage.tsx:201-205 | Add skeleton rows matching the comparison grid layout |

**Summary:** All 18 pages use skeleton screens for loading. Zero spinners. This is fully compliant with the design rules.

---

## Part 4: Empty States

| Page | Has Empty State? | Quality | Notes |
|------|-----------------|---------|-------|
| **Dashboard** | YES | Excellent | Full CTA to analyze first deal + hint cards for Pipeline/Documents/Chat |
| **MyDeals** | YES (3 variants) | Excellent | Separate empty states for: no deals, search no results, filter no results — each with appropriate CTA |
| **Pipeline** | YES | Good | `PipelineEmpty` component with CTA to analyze |
| **PortfolioPage** | YES | Good | Empty table state with inbox icon + "No closed deals yet" |
| **PortfolioPage charts** | YES | Good | Chart sections show "Add at least 2 closed deals..." when insufficient data |
| **ChatPage** | YES | Excellent | Suggested questions grid with category labels |
| **DocumentsPage** | YES | Good | `DocumentList` empty state: "No documents yet — Upload a file to get started" |
| **Document Detail (no selection)** | YES | Good | `FileSearch` icon + "Select a document to view AI analysis" |
| **ComparePage** | YES | Good | "Select two deals above to compare" |
| **SettingsPage** | N/A | — | Always has content (forms pre-filled from user data) |
| **ShareDealPage** | YES | Good | `ErrorState` covers both errors and missing deals |
| **OfferLetterModal** | N/A | — | Always generates content |

| ID | Issue | Severity | File | Recommendation |
|----|-------|----------|------|----------------|
| ES-1 | Dashboard activity section: no error-specific empty state — if API fails, it shows "No recent activity" which is misleading | P2 | Dashboard.tsx:376 | Should distinguish between "no activity" and "failed to load activity" |
| ES-2 | Portfolio page has no error state at all — if API fails, page renders with all zero KPIs and empty table, looking like a valid empty portfolio | P1 | PortfolioPage.tsx:416-430 | Add `isError` check before the `isLoading` check, show error UI with retry |

---

## Part 5: Error States

| Page | Error State? | Shows Error Message? | Can User Retry? | Notes |
|------|-------------|---------------------|-----------------|-------|
| **Dashboard** | YES | Yes (error.message) | NO (no retry button) | Error UI at line 170-185 |
| **MyDeals** | YES | Yes (error.message) | NO (no retry button) | Error box at line 282-292 |
| **Pipeline** | YES | Yes (error.message) | YES (retry button) | Full `PipelineError` component |
| **ResultsPage** | **NO** | — | — | Shows infinite skeleton on error (RQ-1) |
| **PortfolioPage** | **NO** | — | — | Shows empty-looking page on error (RQ-2, ES-2) |
| **ChatPage** | YES (inline) | Yes ("Sorry, something went wrong") | YES (can resend) | Handled in streaming catch block |
| **DocumentsPage** | **NO** | — | — | Blank page on document list error |
| **Document Detail** | PARTIAL | Only for `status=failed` docs | NO for query errors | Returns `null` on query error |
| **SettingsPage** | **NO** | — | — | Renders forms with empty data on error |
| **ShareDealPage** | YES | Yes (generic message) | NO | `ErrorState` component |
| **ComparePage** | PARTIAL | Yes (in select dropdown) | NO | Only handles deal list error, not individual deal fetch errors |
| **Login** | YES | Yes (error.message) | YES (can resubmit) | Inline error + shake animation |
| **Register** | YES | Yes (error.message) | YES (can resubmit) | Inline error + shake animation |
| **ForgotPassword** | YES | Yes (error.message) | YES (can resubmit) | Inline error |
| **ResetPassword** | YES | Yes (generic) | YES (link to retry) | Error state with "Request new reset link" |
| **OfferLetterModal** | YES | Yes (error.message) | YES (retry button) | Excellent |
| **CloseDealModal** | YES | Yes (submitError) | YES (can resubmit) | Good |

| ID | Issue | Severity | File | Recommendation |
|----|-------|----------|------|----------------|
| ER-1 | ResultsPage has no error state — infinite skeleton on API failure | P0 | ResultsPage.tsx:106 | Add `isError` check before `isLoading` check. Show error message with retry button and link back to deals. |
| ER-2 | Dashboard error state has no retry button | P2 | Dashboard.tsx:170-185 | Add a "Try again" button that calls `refetch()` |
| ER-3 | MyDeals error state has no retry button | P2 | MyDeals.tsx:282-292 | Add a "Try again" button. Currently the user must refresh the page. |
| ER-4 | `useCreateDeal` has no error handling — form silently fails | P1 | useDeals.ts:20-26, AnalyzerFormPage.tsx | The mutation's `onError` is not set. When the API returns an error (e.g., validation error), nothing happens. The submit button stays in its default state. Add `onError` with toast or inline error. |

---

## Summary Tables

### All Issues by Severity

| ID | Severity | Category | Description | File |
|----|----------|----------|-------------|------|
| ER-1 | **P0** | Error State | ResultsPage: infinite skeleton on API error | ResultsPage.tsx:106 |
| RQ-1 | **P0** | React Query | useDeal error not destructured in ResultsPage | ResultsPage.tsx:106 |
| RQ-2 | **P1** | React Query | usePortfolio error not handled | PortfolioPage.tsx:416 |
| ES-2 | **P1** | Empty State | Portfolio shows zero KPIs instead of error on failure | PortfolioPage.tsx |
| RQ-4 | **P1** | React Query | Documents page: no error state for list fetch | DocumentsPage.tsx:71 |
| RQ-9 | **P1** | Mutation | useCreateDeal has no onError — form silently fails | useDeals.ts:20 |
| ER-4 | **P1** | Error State | AnalyzerFormPage: no error feedback on deal creation failure | AnalyzerFormPage.tsx |
| API-1 | **P2** | API Client | No network error wrapping (raw TypeError on offline) | api.ts:37 |
| API-4 | **P2** | API Client | chat-stream.ts does not handle 401 | chat-stream.ts:30 |
| RQ-3 | **P2** | React Query | Dashboard activity query: no error handling | Dashboard.tsx:116 |
| RQ-5 | **P2** | React Query | Document detail: no query-error handling (returns null) | document-detail.tsx:315 |
| RQ-6 | **P2** | React Query | Settings profile query: no error handling | SettingsPage.tsx:32 |
| RQ-7 | **P2** | React Query | Settings notification prefs: no loading or error | SettingsPage.tsx:52 |
| RQ-10 | **P2** | React Query | Compare page: deal fetch errors show dashes, no error msg | ComparePage.tsx:75 |
| RQ-11 | **P2** | React Query | QueryClient has no defaultOptions | App.tsx:31 |
| ES-1 | **P2** | Empty State | Dashboard activity: "no activity" shown even on error | Dashboard.tsx:376 |
| ER-2 | **P2** | Error State | Dashboard error has no retry button | Dashboard.tsx:170 |
| ER-3 | **P2** | Error State | MyDeals error has no retry button | MyDeals.tsx:282 |
| API-2 | **P3** | API Client | No runtime response validation (type casts only) | api.ts:57 |
| RQ-8 | **P3** | React Query | Chat history error: falls back to empty (acceptable) | ChatPage.tsx:110 |
| RQ-12 | **P3** | React Query | Command palette fetches all deals, filters client-side | command-palette.tsx:129 |
| LS-1 | **P3** | Loading | Compare page skeleton doesn't match layout | ComparePage.tsx:201 |

### Page-by-Page Compliance Matrix

| Page | Loading | Empty | Error | Overall Grade |
|------|---------|-------|-------|---------------|
| Dashboard | A | A | B (no retry) | B+ |
| MyDeals | A | A | B (no retry) | B+ |
| Pipeline | A | A | A (retry) | A |
| ResultsPage | A | N/A | **F (broken)** | **D** |
| AnalyzerFormPage | N/A | N/A | **F (no error)** | **D** |
| PortfolioPage | A | A | **F (no error)** | **C** |
| ChatPage | A | A | B | B+ |
| DocumentsPage | A | A | **D (no error)** | **C+** |
| SettingsPage | A | N/A | **D (no error)** | **C** |
| ShareDealPage | A | A | A | A |
| ComparePage | B | A | C | B- |
| Login | A | N/A | A | A |
| Register | A | N/A | A | A |
| ForgotPassword | A | N/A | A | A |
| ResetPassword | A | N/A | A | A |
| OfferLetterModal | A | N/A | A (retry) | A |
| CloseDealModal | N/A | N/A | A | A |

---

## Prioritized Fix List

### P0 — Fix immediately (will crash or confuse users)

**1. ResultsPage: Add error state (ER-1 / RQ-1)**
- File: `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx`
- Line: 106
- Current: `if (isLoading || !deal)` returns skeleton forever on error
- Fix: Destructure `isError, error` from `useDeal()`. Add error state before loading check:
```tsx
const { data: deal, isLoading, isError, error } = useDeal(dealId ?? '')

if (isError) {
  return (
    <AppShell title="Deal Results">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-accent-danger shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Failed to load deal</p>
            <p className="text-xs text-text-secondary">{error instanceof Error ? error.message : 'Something went wrong.'}</p>
            <Link to="/deals" className="text-xs text-accent-primary hover:underline">Back to My Deals</Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
```

**2. useCreateDeal: Add error handling (RQ-9 / ER-4)**
- File: `/Users/ivanflores/parcel-platform/frontend/src/hooks/useDeals.ts`
- Line: 20-26
- Fix: Add `onError` callback (or return the mutation so the form page can check `createDeal.error`). The AnalyzerFormPage already has access to the mutation — just add an error display:
```tsx
// In useDeals.ts, the mutation already returns error via createDeal.error
// In AnalyzerFormPage, add after form submit button:
{createDeal.error && (
  <p className="text-accent-danger text-sm mt-2">
    {createDeal.error instanceof Error ? createDeal.error.message : 'Failed to analyze deal'}
  </p>
)}
```

### P1 — Fix soon (degrades UX significantly)

**3. PortfolioPage: Add error state (RQ-2 / ES-2)**
- File: `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx`
- Line: 323 (destructure `isError, error` from `usePortfolio()`), line 416 (add error check)

**4. DocumentsPage: Add error state (RQ-4)**
- File: `/Users/ivanflores/parcel-platform/frontend/src/pages/documents/DocumentsPage.tsx`
- Line: 71 (destructure `isError`)
- Show error card above document list with retry

**5. AnalyzerFormPage: Surface deal creation errors (ER-4)**
- File: `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/AnalyzerFormPage.tsx`
- The `createDeal` mutation object is accessible. Display `createDeal.error` in the form.

### P2 — Fix when convenient (suboptimal but functional)

**6. api.ts: Wrap fetch in try/catch for network errors (API-1)**
```tsx
try {
  const res = await fetch(...)
} catch (err) {
  if (err instanceof TypeError) {
    throw new Error('Network error — please check your connection and try again.')
  }
  throw err
}
```

**7. chat-stream.ts: Handle 401 (API-4)**
```tsx
if (res.status === 401) {
  useAuthStore.getState().clearAuth()
  throw new Error('Session expired')
}
```

**8. Dashboard: Add retry to error state + error handling for activity (RQ-3, ER-2, ES-1)**

**9. MyDeals: Add retry button to error state (ER-3)**

**10. Document detail: Handle query errors (RQ-5)**
- After `if (!doc) return null` on line 315, add `isError` check that shows an error panel.

**11. Settings: Add error handling for profile and notification queries (RQ-6, RQ-7)**

**12. App.tsx: Add QueryClient defaultOptions (RQ-11)**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
    },
  },
})
```

### P3 — Nice to have

**13. Runtime response validation with Zod (API-2)**
**14. Command palette: Pass search param to API (RQ-12)**
**15. Compare page: Better loading skeleton (LS-1)**

---

## Architecture Strengths (things done right)

1. **Centralized API client** — All requests go through `api.ts`, never raw `fetch` in components.
2. **401 interception** — Session expiry is caught centrally and clears auth state.
3. **Skeleton screens everywhere** — Zero spinners in the entire codebase. Fully compliant with design rules.
4. **Error boundaries** — Both `ErrorBoundary` (app-level) and `PageErrorBoundary` (route-level) are in place and wrap every protected route.
5. **Optimistic updates** — Pipeline drag-and-drop uses optimistic updates with rollback on error.
6. **Mutation feedback** — Most mutations show loading state on buttons ("Saving...", "Deleting...") and use toast for success/error.
7. **Empty states** — Every data-displaying page has thoughtful empty states with CTAs.
8. **Conditional queries** — `enabled` is used correctly everywhere (e.g., `useDeal` waits for `dealId`, offer letter waits for `isOpen`).
9. **Query key structure** — Keys are unique and properly scoped. Filters are included in deal query keys for cache correctness.
10. **Chat streaming** — Excellent implementation with AbortController, rolling buffer, and proper cleanup.
