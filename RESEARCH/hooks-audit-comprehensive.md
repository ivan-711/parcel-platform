# Comprehensive React Hooks Ordering Audit

**Audited:** 2026-03-02
**Scope:** Every `.tsx` and `.ts` file in `frontend/src/pages/`, `frontend/src/components/`, and `frontend/src/hooks/`
**Total files audited:** 62

---

## VIOLATIONS FOUND

### 1. `frontend/src/pages/share/ShareDealPage.tsx` -- VIOLATION

**Lines:** 172-173 (early returns), then lines 175-186 (non-hook code that derives from deal data after the guard)

**Hooks present:**
- Line 162: `useParams` (before returns -- OK)
- Line 163: `useState` (before returns -- OK)
- Line 165-169: `useQuery` (before returns -- OK)

**Early returns:**
- Line 172: `if (isLoading) return <LoadingState />`
- Line 173: `if (isError || !deal) return <ErrorState />`

**Verdict:** No hook is called after the early returns. The code after lines 172-173 is all non-hook derived values and JSX. **CLEAN -- no violation.**

Wait -- let me re-examine more carefully.

Actually, upon careful re-examination: **ShareDealPage is CLEAN.** All three hooks (`useParams`, `useState`, `useQuery`) are called before the early returns at lines 172-173. The code after the returns is purely non-hook derivations (variable assignments and JSX).

### 2. `frontend/src/pages/settings/SettingsPage.tsx` -- VIOLATION

**Hooks called:**
- Line 32-35: `useQuery` (queryKey: `['me']`)
- Lines 38-47: `useState` x7 (name, email, profileMsg, currentPassword, newPassword, confirmPassword, passwordMsg, confirmError)
- Line 50: `useQueryClient`
- Lines 52-55: `useQuery` (queryKey: `['notification-preferences']`)
- Lines 57-58: `useState` x2 (notifSaved, notifError)
- Lines 60-71: `useMutation` (notifMutation)
- Lines 74-79: `useEffect`
- Lines 81-99: `useMutation` (profileMutation)
- Lines 101-115: `useMutation` (passwordMutation)

**Early return:**
- Lines 140-149: `if (isLoading) { return (...) }`

**After the early return:**
- Line 151+: Only JSX rendering, no hooks.

**Verdict: CLEAN** -- all hooks are above the early return.

### 3. `frontend/src/pages/portfolio/PortfolioPage.tsx` -- VIOLATION

**Hooks called (in PortfolioPage component):**
- Line 323: `usePortfolio()`
- Line 324: `useQueryClient()`
- Line 325: `useState` (sheetOpen)
- Line 326: `useState` (editingEntry)
- Lines 328-338: `useMutation` (addMutation)
- Lines 340-351: `useMutation` (editMutation)
- Lines 357-368: `useMemo` (chartData)
- Lines 371-395: `useMemo` (strategyBreakdownData)
- Lines 398-413: `useMemo` (monthlyCashFlowData)

**Early return:**
- Lines 416-430: `if (isLoading) { return (...) }`

**After the early return:**
- Line 432+: Only JSX rendering, no hooks.

**Verdict: CLEAN** -- all hooks are above the early return.

### 4. `frontend/src/components/deals/compare-bar.tsx` -- VIOLATION

**Hooks called:**
- Line 12: `useNavigate()`

**Early return:**
- Line 14: `if (compareIds.size !== 2) return null`

**After the early return:**
- Line 16+: Only JSX rendering, no hooks.

**Verdict: CLEAN** -- the only hook (`useNavigate`) is before the early return.

### 5. `frontend/src/components/ui/KPICard.tsx` -- VIOLATION

**Hooks called:**
- Line 37: `useCountUp(value)`
- Lines 40-43: `useMemo` (chartData)
- Lines 45-47: `useMemo` (gradientId)

**Early return:**
- Lines 49-51: `if (loading) { return <SkeletonCard ... /> }`

**After the early return:**
- Line 53+: Only non-hook code (variable declarations and JSX).

**Verdict: CLEAN** -- all three hooks are above the early return.

### 6. `frontend/src/components/charts/CashFlowProjection.tsx` -- POTENTIAL VIOLATION

**Hooks called:**
- Lines 273-276: `useMemo` (data)

**Early return:**
- Lines 279-303: `if (!data) { return (...) }`

**After the early return:**
- Line 305+: Only JSX rendering, no hooks.

**Verdict: CLEAN** -- the only hook (`useMemo`) is above the early return.

### 7. `frontend/src/components/charts/ComparisonRadar.tsx` -- POTENTIAL VIOLATION

**Hooks called:**
- Lines 203-259: `useMemo` (data, activeDimensions, dealAddresses)

**Early return:**
- Lines 262-272: `if (deals.length < 2 || activeDimensions.length < 3) { return (...) }`

**After the early return:**
- Line 274+: Only JSX rendering, no hooks.

**Verdict: CLEAN** -- the only hook (`useMemo`) is above the early return.

### 8. `frontend/src/components/documents/document-detail.tsx` -- POTENTIAL VIOLATION (RightPanelContent)

**Hooks called in RightPanelContent:**
- Line 267: `useQueryClient()`
- Lines 269-278: `useQuery` (queryKey: `['document', selectedId]`)
- Lines 280-288: `useMutation` (deleteMutation)

**Early returns:**
- Lines 290-296: `if (!selectedId) { return (...) }`
- Lines 299-313: `if (isLoading) { return (...) }`
- Line 315: `if (!doc) return null`
- Lines 317-335: `if (doc.status === 'pending' || doc.status === 'processing') { return (...) }`
- Lines 338-372: `if (doc.status === 'failed') { return (...) }`

**After the early returns:**
- Lines 375+: Only JSX rendering, no hooks.

**Verdict: CLEAN** -- all three hooks are above all early returns.

---

## ACTUAL VIOLATION FOUND

After exhaustive review of all 62 files, I found **ZERO remaining hooks ordering violations** in the current codebase. The previously-reported violations in Dashboard.tsx, Pipeline.tsx, and ResultsPage.tsx have been successfully fixed in prior commits.

---

## COMPLETE FILE-BY-FILE AUDIT RESULTS

### Pages (18 files)

| File | Hooks Used | Early Returns | Status |
|------|-----------|---------------|--------|
| `pages/Dashboard.tsx` | useNavigate, useDashboard, useAuthStore, useState, useQuery, useMemo | Lines 152 (isLoading), 170 (isError), 188 (empty) | **CLEAN** -- all hooks (including useMemo at L130) are above first early return at L152 |
| `pages/Pipeline.tsx` | useQueryClient, useNavigate, useState x4, useCallback, useSensors/useSensor, useQuery, useMemo, useKanbanKeyboard, useMutation x2, useCallback x5 | Lines 249 (isError), 259 (empty) | **CLEAN** -- all hooks above first early return at L249 |
| `pages/analyze/ResultsPage.tsx` | useParams, useNavigate, useDeal, useAddToPipeline, useUpdateDeal, useState x7, useRef, useMutation, useEffect x2 | Line 106 (isLoading/!deal) | **CLEAN** -- all hooks above early return at L106 |
| `pages/MyDeals.tsx` | useState x10, useDebouncedValue, useRef, useMutation, useQueryClient, useEffect, useDeals | No early returns (uses inline conditionals in JSX) | **CLEAN** |
| `pages/compare/ComparePage.tsx` | useSearchParams, useDeals, useDeal x2, useMemo x4 | No early returns (uses inline conditionals in JSX) | **CLEAN** |
| `pages/chat/ChatPage.tsx` | useSearchParams, useState x4, useRef x3, useQuery, useEffect x2, useCallback | No early returns | **CLEAN** |
| `pages/analyze/AnalyzerFormPage.tsx` | useParams, useState, useForm, useCreateDeal, useShake | No early returns | **CLEAN** |
| `pages/analyze/StrategySelectPage.tsx` | None | None | **CLEAN** (no hooks used) |
| `pages/portfolio/PortfolioPage.tsx` | usePortfolio, useQueryClient, useState x2, useMutation x2, useMemo x3 | Line 416 (isLoading) | **CLEAN** -- all hooks above early return |
| `pages/documents/DocumentsPage.tsx` | useState x2, useQueryClient, useQuery, useMutation | No early returns | **CLEAN** |
| `pages/share/ShareDealPage.tsx` | useParams, useState, useQuery | Lines 172-173 (isLoading, isError) | **CLEAN** -- all hooks above early returns |
| `pages/settings/SettingsPage.tsx` | useQuery x2, useState x7, useQueryClient, useMutation x3, useEffect | Line 140 (isLoading) | **CLEAN** -- all hooks above early return |
| `pages/Login.tsx` | useLogin, useShake, useState, useEffect | No early returns | **CLEAN** |
| `pages/Register.tsx` | useRegister, useShake, useState x2, useEffect | No early returns | **CLEAN** |
| `pages/Landing.tsx` | None | None | **CLEAN** (no hooks, just renders children) |
| `pages/ForgotPassword.tsx` | useState x4 | No early returns | **CLEAN** |
| `pages/ResetPassword.tsx` | useSearchParams, useNavigate, useState x4, useShake, useCallback, useEffect | No early returns | **CLEAN** |
| `pages/NotFound.tsx` | None | None | **CLEAN** (no hooks) |

### Components (44 files)

| File | Hooks Used | Early Returns | Status |
|------|-----------|---------------|--------|
| `components/layout/AppShell.tsx` | useState x2, useRef, useLocation, useEffect, useAuthStore, useLogout, useLocation (NavGroup) | No early returns in hook-using components | **CLEAN** |
| `components/layout/PageHeader.tsx` | None | N/A | **CLEAN** |
| `components/layout/PageContent.tsx` | None | N/A | **CLEAN** |
| `components/command-palette.tsx` | useNavigate, useState x2, useDebouncedValue (local), useRef, useQuery, useCallback x2, useEffect x2 | No early returns | **CLEAN** |
| `components/error-boundary.tsx` | None (class components) | N/A | **CLEAN** (class components don't use hooks) |
| `components/offer-letter-modal.tsx` | useState, useQuery | No early returns | **CLEAN** |
| `components/close-deal-modal.tsx` | useQueryClient, useNavigate, useShake, useState x6, useEffect, useMutation | No early returns | **CLEAN** |
| `components/edit-portfolio-modal.tsx` | useState x5, useEffect | No early returns | **CLEAN** |
| `components/ui/KPICard.tsx` | useCountUp, useMemo x2 | Line 49 (loading) | **CLEAN** -- all hooks above early return |
| `components/ui/RiskGauge.tsx` | useCountUp | No early returns | **CLEAN** |
| `components/ui/SkeletonCard.tsx` | None | N/A | **CLEAN** |
| `components/ui/StrategyBadge.tsx` | None | N/A | **CLEAN** |
| `components/ui/ConceptTooltip.tsx` | None | N/A | **CLEAN** |
| `components/ui/button.tsx` | None (forwardRef) | N/A | **CLEAN** |
| `components/ui/input.tsx` | None (forwardRef) | N/A | **CLEAN** |
| `components/ui/label.tsx` | None (forwardRef) | N/A | **CLEAN** |
| `components/ui/card.tsx` | None (forwardRef) | N/A | **CLEAN** |
| `components/ui/tooltip.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/ui/sheet.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/ui/badge.tsx` | None | N/A | **CLEAN** |
| `components/ui/sonner.tsx` | None | N/A | **CLEAN** |
| `components/ui/select.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/ui/dialog.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/ui/popover.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/ui/switch.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/ui/alert-dialog.tsx` | None (re-export) | N/A | **CLEAN** |
| `components/charts/CashFlowProjection.tsx` | useMemo | Line 279 (!data) | **CLEAN** -- useMemo above early return |
| `components/charts/ComparisonRadar.tsx` | useMemo | Line 262 (not enough data) | **CLEAN** -- useMemo above early return |
| `components/landing/ParallaxBackground.tsx` | useRef, useScroll, useTransform (in ParallaxLayer) | No early returns | **CLEAN** |
| `components/landing/navbar.tsx` | useState, useEffect | No early returns | **CLEAN** |
| `components/landing/hero.tsx` | useNavigate, useAuthStore, useState x2 | No early returns | **CLEAN** |
| `components/landing/demo-card.tsx` | useState | No early returns | **CLEAN** |
| `components/landing/features-bento.tsx` | None | N/A | **CLEAN** |
| `components/landing/ticker.tsx` | None | N/A | **CLEAN** |
| `components/landing/stats-strip.tsx` | None | N/A | **CLEAN** |
| `components/landing/how-it-works.tsx` | None | N/A | **CLEAN** |
| `components/landing/pricing.tsx` | None | N/A | **CLEAN** |
| `components/landing/final-cta.tsx` | None | N/A | **CLEAN** |
| `components/landing/footer.tsx` | None | N/A | **CLEAN** |
| `components/pipeline/kanban-column.tsx` | useCallback | No early returns | **CLEAN** |
| `components/pipeline/mobile-pipeline.tsx` | useState, useRef x2, useEffect, useCallback | No early returns | **CLEAN** |
| `components/pipeline/deal-card.tsx` | memo, useState, useRef, useEffect (DealCard); useSortable, useCallback (SortableDealCard) | No early returns | **CLEAN** |
| `components/pipeline/pipeline-empty.tsx` | None | N/A | **CLEAN** |
| `components/pipeline/pipeline-error.tsx` | None | N/A | **CLEAN** |
| `components/pipeline/column-skeleton.tsx` | None | N/A | **CLEAN** |
| `components/deals/deal-card.tsx` | None | N/A | **CLEAN** |
| `components/deals/deal-grid.tsx` | None | N/A | **CLEAN** |
| `components/deals/filter-bar.tsx` | useRef, useEffect | No early returns | **CLEAN** |
| `components/deals/compare-bar.tsx` | useNavigate | Line 14 (compareIds.size !== 2) | **CLEAN** -- useNavigate above early return |
| `components/deals/preset-chips.tsx` | None | N/A | **CLEAN** |
| `components/documents/upload-zone.tsx` | useCallback, useDropzone | No early returns | **CLEAN** |
| `components/documents/document-list.tsx` | None | N/A | **CLEAN** |
| `components/documents/document-detail.tsx` | useNavigate, useState (DetailPanel); useQueryClient, useQuery, useMutation (RightPanelContent) | Lines 290, 299, 315, 317, 338 (RightPanelContent) | **CLEAN** -- all hooks above first early return |
| `components/documents/processing-steps.tsx` | None | N/A | **CLEAN** |

### Custom Hooks (7 files)

| File | Internal Hooks Used | Early Returns | Status |
|------|-------------------|---------------|--------|
| `hooks/useCountUp.ts` | useState, useRef x2, useEffect | No early returns | **CLEAN** |
| `hooks/useDashboard.ts` | useQuery | No early returns | **CLEAN** |
| `hooks/useDeals.ts` | useQuery, useMutation, useQueryClient, useNavigate | No early returns | **CLEAN** |
| `hooks/usePortfolio.ts` | useQuery | No early returns | **CLEAN** |
| `hooks/useAuth.ts` | useMutation, useNavigate, useAuthStore | No early returns | **CLEAN** |
| `hooks/useDebouncedValue.ts` | useState, useEffect | No early returns | **CLEAN** |
| `hooks/useKanbanKeyboard.ts` | useState x2, useRef, useCallback x4 | No early returns | **CLEAN** |

### Constant/Type-only files (no components, no hooks)

- `components/landing/constants.ts` -- data only
- `components/pipeline/constants.ts` -- data only
- `components/deals/constants.ts` -- data only
- `components/documents/constants.ts` -- data only

---

## SUMMARY

**Total files audited:** 62
**Violations found:** 0

All previously-reported violations (Dashboard.tsx, Pipeline.tsx, ResultsPage.tsx) have been successfully fixed in prior commits:
- Commit `e2f14a5`: "fix: pipeline crash on null asking_price and ResultsPage hooks violation"
- Commit `e13e139`: "fix: resolve post-login crash caused by React hooks ordering violation"

The codebase is currently **clean of all hooks ordering violations**. Every file with hooks that also has early returns places all hook calls before the first conditional return statement.

### Patterns observed (for future reference)

1. **Good pattern used throughout:** All `useMemo`, `useCallback`, `useState`, `useQuery`, `useMutation`, `useEffect`, `useNavigate`, `useParams`, `useSearchParams`, and custom hooks are consistently placed at the top of component function bodies.

2. **Files with hooks + early returns that are correctly ordered:**
   - `Dashboard.tsx` (4 hooks, 3 early returns)
   - `Pipeline.tsx` (12+ hooks, 2 early returns)
   - `ResultsPage.tsx` (9+ hooks, 1 early return)
   - `SettingsPage.tsx` (13+ hooks, 1 early return)
   - `PortfolioPage.tsx` (8+ hooks, 1 early return)
   - `ShareDealPage.tsx` (3 hooks, 2 early returns)
   - `KPICard.tsx` (3 hooks, 1 early return)
   - `CashFlowProjection.tsx` (1 hook, 1 early return)
   - `ComparisonRadar.tsx` (1 hook, 1 early return)
   - `RightPanelContent` in `document-detail.tsx` (3 hooks, 5 early returns)
   - `CompareBar` in `compare-bar.tsx` (1 hook, 1 early return)

3. **No hooks inside conditionals, loops, or ternaries** were found anywhere in the codebase.

4. **No conditionally-called hooks** (e.g., `if (x) useState(...)`) were found anywhere.
