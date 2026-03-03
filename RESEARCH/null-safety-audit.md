# Null Safety Audit — Parcel Platform Frontend

**Date:** 2026-03-02
**Scope:** Every `.ts` and `.tsx` file under `frontend/src/`
**Auditor:** TypeScript null safety expert
**Severity scale:** P0 = will crash, P1 = likely crash under normal use, P2 = edge case crash

---

## Executive Summary

| Severity | Count |
|----------|-------|
| P0       | 2     |
| P1       | 7     |
| P2       | 6     |
| **Total**| **15**|

The most dangerous finding is a **stale type definition** in `types/pipeline.ts` that declares `asking_price: number` (non-nullable) while the API returns `number | null`. The correct definition in `components/pipeline/constants.ts` is used by pipeline components, but any future import from `types/pipeline.ts` will silently suppress null checks. The second P0 is an unguarded `JSON.parse` in `authStore.ts` that will throw on corrupted localStorage data and crash the entire app on load.

---

## P0 — Will Crash

### 1. `types/pipeline.ts` — Stale type hides nullable `asking_price`

**File:** `/frontend/src/types/pipeline.ts`
**Line:** 17

```typescript
export interface PipelineCard {
  pipeline_id: string
  deal_id: string
  address: string
  strategy: string
  asking_price: number          // <-- BUG: should be number | null
  stage: Stage
  days_in_stage: number
  entered_stage_at: string
}
```

**Why it crashes:** The API returns `asking_price: null` for deals without a price. Any component that imports `PipelineCard` from this file and calls `card.asking_price.toLocaleString()` or similar will throw `TypeError: Cannot read properties of null`. The correct definition exists in `components/pipeline/constants.ts` (line 17: `asking_price: number | null`), which is the version pipeline components actually import — but this stale type is a ticking time bomb if anyone imports from the wrong location.

**Fix:**
```typescript
// types/pipeline.ts line 17
asking_price: number | null
```

---

### 2. `stores/authStore.ts` — Unguarded `JSON.parse` on store initialization

**File:** `/frontend/src/stores/authStore.ts`
**Line:** 14

```typescript
user: JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null,
```

**Why it crashes:** If `localStorage` contains corrupted or malformed JSON for the `parcel_user` key (browser extensions, manual tampering, encoding bugs), `JSON.parse` will throw a `SyntaxError`. This runs during Zustand store initialization (module-level), which means the entire app crashes on load with no recovery path. There is no try/catch.

**Fix:**
```typescript
user: (() => {
  try {
    return JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null
  } catch {
    localStorage.removeItem('parcel_user')
    return null
  }
})(),
isAuthenticated: (() => {
  try {
    return JSON.parse(localStorage.getItem('parcel_user') ?? 'null') !== null
  } catch {
    return false
  }
})(),
```

---

## P1 — Likely Crash Under Normal Use

### 3. `pages/analyze/ResultsPage.tsx` — Non-null assertion on `dealId`

**File:** `/frontend/src/pages/analyze/ResultsPage.tsx`
**Line:** 81

```typescript
mutationFn: () => api.deals.delete(dealId!),
```

**Why it can crash:** `useParams<{ dealId: string }>()` returns `{ dealId: string | undefined }`. The `!` operator suppresses the TypeScript warning, but if the route is hit without a `dealId` param (programmatic navigation bug, direct URL entry error), this sends `undefined` to the API call, producing a request to `/api/v1/deals/undefined` which will return an unexpected error or 404.

**Fix:**
```typescript
mutationFn: () => {
  if (!dealId) throw new Error('No deal ID')
  return api.deals.delete(dealId)
},
```

---

### 4. `pages/analyze/ResultsPage.tsx` — Unsafe cast of `rawValue as number`

**File:** `/frontend/src/pages/analyze/ResultsPage.tsx`
**Line:** 230

```typescript
<KPICard key={kpi.key} label={kpi.label} value={rawValue as number} format="percent" />
```

**Why it can crash:** `rawValue` is `outputs[kpi.key]` which is `unknown` (from `Record<string, unknown>`). If the backend returns `null`, a string, or omits the key entirely, this casts `undefined`/`null`/`string` to `number`. `KPICard` then passes it to `useCountUp` which does arithmetic on it. While `useCountUp` may handle `NaN`, the display will be broken.

**Fix:**
```typescript
const numVal = typeof rawValue === 'number' ? rawValue : 0
return <KPICard key={kpi.key} label={kpi.label} value={numVal} format="percent" />
```

---

### 5. `pages/analyze/ResultsPage.tsx` — `outputs` cast to `Record<string, number | string>`

**File:** `/frontend/src/pages/analyze/ResultsPage.tsx`
**Line:** 400

```typescript
<CashFlowProjection
  outputs={outputs as Record<string, number | string>}
  strategy={deal.strategy as Strategy}
  dealId={deal.id}
/>
```

**Why it can crash:** `outputs` is `Record<string, unknown>` (from `deal.outputs ?? {}`). Values could be `null`, arrays, nested objects, or other types. The cast to `Record<string, number | string>` suppresses warnings. `CashFlowProjection` uses a `getNum()` helper (line 69) that safely handles `NaN` but does not guard against non-primitive values. If a value is an object, `Number(value)` will produce `NaN`, which is handled — so this is a data corruption risk rather than a hard crash, but the type assertion hides it.

**Fix:**
```typescript
// The CashFlowProjection component's getNum() helper already handles this safely,
// but the cast should be removed in favor of accepting Record<string, unknown>
outputs={outputs}
// Then update CashFlowProjection props type to accept Record<string, unknown>
```

---

### 6. `lib/chat-stream.ts` — Unguarded `JSON.parse` on SSE data

**File:** `/frontend/src/lib/chat-stream.ts`
**Line:** 49

```typescript
const json = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean; error?: string }
```

**Why it can crash:** If the SSE stream sends malformed data (network corruption, proxy injection, backend bug), `JSON.parse` will throw a `SyntaxError`. The outer try/catch on line 56 only catches `AbortError` by name — all other errors are re-thrown. The async generator will then throw to the consumer in `ChatPage.tsx`, which may not handle it gracefully.

**Fix:**
```typescript
let json: { delta?: string; done?: boolean; error?: string }
try {
  json = JSON.parse(line.slice(6))
} catch {
  continue // skip malformed SSE lines
}
```

---

### 7. `lib/api.ts` — `return {} as T` for 204 responses

**File:** `/frontend/src/lib/api.ts`
**Line:** 54

```typescript
if (res.status === 204) {
  return {} as T
}
```

**Why it can crash:** When the API returns 204 No Content, this returns an empty object cast to whatever `T` is. If `T` is `{ message: string }` (used by `pipeline.remove`, `deals.delete`, `documents.delete`), calling `.message` on `{}` returns `undefined`, not a string. Any code that chains `.toLowerCase()` or similar on the result will crash. Currently, no consumer chains on the 204 result, but the type assertion makes it invisible to TypeScript.

**Fix:**
```typescript
if (res.status === 204) {
  return undefined as unknown as T
}
// Or better: change return type to Promise<T | undefined> and update callers
```

---

### 8. `pages/Pipeline.tsx` — Pipeline data structure assumption

**File:** `/frontend/src/pages/Pipeline.tsx`
**Line:** 86–89

```typescript
const board: Record<Stage, PipelineCard[]> =
  localBoard ??
  (pipelineData as Record<Stage, PipelineCard[]> | undefined) ??
  (Object.fromEntries(STAGES.map((s) => [s.key, []])) as unknown as Record<Stage, PipelineCard[]>)
```

**Why it can crash:** `api.pipeline.list()` returns `{ data: Record<string, PipelineCardResponse[]> }` (per `api.ts` line 146). The `useQuery` will set `pipelineData` to this response shape: `{ data: { lead: [...], analyzing: [...], ... } }`. The cast `pipelineData as Record<Stage, PipelineCard[]>` is applied to the outer object which has a `.data` property — not the inner record. This means `board.lead` is `undefined`, and any `.some()`, `.filter()`, or `.map()` on it will crash with `TypeError: Cannot read properties of undefined`.

**However:** The `?? []` fallbacks on lines like 311 (`board[stage.key] ?? []`) provide protection in the rendering path. The real risk is in drag handlers (lines 186, 212, 223) where `board[stage.key]` is accessed without `?? []` — if `board` is the outer response object, `board['lead']` is `undefined`, and `.some()` on `undefined` crashes.

**Fix:**
```typescript
const rawBoard = (pipelineData as { data?: Record<string, PipelineCard[]> })?.data
const board: Record<Stage, PipelineCard[]> =
  localBoard ??
  (rawBoard as Record<Stage, PipelineCard[]> | undefined) ??
  (Object.fromEntries(STAGES.map((s) => [s.key, []])) as unknown as Record<Stage, PipelineCard[]>)
```

---

### 9. `components/documents/document-detail.tsx` — Non-null assertion on `selectedId`

**File:** `/frontend/src/components/documents/document-detail.tsx`
**Line:** 271

```typescript
queryFn: () => api.documents.get(selectedId!),
enabled: !!selectedId,
```

**Why it can crash:** The `enabled: !!selectedId` guard prevents the query from running when `selectedId` is null/undefined. However, `queryFn` is still created with the closure, and React Query can call it during certain race conditions (e.g., if `enabled` becomes `true` before the query function is re-created). The `!` assertion suppresses the TypeScript check entirely.

**Fix:**
```typescript
queryFn: () => {
  if (!selectedId) throw new Error('No document selected')
  return api.documents.get(selectedId)
},
```

---

## P2 — Edge Case Crash

### 10. `pages/compare/ComparePage.tsx` — String used as boolean in loading check

**File:** `/frontend/src/pages/compare/ComparePage.tsx`
**Line:** 127

```typescript
const isLoading = loadingList || (dealAId && loadingA) || (dealBId && loadingB)
```

**Why it's risky:** `dealAId` is `string | null` (from `useState<string | null>`). When `dealAId` is a non-empty string and `loadingA` is `false`, the expression `(dealAId && loadingA)` evaluates to `false`. When `dealAId` is a non-empty string and `loadingA` is `true`, the expression evaluates to `true`. This actually works correctly by coincidence, but `isLoading` is typed as `string | boolean | false` by TypeScript inference, which could cause type issues downstream if strict boolean checks are used.

**Fix:**
```typescript
const isLoading = loadingList || (!!dealAId && loadingA) || (!!dealBId && loadingB)
```

---

### 11. `pages/Dashboard.tsx` — `recent_deals` array not null-checked

**File:** `/frontend/src/pages/Dashboard.tsx`
**Line:** 287

```typescript
{stats.recent_deals.length > 0 && (
```

**Why it's risky:** `stats` is checked for null on line 188, but `stats.recent_deals` is assumed to always be a valid array. If the backend omits this field or returns `null` for it, `.length` will throw. The `DashboardStats` type defines `recent_deals: RecentDeal[]` (non-nullable), but the API could diverge from the type.

**Fix:**
```typescript
{(stats.recent_deals?.length ?? 0) > 0 && (
```

---

### 12. `pages/analyze/ResultsPage.tsx` — `outputs` values cast in table

**File:** `/frontend/src/pages/analyze/ResultsPage.tsx`
**Line:** 356

```typescript
{formatOutputValue(key, value as number | string | null | undefined)}
```

**Why it's risky:** `value` comes from `Object.entries(outputs)` where `outputs` is `Record<string, unknown>`. The cast to `number | string | null | undefined` is mostly correct for expected backend data, but if a value is an object or array, `formatOutputValue` may call `.toLocaleString()` on it or produce unexpected rendering. The `formatOutputValue` function in `lib/format.ts` does handle the common cases safely, but the cast hides unexpected types.

**Fix:**
```typescript
{formatOutputValue(key, value)}
// Update formatOutputValue to accept `unknown` and handle all types
```

---

### 13. `pages/analyze/ResultsPage.tsx` — `err.message` without instanceof check

**File:** `/frontend/src/pages/analyze/ResultsPage.tsx`
**Line:** 144, 193

```typescript
// Line 144
onError: (err) => {
  const msg = err.message.toLowerCase()

// Line 193
onError: (err) => toast.error(err.message),
```

**Why it's risky:** React Query's `onError` callback receives `Error` by default, but if a non-Error is thrown (e.g., a string, or a network failure object), `.message` could be `undefined`, and `.toLowerCase()` on `undefined` will throw. In practice, `api.ts` always wraps errors in `new Error(...)`, so this is unlikely but not impossible if a TypeError or other unexpected error propagates.

**Fix:**
```typescript
onError: (err) => {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
```

---

### 14. `lib/api.ts` — Error response parsing assumption

**File:** `/frontend/src/lib/api.ts`
**Line:** 49–50

```typescript
const error = await res.json().catch(() => ({ error: 'Unknown error' }))
throw new Error((error as { error?: string }).error ?? `HTTP ${res.status}`)
```

**Why it's risky:** If the API returns a non-JSON error body (e.g., HTML from a proxy, or plain text), the `.catch()` handles it. But the cast `error as { error?: string }` on the parsed JSON assumes a specific shape. If the API returns `{ message: "..." }` instead of `{ error: "..." }`, the error message will be `HTTP 500` instead of the actual error text. This isn't a crash, but it hides useful error information.

**Fix:**
```typescript
const error = await res.json().catch(() => ({ error: 'Unknown error' }))
const errorObj = error as Record<string, unknown>
const message = (typeof errorObj.error === 'string' ? errorObj.error : null)
  ?? (typeof errorObj.message === 'string' ? errorObj.message : null)
  ?? `HTTP ${res.status}`
throw new Error(message)
```

---

### 15. `components/charts/ComparisonRadar.tsx` — `deal.outputs[key]` without optional chaining

**File:** `/frontend/src/components/charts/ComparisonRadar.tsx`
**Line:** 95

```typescript
const val = deal.outputs[key]
```

**Why it's risky:** `deal.outputs` is typed as `Record<string, unknown>` (required field on `RadarDeal`). The `extractRawValue` function accesses `deal.outputs[key]` directly. If `deal.outputs` were ever `undefined` or `null` (e.g., a backend bug or incomplete data), this would throw. However, the component guards against this by checking `deals.length < 2` before calling this code path, and `RadarDeal.outputs` is a required field. Risk is minimal.

**Fix:**
```typescript
const val = deal.outputs?.[key]
```

---

## Files Checked — Clean (No Significant Null Safety Issues)

### Pages
| File | Notes |
|------|-------|
| `pages/Landing.tsx` | No data fetching, static content |
| `pages/Login.tsx` | Form with proper validation guards |
| `pages/Register.tsx` | Form with proper validation guards |
| `pages/ForgotPassword.tsx` | Simple form, no nullable data |
| `pages/ResetPassword.tsx` | Token from URL params handled safely |
| `pages/NotFound.tsx` | Static page |
| `pages/analyze/StrategySelectPage.tsx` | Static strategy cards, no data fetching |
| `pages/portfolio/PortfolioPage.tsx` | Excellent null safety: `data?.summary`, `data?.entries ?? []`, `summary?.total_deals_closed ?? 0` throughout |
| `pages/settings/SettingsPage.tsx` | `user?.role ?? ''`, proper null checks on `existingUser` |
| `pages/chat/ChatPage.tsx` | `historyData?.messages ?? []`, proper guards |
| `pages/MyDeals.tsx` | `if (!deals) return` guard before `.map()`, `deals !== undefined` checks |
| `pages/share/ShareDealPage.tsx` | Good guards: `deal.risk_score ?? 0`, `deal.inputs ?? {}`, `deal.primary_metric_value === null` check |

### Components
| File | Notes |
|------|-------|
| `components/pipeline/deal-card.tsx` | `card.asking_price != null && card.asking_price > 0` — correctly guarded |
| `components/pipeline/kanban-column.tsx` | Props are well-typed, no nullable access |
| `components/pipeline/column-skeleton.tsx` | Static skeleton, no data |
| `components/pipeline/pipeline-empty.tsx` | Static empty state |
| `components/pipeline/pipeline-error.tsx` | `error` prop typed as `Error | null`, handled safely |
| `components/pipeline/mobile-pipeline.tsx` | `board[activeStage] ?? []` — properly guarded |
| `components/pipeline/constants.ts` | Type definitions only, correct nullable `asking_price: number \| null` |
| `components/deals/deal-card.tsx` | `deal.primary_metric_label ?? 'Primary Metric'` — properly guarded |
| `components/deals/filter-bar.tsx` | No nullable data access |
| `components/deals/preset-chips.tsx` | No nullable data access |
| `components/deals/compare-bar.tsx` | Props are required, no nullable issues |
| `components/documents/upload-zone.tsx` | File handling, no nullable data issues |
| `components/documents/processing-steps.tsx` | Static content |
| `components/documents/document-list.tsx` | Props typed correctly |
| `components/close-deal-modal.tsx` | `askingPrice > 0 ? String(askingPrice) : ''` — safe |
| `components/offer-letter-modal.tsx` | `data?.offer_letter` — properly guarded |
| `components/edit-portfolio-modal.tsx` | `if (!canSubmit \|\| !entry) return` — properly guarded |
| `components/error-boundary.tsx` | Clean error boundary implementation |
| `components/command-palette.tsx` | `deals ? deals.filter(...) : []` — properly guarded |
| `components/layout/AppShell.tsx` | No nullable data access |
| `components/layout/PageHeader.tsx` | Props are well-typed |
| `components/layout/PageContent.tsx` | Wrapper component, no data |
| `components/charts/CashFlowProjection.tsx` | Excellent null safety: `getNum()` helper returns `null` for missing/NaN, all paths guarded |
| `components/ui/KPICard.tsx` | `value` prop is `number` (required) |
| `components/ui/RiskGauge.tsx` | `score` prop is `number` (required) |
| `components/ui/StrategyBadge.tsx` | Strategy string lookup with fallback |
| `components/ui/SkeletonCard.tsx` | Static skeleton |
| `components/ui/ConceptTooltip.tsx` | Static tooltip content |
| Landing page sub-components (`hero.tsx`, `navbar.tsx`, `footer.tsx`, etc.) | Static content, no data fetching |

### Hooks
| File | Notes |
|------|-------|
| `hooks/useDeals.ts` | `enabled: !!dealId` guard on useDeal, clean implementations |
| `hooks/useCountUp.ts` | Arithmetic on `number` prop, clean |
| `hooks/useKanbanKeyboard.ts` | `cardCounts[prev.columnIndex] ?? 0` — properly guarded |
| `hooks/useDebouncedValue.ts` | Generic hook, no null issues |

### Lib
| File | Notes |
|------|-------|
| `lib/format.ts` | Handles `null`/`undefined` in `formatCurrency`, `formatPercent`, `formatOutputValue` — well-defended |
| `lib/strategy-kpis.ts` | Returns `KPIDefinition[]`, static data |
| `lib/motion.ts` | Animation variants, no data |
| `lib/utils.ts` | `cn()` utility, no null issues |
| `lib/pdf-report.ts` | `deal.outputs ?? {}`, `deal.inputs ?? {}` — properly guarded |

### Types
| File | Notes |
|------|-------|
| `types/index.ts` | Type definitions — nullable fields correctly marked with `\| null` |
| `types/chat.ts` | Clean type definitions |

### Stores
| File | Notes |
|------|-------|
| `stores/authStore.ts` | **See P0 finding #2** — `JSON.parse` without try/catch |

---

## Recommendations Summary

### Immediate Fixes (P0 — Do Now)
1. **Fix `types/pipeline.ts` line 17** — change `asking_price: number` to `asking_price: number | null`
2. **Fix `stores/authStore.ts` line 14** — wrap `JSON.parse` in try/catch

### High Priority (P1 — This Sprint)
3. **Fix `ResultsPage.tsx` line 81** — replace `dealId!` with runtime guard
4. **Fix `ResultsPage.tsx` line 230** — replace `rawValue as number` with type check
5. **Fix `chat-stream.ts` line 49** — wrap `JSON.parse` in try/catch
6. **Fix `Pipeline.tsx` lines 86-89** — extract `.data` from API response before casting
7. **Fix `document-detail.tsx` line 271** — replace `selectedId!` with runtime guard
8. **Fix `api.ts` line 54** — handle 204 responses more safely
9. **Fix `ResultsPage.tsx` line 400** — remove unsafe cast or widen component props

### Lower Priority (P2 — Backlog)
10. **Fix `ComparePage.tsx` line 127** — use `!!` for explicit boolean coercion
11. **Fix `Dashboard.tsx` line 287** — add optional chaining on `recent_deals`
12. **Fix `ResultsPage.tsx` line 356** — accept `unknown` in `formatOutputValue`
13. **Fix `ResultsPage.tsx` lines 144, 193** — add `instanceof Error` check
14. **Fix `api.ts` lines 49-50** — handle multiple error response shapes
15. **Fix `ComparisonRadar.tsx` line 95** — add optional chaining on `outputs`

---

## Patterns Observed

### Good Patterns (Already in Codebase)
- `deal.outputs ?? {}` — nullish coalescing on JSONB fields
- `card.asking_price != null && card.asking_price > 0` — proper null-then-value guard
- `data?.summary`, `data?.entries ?? []` — optional chaining on React Query data
- `enabled: !!dealId` — preventing queries with empty params
- `if (!deals) return` — early return guards before array operations
- `deal.risk_score ?? 0` — default values for nullable numbers
- `STRATEGY_LABELS[strategy] ?? strategy` — fallback for unknown keys

### Bad Patterns (To Avoid)
- `value as number` — hiding nullable values behind type assertions
- `dealId!` — non-null assertions on `useParams` results
- `JSON.parse(...)` without try/catch — unguarded deserialization
- `return {} as T` — returning empty objects cast to expected types
- Duplicate type definitions (`types/pipeline.ts` vs `components/pipeline/constants.ts`)
