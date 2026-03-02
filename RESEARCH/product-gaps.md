# Parcel Platform -- Product Completeness Audit

**Date:** 2026-03-02
**Auditor:** Product Completeness Analyst (Claude)
**Scope:** Full frontend + backend codebase review
**Files Reviewed:** 60+ files across pages, components, hooks, stores, types, routers, and schemas

---

## Executive Summary

Parcel has a solid foundation with working deal analysis, pipeline Kanban, portfolio tracking, document AI, and chat. However, there are significant gaps in mobile responsiveness (the sidebar has no mobile menu at all), missing error/retry states across several pages, no 404 catch-all route, authentication token management that conflicts with the documented httpOnly cookie approach, a non-functional search bar, and several flows where users can lose work or get stuck. Below are 78 specific findings organized by category.

---

## 1. Critical UX Gaps (Users Would Get Stuck)

### 1.1 No mobile sidebar / hamburger menu
- **Severity:** Critical | **Effort:** Medium (2-3 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx` (lines 76-93)
- **Problem:** The sidebar is a fixed 216px-wide `<aside>` with no responsive collapse. On screens narrower than ~700px, the sidebar consumes ~30% of the viewport, and there is no hamburger toggle, no Sheet-based mobile drawer, and no way to hide it. Every authenticated page (Dashboard, Pipeline, My Deals, etc.) is effectively unusable on mobile devices.
- **Recommendation:** Add a mobile drawer using the existing `Sheet` component (already installed). Hide the sidebar on `md:` breakpoint down. Add a hamburger icon in the Topbar that toggles a `Sheet` from the left.

### 1.2 No 404 / catch-all route
- **Severity:** Critical | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/App.tsx` (lines 49-68)
- **Problem:** If a user navigates to `/anything-invalid`, the React Router renders nothing -- a blank screen. There is no `<Route path="*">` catch-all.
- **Recommendation:** Add `<Route path="*" element={<NotFoundPage />} />` with a minimal page that says "Page not found" and links back to `/dashboard` or `/`.

### 1.3 Auth token stored in localStorage despite CLAUDE.md specifying httpOnly cookies
- **Severity:** Critical | **Effort:** Medium (2-4 hours)
- **Files:** `/Users/ivanflores/parcel-platform/frontend/src/stores/authStore.ts` (lines 15-17, 19-22), `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts` (lines 31-40, 48-49)
- **Problem:** CLAUDE.md says "JWT tokens stored in httpOnly cookies (not localStorage)." The backend correctly sets an httpOnly cookie in `auth.py` (line 28-33). However, the frontend ALSO stores the token in localStorage and sends it as a Bearer header. The 401 handler removes the localStorage token. This dual-storage pattern is a security concern and is inconsistent -- the cookie and localStorage token can get out of sync.
- **Recommendation:** Decide on one approach. If using httpOnly cookies, remove `localStorage.setItem('parcel_token', ...)` and the `Authorization` header logic. Let cookies handle auth automatically via `credentials: 'include'`.

### 1.4 Pipeline "Remove from pipeline" has no confirmation dialog
- **Severity:** High | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 226-237, 419-427)
- **Problem:** Clicking "Remove from pipeline" in the card dropdown immediately fires `handleRemoveCard`, which mutates the backend. No confirmation dialog. In a Kanban board, accidental clicks are common, especially near the drag handle.
- **Recommendation:** Add an `AlertDialog` (already used in MyDeals.tsx) that asks "Remove this deal from pipeline?" before executing.

### 1.5 Pipeline page has no error state
- **Severity:** High | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 379-382)
- **Problem:** The pipeline query (`useQuery`) fetches data, but there is no `isError` check. If the backend is down or the request fails, the user sees an empty Kanban board with no indication something went wrong and no way to retry.
- **Recommendation:** Add an error state similar to Dashboard.tsx (lines 136-151) with an error message and a retry button.

### 1.6 Pipeline page has no empty state
- **Severity:** High | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 512-576)
- **Problem:** When a user has zero pipeline entries, they see 7 empty columns that all say "Drop here." There is no helpful message explaining what the pipeline is or how to add deals. The "Add Deal" button goes to `/analyze`, but it's not clear this is the entry point.
- **Recommendation:** When `totalDeals === 0` and `!isLoading`, show an empty state with an illustration, explanation, and a prominent CTA to analyze a deal.

### 1.7 Document delete has no confirmation dialog
- **Severity:** High | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/documents/DocumentsPage.tsx` (lines 335-340, 483-491)
- **Problem:** The "Delete" button on document detail directly calls `deleteMutation.mutate(doc.id)`. No confirmation dialog. Documents may have been processed by AI (15-30 seconds of wait time) and cannot be recovered.
- **Recommendation:** Add an `AlertDialog` confirmation before document deletion.

### 1.8 No logout button visible anywhere
- **Severity:** High | **Effort:** Quick (20 min)
- **Files:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx` (lines 76-113)
- **Problem:** The sidebar has Dashboard, Pipeline, My Deals, Compare, Analyzer, Documents, AI Chat, Portfolio, and Settings. There is no "Log out" link. The Topbar has a hardcoded avatar "U" with no dropdown or click handler. Users cannot log out of the application without manually clearing their browser storage or navigating to a URL that doesn't exist.
- **Recommendation:** Add a logout option either at the bottom of the sidebar or in a popover triggered by clicking the avatar. The `useLogout` hook already exists in `useAuth.ts`.

---

## 2. Missing Feedback States

### 2.1 Portfolio page -- no error state
- **Severity:** High | **Effort:** Quick (20 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx` (lines 282-296)
- **Problem:** Has a loading skeleton but no `isError` handling. If the API fails, the user sees the populated state with `summary = undefined` and empty arrays, which shows $0 KPIs and "No closed deals yet" -- misleading them into thinking they have no data.
- **Recommendation:** Check `isError` from `usePortfolio()` and show an error banner with retry.

### 2.2 Portfolio "Add Entry" success feedback missing
- **Severity:** Medium | **Effort:** Quick (10 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx` (lines 243-249)
- **Problem:** The `addMutation.onSuccess` closes the sheet and invalidates the query, but shows no toast notification. The edit mutation has `toast.success('Portfolio entry updated')` (line 257) but the add mutation does not.
- **Recommendation:** Add `toast.success('Deal added to portfolio')` in `addMutation.onSuccess`.

### 2.3 Portfolio "Add Entry" error feedback missing
- **Severity:** Medium | **Effort:** Quick (10 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx` (lines 243-249)
- **Problem:** `addMutation` has no `onError` handler. If the API call fails, the sheet stays open with no error message.
- **Recommendation:** Add `onError: () => toast.error('Failed to add entry -- try again')`.

### 2.4 Settings page -- no error state for initial load
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/settings/SettingsPage.tsx` (lines 32-35, 142-151)
- **Problem:** If `useQuery({ queryKey: ['me'] })` fails, there is no error handling. Only a loading skeleton is shown, then nothing renders.
- **Recommendation:** Add `isError` check and display an error message.

### 2.5 Compare page -- no error state for deal loading
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/compare/ComparePage.tsx` (lines 73-76)
- **Problem:** `useDeal(dealAId)` and `useDeal(dealBId)` have no error handling. If a deal ID in the URL is invalid, the comparison silently shows dashes.
- **Recommendation:** Check `isError` on both deal queries and show an inline error if either deal fails to load.

### 2.6 Dashboard "Recent Activity" -- no error state
- **Severity:** Low | **Effort:** Quick (10 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Dashboard.tsx` (lines 97-101, 314-360)
- **Problem:** The activity query has no `isError` check. If it fails, nothing is rendered in the activity section.
- **Recommendation:** Add an error state with "Failed to load activity" message.

### 2.7 AnalyzerFormPage -- no error state for form submission
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/AnalyzerFormPage.tsx`
- **Problem:** The `useCreateDeal` mutation navigates on success but has no `onError` callback in the hook itself. The form page should display a toast or inline error when the deal creation API call fails (e.g., calculator not implemented, server error).
- **Recommendation:** Add error handling to the `useCreateDeal` hook or at the call site with `toast.error`.

### 2.8 ResultsPage -- no error state for deal fetch
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx` (lines 94-110)
- **Problem:** `if (isLoading || !deal)` shows a skeleton, but there is no `isError` check. If the deal ID is invalid or the user is unauthorized, they see an eternal skeleton loader.
- **Recommendation:** Add `isError` handling that shows an error message with a link back to `/deals`.

---

## 3. Undiscoverable Features

### 3.1 Deal comparison is hidden -- requires selecting 2 deals from My Deals
- **Severity:** Medium | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx` (lines 520-538, 629-649)
- **Problem:** To compare deals, users must: (1) go to My Deals, (2) notice the tiny checkbox in the top-right corner of each card (only visible on hover), (3) check exactly 2 deals, (4) notice the floating bar at the bottom of the screen. This is the only way to reach the Compare page. The sidebar "Compare" link goes to `/compare` with no deals pre-selected, showing just "Select two deals above to compare." There is no tooltip or onboarding hint explaining the checkbox comparison workflow.
- **Recommendation:** (a) Add a tooltip or empty-state explanation on the Compare page about how to use it. (b) Add "Compare" buttons on the ResultsPage. (c) Consider adding "Recently compared" or making the Compare page more self-service (it already has dropdowns, but users need deals first).

### 3.2 Offer letter generator is buried in the results page
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx` (lines 487-494)
- **Problem:** The offer letter button is in a row of 6 action buttons at the bottom of the results page. It doesn't stand out and is easy to miss. There is no mention of offer letters in the sidebar, dashboard, or My Deals.
- **Recommendation:** Consider adding an "Offer Letter" column or badge on the My Deals cards if one has been generated. Add a mention in the dashboard empty state hint cards.

### 3.3 AI Chat context-awareness is invisible
- **Severity:** Medium | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/chat/ChatPage.tsx` (lines 95-98, 232-239)
- **Problem:** The chat page supports deal and document context via `?context=deal&id=...` or `?context=document&id=...`. This is powerful but completely hidden. The only way to access it is through the "Chat" button on a document detail panel (DocumentsPage line 326-329). There is no "Chat about this deal" button on the ResultsPage.
- **Recommendation:** Add a "Chat about this deal" button on ResultsPage and on the deal cards in My Deals. Make the context indicator more prominent.

### 3.4 Filter presets on My Deals require prior knowledge
- **Severity:** Low | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx` (lines 345-352, 385-413)
- **Problem:** The "Save Preset" button appears only when filters are active, is small text, and there is no onboarding or tooltip explaining what presets are or why they are useful. Users who don't actively filter may never discover this feature.
- **Recommendation:** Add a small info tooltip next to "Save Preset" explaining what it does.

### 3.5 Topbar search is cosmetic / non-functional
- **Severity:** High | **Effort:** Large (4+ hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx` (lines 102-106)
- **Problem:** The search pill says "Search" with a Cmd+K shortcut hint, but it is a plain `<button>` with no click handler, no search modal, and no keyboard shortcut listener. Users who click it or press Cmd+K will find nothing happens. This creates false expectations.
- **Recommendation:** Either implement a search/command palette (address search across deals, pipeline, documents) or remove the search pill entirely until it is functional.

---

## 4. Unfinished Flows

### 4.1 Sharing a deal overwrites the deal status to "shared" permanently
- **Severity:** High | **Effort:** Medium (1-2 hours)
- **Files:** `/Users/ivanflores/parcel-platform/backend/routers/deals.py` (lines 360-364), `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx` (lines 149-166)
- **Problem:** When a user shares a deal, the backend sets `deal.status = "shared"`. This overwrites whatever the previous status was (e.g., "saved", "draft"). There is no way to "unshare" a deal or revert its status. The status column is being used for two different purposes (workflow state and sharing state), which is a data modeling concern.
- **Recommendation:** Add a separate `is_shared` boolean column or a `shared_at` timestamp instead of overloading the `status` field. Add an "Unshare" button.

### 4.2 Saving a deal on ResultsPage has no subsequent navigation
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/analyze/ResultsPage.tsx` (lines 168-179)
- **Problem:** After clicking "Save Deal," the button changes to "Saved" with a checkmark, and a toast appears. But the user is left on the results page with no clear next step. There is no prompt to "View in My Deals" or "Add to Pipeline."
- **Recommendation:** Add a toast action link: `toast.success('Deal saved', { action: { label: 'View in My Deals', onClick: () => navigate('/deals') } })`.

### 4.3 CloseDealModal success does not navigate user to portfolio
- **Severity:** Low | **Effort:** Quick (10 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/close-deal-modal.tsx` (lines 68-78)
- **Problem:** After closing a deal, the toast says "Deal closed! Added to Portfolio." but the user stays on the Pipeline page. There is no action link to view the portfolio.
- **Recommendation:** Add a toast action: `toast.success('Deal closed!', { action: { label: 'View Portfolio', onClick: () => navigate('/portfolio') } })`.

### 4.4 Registration has no password strength indicator
- **Severity:** Medium | **Effort:** Medium (1 hour)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Register.tsx` (lines 109-122)
- **Problem:** Backend requires 8+ characters (validated in `schemas/auth.py` line 30-33), but the registration form has no client-side indication of this requirement. Users find out only after form submission fails.
- **Recommendation:** Add a password requirement hint ("Must be at least 8 characters") below the password field and/or a real-time strength indicator.

### 4.5 Login "Remember me" checkbox does nothing
- **Severity:** Medium | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Login.tsx` (lines 72-80)
- **Problem:** The form tracks `rememberMe` in state, but it is never sent to the backend and never influences token expiry or localStorage behavior. The checkbox is cosmetic.
- **Recommendation:** Either implement "Remember me" (e.g., extend token expiry, use a refresh token) or remove the checkbox.

### 4.6 No "Forgot password" flow
- **Severity:** High | **Effort:** Large (4+ hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Login.tsx`
- **Problem:** There is no "Forgot password?" link on the login page, no password reset endpoint, and no email flow. If a user forgets their password, they are completely locked out.
- **Recommendation:** Add a "Forgot password?" link that leads to a reset flow (email with reset token). This is Phase 5+ but is a significant gap for any SaaS product.

---

## 5. Data Integrity Concerns

### 5.1 Deals display "permanently delete" but backend soft-deletes
- **Severity:** Medium | **Effort:** Quick (10 min)
- **Files:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx` (lines 654-668), `/Users/ivanflores/parcel-platform/backend/routers/deals.py` (lines 335-346)
- **Problem:** The delete confirmation dialog says "This will permanently delete this deal. This cannot be undone." But the backend performs a soft delete (sets `deleted_at`). The messaging is misleading -- this could also mislead users into thinking data recovery is impossible when it isn't.
- **Recommendation:** Change the message to "This will remove this deal from your account." Or, if the intent is to match user expectations, keep the message but note internally that recovery is possible.

### 5.2 Bulk delete sends individual API calls without transaction safety
- **Severity:** Medium | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx` (lines 176-189)
- **Problem:** `handleBulkDelete` fires `Promise.all(Array.from(selectedIds).map(id => api.deals.delete(id)))`. If some succeed and some fail (e.g., network blip), the user gets a partial delete with "Some deals could not be deleted" and no indication of which ones survived.
- **Recommendation:** Either (a) add a backend bulk delete endpoint or (b) track which individual deletes succeeded/failed and update the UI accordingly.

### 5.3 No duplicate pipeline entry prevention
- **Severity:** Medium | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/backend/routers/pipeline.py` (lines 80-117)
- **Problem:** The `add_to_pipeline` endpoint does not check if a deal is already in the pipeline. A user can add the same deal to the pipeline multiple times, creating duplicate cards. The frontend handles the "already in pipeline" case via error message detection (ResultsPage line 133), but the backend doesn't actually prevent it.
- **Recommendation:** Add a uniqueness check: `db.query(PipelineEntry).filter(PipelineEntry.deal_id == body.deal_id, PipelineEntry.user_id == current_user.id).first()` and return a 409 Conflict if found.

### 5.4 Portfolio entries can be created for the same deal multiple times
- **Severity:** Medium | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/backend/routers/portfolio.py` (lines 76-122)
- **Problem:** No uniqueness constraint on `(deal_id, user_id)` in the portfolio. A user can close the same deal multiple times via the CloseDealModal, inflating their portfolio metrics.
- **Recommendation:** Check for existing portfolio entry before creating, or add a DB unique constraint.

### 5.5 Document hard-deletes bypass soft-delete policy
- **Severity:** Low | **Effort:** Medium (1 hour)
- **Files:** `/Users/ivanflores/parcel-platform/backend/routers/documents.py` (lines 136-152), CLAUDE.md DB Rules
- **Problem:** CLAUDE.md says "Soft deletes only -- never hard delete deals, documents, or pipeline entries." But the document delete endpoint calls `db.delete(doc)` (hard delete) and also deletes the S3 file. Pipeline entries are also hard-deleted in `pipeline.py` line 173.
- **Recommendation:** Switch documents and pipeline entries to soft deletes (add `deleted_at` column) to match the stated policy.

### 5.6 No input validation on portfolio number fields (negative values accepted)
- **Severity:** Low | **Effort:** Quick (15 min)
- **Files:** `/Users/ivanflores/parcel-platform/frontend/src/components/close-deal-modal.tsx`, `/Users/ivanflores/parcel-platform/frontend/src/components/edit-portfolio-modal.tsx`, `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx`
- **Problem:** The `<input type="number">` fields for closed price, profit, and cash flow accept negative numbers without validation. While profit can legitimately be negative, closed price should not be.
- **Recommendation:** Add `min="0"` to the closed price input. Add Zod or inline validation for the portfolio forms.

---

## 6. Navigation & Information Architecture

### 6.1 Sidebar active state uses exact path match -- nested routes don't highlight parent
- **Severity:** Medium | **Effort:** Quick (20 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx` (lines 53-69)
- **Problem:** `const active = pathname === item.path` uses exact match. When on `/analyze/wholesale` or `/analyze/results/abc123`, the "Analyzer" sidebar item (`/analyze`) is not highlighted. Same for any future nested routes.
- **Recommendation:** Change to `pathname.startsWith(item.path)` (with a special case for `/` to avoid always-active root).

### 6.2 No breadcrumbs on deep pages
- **Severity:** Medium | **Effort:** Medium (1-2 hours)
- **Files:** AnalyzerFormPage, ResultsPage, ComparePage
- **Problem:** On the AnalyzerFormPage, ResultsPage, and ComparePage, users are multiple levels deep but there are no breadcrumbs. The only navigation back is a "Back to Analyzer" ghost button at the bottom of the ResultsPage (line 414-418). If a user lands on `/analyze/results/:id` directly (from My Deals or Dashboard), the "Back to Analyzer" link doesn't make contextual sense.
- **Recommendation:** Add breadcrumbs: Dashboard > My Deals > [Deal Address]. The ResultsPage back link should be contextual (if referred from My Deals, link to My Deals; if from Analyzer, link to Analyzer).

### 6.3 Topbar avatar is not personalized
- **Severity:** Low | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx` (lines 108-111)
- **Problem:** The avatar always shows "U" regardless of who is logged in. The user's name and initials are available in `useAuthStore`.
- **Recommendation:** Extract the user's initials from `useAuthStore` and display them. Add a dropdown with the user's name, email, and a logout option.

### 6.4 Dashboard "View all" on activity section is non-functional
- **Severity:** Low | **Effort:** Quick (10 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Dashboard.tsx` (lines 316-317)
- **Problem:** `<span className="text-xs font-medium text-accent-primary">View all</span>` is a plain `<span>`, not a link. It looks clickable but does nothing.
- **Recommendation:** Either make it a `<Link>` to a dedicated activity page or remove it.

---

## 7. Mobile & Responsive Issues

### 7.1 AppShell sidebar has no mobile collapse (CRITICAL -- repeated from 1.1)
- **Severity:** Critical | **Effort:** Medium (2-3 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx`
- **Problem:** 216px fixed sidebar renders on all screen sizes. No hamburger menu. No responsive breakpoint.

### 7.2 Pipeline Kanban columns don't fit on mobile
- **Severity:** High | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 299, 540)
- **Problem:** Each column is `min-w-[240px] max-w-[240px]`. With 7 columns, that's 1680px minimum width plus gaps. The container has `overflow-x-auto`, so it scrolls, but on mobile with the 216px sidebar, the visible area is tiny. Drag-and-drop on mobile touch devices is also untested -- `PointerSensor` works for touch but the `distance: 6` activation constraint may be too small for fat fingers.
- **Recommendation:** On mobile, consider showing a single column at a time with stage tabs, or a simplified list view.

### 7.3 MyDeals filter bar wraps poorly on small screens
- **Severity:** Medium | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx` (lines 296-382)
- **Problem:** The filter bar has 3 Select dropdowns (170px, 160px, 160px), "Clear filters", "Save Preset", and potentially a preset input. On mobile, these wrap unpredictably with `flex-wrap`.
- **Recommendation:** Stack filters vertically on mobile, or collapse into a single "Filter" button that opens a Sheet.

### 7.4 Compare page table is not scrollable on mobile
- **Severity:** Medium | **Effort:** Quick (20 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/compare/ComparePage.tsx` (lines 321-343)
- **Problem:** `ComparisonRow` uses `grid-cols-[180px_1fr_1fr]`. The 180px label column plus two value columns can overflow on narrow screens, but there is no `overflow-x-auto` wrapper.
- **Recommendation:** Wrap the comparison table in an `overflow-x-auto` container.

### 7.5 Landing page DemoCard strategy tabs overflow on small screens
- **Severity:** Low | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Landing.tsx` (lines 250-265)
- **Problem:** The 5 strategy tabs use `overflow-x-auto scrollbar-none` which is good, but on very narrow screens, users may not realize the tabs are scrollable since the scrollbar is hidden.
- **Recommendation:** Add a subtle fade indicator on the right edge when tabs overflow.

---

## 8. Accessibility Issues

### 8.1 Pipeline deal cards have no keyboard navigation
- **Severity:** High | **Effort:** Medium (2-3 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 148-284)
- **Problem:** Deal cards in the Kanban board are only draggable via mouse/touch. There are no keyboard controls to move cards between stages. The card context menu (three dots) requires hover to appear (`opacity-0 group-hover:opacity-100`) and is not focusable via keyboard.
- **Recommendation:** Add keyboard event handlers for card reordering (e.g., arrow keys when a card is focused). Make the context menu button always visible (or at least keyboard-focusable).

### 8.2 Missing ARIA labels on icon-only buttons
- **Severity:** Medium | **Effort:** Quick (30 min)
- **Files:** Multiple
- **Problem:** Several icon-only buttons lack `aria-label`:
  - Pipeline.tsx: GripVertical drag handle (line 199), MoreHorizontal menu (line 188)
  - PortfolioPage.tsx: Pencil edit button (line 424-429) -- has `aria-label` (good)
  - Dashboard.tsx: Demo banner close button X (line 112)
  - Landing.tsx: Various interactive elements
- **Recommendation:** Add `aria-label` to all icon-only interactive elements.

### 8.3 Chat textarea has no associated label
- **Severity:** Medium | **Effort:** Quick (10 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/chat/ChatPage.tsx` (lines 336-351)
- **Problem:** The chat textarea has a `placeholder` but no `<label>` or `aria-label`. Screen readers cannot describe the purpose of the input.
- **Recommendation:** Add `aria-label="Type your message"` to the textarea.

### 8.4 Color contrast -- risk score colors may fail WCAG
- **Severity:** Medium | **Effort:** Quick (30 min)
- **Files:** Multiple (Pipeline.tsx, Dashboard.tsx, MyDeals.tsx, ResultsPage.tsx)
- **Problem:** Risk score colors use `#F59E0B` (amber/yellow) for medium risk and `#475569` for various muted text. Against the dark background `#08080F`, amber text may pass, but the yellow-on-dark contrast ratios should be verified. The `#475569` text-muted color against `#0F0F1A` is 3.76:1 which fails WCAG AA for normal text (requires 4.5:1).
- **Recommendation:** Verify all color combinations with a contrast checker. Bump `text-muted` to at least `#6B7280` or use `text-text-secondary` for any text that conveys meaningful information.

### 8.5 No focus trap in modals
- **Severity:** Medium | **Effort:** Quick (varies)
- **Files:** close-deal-modal.tsx, offer-letter-modal.tsx, edit-portfolio-modal.tsx
- **Problem:** These modals use shadcn/ui `Dialog` component which should trap focus by default (via Radix). However, the Pipeline card dropdown menu (`menuRef` on line 209) is a custom dropdown without focus trapping -- pressing Tab when the menu is open moves focus out of the menu.
- **Recommendation:** Convert the Pipeline card dropdown to use the shadcn/ui `DropdownMenu` component for proper focus management.

---

## 9. Performance Concerns

### 9.1 Compare page fetches ALL deals (up to 100) for the dropdowns
- **Severity:** Medium | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/compare/ComparePage.tsx` (line 73)
- **Problem:** `useDeals({ per_page: 100 })` fetches up to 100 deals to populate the dropdown selectors. As users accumulate deals, this becomes slow and wasteful.
- **Recommendation:** Add a lightweight deals list endpoint that returns only `id`, `address`, and `strategy` without outputs/inputs. Or implement search-as-you-type in the dropdown.

### 9.2 No debouncing on filter changes in MyDeals
- **Severity:** Low | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/MyDeals.tsx` (lines 297-334)
- **Problem:** Every filter change (strategy, status, sort) triggers an immediate API call via React Query. While React Query deduplicates, rapid changes could cause unnecessary requests.
- **Recommendation:** This is minor since the Select components require explicit selection (not typing), but consider a brief debounce on page change buttons.

### 9.3 Portfolio chart re-renders on every entries change
- **Severity:** Low | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/portfolio/PortfolioPage.tsx` (lines 268-279)
- **Problem:** `chartData` is memoized with `useMemo`, which is good. However, the Recharts `ResponsiveContainer` with `AreaChart` can be expensive to re-render. Currently, it only re-renders when entries change, which is acceptable. No action needed.

### 9.4 Documents list has no pagination
- **Severity:** Medium | **Effort:** Medium (1-2 hours)
- **Files:** `/Users/ivanflores/parcel-platform/backend/routers/documents.py` (lines 95-115), `/Users/ivanflores/parcel-platform/frontend/src/pages/documents/DocumentsPage.tsx`
- **Problem:** The documents list endpoint returns ALL documents without pagination. As users upload more documents, this response will grow unbounded.
- **Recommendation:** Add `page` and `per_page` query params to the documents list endpoint. Add infinite scroll or pagination to the document list panel.

### 9.5 Chat history loads all 50 messages at once
- **Severity:** Low | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/backend/routers/chat.py` (lines 190-215)
- **Problem:** The chat history endpoint returns the last 50 messages. For users with long conversations, this could be slow. Also, the entire message list is stored in React state, which can cause performance issues with large message counts.
- **Recommendation:** Implement cursor-based pagination for chat history and "load more" scrolling in the UI.

### 9.6 Pipeline board data structure causes unnecessary re-renders
- **Severity:** Low | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 385-390)
- **Problem:** `const board` is recalculated on every render because `localBoard ?? pipelineData ?? ...` creates new object references. The `board` object is used in multiple `useCallback` dependencies, causing those callbacks to be recreated on every render.
- **Recommendation:** Stabilize the `board` reference using `useMemo` or by restructuring the state management.

---

## 10. Backend API Gaps

### 10.1 Frontend documents max size (25 MB) does not match backend (10 MB)
- **Severity:** High | **Effort:** Quick (10 min)
- **Files:** `/Users/ivanflores/parcel-platform/frontend/src/pages/documents/DocumentsPage.tsx` (line 42: `MAX_FILE_SIZE = 25 * 1024 * 1024`), `/Users/ivanflores/parcel-platform/backend/routers/documents.py` (line 21: `MAX_FILE_SIZE = 10 * 1024 * 1024`)
- **Problem:** Frontend allows uploads up to 25 MB but backend rejects anything over 10 MB. Users who upload a 15 MB file will see it accepted by the frontend dropzone but fail with a cryptic error from the backend.
- **Recommendation:** Align the limits. Either increase the backend to 25 MB or decrease the frontend to 10 MB. Update the help text on DocumentsPage line 98.

### 10.2 Dashboard endpoint returns `closed_deals` but frontend type expects `pipeline_by_stage.closed`
- **Severity:** Medium | **Effort:** Quick (20 min)
- **Files:** `/Users/ivanflores/parcel-platform/backend/routers/dashboard.py` (line 99-106), `/Users/ivanflores/parcel-platform/frontend/src/pages/Dashboard.tsx` (line 215), `/Users/ivanflores/parcel-platform/frontend/src/types/index.ts` (lines 71-77)
- **Problem:** The backend `DashboardStatsResponse` returns a `closed_deals` field (line 101), but the frontend `DashboardStats` type (types/index.ts) does not include `closed_deals`. The Dashboard page computes closed deals from `stats.pipeline_by_stage?.closed ?? 0` (line 215), which counts pipeline entries in "closed" stage, not portfolio entries. These are different metrics -- a deal can be in the pipeline "closed" stage but not have a portfolio entry.
- **Recommendation:** Add `closed_deals` to the `DashboardStats` TypeScript interface and use it in the Dashboard KPI.

### 10.3 No backend endpoint for text search across deals
- **Severity:** Medium | **Effort:** Large (4+ hours)
- **Problem:** The My Deals page has a search icon in the empty state, and the topbar has a search pill, but there is no search endpoint. The deals list endpoint supports filtering by strategy and status but not by address or zip code text search (zip_code is supported but not exposed in the frontend filters).
- **Recommendation:** Add a `q` (query) parameter to the deals list endpoint that searches across address and zip code using `ILIKE`.

### 10.4 Pipeline board response doesn't match the frontend expected structure
- **Severity:** High | **Effort:** Quick (15 min)
- **Files:** `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts` (line 136), `/Users/ivanflores/parcel-platform/frontend/src/pages/Pipeline.tsx` (lines 387-390)
- **Problem:** The API client types the pipeline response as `{ data: Record<string, PipelineCardResponse[]> }`, but the backend returns a `PipelineBoardResponse` which is a flat model with stage keys at the top level (not nested under a `data` key). The Pipeline page then casts `pipelineData as Record<Stage, PipelineCard[]>` (line 389), which works only because TypeScript doesn't enforce runtime shapes. This is fragile -- if the response shape changes, it will silently break.
- **Recommendation:** Verify the actual API response shape and update the type in `api.ts` to match. Remove the cast in Pipeline.tsx.

### 10.5 No rate limiting on authentication endpoints
- **Severity:** High | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/backend/routers/auth.py`
- **Problem:** The login and register endpoints have no rate limiting. An attacker could brute-force passwords or spam registrations.
- **Recommendation:** Add rate limiting middleware (e.g., `slowapi`) to the auth endpoints.

### 10.6 Offer letter generation uses POST inside a useQuery
- **Severity:** Medium | **Effort:** Quick (15 min)
- **File:** `/Users/ivanflores/parcel-platform/frontend/src/components/offer-letter-modal.tsx` (lines 41-53)
- **Problem:** The offer letter is generated via `useQuery` which calls `api.offerLetter.generate(dealId)` -- but `generate` is a POST request. Using `useQuery` for a POST is semantically incorrect (queries should be idempotent GETs). Also, React Query may retry the POST on failure, generating multiple letters.
- **Recommendation:** Switch to `useMutation` for the offer letter generation, triggered when the modal opens.

### 10.7 Chat history endpoint returns messages without session filtering
- **Severity:** Medium | **Effort:** Quick (30 min)
- **File:** `/Users/ivanflores/parcel-platform/backend/routers/chat.py` (lines 190-215)
- **Problem:** The chat history returns the last 50 messages for the user regardless of session, context type, or context ID. The frontend generates a unique `sessionId` per ChatPage mount (line 103) but the history endpoint doesn't filter by it. This means reopening the chat page shows messages from all previous sessions, including deal-context and document-context conversations mixed together.
- **Recommendation:** Add `session_id` and/or `context_type` + `context_id` query params to the history endpoint so the frontend can request context-specific history.

### 10.8 Delete deal returns 204 but frontend expects JSON
- **Severity:** Low | **Effort:** Quick (10 min)
- **Files:** `/Users/ivanflores/parcel-platform/backend/routers/deals.py` (lines 335-346), `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts` (lines 131-132)
- **Problem:** The backend `delete_deal` returns `status_code=204` (No Content) with no body. But `api.deals.delete` in api.ts calls `request<{ message: string }>()` which tries to parse `res.json()`, which will fail on a 204 with no body.
- **Recommendation:** Either (a) have the backend return 200 with a JSON body `{"message": "Deal deleted"}` or (b) update the `request` function to handle 204 responses by returning an empty object.

### 10.9 No search/filter on pipeline endpoint
- **Severity:** Low | **Effort:** Medium (1-2 hours)
- **File:** `/Users/ivanflores/parcel-platform/backend/routers/pipeline.py`
- **Problem:** The pipeline board endpoint returns all entries. As users accumulate deals in the pipeline, the response will grow. There is no way to filter by strategy, date range, or search by address.
- **Recommendation:** Consider adding optional filters, though the Kanban paradigm typically shows all items. More important for performance is ensuring the query is efficient.

---

## Summary Table

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| 1. Critical UX Gaps | 3 | 5 | 0 | 0 | 8 |
| 2. Missing Feedback States | 0 | 2 | 5 | 1 | 8 |
| 3. Undiscoverable Features | 0 | 1 | 3 | 1 | 5 |
| 4. Unfinished Flows | 0 | 2 | 3 | 1 | 6 |
| 5. Data Integrity | 0 | 0 | 4 | 2 | 6 |
| 6. Navigation & IA | 0 | 0 | 3 | 2 | 5 |
| 7. Mobile & Responsive | 1 | 1 | 2 | 1 | 5 |
| 8. Accessibility | 0 | 2 | 3 | 0 | 5 |
| 9. Performance | 0 | 0 | 3 | 4 | 7 |
| 10. Backend API Gaps | 0 | 3 | 5 | 2 | 10 |
| **TOTAL** | **4** | **16** | **31** | **14** | **65** |

## Priority Recommendations (Top 10 fixes by impact)

1. **Add mobile sidebar drawer** (Critical, Medium effort) -- Every mobile user is blocked
2. **Add 404 catch-all route** (Critical, Quick) -- Blank screen on invalid URLs
3. **Add logout button** (High, Quick) -- Users cannot sign out
4. **Fix file size mismatch** (High, Quick) -- 25MB vs 10MB causes confusing failures
5. **Add Pipeline error state** (High, Quick) -- Failed loads show empty board silently
6. **Add Pipeline empty state** (High, Quick) -- New users see empty columns with no guidance
7. **Add confirmation dialog to Pipeline remove** (High, Quick) -- Accidental deletions
8. **Implement or remove search bar** (High, Large) -- Sets false expectations
9. **Fix 204 response parsing** (Low but causes JS errors, Quick) -- Deal deletion may break
10. **Fix sidebar active state for nested routes** (Medium, Quick) -- Analyzer item not highlighted on form/results pages
