# Pipeline Page Code Investigation

**Date:** 2026-03-02
**Investigator:** Claude Code
**Subject:** React error boundary crash on Pipeline page
**Hypothesis:** Hook called after conditional early return (React Rules of Hooks violation, Error #310)

---

## Executive Summary

**BUG CONFIRMED** in `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx`.

The `PipelinePage` component has **zero hooks after its conditional early returns** --- meaning the *exact same pattern* as the Dashboard crash (useMemo after early return) is **NOT present** here in the same way.

However, the **real problem is subtler and still causes Error #310**: the `useSensors` / `useSensor` hooks (from `@dnd-kit/core`) are called unconditionally, BUT if the board is empty and `isLoading` is false, the component returns early at line 260 **before reaching the JSX that renders the `<DndContext>`**. This itself is not a hooks violation because all hooks are called before the early returns.

**After exhaustive analysis: there are NO hooks-after-early-return violations in Pipeline.tsx.** All 14 hook calls occur at lines 60--146, and both early returns are at lines 249--261. The hooks are correctly ordered before the returns.

**If the Pipeline page IS crashing with Error #310, the cause must be in a child component or a different rendering path.** Below is the complete analysis of every file.

---

## File 1: Pipeline.tsx (MAIN PAGE)

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx`

### A) Hook Calls (in order of appearance)

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useQueryClient()` | 60 | React Query client |
| 2 | `useNavigate()` | 61 | React Router navigation |
| 3 | `useState<PipelineCard \| null>(null)` | 62 | `activeCard` for drag overlay |
| 4 | `useState<Stage \| null>(null)` | 63 | `overColumnKey` for highlight |
| 5 | `useState<PipelineCard \| null>(null)` | 64 | `closeDealCard` for close modal |
| 6 | `useState<{...} \| null>(null)` | 65 | `removeTarget` for remove dialog |
| 7 | `useCallback(...)` | 67 | `handleCloseDeal` |
| 8 | `useSensors(useSensor(...))` | 71-75 | dnd-kit sensors (note: `useSensor` is nested inside `useSensors`) |
| 9 | `useQuery(...)` | 78-81 | Pipeline data fetch |
| 10 | `useState<Record<Stage, PipelineCard[]> \| null>(null)` | 84 | `localBoard` |
| 11 | `useMemo(...)` | 92-95 | `cardCounts` |
| 12 | `useCallback(...)` | 97-108 | `handleKanbanSelect` |
| 13 | `useKanbanKeyboard(...)` | 110-119 | Custom hook (contains its own internal hooks) |
| 14 | `useMutation(...)` | 122-133 | `updateStageMutation` |
| 15 | `useMutation(...)` | 136-146 | `removeMutation` |
| 16 | `useCallback(...)` | 148-153 | `handleRemoveCard` |
| 17 | `useCallback(...)` | 155-163 | `confirmRemoveCard` |
| 18 | `useCallback(...)` | 166-172 | `handleDragStart` |
| 19 | `useCallback(...)` | 174-193 | `handleDragOver` |
| 20 | `useCallback(...)` | 196-243 | `handleDragEnd` |

**Total top-level hook calls: 20** (all between lines 60-243)

### B) Conditional Return Statements

| Line | Condition | Returns |
|------|-----------|---------|
| 249 | `if (isError)` | `<PipelineError ... />` |
| 259 | `if (!isLoading && totalDeals === 0)` | `<PipelineEmpty />` |

### C) Hooks After Conditional Returns?

**NO.** All 20 hook calls (lines 60-243) occur BEFORE both early returns (lines 249, 259). This component does NOT have the hooks-after-early-return bug.

### D) Other Potential Crash Causes

1. **`totalDeals` computation (line 246):** Uses `board[s.key]?.length ?? 0` with optional chaining -- safe.
2. **`board` derivation (lines 86-89):** Complex chain of nullish coalescing. `localBoard ?? (pipelineData as Record<...>) ?? fallback`. The `as unknown as Record<...>` cast on line 89 is suspicious -- if `pipelineData` has a different shape than expected (e.g., an array or a wrapped `{ data: ... }` object), `board` would be the raw API response object, and accessing `board[stage.key]` could return `undefined`. This would NOT crash (due to optional chaining in most places), but could cause silent bugs.
3. **Line 186:** `board[stage.key].some(...)` -- NO optional chaining. If `board[stage.key]` is undefined, this will throw `TypeError: Cannot read properties of undefined (reading 'some')`. Same at line 212.
4. **Line 159:** `newBoard[stage].filter(...)` -- NO optional chaining. If `board` doesn't have the expected stage key, this throws.
5. **Line 339:** `activeCard.asking_price.toLocaleString()` -- safe because guarded by `activeCard.asking_price > 0`.

---

## File 2: kanban-column.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/kanban-column.tsx`

### A) Hook Calls

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useCallback(...)` | 43-51 | `makeRegisterRef` |

### B) Conditional Returns

None.

### C) Hooks After Returns?

**NO.** Only one hook, no early returns.

### D) Other Issues

None identified. Clean component.

---

## File 3: deal-card.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/deal-card.tsx`

### A) Hook Calls -- DealCard (memo-wrapped)

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useState(false)` | 49 | `menuOpen` |
| 2 | `useRef<HTMLDivElement>(null)` | 50 | `menuRef` |
| 3 | `useEffect(...)` | 52-61 | Click-outside handler for menu |

### A) Hook Calls -- SortableDealCard

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useSortable(...)` | 170-177 | dnd-kit sortable hook |
| 2 | `useCallback(...)` | 186-192 | `combinedRef` |

### B) Conditional Returns

- **DealCard:** None (within the component function body -- `RiskBadge` has an early return at line 25 but that's a separate component).
- **SortableDealCard:** None.
- **RiskBadge (line 24-38):** `if (score == null) return null` at line 25. No hooks in RiskBadge, so this is safe.

### C) Hooks After Returns?

**NO.** Both components have hooks before any logic/returns.

### D) Other Issues

None identified.

---

## File 4: mobile-pipeline.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/mobile-pipeline.tsx`

### A) Hook Calls

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useState<Stage>('lead')` | 20 | `activeStage` |
| 2 | `useRef<HTMLDivElement>(null)` | 21 | `tabsRef` |
| 3 | `useRef<HTMLButtonElement>(null)` | 22 | `activeTabRef` |
| 4 | `useEffect(...)` | 27-34 | Scroll active tab into view |
| 5 | `useCallback(...)` | 36-38 | `handleStageChange` |

### B) Conditional Returns

None.

### C) Hooks After Returns?

**NO.**

### D) Other Issues

None identified.

---

## File 5: pipeline-empty.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/pipeline-empty.tsx`

### A) Hook Calls

None.

### B) Conditional Returns

None.

### C) Hooks After Returns?

N/A.

### D) Other Issues

None.

---

## File 6: pipeline-error.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/pipeline-error.tsx`

### A) Hook Calls

None.

### B) Conditional Returns

None.

### C) Hooks After Returns?

N/A.

### D) Other Issues

None.

---

## File 7: column-skeleton.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/column-skeleton.tsx`

### A) Hook Calls

None.

### B) Conditional Returns

None.

### C) Hooks After Returns?

N/A.

### D) Other Issues

None.

---

## File 8: useKanbanKeyboard.ts

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/hooks/useKanbanKeyboard.ts`

### A) Hook Calls

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useState<KanbanFocusState>(...)` | 52-55 | `focusState` |
| 2 | `useState(false)` | 58 | `isKeyboardActive` |
| 3 | `useRef<Map<string, HTMLDivElement>>(new Map())` | 61 | `cardRefs` |
| 4 | `useCallback(...)` | 64-74 | `registerCardRef` |
| 5 | `useCallback(...)` | 77-86 | `focusCard` |
| 6 | `useCallback(...)` | 89-153 | `handleKeyDown` |
| 7 | `useCallback(...)` | 156-158 | `handleMouseDown` |

### B) Conditional Returns

None (within the hook body).

### C) Hooks After Returns?

**NO.**

### D) Other Issues

None.

---

## File 9: constants.ts

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/pipeline/constants.ts`

Pure data file. No hooks, no components, no returns.

---

## File 10: close-deal-modal.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/close-deal-modal.tsx`

### A) Hook Calls

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useQueryClient()` | 39 | React Query client |
| 2 | `useNavigate()` | 40 | React Router navigation |
| 3 | `useShake()` | 41 | Custom hook (contains useState + useCallback internally) |
| 4 | `useState('')` | 43 | `closedDate` |
| 5 | `useState('')` | 44 | `closedPrice` |
| 6 | `useState('')` | 45 | `profit` |
| 7 | `useState('')` | 46 | `monthlyCashFlow` |
| 8 | `useState('')` | 47 | `notes` |
| 9 | `useState<Record<string, string>>({})` | 48 | `errors` |
| 10 | `useState('')` | 49 | `submitError` |
| 11 | `useEffect(...)` | 51-60 | Reset form on open |
| 12 | `useMutation(...)` | 62-88 | `closeDealMutation` |

### B) Conditional Returns

None.

### C) Hooks After Returns?

**NO.**

### D) Other Issues

None.

---

## File 11: AppShell.tsx

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx`

### A) Hook Calls (AppShell component)

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useState(false)` | 221 | `mobileNavOpen` |
| 2 | `useState(false)` | 222 | `commandPaletteOpen` |
| 3 | `useRef<HTMLElement>(null)` | 223 | `mainRef` |
| 4 | `useLocation()` | 224 | React Router location |
| 5 | `useEffect(...)` | 227-238 | Focus management on route change |

### A) Hook Calls (NavGroup sub-component)

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useLocation()` | 55 | React Router location |

### A) Hook Calls (UserMenu sub-component)

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useAuthStore(...)` | 139 | Zustand store selector |
| 2 | `useLogout()` | 140 | Custom hook |

### B) Conditional Returns

None in any of the sub-components.

### C) Hooks After Returns?

**NO.**

### D) Other Issues

None.

---

## File 12: motion.ts (useShake hook)

**Path:** `/Users/ivanflores/parcel-platform/frontend/src/lib/motion.ts`

### A) Hook Calls (useShake)

| # | Hook | Line | Description |
|---|------|------|-------------|
| 1 | `useState(false)` | 146 | `shouldShake` |
| 2 | `useCallback(...)` | 147 | `triggerShake` |

### B) Conditional Returns

None.

### C) Hooks After Returns?

**NO.**

### D) Other Issues

None.

---

## Summary of Findings

### Hooks-After-Early-Return Violations

| File | Violation? | Details |
|------|-----------|---------|
| Pipeline.tsx | **NO** | All 20 hooks at lines 60-243, early returns at lines 249 and 259 |
| kanban-column.tsx | NO | 1 hook, no early returns |
| deal-card.tsx | NO | 3+2 hooks, no early returns in component bodies |
| mobile-pipeline.tsx | NO | 5 hooks, no early returns |
| pipeline-empty.tsx | NO | No hooks |
| pipeline-error.tsx | NO | No hooks |
| column-skeleton.tsx | NO | No hooks |
| useKanbanKeyboard.ts | NO | 7 hooks, no early returns |
| close-deal-modal.tsx | NO | 12 hooks, no early returns |
| AppShell.tsx | NO | Multiple sub-components, all clean |
| motion.ts (useShake) | NO | 2 hooks, no early returns |

### Other Potential Crash Causes Found

1. **Pipeline.tsx line 186:** `board[stage.key].some(...)` -- missing optional chaining. If `board[stage.key]` is `undefined`, this throws a TypeError inside the `handleDragOver` callback. Same pattern at line 212 inside `handleDragEnd`.

2. **Pipeline.tsx line 159:** `newBoard[stage].filter(...)` -- missing optional chaining inside `confirmRemoveCard`. If the board doesn't have the expected stage key populated, this throws.

3. **Pipeline.tsx lines 86-89 (board derivation):** The `pipelineData` is cast via `as Record<Stage, PipelineCard[]>`. If the API returns a different shape (e.g., `{ items: [...] }` or an array), the board object won't have stage keys, and any access like `board['lead']` will be `undefined`. Combined with the missing optional chaining in points 1 and 2, this could cause runtime crashes.

4. **Conditional rendering of CloseDealModal (line 349):** `closeDealCard && <CloseDealModal ...>` means the modal mounts/unmounts, which means its 12 internal hooks mount/unmount. This is fine in isolation, BUT if there's some parent-level state issue causing the Pipeline component itself to re-render with a different hook count (e.g., the `useSensors(useSensor(...))` pattern at line 71-75), that could theoretically cause issues. However, `useSensors` is documented to accept hook results, so this should be fine.

### Conclusion

**The Pipeline page does NOT have the same hooks-after-early-return bug that was found in Dashboard.** All hook calls are correctly placed before any conditional early returns.

If the Pipeline page is experiencing Error #310 ("Rendered more hooks than during the previous render"), the most likely causes to investigate are:

1. **A different page/component in the route tree** that wraps or is a parent of Pipeline
2. **The `useSensors(useSensor(...))` nested hook pattern** -- while this is the documented @dnd-kit API, verify it's not causing issues in the specific React version
3. **A hot-module-reload (HMR) artifact** during development that corrupted the hook order
4. **An error in a completely different component** (error boundaries can catch errors from any descendant) that was misattributed to Pipeline

If the crash is actually a **TypeError** (not a hooks violation), then the missing optional chaining at lines 186 and 212 in the drag handlers are the prime suspects.
