# Parcel Platform — User Flow QA Audit

**Date:** 2026-03-02
**Auditor:** Claude Code (Code-level trace)
**Method:** Full source code trace of every user flow, no live browser testing
**Severity Scale:** CRITICAL (app crashes/data loss), HIGH (broken feature), MEDIUM (degraded UX), LOW (cosmetic/minor)

---

## Part 1: Route Configuration Analysis

**File:** `frontend/src/App.tsx`

### Route Map

| Route | Component | Protected | Error Boundary |
|---|---|---|---|
| `/` | Landing | No | No (root ErrorBoundary only) |
| `/login` | Login | No | No |
| `/register` | Register | No | No |
| `/forgot-password` | ForgotPassword | No | No |
| `/reset-password` | ResetPassword | No | No |
| `/share/:dealId` | ShareDeal | No | No |
| `/dashboard` | Dashboard | Yes | PageErrorBoundary |
| `/analyze` | StrategySelectPage | Yes | PageErrorBoundary |
| `/analyze/results/:dealId` | ResultsPage | Yes | PageErrorBoundary |
| `/analyze/:strategy` | AnalyzerFormPage | Yes | PageErrorBoundary |
| `/deals` | MyDeals | Yes | PageErrorBoundary |
| `/compare` | ComparePage | Yes | PageErrorBoundary |
| `/pipeline` | Pipeline | Yes | PageErrorBoundary |
| `/portfolio` | PortfolioPage | Yes | PageErrorBoundary |
| `/documents` | DocumentsPage | Yes | PageErrorBoundary |
| `/chat` | ChatPage | Yes | PageErrorBoundary |
| `/settings` | SettingsPage | Yes | PageErrorBoundary |
| `*` | NotFound | No | No |

### Issues Found

**ISSUE R-1: Public routes lack PageErrorBoundary** (MEDIUM)
Login, Register, ForgotPassword, ResetPassword, Landing, ShareDeal, and NotFound pages are not wrapped in `PageErrorBoundary`. If any of these crash, only the root `ErrorBoundary` catches it, which shows a full-screen error with "Dashboard" and "Try Again" buttons. For unauthenticated users on Landing/Login, the "Dashboard" button redirects to `/dashboard`, which then redirects back to `/login` (confusing loop). The root error boundary `handleGoHome` does `window.location.href = '/dashboard'` which would trigger a ProtectedRoute redirect for logged-out users.

**ISSUE R-2: Route ordering ambiguity for `/analyze/results/:dealId` vs `/analyze/:strategy`** (LOW)
Routes `/analyze/results/:dealId` and `/analyze/:strategy` are both parametric. Since `results` is listed first, React Router correctly matches `/analyze/results/abc123` to ResultsPage. However, if anyone navigates to `/analyze/results` (no dealId), it would match `/analyze/:strategy` with `strategy = "results"` which is not a valid strategy. The AnalyzerFormPage handles this correctly by checking VALID_STRATEGIES and showing a "Not Found" state, so this is a minor edge case.

**ISSUE R-3: No redirect from `/login` to `/dashboard` for already-authenticated users** (MEDIUM)
When an authenticated user navigates to `/login`, the page renders the login form. There is no guard to redirect them to `/dashboard`. Same applies to `/register`. This means a logged-in user can see the login/register forms and attempt to log in again, which would overwrite their session.

**ISSUE R-4: Auth state persists in localStorage but JWT is in httpOnly cookie** (MEDIUM)
`authStore.ts` hydrates `isAuthenticated` from `localStorage.getItem('parcel_user')`. If the httpOnly cookie expires but localStorage still has the user object, the app will think the user is authenticated, render protected routes, and then every API call will fail with 401 (which clears auth via the API client). This creates a brief flash of authenticated UI followed by forced logout. Not a crash, but a jarring experience.

---

## Part 2: User Flow Traces

### Flow 1: Login -> Dashboard

#### Login Page (`Login.tsx`)

**Trace:**
1. User sees login form with email + password fields
2. `useLogin()` hook wraps `api.auth.login(email, password)` in a mutation
3. On submit: `login.mutate({ email, password })`
4. Success: `setAuth(user)` saves user to Zustand + localStorage, `navigate('/dashboard')`
5. Error: `login.error.message` displayed inline, form shakes via `useShake`

**Issues:**
- **ISSUE L-1: No loading state blocks re-submission properly** (LOW) - The submit button is disabled when `login.isPending`, which is correct. No issue here.
- **ISSUE L-2: Login error message may expose backend details** (LOW) - The error message comes from `login.error.message` which is whatever the API returns. If the backend returns "Invalid credentials" that's fine. If it returns a stack trace or detailed error, that would leak info. This depends on backend behavior.

#### Dashboard Page (`Dashboard.tsx`)

**Trace:**
1. Two queries fire: `useDashboard()` (dashboard stats) and `useQuery(['activity'])` (activity list)
2. Loading: Shows skeleton cards inside AppShell
3. Error: Shows error card with message
4. Empty (0 deals): Shows "Analyze Your First Deal" CTA + hint cards
5. Populated: KPI row (4 cards), Recent Deals table, Pipeline Summary, Recent Activity

**Issues:**
- **ISSUE D-1: Empty state hint cards grid is `grid-cols-3` with no responsive breakpoint** (MEDIUM)
  File: `Dashboard.tsx` line 229: `className="grid grid-cols-3 gap-4"`. On mobile (< 640px), three cards in a row will be cramped. Each card has ~120px minimum width, so on a 320px screen this forces ~106px per card which makes text unreadable. Should be `grid-cols-1 sm:grid-cols-3`.

- **ISSUE D-2: Sparkline data regenerates on every render cycle** (LOW)
  `generateTrendData` uses `Math.random()`. The `sparklines` are memoized with `useMemo` keyed on `stats` values, so they stay stable across re-renders as long as stats don't change. This is correctly handled.

- **ISSUE D-3: Recent Deals table has no horizontal scroll on mobile** (MEDIUM)
  The table at line 299 is inside a `rounded-xl border` div with `overflow-hidden`, but there's no `overflow-x-auto` wrapper. On mobile, a 5-column table (Address, Strategy, Risk, Status, View) will overflow. The table container has no horizontal scrolling mechanism.

- **ISSUE D-4: `timeAgo` utility called for activity items — not verified** (LOW)
  The `timeAgo` function is imported from `@/lib/utils`. If timestamps are in unexpected format, it could show "NaN" or "Invalid Date". This depends on backend data shape.

---

### Flow 2: Pipeline

#### Pipeline Page (`Pipeline.tsx`)

**Trace:**
1. `useQuery(['pipeline'])` fetches pipeline data
2. Data is typed as `Record<Stage, PipelineCard[]>` but API returns `{ data: Record<string, PipelineCardResponse[]> }`
3. Error: Shows `PipelineError` component with retry button
4. Empty (0 total deals): Shows `PipelineEmpty` component
5. Populated: Desktop Kanban (hidden on <md) + Mobile tabbed view (visible on <md)

**Issues:**
- **ISSUE P-1: Pipeline API response shape mismatch** (HIGH)
  File: `api.ts` line 146: `api.pipeline.list()` returns `{ data: Record<string, PipelineCardResponse[]> }`. But in `Pipeline.tsx` line 86-88, the board is derived from `pipelineData` cast as `Record<Stage, PipelineCard[]>`. The API wraps the data in a `{ data: ... }` object, but the Pipeline page doesn't unwrap it. It treats `pipelineData` directly as the board. This means `board` would be `{ data: { lead: [...], ... } }` rather than `{ lead: [...], ... }`. Every stage column would show 0 cards because `board['lead']` is undefined (the data is in `board.data.lead`). The pipeline would always show as empty.

  CORRECTION: Looking more carefully, `pipelineData` comes from `useQuery`, so `data: pipelineData` destructures the React Query wrapper. The `pipelineData` is the resolved value from `api.pipeline.list()`, which is `{ data: Record<string, PipelineCardResponse[]> }`. So `pipelineData.data` has the actual board, but `pipelineData` itself is not the board. The line `(pipelineData as Record<Stage, PipelineCard[]> | undefined)` is incorrect — it should be `pipelineData?.data` or the API type should not wrap in `{ data: ... }`.

  However, if the backend actually returns the stage map directly (without a `data` wrapper), then the type in `api.ts` is wrong but the code works. This needs backend verification. If the type is accurate, this is a critical rendering bug where the pipeline always appears empty.

- **ISSUE P-2: "Add Deal" button uses `<a href>` instead of `<Link to>`** (LOW)
  Line 270: `<a href="/analyze">` instead of `<Link to="/analyze">`. This causes a full page reload rather than a client-side navigation, breaking the SPA experience and losing all in-memory state.

- **ISSUE P-3: Pipeline loading state shows Kanban columns with skeletons, but empty state check runs before loading completes** (LOW)
  Lines 258-261: `if (!isLoading && totalDeals === 0)` — this correctly gates on `!isLoading`, so no issue.

#### Pipeline Components

- **deal-card.tsx**: `DealCard` is wrapped in `React.memo`. The context menu (three-dot) positions absolutely at `top-10 right-3`. On cards near the bottom of a column, the menu could overflow below the viewport. No scroll handling or boundary detection.

- **kanban-column.tsx**: Correctly uses `SortableContext` and `AnimatePresence`. Empty columns show "Drop here" placeholder.

- **mobile-pipeline.tsx**: Tab-based stage view. Uses `role="tablist"` and `role="tab"` correctly. Cards render without drag-and-drop (appropriate for mobile). Focus management scrolls active tab into view.

- **ISSUE P-4: Mobile pipeline has no way to move cards between stages** (HIGH)
  The mobile pipeline renders `DealCard` without drag-and-drop. Users can only view cards in each stage tab. The only actions are "Close Deal" and "Remove from pipeline" via the context menu. There is no mechanism (button, dropdown, swipe gesture) for mobile users to move a deal from one stage to another (e.g., from "Lead" to "Analyzing"). Desktop users can drag-and-drop. This is a significant feature gap for mobile users.

---

### Flow 3: My Deals

#### MyDeals Page (`MyDeals.tsx`)

**Trace:**
1. State: strategy filter, status filter, sort, page, search query, compare IDs, selection mode
2. `useDeals(filters)` fetches filtered/paginated deal list
3. Multiple empty states: no deals, search no results, filters no results
4. Grid renders `DealGrid` with pagination (Previous/Next)
5. Compare bar floats at bottom when 1-2 deals selected for comparison
6. Single delete and bulk delete via AlertDialogs

**Issues:**
- **ISSUE MD-1: Pagination uses client-side "has more" heuristic** (LOW)
  Line 176: `const hasMore = deals !== undefined && deals.length === PER_PAGE`. If the API returns exactly `PER_PAGE` items and there are no more, the "Next" button is enabled but leads to an empty page. Then the user has to click "Previous" to go back. This is a common pattern but slightly confusing.

- **ISSUE MD-2: Bulk delete fires all deletions in parallel with `Promise.all`** (MEDIUM)
  Line 112: `await Promise.all(Array.from(selectedIds).map(id => api.deals.delete(id)))`. If the user selects 20 deals and clicks "Delete All", this fires 20 simultaneous DELETE requests. This could overwhelm the backend or hit rate limits. A sequential approach or batched endpoint would be safer.

- **ISSUE MD-3: Filter presets stored in localStorage without user scoping** (LOW)
  Line 61: `localStorage.getItem('parcel_filter_presets')`. If multiple users share the same browser (e.g., demo scenario), they share filter presets. Should be scoped by user ID.

- **ISSUE MD-4: Header layout breaks on mobile in selection mode** (MEDIUM)
  Lines 185-224: In selection mode, the header renders "Select all", "Cancel", and "Delete Selected (N)" buttons inline with `flex items-center gap-2`. On mobile, these three buttons plus the "My Deals" title will likely wrap or overflow. No `flex-wrap` is applied.

---

### Flow 4: Analyze a Deal

#### StrategySelectPage (`analyze/StrategySelectPage.tsx`)

**Trace:**
1. Shows 5 strategy cards in a responsive grid (1/2/3 columns)
2. Each card links to `/analyze/{strategy}`
3. No API calls needed

**No issues found.** Clean, simple page.

#### AnalyzerFormPage (`analyze/AnalyzerFormPage.tsx`)

**Trace:**
1. Reads `:strategy` param from URL
2. Validates against `VALID_STRATEGIES` and `ENABLED_STRATEGIES`
3. Invalid strategy: shows 404-like message
4. Valid strategy: renders strategy-specific form (Wholesale, BuyAndHold, Flip, BRRRR, CreativeFinance)
5. Each form uses `react-hook-form` with `zodResolver` for validation
6. On submit: `useCreateDeal().mutate(data)` -> navigates to `/analyze/results/{dealId}`

**Issues:**
- **ISSUE AF-1: All strategy forms use hardcoded placeholder addresses** (MEDIUM)
  Wholesale: `"Analysis — {date}"`, Buy & Hold: `"Buy & Hold Analysis — {date}"`, etc. The user never enters an actual property address or zip code. The deal is created with address like "Wholesale Analysis — 3/2/2026" and zip_code "00000". This means the deal list shows meaningless addresses, and the pipeline shows generic names. Users cannot identify which property a deal refers to.

- **ISSUE AF-2: No address/property input fields on any strategy form** (HIGH)
  None of the 5 strategy forms include fields for address, zip code, or property type. These are hardcoded. This means every deal analyzed has a generic auto-generated name and zip "00000". For a real estate platform, this is a critical UX gap — users need to know WHICH property each analysis is for.

- **ISSUE AF-3: Form validation shake fires but no scroll-to-error** (LOW)
  When validation fails, the form shakes but doesn't scroll to the first error field. On forms with many fields (BRRRR has 7+ fields), the error message might be off-screen.

- **ISSUE AF-4: Number input fields accept negative values** (MEDIUM)
  All fields use `type="number"` with `step="any"` but no `min="0"` attribute. Users can enter negative values for prices, costs, rates. The Zod schemas may validate this, but the HTML allows it. Should add `min="0"` for monetary fields.

#### ResultsPage (`analyze/ResultsPage.tsx`)

**Trace:**
1. `useDeal(dealId)` fetches deal by ID
2. Loading/no deal: Shows skeleton
3. Renders: Breadcrumbs, strategy badge + address, KPI row, Outputs table, Risk gauge, Cash flow projection, Action buttons
4. Actions: Add to Pipeline (stage picker), Share, Download Report, Delete, Chat about Deal, Offer Letter, Save

**Issues:**
- **ISSUE RP-1: No error state for failed deal fetch** (MEDIUM)
  Line 106: `if (isLoading || !deal)` shows skeleton forever if the fetch fails. The `useDeal` hook doesn't expose `isError`. If the API returns 404 or 500, the page shows loading skeletons indefinitely. Should check `isError` and show an error message.

- **ISSUE RP-2: `navigator.clipboard.writeText` may fail on HTTP or in some browsers** (LOW)
  Line 164: `await navigator.clipboard.writeText(url)`. The Clipboard API requires HTTPS or localhost. Since the app deploys to `parceldesk.io` (HTTPS), this should work. But no fallback exists if it fails — the error is caught and shows a toast, which is fine.

- **ISSUE RP-3: Delete mutation uses non-null assertion `dealId!`** (LOW)
  Line 81: `api.deals.delete(dealId!)`. If `dealId` is somehow undefined (shouldn't happen since it's a route param), this would throw. The `dealId` is from `useParams` so it could theoretically be undefined, but the page guards with `isLoading || !deal` which requires a valid dealId fetch.

- **ISSUE RP-4: Stage picker dropdown has no keyboard accessibility** (MEDIUM)
  Lines 436-449: The stage selection dropdown is a custom div-based menu, not a `<select>` or accessible dropdown. It opens on click but has no keyboard navigation (arrow keys, Enter, Escape). It does close on click-outside, but not on Escape key. Visually it appears above the button (`bottom-full`), but keyboard users cannot navigate to it.

- **ISSUE RP-5: Action buttons wrap awkwardly on mobile** (MEDIUM)
  Line 407: `className="flex gap-3 justify-end flex-wrap"` — there are 7 action buttons (Back, Add to Pipeline, Share, Download, Delete, Chat, Offer Letter, Save). On mobile, these wrap into multiple rows. The `justify-end` alignment may cause the first row to appear right-aligned with the second row left-aligned, creating visual imbalance.

---

### Flow 5: Portfolio

#### PortfolioPage (`portfolio/PortfolioPage.tsx`)

**Trace:**
1. `usePortfolio()` fetches summary + entries
2. Loading: Skeleton cards
3. KPI row: Total Deals Closed, Total Profit, Monthly Cash Flow, Total Equity
4. Charts: Cash Flow Over Time (area), Strategy Breakdown (donut), Monthly Cash Flow (bar)
5. Table: Closed deals with edit button
6. Sheet: "Add closed deal" form
7. Edit modal for existing entries

**Issues:**
- **ISSUE PF-1: No error state for portfolio fetch** (MEDIUM)
  The `usePortfolio` hook returns `{ data, isLoading }` but the page only checks `isLoading`. If the API call fails, the page renders as if there's no data (shows empty charts and empty table), with no error message.

- **ISSUE PF-2: AddEntryForm deal selector loads ALL deals without pagination** (MEDIUM)
  Line 209: `const { data: deals } = useDeals({})`. This fetches deals with no filters and no pagination. If a user has hundreds of deals, this loads all of them into a Select dropdown, which could be slow and hard to navigate. Should add a search filter or limit.

- **ISSUE PF-3: Portfolio table has no horizontal scroll on narrow mobile** (LOW)
  The table has 8 columns (Address, Strategy, Date, Price, Profit, Monthly CF, Notes, Edit). The wrapper has `overflow-x-auto`, so horizontal scrolling IS available. This is handled correctly.

- **ISSUE PF-4: Edit button only visible on hover (opacity-0 group-hover:opacity-100)** (MEDIUM)
  Line 669: The edit pencil icon is invisible until hover. On mobile (touch devices), there is no hover state, so users cannot see or access the edit button. The button exists in the DOM but is `opacity-0` and becomes `opacity-100` on group-hover, which doesn't trigger on touch. Mobile users cannot edit portfolio entries.

---

### Flow 6: Documents

#### DocumentsPage (`documents/DocumentsPage.tsx`)

**Trace:**
1. Two-panel layout: Left (document list + upload zone) / Right (document detail)
2. Mobile: Shows list OR detail (toggles with `showMobileDetail`)
3. Upload: `react-dropzone` via `UploadZone`, fires mutation, selects uploaded doc
4. Pagination: Page controls at bottom of left panel

**Issues:**
- **ISSUE DOC-1: No error state for documents list fetch** (LOW)
  The query uses `placeholderData` for smooth transitions but doesn't expose or handle `isError`. If the API fails, the list shows previous page's data or nothing.

- **ISSUE DOC-2: Mobile back-navigation from document detail** (LOW)
  When `showMobileDetail` is true, the left panel is `hidden` and right panel is shown. The `RightPanelContent` has an `onClearSelection` callback. Need to verify this component renders a "Back" button on mobile — if it doesn't, the user is trapped in the detail view with no way to go back to the list.

---

### Flow 7: Compare

#### ComparePage (`compare/ComparePage.tsx`)

**Trace:**
1. Two Select dropdowns (Deal A, Deal B) populated from `useDeals({ per_page: 100 })`
2. Deal B filtered to same strategy as Deal A
3. When both selected: Radar chart + comparison table with winner highlighting
4. Cross-strategy warning banner if strategies differ

**Issues:**
- **ISSUE CMP-1: Fetches up to 100 deals for the selector** (LOW)
  Line 74: `useDeals({ per_page: 100 })`. If a user has more than 100 deals, some won't appear in the selector. This is a practical limit that could confuse power users.

- **ISSUE CMP-2: Comparison table grid uses fixed 180px label column** (MEDIUM)
  Line 342: `grid-cols-[180px_1fr_1fr]`. On mobile (<400px), the label column takes 180px leaving ~220px for two value columns (~110px each). This is tight but workable. However, there's no `overflow-x-auto` on the table container, and the grid doesn't switch to a stacked layout on mobile. Long metric labels may truncate or overflow.

- **ISSUE CMP-3: `useDeal` called with empty string when no deal selected** (LOW)
  Line 75: `useDeal(dealAId)` where `dealAId` defaults to `''`. The `useDeal` hook has `enabled: !!dealId`, so an empty string is falsy and the query doesn't fire. This is correctly handled.

---

### Flow 8: Settings

#### SettingsPage (`settings/SettingsPage.tsx`)

**Trace:**
1. `useQuery(['me'])` fetches user profile
2. `useQuery(['notification-preferences'])` fetches notification prefs
3. Profile form: name + email + read-only role
4. Password form: current password + new password + confirm
5. Notifications: Email toggle switch

**Issues:**
- **ISSUE SET-1: Profile update syncs authStore with direct getState call** (LOW)
  Line 88: `useAuthStore.getState().setAuth(...)`. This works but is unconventional — typically you'd use the hook. Since it's in a mutation callback (not a render function), this is technically fine.

- **ISSUE SET-2: No validation on profile form** (MEDIUM)
  The profile form has no client-side validation. A user could clear the name field and submit an empty name, or enter an invalid email. The backend may reject it, but the frontend provides no early feedback. The password form correctly validates length >= 8 and matching passwords.

- **ISSUE SET-3: Password change sends both current and new password via the same `updateMe` endpoint** (LOW)
  Line 102-103: `api.auth.updateMe({ current_password, new_password })`. This combines profile updates and password changes into one endpoint. If the backend doesn't handle partial updates correctly, sending only password fields might clear name/email. This depends on backend implementation.

- **ISSUE SET-4: Success/error messages auto-dismiss after 3 seconds** (LOW)
  Lines 85-86, 96-97, 108-109, 112-113: All messages use `setTimeout(() => setMsg(null), 3000)`. If a user isn't looking at the screen, they'll miss the feedback. Consider using toasts (which the app already has via Sonner) instead of inline messages for consistency.

---

### Flow 9: Forgot Password / Reset Password

#### ForgotPassword (`ForgotPassword.tsx`)

**Trace:**
1. Email input with basic regex validation
2. Calls `api.auth.forgotPassword(email)` (POST)
3. Success: Shows "Check your inbox" message with email address
4. Error: Shows inline error message

**No significant issues.** Well-structured with proper state management.

#### ResetPassword (`ResetPassword.tsx`)

**Trace:**
1. Reads `token` from URL search params
2. No token: Shows error state immediately
3. Form: New password + confirm password
4. Validates: length >= 8, passwords match
5. Calls `api.auth.resetPassword(token, password)`
6. Success: Shows success + auto-redirects to login after 3 seconds
7. Error: Shows "Invalid or expired reset link" with CTA to request new one

**Issues:**
- **ISSUE RP-1: Auto-redirect may surprise users** (LOW)
  Line 33: After success, auto-redirects to `/login` after 3 seconds. The text says "Redirecting you to sign in..." which is clear. There's also a manual "Go to sign in" button. This is acceptable behavior.

---

### Flow 10: Command Palette

#### CommandPalette (`components/command-palette.tsx`)

**Trace:**
1. Global keyboard shortcut: Cmd+K / Ctrl+K toggles open
2. Search input with debounced value (300ms)
3. Three groups: Pages (9 items), Quick Actions (3 items), Deals (fetched on search)
4. Deal search: Fetches all deals via `api.deals.list()` then filters client-side
5. Selection navigates and closes palette

**Issues:**
- **ISSUE CP-1: Deal search fetches ALL deals, not server-filtered** (MEDIUM)
  Line 129: `api.deals.list()` — fetches all deals with no query parameter. Then line 135-143 filters client-side. For users with many deals, this loads the entire deal list just to show 5 results. Should pass the search query to the API for server-side filtering.

- **ISSUE CP-2: Command palette is only accessible from desktop** (MEDIUM)
  The search pill in the topbar (line 197-204 of AppShell.tsx) has `className="hidden md:flex"`. On mobile, there's no way to open the command palette. The Cmd+K shortcut still works via keyboard, but mobile users have no trigger. Should add a search icon button visible on mobile.

- **ISSUE CP-3: Keyboard shortcut `Cmd+K` conflicts with browser "focus address bar" in Firefox** (LOW)
  Not specific to this app, but worth noting. The shortcut is correctly prevented with `e.preventDefault()`.

---

## Part 3: Mobile Responsiveness Audit

### Page-by-Page Mobile Review

| Page | Responsive? | Issues |
|---|---|---|
| Landing | Yes | Full marketing page with mobile styles |
| Login | Yes | `max-w-[480px]` centered, `px-4` padding |
| Register | Yes | Same as Login, role cards `grid-cols-3` on mobile may be tight |
| Dashboard (empty) | PARTIAL | Hint cards `grid-cols-3` not responsive (ISSUE D-1) |
| Dashboard (populated) | PARTIAL | Recent Deals table no horizontal scroll (ISSUE D-3) |
| Pipeline | Yes | Mobile-specific tabbed view below `md` breakpoint |
| My Deals | PARTIAL | Header buttons overflow in selection mode (ISSUE MD-4) |
| StrategySelectPage | Yes | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| AnalyzerFormPage | Yes | Forms use `grid md:grid-cols-2`, stack on mobile |
| ResultsPage | PARTIAL | 7 action buttons wrap messily (ISSUE RP-5) |
| Portfolio | PARTIAL | Edit button invisible on mobile touch (ISSUE PF-4) |
| Documents | Yes | List/detail toggle pattern for mobile |
| Compare | PARTIAL | Fixed 180px label column tight on mobile (ISSUE CMP-2) |
| Chat | Yes | Full-height flex layout works on mobile |
| Settings | Yes | Single-column `max-w-[600px]` layout |

### Key Mobile-Specific Components

- **MobileSidebar (`AppShell.tsx`):** Sheet drawer from left side, 216px wide. Correctly hidden on desktop, shown via hamburger menu on mobile.
- **MobilePipeline (`mobile-pipeline.tsx`):** Tab-based stage view. Horizontal scrollable tabs. 44px minimum touch targets. Proper ARIA roles.

### Specific Mobile Issues Summary

1. **Dashboard empty state hint cards:** `grid-cols-3` without responsive breakpoint
2. **Dashboard Recent Deals table:** No `overflow-x-auto` for horizontal scroll
3. **My Deals header in selection mode:** Buttons overflow on narrow screens
4. **ResultsPage action buttons:** 7+ buttons wrapping unpredictably
5. **Portfolio edit button:** Opacity-0 on non-hover (invisible on touch devices)
6. **Compare table:** Fixed 180px first column leaves little room for values
7. **Pipeline mobile:** Cannot move deals between stages (ISSUE P-4)
8. **Command palette:** No mobile trigger button (ISSUE CP-2)
9. **Register page role cards:** `grid-cols-3` on 320px screens = ~93px per card, text may be unreadable

---

## Part 4: Accessibility Audit

### Skip Navigation
- **Present:** `AppShell.tsx` line 243-247 — `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>`. Correctly implemented with visible-on-focus pattern.

### Focus Management
- **Present:** `AppShell.tsx` lines 227-238 — On route change, focuses first `<h1>` inside main or the `<main>` element itself. Uses `tabindex="-1"` and `preventScroll: true`.

### ARIA Labels
- **Pipeline Kanban:** `role="grid"`, `aria-label` with keyboard instructions
- **Kanban columns:** `role="listbox"`, `aria-label` with stage name and count
- **Deal cards:** `role="option"`, `aria-label` with address + strategy + price, `aria-selected`
- **Mobile pipeline:** `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`
- **Search input (My Deals):** `aria-label="Search deals by address"`
- **Chat textarea:** `aria-label="Type your message"`
- **Clear search button:** `aria-label="Clear search"`
- **Navigation hamburger:** `aria-label="Open navigation"`
- **User menu:** `aria-label="User menu"`
- **Command palette search pill:** `aria-label="Open command palette"`
- **Breadcrumbs (ResultsPage):** `aria-label="Breadcrumb"` + `aria-current="page"`

### Keyboard Navigation
- **Pipeline Kanban:** `useKanbanKeyboard` hook — arrow keys, Enter to open deal, Escape to deselect. Focus ring visible on active card.
- **Command palette:** Up/Down arrows, Enter to select, Escape to close. `cmdk` library handles this.
- **Mobile pipeline tabs:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary`

### Accessibility Issues

**ISSUE A-1: Color contrast concern on dark backgrounds** (MEDIUM)
`text-text-muted` on `bg-app-bg` (#08080F) may have insufficient contrast. The exact values of `text-text-muted` would need to be checked against WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text). Several places use `text-[#475569]` on `#08080F` which is approximately 3.7:1 — below the 4.5:1 requirement for small text.

**ISSUE A-2: ResultsPage stage picker dropdown not keyboard accessible** (MEDIUM)
(Same as ISSUE RP-4) Custom dropdown with no keyboard support.

**ISSUE A-3: DealCard context menu not keyboard accessible** (MEDIUM)
The three-dot menu button on pipeline cards opens a dropdown on click, but there's no keyboard handling for navigating the dropdown items. The button itself is focusable, but the menu items cannot be reached via keyboard.

**ISSUE A-4: Portfolio edit button has no visible focus indicator** (LOW)
The edit pencil button is `opacity-0` by default and `group-hover:opacity-100`. Even with keyboard focus, the button might not be visible since focus ≠ hover. A `focus-visible:opacity-100` should be added.

**ISSUE A-5: Landing page and public pages have no skip-navigation** (LOW)
The skip-nav link is only in `AppShell`. Public pages (Landing, Login, etc.) don't use AppShell and lack skip-navigation.

**ISSUE A-6: Charts (Recharts) have limited screen reader support** (LOW)
Recharts renders SVG elements. The charts in Portfolio, ResultsPage (CashFlowProjection), and ComparePage (ComparisonRadar) don't have `aria-label` or `role="img"` on the chart container. Screen readers would read the raw SVG elements, which is not meaningful.

**ISSUE A-7: `eslint-disable-next-line jsx-a11y/no-static-element-interactions`** (LOW)
`Pipeline.tsx` line 299 explicitly disables the JSX a11y rule for the Kanban board container's `onKeyDown` and `onMouseDown`. The Kanban board div has `role="grid"` which is appropriate, but the eslint disable suggests the div should be an interactive element. Since it has a `role` and keyboard handlers, this is actually fine — the eslint disable is just suppressing a false positive.

---

## Issue Summary by Severity

### CRITICAL (0)
No crashes found that would prevent app usage entirely. All pages have ErrorBoundary protection for protected routes.

### HIGH (3)
| ID | Issue | Location |
|---|---|---|
| P-1 | Pipeline API response shape mismatch — board may always appear empty | `Pipeline.tsx` line 86-88 |
| P-4 | Mobile users cannot move pipeline deals between stages | `mobile-pipeline.tsx` |
| AF-2 | No address/property input on analyzer forms — deals get generic names | `AnalyzerFormPage.tsx` |

### MEDIUM (15)
| ID | Issue | Location |
|---|---|---|
| R-1 | Public routes lack PageErrorBoundary | `App.tsx` |
| R-3 | No redirect from /login for authenticated users | `App.tsx` |
| R-4 | Auth state can desync between localStorage and httpOnly cookie | `authStore.ts` |
| D-1 | Dashboard empty state hint cards `grid-cols-3` not responsive | `Dashboard.tsx:229` |
| D-3 | Dashboard Recent Deals table no horizontal scroll on mobile | `Dashboard.tsx:299` |
| MD-2 | Bulk delete fires all requests in parallel | `MyDeals.tsx:112` |
| MD-4 | Header layout breaks on mobile in selection mode | `MyDeals.tsx:185` |
| AF-1 | All strategy forms use hardcoded placeholder addresses | `AnalyzerFormPage.tsx` |
| AF-4 | Number inputs accept negative values | `AnalyzerFormPage.tsx` |
| RP-1 | No error state for failed deal fetch on ResultsPage | `ResultsPage.tsx:106` |
| RP-4 | Stage picker dropdown not keyboard accessible | `ResultsPage.tsx:436` |
| RP-5 | 7 action buttons wrap awkwardly on mobile | `ResultsPage.tsx:407` |
| PF-1 | No error state for portfolio fetch | `PortfolioPage.tsx` |
| PF-4 | Edit button invisible on mobile (hover-only visibility) | `PortfolioPage.tsx:669` |
| SET-2 | No client-side validation on profile settings form | `SettingsPage.tsx` |
| CP-1 | Command palette fetches all deals for search | `command-palette.tsx:129` |
| CP-2 | Command palette has no mobile trigger | `AppShell.tsx:197` |
| CMP-2 | Compare table fixed-width column tight on mobile | `ComparePage.tsx:342` |
| A-1 | Color contrast may not meet WCAG AA for small text | Multiple files |

### LOW (14)
| ID | Issue | Location |
|---|---|---|
| R-2 | Route ordering edge case for `/analyze/results` | `App.tsx` |
| L-2 | Login error may expose backend details | `Login.tsx` |
| D-2 | Sparkline data uses random — correctly memoized | `Dashboard.tsx` |
| D-4 | `timeAgo` depends on valid timestamps | `Dashboard.tsx` |
| P-2 | Pipeline "Add Deal" uses `<a>` instead of `<Link>` | `Pipeline.tsx:270` |
| MD-1 | Pagination "has more" heuristic | `MyDeals.tsx:176` |
| MD-3 | Filter presets not user-scoped | `MyDeals.tsx:61` |
| AF-3 | No scroll-to-error on form validation failure | `AnalyzerFormPage.tsx` |
| RP-2 | Clipboard API may fail without HTTPS | `ResultsPage.tsx` |
| RP-3 | Non-null assertion on dealId | `ResultsPage.tsx:81` |
| SET-1 | Unconventional Zustand getState in callback | `SettingsPage.tsx:88` |
| SET-3 | Password + profile share same API endpoint | `SettingsPage.tsx` |
| SET-4 | Auto-dismiss messages may be missed | `SettingsPage.tsx` |
| CMP-1 | Compare selector limited to 100 deals | `ComparePage.tsx:74` |
| CMP-3 | useDeal called with empty string — correctly handled | `ComparePage.tsx:75` |
| A-3 | DealCard context menu not keyboard accessible | `deal-card.tsx` |
| A-4 | Portfolio edit button no visible focus indicator | `PortfolioPage.tsx` |
| A-5 | Public pages no skip-navigation | Multiple |
| A-6 | Charts have no screen reader support | Multiple |
| A-7 | ESLint a11y disable — false positive | `Pipeline.tsx` |
| DOC-1 | No error state for documents list | `DocumentsPage.tsx` |
| DOC-2 | Mobile document detail may lack back button | `DocumentsPage.tsx` |
| CP-3 | Cmd+K conflicts in Firefox | `command-palette.tsx` |
| PF-2 | AddEntryForm loads all deals without pagination | `PortfolioPage.tsx:209` |

---

## Top 5 Recommendations (Priority Order)

1. **Add address + zip code fields to all 5 analyzer forms.** Every analyzed deal gets a generic auto-generated name. This is the most impactful UX improvement possible.

2. **Verify and fix Pipeline API response shape.** The type in `api.ts` says the response is wrapped in `{ data: ... }` but the Pipeline page treats it as a flat record. Whichever is wrong needs to be fixed, or the pipeline will show empty.

3. **Add stage-change mechanism for mobile pipeline.** Mobile users have no way to move deals between stages. Add a dropdown or action button per card to change stage.

4. **Add `overflow-x-auto` to Dashboard Recent Deals table.** Wrap the table in a scrollable container for mobile.

5. **Add responsive breakpoints to Dashboard empty state hint cards.** Change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`.
