# Pipeline Error Boundary Crash Investigation

**Date:** 2026-03-02
**URL:** https://parceldesk.io/pipeline
**Repro:** Login as demo@parcel.app -> Click "Pipeline" in sidebar -> Immediate crash

---

## 1. Exact Error Message

```
TypeError: Cannot read properties of null (reading 'toLocaleString')
```

The error fires **twice** on initial render (React strict mode double-render), and **twice more** on each Retry click.

---

## 2. Full Stack Trace

```
TypeError: Cannot read properties of null (reading 'toLocaleString')
    at hs (https://www.parceldesk.io/assets/Pipeline-CeKdLBJh.js:15:53614)
    at nu (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:39:17236)
    at ep (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:44353)
    at Yh (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:40012)
    at iw (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:39940)
    at ya (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:39793)
    at Ru (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:36117)
    at Qh (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:36929)
    at rr (https://www.parceldesk.io/assets/index-Bv6L4N0b.js:39:3273)
    at https://www.parceldesk.io/assets/index-Bv6L4N0b.js:41:34428
```

### Minified -> Source Mapping

- **`hs`** in `Pipeline-CeKdLBJh.js:15:53614` = the `DealCard` or `SortableDealCard` component in the Pipeline chunk
- The rest of the stack (`nu`, `ep`, `Yh`, `iw`, `ya`, `Ru`, `Qh`, `rr`) are React internals (`index-Bv6L4N0b.js` = the main React bundle)

---

## 3. Crashing Component and File/Line

### Primary crash site: `frontend/src/components/pipeline/deal-card.tsx`

There are **3 locations** where `asking_price.toLocaleString()` is called without null guards:

#### Location 1 — `deal-card.tsx:148` (price display)
```tsx
// Line 146-149
{card.asking_price > 0 && (
  <span className="text-[12px] font-mono text-[#94A3B8]">
    ${card.asking_price.toLocaleString()}
  </span>
)}
```
**Problem:** `card.asking_price > 0` evaluates to `false` when `asking_price` is `null`, so this line is actually safe due to short-circuit. BUT the condition `null > 0` returns `false`, so this specific call is skipped.

#### Location 2 — `deal-card.tsx:202` (aria-label) **<-- THE CRASH**
```tsx
aria-label={`${card.address}, ${STRATEGY_LABELS[card.strategy] ?? card.strategy}, $${card.asking_price.toLocaleString()}`}
```
**Problem:** This is a **template literal** that runs unconditionally. There is NO null guard. When `asking_price` is `null`, calling `.toLocaleString()` on `null` throws `TypeError: Cannot read properties of null (reading 'toLocaleString')`.

#### Location 3 — `Pipeline.tsx:339` (drag overlay)
```tsx
// Line 337-340
{activeCard.asking_price > 0 && (
  <span className="text-[12px] font-mono text-[#94A3B8]">
    ${activeCard.asking_price.toLocaleString()}
  </span>
)}
```
**Problem:** Same pattern as Location 1. The `> 0` check short-circuits when null, so this is safe at runtime. However, it would crash if you dragged a card with null asking_price.

#### Location 4 — `deal-card.tsx:141` (RiskBadge, lesser issue)
```tsx
<RiskBadge score={card.asking_price} />
```
**Problem:** This passes `asking_price` as a "risk score" which appears to be a bug -- asking_price is not a risk score. The `RiskBadge` component handles null correctly (`if (score == null) return null`), so this doesn't crash, but it displays wrong data.

---

## 4. Root Cause

### Type mismatch between backend schema and frontend type

**Backend** (`backend/schemas/pipeline.py:31`):
```python
asking_price: Optional[float]   # <-- CAN BE NULL
```

**Backend router** (`backend/routers/pipeline.py:26-34`):
```python
def _asking_price(inputs: dict) -> float | None:
    for key in ("asking_price", "purchase_price"):
        if key in inputs:
            try:
                return float(inputs[key])
            except (TypeError, ValueError):
                pass
    return None   # <-- RETURNS None when no price found in inputs
```

**Frontend type** (`frontend/src/components/pipeline/constants.ts:17`):
```typescript
asking_price: number   // <-- TYPED AS NON-NULLABLE
```

The backend correctly marks `asking_price` as `Optional[float]` because some deals may not have a price in their JSONB inputs. But the frontend TypeScript type declares it as `number` (non-nullable), causing the code to assume it's always a number. At runtime, the API returns `null`, and the code crashes.

---

## 5. Does Clicking Retry Fix It?

**No.** Clicking Retry causes the exact same crash again (4 total errors after retry). This **rules out** a hooks ordering issue (like the Dashboard had previously). The error is deterministic -- every render attempt crashes because the pipeline data always contains at least one card with `asking_price: null`.

---

## 6. Network Errors (401s, 500s)

**None.** All API calls returned HTTP 200:

```
[POST] https://api.parceldesk.io/api/v1/auth/login       => [200]
[GET]  https://api.parceldesk.io/api/v1/dashboard/stats/  => [200]
[GET]  https://api.parceldesk.io/api/v1/dashboard/activity/ => [200]
[GET]  https://api.parceldesk.io/api/v1/pipeline/          => [200]
```

The pipeline API returns successfully. The data itself contains null `asking_price` values which crash the component.

---

## 7. Other Console Errors or Warnings

**None.** The only console output is the repeated `TypeError` -- no warnings, no other errors, no React hydration warnings.

---

## 8. Fix Required

### Minimum fix (3 lines):

**`frontend/src/components/pipeline/deal-card.tsx:202`** -- add null coalesce:
```tsx
// Before (crashes):
aria-label={`${card.address}, ${STRATEGY_LABELS[card.strategy] ?? card.strategy}, $${card.asking_price.toLocaleString()}`}

// After (safe):
aria-label={`${card.address}, ${STRATEGY_LABELS[card.strategy] ?? card.strategy}, $${(card.asking_price ?? 0).toLocaleString()}`}
```

### Recommended comprehensive fix:

1. **Update the frontend type** to match the backend schema:
   ```typescript
   // frontend/src/components/pipeline/constants.ts:17
   asking_price: number | null   // Match backend Optional[float]
   ```

2. **Add null guards** in all 3 `.toLocaleString()` call sites:
   - `deal-card.tsx:148` -- already safe via short-circuit, but add explicit check
   - `deal-card.tsx:202` -- **MUST FIX** (the crash site)
   - `Pipeline.tsx:339` -- already safe via short-circuit, but add explicit check

3. **Fix the RiskBadge misuse** at `deal-card.tsx:141`:
   ```tsx
   // asking_price is NOT a risk score -- this line displays prices as risk scores
   <RiskBadge score={card.asking_price} />  // Bug: should be card.risk_score or similar
   ```

---

## 9. Screenshots

- **Dashboard (working):** Screenshot captured -- KPI cards, recent deals, pipeline summary all render correctly
- **Pipeline (crash):** Error boundary shows "This section encountered an error / The rest of the app is still working." with Retry button
- **Pipeline (after retry):** Identical error boundary -- retry does not resolve the issue

---

## 10. Summary

| Question | Answer |
|---|---|
| Exact error | `TypeError: Cannot read properties of null (reading 'toLocaleString')` |
| Crashing component | `SortableDealCard` in `deal-card.tsx:202` (aria-label template literal) |
| Root cause | Backend returns `asking_price: null` for deals without price in inputs; frontend type says `number` (non-nullable) and calls `.toLocaleString()` without null check |
| Retry fixes it? | **No** -- deterministic data issue, not a hooks ordering bug |
| Network errors? | **None** -- all APIs return 200 |
| Other errors? | **None** |
| Severity | **P0** -- Pipeline page is completely unusable for any user who has a deal without asking_price in their pipeline |
