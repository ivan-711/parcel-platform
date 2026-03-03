# Parcel Platform — Full QA Audit Report

**Date:** 2026-03-02
**Audited by:** 6 parallel investigative agents (Hooks, Null Safety, API/Error/Loading, Component/Props, Auth/State, User Flows)
**Scope:** Every page, component, hook, store, and utility in `frontend/src/`
**Files audited:** 62+ TypeScript/React files

---

## Executive Summary

The Parcel Platform frontend is well-architected with strong foundations: centralized API client, skeleton loading screens on every page (zero spinners), error boundaries on all protected routes, consistent design system compliance, and solid React Query patterns. However, the audit found **~55 unique issues** across all severity levels. The most critical are silent user logouts (no token refresh), crash risks from unguarded JSON.parse, and several pages with no error states that show infinite skeletons or misleading empty UIs when API calls fail.

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Crash / Data Loss** | 4 | App crashes, infinite loading, silent data loss |
| **P1 — Broken Feature** | 8 | Features that don't work or silently fail |
| **P2 — Degraded Experience** | 22 | Missing error states, mobile issues, a11y gaps |
| **P3 — Polish** | ~21 | Type narrowing, code quality, minor UX |

### React Hooks Ordering: ALL CLEAR
All 62 files audited. Zero remaining violations. Previously fixed files (Dashboard, Pipeline, ResultsPage) confirmed clean.

---

## P0 — Crash / Data Loss (Fix Immediately)

### P0-1: No Token Refresh — Users Silently Logged Out After 15 Minutes
**Files:** `lib/api.ts:31-58`, `hooks/useAuth.ts`
**Found by:** Auth/State Auditor

CLAUDE.md specifies 15-min access tokens + 7-day refresh tokens, but the frontend has **zero** refresh token logic. When the access token expires:
1. Next API call returns 401
2. `clearAuth()` fires immediately — user is silently logged out
3. Any unsaved form state (deal analysis mid-entry) is **lost**

A user filling out a complex deal analysis for 16+ minutes will lose all work on submit.

**Fix:** Implement refresh token flow in `api.ts` — on 401, attempt `/auth/refresh`, retry original request, only `clearAuth()` if refresh also fails. Show toast: "Session expired."
**Effort:** Medium (2-3 hours) — requires backend `/auth/refresh` endpoint + frontend retry logic

---

### P0-2: authStore JSON.parse Crash on Corrupted localStorage
**File:** `stores/authStore.ts:14`
**Found by:** Null Safety Auditor

```typescript
user: JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null
```

Runs at module initialization with **no try/catch**. If localStorage contains corrupted JSON (browser extensions, manual tampering, encoding bugs), `JSON.parse` throws `SyntaxError` and the **entire app crashes on load** with no recovery.

**Fix:** Wrap in try/catch, clear corrupted data on parse failure.
```typescript
user: (() => {
  try { return JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null }
  catch { localStorage.removeItem('parcel_user'); return null }
})()
```
**Effort:** Small (15 minutes)

---

### P0-3: ResultsPage Infinite Skeleton on API Error
**File:** `pages/analyze/ResultsPage.tsx:106`
**Found by:** API/Error Auditor, User Flow Auditor

```typescript
if (isLoading || !deal) return <SkeletonState />
```

Conflates loading and error states. When the API fails: `isLoading` = false, `deal` = undefined, so user sees **infinite skeleton with no way to recover**. `isError` is never destructured or checked from `useDeal()`.

**Fix:** Destructure `isError, error` from `useDeal()`. Add error state before loading check with "Back to My Deals" link.
**Effort:** Small (30 minutes)

---

### P0-4: Stale Type Definition Hides Nullable `asking_price`
**File:** `types/pipeline.ts:17`
**Found by:** Null Safety Auditor

```typescript
asking_price: number  // BUG: should be number | null
```

The API returns `asking_price: null` for deals without a price. The **correct** definition exists in `components/pipeline/constants.ts` (`asking_price: number | null`), which pipeline components actually import. But this duplicate type is a ticking time bomb — any future import from the wrong location silently suppresses null checks and will crash.

**Fix:** Change to `asking_price: number | null`. Consider deleting the duplicate type entirely.
**Effort:** Small (10 minutes)

---

## P1 — Broken Feature (Fix Before Deploy)

### P1-1: React Query Cache Not Cleared on Logout — Data Leak Between Users
**File:** `hooks/useAuth.ts:45-59`
**Found by:** Auth/State Auditor

When User A logs out and User B logs in on the same browser, User B can see User A's cached deals, pipeline, portfolio, and chat history until the default 5-minute cache expires.

**Fix:** Add `queryClient.clear()` in the logout handler (both `onSuccess` and `onError`).
**Effort:** Small (15 minutes)

---

### P1-2: useCreateDeal Has No Error Handling — Form Silently Fails
**Files:** `hooks/useDeals.ts:20-26`, `pages/analyze/AnalyzerFormPage.tsx`
**Found by:** API/Error Auditor

When deal creation fails (server validation, 500, network error), **nothing happens**. No toast, no inline error, no feedback. The user is stuck on the form with no indication anything went wrong.

**Fix:** Surface `createDeal.error` in the AnalyzerFormPage with inline error message + toast.
**Effort:** Small (30 minutes)

---

### P1-3: PortfolioPage Has No Error State
**File:** `pages/portfolio/PortfolioPage.tsx:416`
**Found by:** API/Error Auditor, User Flow Auditor

If the API fails, the page renders with all-zero KPIs and empty table — **indistinguishable from a legitimate empty portfolio**. User has no idea something went wrong.

**Fix:** Destructure `isError` from `usePortfolio()`, add error state with retry button.
**Effort:** Small (30 minutes)

---

### P1-4: DocumentsPage Has No Error State
**File:** `pages/documents/DocumentsPage.tsx:71`
**Found by:** API/Error Auditor

If the documents list fetch fails, blank page. No error message, no retry.

**Fix:** Add `isError` check and error UI.
**Effort:** Small (30 minutes)

---

### P1-5: No Server Validation of Auth on App Load
**Files:** `stores/authStore.ts:14-15`, `App.tsx:43-46`
**Found by:** Auth/State Auditor

Authentication is determined solely by whether localStorage has `parcel_user`. No call to `/api/v1/auth/me` to verify the session cookie is still valid. If the cookie expires but localStorage persists, user sees the full authenticated UI briefly before being kicked out by the first API call.

**Fix:** Add a startup validation query that calls `api.auth.me()` when `isAuthenticated` is true.
**Effort:** Small (30 minutes)

---

### P1-6: Pipeline API Response Shape Mismatch (Needs Backend Verification)
**Files:** `pages/Pipeline.tsx:86-89`, `lib/api.ts:146`
**Found by:** Null Safety Auditor, User Flow Auditor

`api.pipeline.list()` is typed as returning `{ data: Record<string, PipelineCardResponse[]> }`, but Pipeline.tsx casts `pipelineData` directly as `Record<Stage, PipelineCard[]>` without unwrapping `.data`. **If the API actually wraps the response**, the pipeline always appears empty because `board['lead']` would be `undefined`. Drag handlers access `board[stage.key]` without `?? []` fallback.

**Fix:** Verify backend response shape. Either unwrap `.data` in the component or fix the type in `api.ts`.
**Effort:** Small (30 minutes) after backend verification

---

### P1-7: Mobile Pipeline Cannot Move Deals Between Stages
**File:** `components/pipeline/mobile-pipeline.tsx`
**Found by:** User Flow Auditor

Desktop users drag-and-drop cards between Kanban columns. Mobile users can only **view** cards and close/remove them. There is no dropdown, button, or gesture for changing a deal's pipeline stage on mobile. This is a significant feature gap.

**Fix:** Add a "Move to..." dropdown/action menu per card on mobile.
**Effort:** Medium (2-3 hours)

---

### P1-8: No Address/Property Input on Any Analyzer Form
**File:** `pages/analyze/AnalyzerFormPage.tsx`
**Found by:** User Flow Auditor

All 5 strategy forms hardcode the address as generic text ("Buy & Hold Analysis -- 3/2/2026") and zip_code as "00000". Users cannot enter which property they are analyzing. Deals are indistinguishable in the deals list and pipeline. For a real estate platform, this is a critical UX gap.

**Fix:** Add address + zip code fields to all 5 strategy forms.
**Effort:** Medium (2-3 hours) — affects all 5 form schemas + backend

---

## P2 — Degraded Experience (Fix Soon)

### Auth & API Issues

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P2-1 | Chat streaming bypasses 401 handling — shows "HTTP 401" instead of redirecting to login | `lib/chat-stream.ts:17-31` | Small (15 min) |
| P2-2 | 401 race condition — multiple parallel calls all fire `clearAuth()` independently, may cause cascading errors | `lib/api.ts:43-45` | Small (30 min) |
| P2-3 | No network error wrapping — raw `TypeError: Failed to fetch` shown to users when offline | `lib/api.ts:37` | Small (30 min) |
| P2-4 | QueryClient has no `defaultOptions` — 401s retried 3 times (always failing), no global staleTime | `App.tsx:31` | Small (15 min) |
| P2-5 | Profile update cache desync — Settings form shows stale data after profile update | `pages/settings/SettingsPage.tsx:81-99` | Small (15 min) |
| P2-6 | Authenticated users can access /login and /register — no GuestRoute guard | `App.tsx:65-70` | Small (30 min) |

### Missing Error States

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P2-7 | Dashboard activity query — silent failure, shows "No activity" even on error | `Dashboard.tsx:116-120, 376` | Small (30 min) |
| P2-8 | Document detail — returns null on query error, blank panel | `documents/document-detail.tsx:315` | Small (30 min) |
| P2-9 | Settings queries — no error handling for profile or notification prefs | `SettingsPage.tsx:32, 52` | Small (30 min) |
| P2-10 | Compare page — individual deal fetch errors show dashes, no error message | `ComparePage.tsx:75-76` | Small (30 min) |
| P2-11 | Dashboard error state has no retry button | `Dashboard.tsx:170-185` | Small (15 min) |
| P2-12 | MyDeals error state has no retry button | `MyDeals.tsx:282-292` | Small (15 min) |

### Mobile & Responsive Issues

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P2-13 | Dashboard empty-state hint cards `grid-cols-3` not responsive — cramped on mobile | `Dashboard.tsx:229` | Small (5 min) |
| P2-14 | Dashboard Recent Deals table no horizontal scroll on mobile | `Dashboard.tsx:299` | Small (10 min) |
| P2-15 | MyDeals header buttons overflow on mobile in selection mode | `MyDeals.tsx:185-224` | Small (15 min) |
| P2-16 | ResultsPage 7 action buttons wrap awkwardly on mobile | `ResultsPage.tsx:407` | Small (30 min) |
| P2-17 | Portfolio edit button invisible on touch devices (opacity-0, hover-only) | `PortfolioPage.tsx:669` | Small (10 min) |
| P2-18 | Command palette has no mobile trigger — `hidden md:flex` on search pill | `AppShell.tsx:197-204` | Small (30 min) |
| P2-19 | Compare table fixed 180px label column tight on mobile | `ComparePage.tsx:342` | Small (30 min) |

### Accessibility & Component Issues

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P2-20 | AnimatePresence wraps non-motion DetailPanel — exit animations silently fail | `documents/document-detail.tsx:376-386` | Small (15 min) |
| P2-21 | Error boundary uses `process.env.NODE_ENV` instead of `import.meta.env.DEV` — dev error details never shown | `error-boundary.tsx:55` | Small (5 min) |
| P2-22 | ResultsPage stage picker dropdown not keyboard accessible | `ResultsPage.tsx:436-449` | Medium (1 hour) |

---

## P3 — Polish (Fix When Convenient)

### Null Safety & Type Issues

| # | Issue | File(s) |
|---|-------|---------|
| P3-1 | `dealId!` non-null assertion on useParams result | `ResultsPage.tsx:81` |
| P3-2 | `rawValue as number` unsafe cast on output values | `ResultsPage.tsx:230` |
| P3-3 | `outputs as Record<string, number \| string>` cast hides unknown types | `ResultsPage.tsx:400` |
| P3-4 | `JSON.parse` on SSE data without try/catch | `chat-stream.ts:49` |
| P3-5 | `return {} as T` for 204 responses — type-unsafe | `api.ts:54` |
| P3-6 | `selectedId!` non-null assertion in document detail | `document-detail.tsx:271` |
| P3-7 | Boolean coercion with strings in ComparePage loading check | `ComparePage.tsx:127` |
| P3-8 | `recent_deals` array not null-checked on Dashboard | `Dashboard.tsx:287` |
| P3-9 | `err.message` without `instanceof Error` check | `ResultsPage.tsx:144, 193` |
| P3-10 | Error response parsing assumes `{ error: ... }` shape | `api.ts:49-50` |
| P3-11 | ComparisonRadar `deal.outputs[key]` without optional chaining | `ComparisonRadar.tsx:95` |

### Component & UX Issues

| # | Issue | File(s) |
|---|-------|---------|
| P3-12 | Clipboard writeText no try/catch in OfferLetterModal | `offer-letter-modal.tsx:55` |
| P3-13 | CloseDealModal/OfferLetterModal type `strategy` as `string` not `Strategy` | `close-deal-modal.tsx:25`, `offer-letter-modal.tsx:29` |
| P3-14 | Dead CSS selector `[&_.kpi-value]` in PortfolioPage | `PortfolioPage.tsx:446-448` |
| P3-15 | Index keys on dynamic lists (parties, risk_flags, key_terms) | `document-detail.tsx:155, 180, 227` |
| P3-16 | `Math.random()` during render for skeleton widths | `offer-letter-modal.tsx:99` |
| P3-17 | Hardcoded SVG gradient IDs could collide on multiple instances | `CashFlowProjection.tsx:335`, `KPICard.tsx:46` |
| P3-18 | Pipeline "Add Deal" uses `<a href>` instead of `<Link to>` — causes full page reload | `Pipeline.tsx:270` |
| P3-19 | setTimeout leaks in SettingsPage — not cleaned up on unmount | `SettingsPage.tsx:65-113` |
| P3-20 | Command palette fetches all deals, filters client-side | `command-palette.tsx:129` |
| P3-21 | No runtime response validation (TypeScript casts only) | `api.ts:57` |

### Minor UX Issues

| # | Issue | File(s) |
|---|-------|---------|
| P3-22 | 404 page "Dashboard" button misleading for unauthenticated users | `NotFound.tsx:18` |
| P3-23 | No route param validation for `:strategy` | `App.tsx` |
| P3-24 | AnimatePresence key on pathname causes extra animations between same-component routes | `App.tsx:56` |
| P3-25 | Filter presets not user-scoped in localStorage | `MyDeals.tsx:61` |
| P3-26 | Number inputs accept negative values on analyzer forms | `AnalyzerFormPage.tsx` |
| P3-27 | No scroll-to-error on form validation failure | `AnalyzerFormPage.tsx` |
| P3-28 | eslint exhaustive-deps suppression on chat history effect | `ChatPage.tsx:128` |
| P3-29 | Color contrast may not meet WCAG AA for small text (`text-[#475569]` on `#08080F`) | Multiple files |
| P3-30 | DealCard context menu not keyboard accessible | `pipeline/deal-card.tsx` |
| P3-31 | Charts lack `aria-label` / screen reader support | Multiple chart components |
| P3-32 | Public pages (Landing, Login, etc.) lack skip-navigation | Multiple files |
| P3-33 | Bulk delete fires all requests in parallel — could overwhelm backend | `MyDeals.tsx:112` |
| P3-34 | Compare selector limited to 100 deals | `ComparePage.tsx:74` |
| P3-35 | Portfolio AddEntryForm deal selector loads all deals without pagination | `PortfolioPage.tsx:209` |

---

## Recommended Fix Order

### Sprint 1 — Critical Path (Estimated: 1 day)

These prevent crashes and data loss. All are small fixes.

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | **P0-2:** authStore JSON.parse crash | 15 min |
| 2 | **P0-4:** Fix stale `asking_price` type | 10 min |
| 3 | **P0-3:** ResultsPage infinite skeleton on error | 30 min |
| 4 | **P1-1:** Clear React Query cache on logout | 15 min |
| 5 | **P1-2:** useCreateDeal error handling | 30 min |
| 6 | **P1-3:** PortfolioPage error state | 30 min |
| 7 | **P1-4:** DocumentsPage error state | 30 min |
| 8 | **P1-5:** Server validation on app load | 30 min |
| 9 | **P1-6:** Verify + fix Pipeline API shape | 30 min |
| 10 | **P2-21:** Error boundary `import.meta.env.DEV` | 5 min |
| 11 | **P2-4:** QueryClient defaultOptions | 15 min |

### Sprint 2 — Auth & Error Handling (Estimated: 1 day)

| Priority | Issue | Effort |
|----------|-------|--------|
| 12 | **P0-1:** Token refresh mechanism | 2-3 hours |
| 13 | **P2-1:** Chat stream 401 handling | 15 min |
| 14 | **P2-2:** 401 race condition debounce | 30 min |
| 15 | **P2-3:** Network error wrapping | 30 min |
| 16 | **P2-5:** Profile update cache desync | 15 min |
| 17 | **P2-6:** GuestRoute guard | 30 min |
| 18 | **P2-7 to P2-12:** Missing error states + retry buttons | 2 hours |

### Sprint 3 — Mobile & UX (Estimated: 1 day)

| Priority | Issue | Effort |
|----------|-------|--------|
| 19 | **P2-13:** Dashboard hint cards responsive | 5 min |
| 20 | **P2-14:** Dashboard table horizontal scroll | 10 min |
| 21 | **P2-15:** MyDeals header mobile overflow | 15 min |
| 22 | **P2-16:** ResultsPage action buttons mobile | 30 min |
| 23 | **P2-17:** Portfolio edit button touch visibility | 10 min |
| 24 | **P2-18:** Command palette mobile trigger | 30 min |
| 25 | **P2-19:** Compare table mobile layout | 30 min |
| 26 | **P2-20:** AnimatePresence motion wrapper | 15 min |
| 27 | **P1-7:** Mobile pipeline stage change | 2-3 hours |

### Backlog — Feature Gaps + Polish

| Issue | Effort |
|-------|--------|
| **P1-8:** Address/zip code fields on analyzer forms | 2-3 hours |
| **P2-22:** Stage picker keyboard accessibility | 1 hour |
| **P3-1 to P3-11:** Null safety fixes (batch) | 2 hours |
| **P3-12 to P3-21:** Component fixes (batch) | 2 hours |
| **P3-22 to P3-35:** Minor UX + a11y (batch) | 3 hours |

---

## Architecture Strengths (Things Done Right)

1. **Centralized API client** — All requests go through `api.ts`, never raw `fetch` in components
2. **401 interception** — Session expiry caught centrally and clears auth state
3. **Skeleton screens everywhere** — Zero spinners in the entire codebase (design-brief compliant)
4. **Error boundaries** — Both app-level and page-level, wrapping every protected route
5. **Optimistic updates** — Pipeline drag-and-drop uses optimistic updates with rollback
6. **Empty states with CTAs** — Every data page has thoughtful empty states
7. **Conditional queries** — `enabled` used correctly everywhere (e.g., `useDeal` waits for dealId)
8. **Hooks ordering** — All 62 files clean. No violations remaining.
9. **Mobile pipeline** — Dedicated tabbed mobile view (just needs stage-change capability)
10. **Keyboard navigation** — Full arrow-key Kanban navigation, command palette, focus management on route changes
11. **Accessibility foundations** — Skip-to-content, ARIA labels, role attributes throughout

---

## Source Reports

- `RESEARCH/hooks-audit-comprehensive.md` — Hooks ordering (62 files, 0 violations)
- `RESEARCH/null-safety-audit.md` — Null safety (15 findings)
- `RESEARCH/api-error-loading-audit.md` — API/error/loading/empty states (19 findings)
- `RESEARCH/component-props-audit.md` — Component props & render safety (42 checks, 15 findings)
- `RESEARCH/auth-state-audit.md` — Auth flows, stores, routing (20 findings)
- `RESEARCH/user-flow-audit.md` — User flow traces, mobile, accessibility (32+ findings)
