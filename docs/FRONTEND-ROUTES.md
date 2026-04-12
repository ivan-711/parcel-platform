# Frontend Route Map

> Generated 2026-04-12. Read-only audit of `frontend/src/App.tsx` and navigation components.

## Summary

| Metric | Count |
|--------|-------|
| Total routes | 48 (including catch-all 404) |
| Protected (auth required) | 36 |
| Public (no auth) | 11 |
| Guest-only (redirects if logged in) | 5 |
| Tier-gated (FeatureGate) | 3 (pipeline, ai_chat, document_upload) |
| Service-gated (ComingSoonGate) | 3 (sequences, skip-tracing, mail-campaigns) |
| Locked feature routes | 2 (d4d, compliance) |
| Orphan routes (not in sidebar/navbar) | 15 |
| Broken navigation links | 0 |
| Dead page files | 0 |

---

## Route Table

All routes defined in `frontend/src/App.tsx` lines 157-215. React Router v6 -- all routes are exact match (no prefix matching).

### Public Routes (no auth guard)

| Path | Component | Guard | Tier Gate | In Nav? | Notes |
|------|-----------|-------|-----------|---------|-------|
| `/` | `LandingPage` | GuestRoute | -- | Landing navbar | Redirects to `/today` if signed in |
| `/login` | `Login` (Clerk SignIn) | GuestRoute | -- | Landing navbar | Redirects to `/today` if signed in |
| `/register` | `Register` (Clerk SignUp) | GuestRoute | -- | Landing navbar | Redirects to `/today` if signed in |
| `/forgot-password` | `ForgotPassword` | GuestRoute | -- | No | Immediately redirects to `/login` (Clerk handles reset) |
| `/reset-password` | `ResetPassword` | GuestRoute | -- | No | Immediately redirects to `/login` (Clerk handles reset) |
| `/share/:dealId` | `ShareDealPage` | None | -- | No | Public share link for deals |
| `/reports/view/:shareToken` | `SharedReportPage` | None | -- | No | Public share link for reports |
| `/packets/view/:shareToken` | `SharedPacketPage` | None | -- | No | Public share link for disposition packets |
| `/privacy` | `PrivacyPage` | None | -- | Footer only | Static legal page |
| `/terms` | `TermsPage` | None | -- | Footer only | Static legal page |
| `/pricing` | `PricingPage` | None (no ProtectedRoute) | -- | Landing section + Cmd+K | Accessible to both guests and logged-in users |

### Protected Routes (auth required via ProtectedRoute)

#### Core Navigation (in sidebar)

| Path | Component | Tier Gate | Sidebar Section | Notes |
|------|-----------|-----------|-----------------|-------|
| `/today` | `TodayPage` | -- | HOME | Default redirect target after login |
| `/dashboard` | `Dashboard` | -- | HOME | Overview/stats page |
| `/analyze` | `AnalyzePage` | -- | DEALS | Address input + strategy selection |
| `/pipeline` | `Pipeline` | FeatureGate(`pipeline`, pro) | DEALS | Kanban board |
| `/properties` | `PropertiesListPage` | -- | DEALS | Property list |
| `/contacts` | `ContactsListPage` | -- | PEOPLE | Contact list |
| `/buyers` | `BuyersListPage` | -- | PEOPLE | Buyer list |
| `/portfolio` | `PortfolioPage` | -- | ASSETS | Closed deals tracking |
| `/financing` | `FinancingDashboardPage` | -- | ASSETS | Financing overview |
| `/obligations` | `ObligationsPage` | -- | ASSETS | Loan obligations |
| `/rehabs` | `RehabsPage` | -- | ASSETS | Rehab projects list |
| `/transactions` | `TransactionsPage` | -- | ASSETS | Transaction list |
| `/reports` | `ReportsListPage` | -- | OUTPUTS | Report list |
| `/documents` | `DocumentsPage` | FeatureGate(`document_upload`, pro) | OUTPUTS | Document upload/AI |
| `/sequences` | `SequencesListPage` | ComingSoonGate(`email_outbound`) | OUTREACH | Email sequences |
| `/skip-tracing` | `SkipTracingPage` | ComingSoonGate(`skip_tracing`) | OUTREACH | Skip tracing search |
| `/mail-campaigns` | `MailCampaignsPage` | ComingSoonGate(`direct_mail`) | OUTREACH | Direct mail campaigns |
| `/settings` | `SettingsPage` | -- | BOTTOM | Profile, notifications, billing, SMS, data tabs |

#### Sidebar Locked Items (buttons, not links -- show toast)

| Path | Component | Sidebar Section | Notes |
|------|-----------|-----------------|-------|
| `/d4d` | `LockedFeaturePage` | OUTREACH | `locked: true` in nav-data; button shows "Available on Pro" toast |
| `/compliance` | `LockedFeaturePage` | BOTTOM | `locked: true` in nav-data; button shows "Available on Pro" toast |

#### Detail/Sub-Routes (not directly in sidebar)

| Path | Component | Tier Gate | Reachable From | Notes |
|------|-----------|-----------|----------------|-------|
| `/onboarding` | `OnboardingPage` | -- | Auto-redirect after login if not completed | `skipOnboarding` flag on ProtectedRoute |
| `/analyze/strategies` | `StrategySelectPage` | -- | `/analyze` flow | Strategy selection step |
| `/analyze/results/:propertyId` | `AnalysisResultsPage` | -- | `/analyze` flow, Cmd+K deal search | Results by property |
| `/analyze/deal/:dealId` | `ResultsPage` | -- | `/analyze` flow, Cmd+K deal search | Results by deal |
| `/analyze/:strategy` | `AnalyzerFormPage` | -- | `/analyze/strategies` | Dynamic strategy form |
| `/deals` | `MyDeals` | -- | Dashboard links, ResultsPage links | Not in sidebar nav |
| `/compare` | `ComparePage` | -- | Cmd+K, compare bar | Not in sidebar nav |
| `/chat` | `ChatPage` | FeatureGate(`ai_chat`, pro) | Mobile tab bar, Cmd+K, AI floating button | Not in sidebar; in mobile primary tabs |
| `/properties/:propertyId` | `PropertyDetailPage` | -- | `/properties` list | Detail view |
| `/contacts/:contactId` | `ContactDetailPage` | -- | `/contacts` list | Detail view |
| `/buyers/:contactId` | `BuyerDetailPage` | -- | `/buyers` list | Detail view |
| `/rehabs/:projectId` | `RehabDetailPage` | -- | `/rehabs` list | Detail view |
| `/dispositions/matches/:propertyId` | `MatchResultsPage` | -- | Property actions | Buyer-property matching |
| `/sequences/new` | `SequenceBuilderPage` | -- | `/sequences` list | New sequence form |
| `/sequences/:id` | `SequenceBuilderPage` | -- | `/sequences` list | Edit existing sequence |
| `/skip-tracing/batch` | `BatchSkipTracePage` | -- | `/skip-tracing` | Batch skip trace upload |
| `/mail-campaigns/new` | `CampaignBuilderPage` | -- | `/mail-campaigns` list | New campaign form |
| `/mail-campaigns/:id` | `CampaignBuilderPage` | -- | `/mail-campaigns` list | Edit existing campaign |
| `/mail-campaigns/:id/analytics` | `CampaignAnalyticsPage` | -- | `/mail-campaigns` list | Campaign analytics |

### Catch-All

| Path | Component | Notes |
|------|-----------|-------|
| `*` | `NotFound` | 404 page with "Back to Dashboard" link to `/` |

---

## Navigation Structure

### Desktop Sidebar (`nav-data.ts` + `AppShell.tsx`)

Defined in `frontend/src/components/layout/nav-data.ts` via `NAV_SECTIONS` and `BOTTOM_NAV`.

```
HOME
  Today          /today         (matchExact)
  Dashboard      /dashboard     (matchExact)

DEALS
  Analyze        /analyze
  Pipeline       /pipeline
  Properties     /properties

PEOPLE
  Contacts       /contacts
  Buyers         /buyers

ASSETS
  Portfolio      /portfolio
  Financing      /financing
  Obligations    /obligations
  Rehabs         /rehabs
  Transactions   /transactions

OUTPUTS
  Reports        /reports
  Documents      /documents

OUTREACH
  Sequences      /sequences
  Skip Tracing   /skip-tracing
  Mail Campaigns /mail-campaigns
  D4D            /d4d           (locked)

---bottom---
  Settings       /settings
  Compliance     /compliance    (locked)
```

### Top Bar (`Topbar` in `AppShell.tsx`)

- Settings gear icon -> `/settings`
- User menu -> Settings link to `/settings`, Logout button
- Logo (mobile) -> `/today`

### Mobile Tab Bar (`MobileTabBar.tsx`)

Primary tabs (always visible at bottom):
```
Today     /today
Analyze   /analyze
Pipeline  /pipeline
Chat      /chat
More      (opens sheet with all remaining nav items)
```

The "More" sheet shows all `NAV_SECTIONS` items (excluding primary tab paths and `/chat`), plus `BOTTOM_NAV` items under an "ACCOUNT" heading.

### Landing Page Navbar (`navbar.tsx`)

- Logo -> `/`
- Features -> scroll to `#features` section
- Pricing -> scroll to `#pricing` section
- Log in -> `/login`
- Get Started -> `/register`

### Landing Page Footer (`footer.tsx`)

- Logo -> `/`
- Terms -> `/terms`
- Privacy -> `/privacy`

### Command Palette (`command-palette.tsx`, Cmd+K)

Pages indexed:
```
Today, Dashboard, Analyze, Pipeline, Properties, My Deals,
Contacts, Portfolio, Transactions, Reports, Documents,
AI Chat, Compare, Settings
```

Quick actions: Analyze New Deal (`/analyze`), Go to Pipeline (`/pipeline`), Open Chat (`/chat`)

Deal search: navigates to `/analyze/results/:propertyId` or `/analyze/deal/:dealId`

---

## Orphan Routes

Routes defined in App.tsx that are NOT reachable from any persistent navigation element (sidebar, mobile tab bar, top bar). They are reachable only via in-page links, programmatic navigation, URL, or the command palette.

| Route | How users reach it |
|-------|--------------------|
| `/forgot-password` | Clerk SignIn "Forgot password?" link |
| `/reset-password` | Clerk password reset email link |
| `/onboarding` | Auto-redirect from ProtectedRoute when onboarding incomplete |
| `/share/:dealId` | External share URL |
| `/reports/view/:shareToken` | External share URL |
| `/packets/view/:shareToken` | External share URL |
| `/pricing` | Links from billing components, landing page, LockedFeaturePage; **not** in sidebar |
| `/deals` | Links from Dashboard and ResultsPage; **not** in sidebar (replaced by Pipeline/Properties) |
| `/compare` | Cmd+K and compare bar; **not** in sidebar |
| `/chat` | Mobile tab bar + AI floating button + Cmd+K; **not** in desktop sidebar |
| `/analyze/strategies` | Navigate from `/analyze` flow |
| `/analyze/results/:propertyId` | Navigate from analysis flow or Cmd+K deal search |
| `/analyze/deal/:dealId` | Navigate from analysis flow or Cmd+K deal search |
| `/analyze/:strategy` | Navigate from `/analyze/strategies` |
| `/dispositions/matches/:propertyId` | Navigate from property detail actions |

**Note on `/deals`**: This route exists and is linked from Dashboard and ResultsPage, but it is NOT in the sidebar navigation. The sidebar uses `/pipeline` and `/properties` instead. The Cmd+K palette does include "My Deals" pointing to `/deals`.

**Note on `/chat`**: Intentionally excluded from the desktop sidebar. Accessible via the floating AI button (slide-over panel) and the mobile primary tab bar.

---

## Broken Links

**No broken links found.** All `<Link to=...>` and `navigate(...)` calls point to routes defined in App.tsx.

One minor inconsistency:
- The error boundary `handleGoHome` uses `window.location.href = '/dashboard'` which is a valid route but not the current "home" destination (the app redirects authenticated users to `/today`, and `GuestRoute` on `/` redirects to `/today`).

---

## Dead Page Files

**No dead page files.** Every file in `frontend/src/pages/` is either:
1. Directly imported as a lazy route in App.tsx, or
2. Imported as a sub-component (e.g., `BillingSettings.tsx` imported by `SettingsPage.tsx`)

Files in `pages/analyze/components/` are sub-components of analyze pages, not standalone pages.

---

## Route Guard Architecture

### ProtectedRoute (`App.tsx` lines 122-136)

```
1. Check isLoaded (Clerk SDK ready or fallback)
   -> If not loaded: show PageFallback skeleton
2. Check isSignedIn (Clerk or authStore)
   -> If not signed in: <Navigate to="/login" replace />
3. Check onboarding (unless skipOnboarding prop)
   -> If onboarding not completed AND status fetched: <Navigate to="/onboarding" replace />
4. Render children
```

All protected routes wrap children in `<ProtectedRoute>`. The `/onboarding` route passes `skipOnboarding` to avoid redirect loops.

### GuestRoute (`App.tsx` lines 139-146)

```
1. Check isLoaded -> show fallback if not ready
2. Check isSignedIn
   -> If signed in: <Navigate to="/today" replace />
3. Render children
```

Applied to: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`

### Auth Detection (`useIsSignedIn` hook, lines 110-119)

- When Clerk is enabled: uses `useClerkAuth()` for `isLoaded` and `isSignedIn`
- When Clerk is disabled: falls back to `useAuthStore().isAuthenticated`, always reports `isLoaded: true`

### Tier Gating (3 mechanisms)

1. **FeatureGate component** (`components/billing/FeatureGate.tsx`)
   - Checks user's plan tier against required tier for the feature
   - Trial users on `free` plan get treated as `pro`
   - Demo users (`demo@parcel.app`) always get access
   - Blocked users see content rendered behind an inert overlay with `PaywallOverlay`
   - Used on: `/pipeline` (pro), `/chat` (pro), `/documents` (pro)

2. **ComingSoonGate component** (`components/ComingSoonGate.tsx`)
   - Checks backend service status via `api.serviceStatus()`
   - If service is not configured, shows "Coming Soon" placeholder
   - Not tier-based -- depends on backend service availability
   - Used on: `/sequences` (email_outbound), `/skip-tracing` (skip_tracing), `/mail-campaigns` (direct_mail)

3. **Locked nav items** (`nav-data.ts` `locked: true`)
   - Sidebar items with `locked: true` render as buttons, not links
   - Clicking shows a toast: "Available on Pro plan" with "Upgrade" action -> `/settings`
   - Routes still exist and render `LockedFeaturePage` if accessed by URL
   - Applied to: `/d4d`, `/compliance`

### Plan Tiers

```typescript
type PlanTier = 'free' | 'plus' | 'pro' | 'business'
// Rank: free=0, plus=1, pro=2, business=3
// hasAccess(current, required) = PLAN_RANK[current] >= PLAN_RANK[required]
```

### Gated Features Map

| Feature Key | Display Name | Required Tier | Used On |
|-------------|--------------|---------------|---------|
| `ai_chat` | AI Deal Chat | pro | `/chat` (ChatPage) |
| `pipeline` | Deal Pipeline | pro | `/pipeline` (Pipeline) |
| `document_upload` | Document AI | pro | `/documents` (DocumentsPage) |
| `pdf_export` | PDF Reports | pro | Report generation (not a route gate) |
| `offer_letter` | Offer Letter Generator | pro | Offer flow (not a route gate) |
| `compare_deals` | Deal Comparison | pro | Compare flow (not a route gate) |
| `portfolio` | Portfolio Tracking | pro | Defined but NOT applied as route gate on `/portfolio` |

**Note**: `portfolio` is defined as a gated feature requiring `pro` tier in `FEATURE_LABELS`, but the `/portfolio` route does NOT wrap its content in a `<FeatureGate>`. This may be intentional (e.g., showing empty state instead) or an oversight.

---

## Redirect Flows

| Condition | Redirect |
|-----------|----------|
| Unauthenticated user hits protected route | -> `/login` |
| Authenticated user hits `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` | -> `/today` |
| Authenticated user with incomplete onboarding hits any protected route | -> `/onboarding` |
| Onboarding completed | -> `/today` |
| Clerk SignIn `fallbackRedirectUrl` | -> `/today` |
| Error boundary "Go Home" | -> `/dashboard` (uses `window.location.href`) |
| Settings page logout | -> `/` (uses `window.location.href`) |
| Unknown route | -> `NotFound` (404 page) |
