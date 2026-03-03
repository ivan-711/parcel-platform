# React Hooks Audit: All Page Components

**Date:** 2026-03-02
**Bug Pattern:** Hooks called AFTER conditional early return statements (violates React Rules of Hooks, error #310)
**Scope:** All `.tsx` files in `frontend/src/pages/` (including subdirectories)

---

## Dashboard.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Dashboard.tsx`

Hooks:
- Line 110: `useNavigate()`
- Line 111: `useDashboard()` (custom hook wrapping useQuery)
- Line 112: `useAuthStore()` (Zustand selector)
- Line 114: `useState(false)` — bannerDismissed
- Line 116: `useQuery({ queryKey: ['activity'] })` — activityData
- Line 130: `useMemo(() => ...)` — sparklines

Early returns:
- Line 152-167: `if (isLoading) return ...`
- Line 170-185: `if (isError) return ...`
- Line 188-246: `if (!stats || stats.total_deals === 0) return ...`

VIOLATION: **NO** -- All hooks (lines 110-135) are called before the first early return (line 152). This was previously fixed.

---

## Pipeline.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx`

Hooks:
- Line 60: `useQueryClient()`
- Line 61: `useNavigate()`
- Line 62: `useState(null)` — activeCard
- Line 63: `useState(null)` — overColumnKey
- Line 64: `useState(null)` — closeDealCard
- Line 65: `useState(null)` — removeTarget
- Line 67: `useCallback()` — handleCloseDeal
- Line 71-75: `useSensors(useSensor(...))` — sensors
- Line 78-81: `useQuery({ queryKey: ['pipeline'] })` — pipelineData
- Line 84: `useState(null)` — localBoard
- Line 92-95: `useMemo()` — cardCounts
- Line 97-108: `useCallback()` — handleKanbanSelect
- Line 110-119: `useKanbanKeyboard()` — keyboard nav
- Line 122-133: `useMutation()` — updateStageMutation
- Line 136-146: `useMutation()` — removeMutation
- Line 148-153: `useCallback()` — handleRemoveCard
- Line 155-163: `useCallback()` — confirmRemoveCard
- Line 166-171: `useCallback()` — handleDragStart
- Line 174-193: `useCallback()` — handleDragOver
- Line 196-243: `useCallback()` — handleDragEnd

Early returns:
- Line 249-256: `if (isError) return ...`
- Line 259-261: `if (!isLoading && totalDeals === 0) return ...`

VIOLATION: **NO** -- All hooks (lines 60-243) are called before the first early return (line 249).

---

## MyDeals.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx`

Hooks:
- Line 31: `useState('all')` — strategy
- Line 32: `useState('all')` — status
- Line 33: `useState('created_at_desc')` — sort
- Line 34: `useState(1)` — page
- Line 35: `useState('')` — searchQuery
- Line 36: `useDebouncedValue(searchQuery, 300)` — debouncedSearch
- Line 37: `useRef(null)` — searchInputRef
- Line 38: `useState(new Set())` — compareIds
- Line 39: `useState(null)` — deletingId
- Line 40: `useState(false)` — selectionMode
- Line 41: `useState(new Set())` — selectedIds
- Line 42: `useState(false)` — bulkDeleteOpen
- Line 43: `useState(false)` — isDeleting
- Line 44: `useQueryClient()`
- Line 46-57: `useMutation()` — deleteDeal
- Line 59-64: `useState([])` — presets (with initializer)
- Line 65: `useState(false)` — showPresetInput
- Line 66: `useState('')` — presetName
- Line 68-70: `useEffect()` — persist presets
- Line 135: `useDeals(filters)` — deals data

Early returns:
- None (uses inline conditional rendering throughout)

VIOLATION: **NO** -- No early returns exist. All hooks are at top level.

---

## Landing.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Landing.tsx`

Hooks:
- None

Early returns:
- None

VIOLATION: **NO** -- No hooks, no early returns.

---

## Login.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Login.tsx`

Hooks:
- Line 17: `useLogin()` — custom mutation hook
- Line 18: `useShake()` — custom animation hook
- Line 19-22: `useState({ email: '', password: '' })` — form
- Line 24-26: `useEffect()` — trigger shake on error

Early returns:
- None

VIOLATION: **NO** -- No early returns.

---

## Register.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Register.tsx`

Hooks:
- Line 50: `useRegister()` — custom mutation hook
- Line 51: `useShake()` — custom animation hook
- Line 52-57: `useState({ name: '', email: '', password: '', role: null })` — form
- Line 58: `useState(null)` — roleError
- Line 60-62: `useEffect()` — trigger shake on error

Early returns:
- None

VIOLATION: **NO** -- No early returns.

---

## NotFound.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/NotFound.tsx`

Hooks:
- None

Early returns:
- None

VIOLATION: **NO** -- No hooks, no early returns.

---

## ForgotPassword.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/ForgotPassword.tsx`

Hooks:
- Line 12: `useState('')` — email
- Line 13: `useState(false)` — isSubmitting
- Line 14: `useState(false)` — isSuccess
- Line 15: `useState(null)` — error

Early returns:
- None

VIOLATION: **NO** -- No early returns.

---

## ResetPassword.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/ResetPassword.tsx`

Hooks:
- Line 15: `useSearchParams()`
- Line 16: `useNavigate()`
- Line 19: `useState('')` — password
- Line 20: `useState('')` — confirmPassword
- Line 21: `useState(false)` — isSubmitting
- Line 22: `useState(token ? 'form' : 'error')` — pageState
- Line 23: `useShake()` — shake animation
- Line 24: `useState(null)` — validationError
- Line 26-28: `useCallback()` — redirectToLogin
- Line 31-35: `useEffect()` — auto-redirect after success

Early returns:
- None

VIOLATION: **NO** -- No early returns.

---

## analyze/StrategySelectPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/StrategySelectPage.tsx`

Hooks:
- None

Early returns:
- None

VIOLATION: **NO** -- No hooks, no early returns.

---

## analyze/AnalyzerFormPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/AnalyzerFormPage.tsx`

Hooks (in exported `AnalyzerFormPage` component, line 1079+):
- Line 1080: `useParams()` — strategy

Early returns:
- Line 1085-1098: `if (!isValid) return ...`
- Line 1100-1120: `if (!isEnabled) return ...`

VIOLATION: **NO** -- The only hook in the page component (`useParams` at line 1080) is called before both early returns (lines 1085, 1100). The inner form components (e.g., `WholesaleForm`, `BuyAndHoldForm`, etc.) are separate component functions with their own hooks -- those are not affected by the parent's early returns.

---

## analyze/ResultsPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx`

Hooks:
- Line 66: `useParams()`
- Line 67: `useNavigate()`
- Line 68: `useDeal(dealId ?? '')` — custom useQuery hook
- Line 69: `useAddToPipeline()` — custom useMutation hook
- Line 70: `useUpdateDeal(dealId ?? '')` — custom useMutation hook
- Line 71: `useState(false)` — saved
- Line 72: `useState(false)` — sharing
- Line 73: `useState(false)` — copied
- Line 74: `useState(false)` — addedToPipeline
- Line 75: `useState(false)` — stageMenuOpen
- Line 76: `useState(false)` — offerLetterOpen
- Line 77: `useRef(null)` — stageMenuRef
- Line 79-88: `useMutation()` — deleteDeal
- Line 90-92: `useEffect()` — reset addedToPipeline on dealId change
- Line 94-103: `useEffect()` — close stage menu on click outside

Early returns:
- Line 105-121: `if (isLoading || !deal) return ...`

**Post-early-return code that uses hooks:**
- Line 197: `useState(false)` -- generatingPDF

VIOLATION: **YES**

- `useState(false)` on line 197 (`generatingPDF`) is called AFTER the early return on line 105.
- When `isLoading` is true or `deal` is null, the component returns the skeleton UI, but on the NEXT render when data loads, React sees more hooks than before -- triggering error #310.

---

## documents/DocumentsPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/documents/DocumentsPage.tsx`

Hooks:
- Line 67: `useState(null)` — selectedId
- Line 68: `useState(1)` — page
- Line 69: `useQueryClient()`
- Line 71-75: `useQuery({ queryKey: ['documents', page] })` — data
- Line 77-90: `useMutation()` — uploadMutation

Early returns:
- None (uses inline conditional rendering)

VIOLATION: **NO** -- No early returns.

---

## portfolio/PortfolioPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx`

Hooks:
- Line 323: `usePortfolio()` — custom useQuery hook
- Line 324: `useQueryClient()`
- Line 325: `useState(false)` — sheetOpen
- Line 326: `useState(null)` — editingEntry
- Line 328-338: `useMutation()` — addMutation
- Line 340-351: `useMutation()` — editMutation
- Line 357-368: `useMemo()` — chartData
- Line 371-395: `useMemo()` — strategyBreakdownData
- Line 398-413: `useMemo()` — monthlyCashFlowData

Early returns:
- Line 416-430: `if (isLoading) return ...`

VIOLATION: **NO** -- All hooks (lines 323-413) are called before the early return (line 416).

---

## settings/SettingsPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/settings/SettingsPage.tsx`

Hooks:
- Line 32-35: `useQuery({ queryKey: ['me'] })` — user
- Line 38: `useState('')` — name
- Line 39: `useState('')` — email
- Line 40: `useState(null)` — profileMsg
- Line 43: `useState('')` — currentPassword
- Line 44: `useState('')` — newPassword
- Line 45: `useState('')` — confirmPassword
- Line 46: `useState(null)` — passwordMsg
- Line 47: `useState('')` — confirmError
- Line 50: `useQueryClient()`
- Line 52-55: `useQuery({ queryKey: ['notification-preferences'] })` — notifPrefs
- Line 57: `useState(false)` — notifSaved
- Line 58: `useState(false)` — notifError
- Line 60-71: `useMutation()` — notifMutation
- Line 74-79: `useEffect()` — populate form on user load
- Line 81-99: `useMutation()` — profileMutation
- Line 101-115: `useMutation()` — passwordMutation

Early returns:
- Line 140-149: `if (isLoading) return ...`

VIOLATION: **NO** -- All hooks (lines 32-115) are called before the early return (line 140).

---

## chat/ChatPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/chat/ChatPage.tsx`

Hooks:
- Line 95: `useSearchParams()`
- Line 100: `useState([])` — messages
- Line 101: `useState('')` — input
- Line 102: `useState(false)` — isStreaming
- Line 103: `useState(crypto.randomUUID())` — sessionId
- Line 105: `useRef(null)` — abortRef
- Line 106: `useRef(null)` — messagesEndRef
- Line 107: `useRef(null)` — textareaRef
- Line 110-114: `useQuery({ queryKey: ['chat-history', ...] })` — historyData
- Line 116-128: `useEffect()` — load history into messages
- Line 131-133: `useEffect()` — auto-scroll
- Line 135-198: `useCallback()` — handleSend

Early returns:
- None

VIOLATION: **NO** -- No early returns.

---

## compare/ComparePage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/compare/ComparePage.tsx`

Hooks:
- Line 70: `useSearchParams()`
- Line 74: `useDeals({ per_page: 100 })` — allDeals
- Line 75: `useDeal(dealAId)` — dealA
- Line 76: `useDeal(dealBId)` — dealB
- Line 78: `useMemo()` — dealOptions
- Line 81-84: `useMemo()` — dealBOptions
- Line 107-123: `useMemo()` — strategyRows

Early returns:
- None

VIOLATION: **NO** -- No early returns.

---

## share/ShareDealPage.tsx

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/share/ShareDealPage.tsx`

Hooks:
- Line 162: `useParams()`
- Line 163: `useState(false)` — breakdownOpen
- Line 165-170: `useQuery({ queryKey: ['share', dealId] })` — deal data

Early returns:
- Line 172: `if (isLoading) return <LoadingState />`
- Line 173: `if (isError || !deal) return <ErrorState />`

VIOLATION: **NO** -- All hooks (lines 162-170) are called before the first early return (line 172).

---

# SUMMARY

## Files with violations: 1

### 1. `analyze/ResultsPage.tsx` -- VIOLATION

**File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx`

**Problem:**
- `useState(false)` for `generatingPDF` on **line 197** is called AFTER the early return on **line 105** (`if (isLoading || !deal) return ...`).
- On the first render when `isLoading` is true, React only sees hooks up through line 103 (the two `useEffect` calls). When data loads and the component re-renders past the early return, React encounters the extra `useState` on line 197 -- a different number of hooks than the previous render.

**Fix:**
Move `const [generatingPDF, setGeneratingPDF] = useState(false)` up to the hook block at the top of the component, alongside the other `useState` calls (after line 76, before line 79). The variable can safely be initialized before the early return since it defaults to `false` and is only used in the populated state.

**Before (broken):**
```tsx
// Line 65-103: hooks
export default function ResultsPage() {
  const { dealId } = useParams<{ dealId: string }>()
  // ... many hooks ...
  useEffect(() => { ... }, [stageMenuOpen])

  // Line 105: EARLY RETURN
  if (isLoading || !deal) {
    return ( <AppShell title="Deal Results">...</AppShell> )
  }

  // ... derived values ...

  // Line 197: BUG -- useState AFTER early return
  const [generatingPDF, setGeneratingPDF] = useState(false)
```

**After (fixed):**
```tsx
export default function ResultsPage() {
  const { dealId } = useParams<{ dealId: string }>()
  // ... many hooks ...
  const [generatingPDF, setGeneratingPDF] = useState(false)  // MOVED UP
  useEffect(() => { ... }, [stageMenuOpen])

  // Line 105: EARLY RETURN -- now safe, all hooks are above
  if (isLoading || !deal) {
    return ( <AppShell title="Deal Results">...</AppShell> )
  }

  // ... derived values, no more hook calls below ...
```

## Files without violations: 17

| File | Reason |
|------|--------|
| Dashboard.tsx | All hooks before early returns (previously fixed) |
| Pipeline.tsx | All hooks before early returns |
| MyDeals.tsx | No early returns |
| Landing.tsx | No hooks |
| Login.tsx | No early returns |
| Register.tsx | No early returns |
| NotFound.tsx | No hooks |
| ForgotPassword.tsx | No early returns |
| ResetPassword.tsx | No early returns |
| StrategySelectPage.tsx | No hooks |
| AnalyzerFormPage.tsx | Only `useParams` before early returns; inner forms are separate components |
| DocumentsPage.tsx | No early returns |
| PortfolioPage.tsx | All hooks before early return |
| SettingsPage.tsx | All hooks before early return |
| ChatPage.tsx | No early returns |
| ComparePage.tsx | No early returns |
| ShareDealPage.tsx | All hooks before early returns |
