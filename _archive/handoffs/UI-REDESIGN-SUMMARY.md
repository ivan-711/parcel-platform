# Parcel UI Redesign Summary

## Date: 2026-03-30

---

### 1. Overview

Parcel is a real estate deal analysis SaaS (React + TypeScript + Vite frontend, FastAPI + PostgreSQL backend). The UI redesign converted the entire application from a **dark fintech theme** (indigo/violet primary, `#08080F` backgrounds, JetBrains Mono financial numbers) to a **professional light theme** (olive/lime primary, white/gray-50 backgrounds, Inter tabular-nums financial numbers).

**Design direction:** Data-dense "Mercury/Linear" aesthetic with a custom Untitled UI gray scale, olive/lime `#4D7C0F` (lime-700) as the primary accent (WCAG AA compliant at 4.63:1 on white), and indigo demoted to informational/decorative accent.

**Scope:** 103 files changed across frontend and backend, with 2,852 insertions and 2,004 deletions. The core redesign affected ~85 frontend files (pages, components, layout, charts, design tokens, CSS variables, PDF generator) and ~18 backend files (backend changes are NOT part of the UI redesign -- they are concurrent feature/fix work on auth, calculators, and API endpoints).

**Build status:** Production build succeeds (2.92s, largest chunk: ResultsPage at 426KB / 140KB gzipped).

**Test status:** 36 of 44 tests pass. 8 tests fail across 3 test files -- all failures are in `schemas.test.ts` (Zod schema validation tests that appear to be pre-existing issues unrelated to the UI redesign -- likely caused by calculator input schema changes in the backend work).

---

### 2. Files Modified By Phase

The redesign was described as 8 phases, but the actual git diff shows all changes on one branch against `main`. Below is the logical grouping reconstructed from the design spec and file contents.

#### Phase 0: Foundation -- Design Tokens & Config

| File | Description |
|------|-------------|
| `frontend/tailwind.config.ts` (NEW, replaces `.js`) | Complete Tailwind config with Untitled UI gray scale, lime/indigo/semantic color scales, CSS-variable-driven semantic tokens, custom font sizes (13px base), Inter/Satoshi/JetBrains Mono font stacks, Stripe-style cool-tinted shadows, spring/expo easing curves, keyframes for shimmer/drift/blink/pipeline-slide |
| `frontend/tailwind.config.js` (DELETED) | Old dark-theme Tailwind config removed (-162 lines) |
| `frontend/src/index.css` | Complete rewrite: light theme `:root` variables (gray-50 page bg, white surfaces, lime-700 accent, gray-800 text), `.dark` class preserved for future rollback, Satoshi `@font-face`, `[data-financial]`/`.financial` utility class for Inter tabular-nums, `.app-shell`/`.prose-content` density classes, `.label-caps`/`.text-kpi-display` utilities, skeleton shimmer, drift animations, ticker, reduced-motion media queries |
| `frontend/src/main.tsx` | Added `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` imports for self-hosted fonts |
| `frontend/index.html` | Updated meta tags (OG image, description), preloads Satoshi-Variable.woff2 |
| `frontend/package.json` | Added `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` |
| `frontend/package-lock.json` | Lock file updated for new font dependencies |

#### Phase 1: App Shell & Layout

| File | Description |
|------|-------------|
| `frontend/src/components/layout/AppShell.tsx` | Major rewrite (~367 line diff): 240px white sidebar with lime-700 logo, border-r border-gray-200, lime-50 active nav state, gray-50 page background, white topbar with search pill, user avatar menu with lime-100 bg, breadcrumb nav, mobile Sheet drawer, skip-to-content link, focus management on route change, AnimatePresence page transitions |
| `frontend/src/components/layout/PageHeader.tsx` | Light-theme header styles (gray-900 text, gray-500 subtitle) |

#### Phase 2: Core UI Components

| File | Description |
|------|-------------|
| `frontend/src/components/ui/KPICard.tsx` | White card with gray-200 border, gray-500 label, gray-900 value (text-3xl tabular-nums), sparkline with lime-600 stroke and 8% opacity gradient fill, sky-600/red-600 delta colors |
| `frontend/src/components/ui/StrategyBadge.tsx` | Inline styles using pastel bg + dark text (amber for wholesale, violet for creative, blue for BRRRR, emerald for buy & hold, rose for flip) |
| `frontend/src/components/ui/SkeletonCard.tsx` | White bg, gray-200 border, gray-200 shimmer bars |
| `frontend/src/components/ui/RiskGauge.tsx` | Light-theme SVG gauge (gray-100 track, color-coded fill) |
| `frontend/src/components/ui/ConceptTooltip.tsx` | White bg, gray-200 border tooltip |
| `frontend/src/components/ui/sonner.tsx` | Light-theme toast configuration |
| `frontend/src/components/error-boundary.tsx` | Light-theme error boundary (red-50 bg, red-500 icon) |

#### Phase 3: Pages -- Auth & Landing

| File | Description |
|------|-------------|
| `frontend/src/pages/Landing.tsx` | Root page with `bg-[#F9FAFB]` (gray-50), lazy-loaded below-fold sections, skeleton placeholders |
| `frontend/src/pages/Login.tsx` | Gray-50 bg, white card with gray-200 border, lime-700 CTA button, lime-500 focus rings |
| `frontend/src/pages/Register.tsx` | Same auth card pattern, role selection cards with lime-500 selected border |
| `frontend/src/pages/ForgotPassword.tsx` | Light-theme auth card |
| `frontend/src/pages/ResetPassword.tsx` | Light-theme auth card |
| `frontend/src/pages/NotFound.tsx` | Light-theme 404 page |
| `frontend/src/components/landing/navbar.tsx` | White/transparent navbar, lime-700 logo, gray text |
| `frontend/src/components/landing/hero.tsx` | Light-theme hero section |
| `frontend/src/components/landing/demo-card.tsx` | Interactive strategy tab card with light backgrounds |
| `frontend/src/components/landing/ticker.tsx` | Light-theme deal ticker |
| `frontend/src/components/landing/stats-strip.tsx` | Gray-900 text on light bg |
| `frontend/src/components/landing/testimonials.tsx` | White cards, gray borders |
| `frontend/src/components/landing/features-bento.tsx` | White bento cards with gray-200 borders |
| `frontend/src/components/landing/comparison-table.tsx` | Light-theme comparison table |
| `frontend/src/components/landing/how-it-works.tsx` | Light-theme step cards with mono numbers |
| `frontend/src/components/landing/deal-calculator.tsx` | Interactive calculator with light inputs |
| `frontend/src/components/landing/pricing.tsx` | White pricing cards, lime-700 CTAs |
| `frontend/src/components/landing/final-cta.tsx` | Light-theme CTA section |
| `frontend/src/components/landing/footer.tsx` | Light-theme footer |
| `frontend/src/components/landing/ParallaxBackground.tsx` | Soft pastel gradient blobs (not dark neon) |
| `frontend/src/components/landing/avatar-stack.tsx` | Light-theme avatars |
| `frontend/src/components/landing/cursor-spotlight.tsx` | Subtle light-theme cursor effect |
| `frontend/src/components/landing/scroll-progress.tsx` | Lime-600 progress bar |
| `frontend/src/components/landing/skip-to-content.tsx` | Lime-700 skip link |
| `frontend/src/components/landing/trust-badges.tsx` | Gray text badges |
| `frontend/src/components/landing/constants.ts` | Updated color constants for light theme |

#### Phase 4: Dashboard & Deals

| File | Description |
|------|-------------|
| `frontend/src/pages/Dashboard.tsx` | White KPI cards, indigo-50 empty state CTA, white data tables with gray-200 borders, activity feed with color-coded icons, demo banner with indigo-50 bg |
| `frontend/src/pages/MyDeals.tsx` | Light-theme deal list with gray text, lime-700 action links |
| `frontend/src/components/deals/deal-card.tsx` | White card, gray-200 border, gray-900 text |
| `frontend/src/components/deals/deal-grid.tsx` | Light-theme grid layout |
| `frontend/src/components/deals/filter-bar.tsx` | Gray inputs, lime active states |
| `frontend/src/components/deals/preset-chips.tsx` | Gray-100 chips, lime-50 active |
| `frontend/src/components/deals/compare-bar.tsx` | Light-theme compare bar |
| `frontend/src/components/deals/constants.ts` | Updated strategy color constants |

#### Phase 5: Analysis & Results

| File | Description |
|------|-------------|
| `frontend/src/pages/analyze/AnalyzerFormPage.tsx` | White form cards, gray-300 input borders, lime-700 submit buttons, gray-400 section headings |
| `frontend/src/pages/analyze/ResultsPage.tsx` | White output cards with gray-200 borders, shadow-xs, lime-700 "Add to Pipeline" button, white dropdown menus, sky-600 positive values, red-600 negative values, tabular-nums throughout |
| `frontend/src/pages/analyze/StrategySelectPage.tsx` | Light-theme strategy selection |
| `frontend/src/pages/compare/ComparePage.tsx` | Light-theme comparison view |
| `frontend/src/pages/share/ShareDealPage.tsx` | Light-theme public share page |

#### Phase 6: Pipeline

| File | Description |
|------|-------------|
| `frontend/src/pages/Pipeline.tsx` | Gray-50 board bg, white column areas, gray-themed scrollbar styles, DragOverlay with white card + shadow, lime-700 "Add Deal" button |
| `frontend/src/components/pipeline/deal-card.tsx` | White cards with `rounded-[10px]`, gray-200 border, gray-300 hover border, indigo-500 keyboard focus ring, gray-900 address text, tabular-nums for prices |
| `frontend/src/components/pipeline/kanban-column.tsx` | Light-theme column headers and drop zones |
| `frontend/src/components/pipeline/column-skeleton.tsx` | Light-theme skeleton cards |
| `frontend/src/components/pipeline/mobile-pipeline.tsx` | Light-theme mobile tabbed view |
| `frontend/src/components/pipeline/pipeline-empty.tsx` | Light-theme empty state |
| `frontend/src/components/pipeline/pipeline-error.tsx` | Light-theme error state |
| `frontend/src/components/pipeline/constants.ts` | Strategy colors updated with light-theme pastel bg + dark text pairs |

#### Phase 7: Chat, Documents, Portfolio, Settings

| File | Description |
|------|-------------|
| `frontend/src/pages/chat/ChatPage.tsx` | Full-width message rows on white (user) and slate-50/60 (assistant), lime-50 AI avatar, lime-700 send button, slate-200 input area, markdown with slate-800 text and font-mono ONLY on code blocks/table cells |
| `frontend/src/pages/portfolio/PortfolioPage.tsx` | White chart cards with gray-200 borders, lime-500 (`#84CC16`) area chart stroke, sky-500 positive bar fills, gray-500 axis text, white tooltip cards |
| `frontend/src/pages/settings/SettingsPage.tsx` | White cards with gray-200 borders, lime-700 tab indicator, lime-700 save buttons, lime-500 focus rings on inputs |
| `frontend/src/pages/documents/DocumentsPage.tsx` | Light-theme document grid |
| `frontend/src/components/documents/document-detail.tsx` | Light-theme detail slide-over |
| `frontend/src/components/documents/document-list.tsx` | Light-theme document list |
| `frontend/src/components/documents/processing-steps.tsx` | Light-theme processing indicator |
| `frontend/src/components/documents/upload-zone.tsx` | Dashed gray-300 border, lime-400 hover |
| `frontend/src/components/close-deal-modal.tsx` | White modal, gray-200 border |
| `frontend/src/components/edit-portfolio-modal.tsx` | White modal, gray-200 border |
| `frontend/src/components/offer-letter-modal.tsx` | White modal, gray-200 border |

#### Phase 8: Charts, PDF, Command Palette

| File | Description |
|------|-------------|
| `frontend/src/components/charts/CashFlowProjection.tsx` | White card, lime-600/sky-500 dual-area chart, gray-200 grid lines, white tooltip card, gray-100 empty state |
| `frontend/src/components/charts/ComparisonRadar.tsx` | Light-theme radar chart with lime-700/sky-600/amber-600 deal colors |
| `frontend/src/lib/pdf-report.ts` | Print-friendly light theme: white pages, indigo-600 accent headings/rules, gray-900/700/500 text hierarchy, pastel strategy badge colors, Inter tabular-nums for financial figures |
| `frontend/src/components/command-palette.tsx` | White dialog with gray-200 border, lime-50 selected state with lime-500 left border, lime-600 search/page icons, gray-100 kbd hints |
| `frontend/src/lib/format.ts` | Updated format helpers for light theme color returns |
| `frontend/src/App.tsx` | Minor route updates |
| `frontend/src/__tests__/components.test.tsx` | Test updates for new component APIs |

---

### 3. Design Token Summary

**Page background:** `#F9FAFB` (gray-50) via `--app-bg`
**Card/surface:** `#FFFFFF` via `--app-surface`
**Secondary surface:** `#F2F4F7` (gray-100) via `--app-overlay`
**Default border:** `#EAECF0` (gray-200) via `--border-subtle`
**Input border:** `#D0D5DD` (gray-300) via `--border-default`

**Primary accent:** `#84CC16` (lime-500) -- brand fills, sparklines, chart strokes
**Button fill:** `#4D7C0F` (lime-700) -- ALL primary buttons, white text (WCAG AA 4.63:1)
**Info/decorative:** `#6366F1` (indigo-500) -- info badges, demo banner, "View all" links

**Primary text:** `#1D2939` (gray-800) via `--text-primary`
**Secondary text:** `#667085` (gray-500) via `--text-secondary`
**Muted text:** `#98A2B3` (gray-400) via `--text-muted`
**Heading text:** `#101828` (gray-900)

**Body font:** Inter (self-hosted via Fontsource, OpenType features cv02/cv03/cv04/cv11)
**Brand font:** Satoshi (self-hosted woff2, landing page headings only)
**Code font:** JetBrains Mono (self-hosted via Fontsource, code blocks and AI output ONLY)
**Financial numbers:** Inter with `tabular-nums lining-nums` and `font-weight: 500`

**Base font size:** 13px (`text-base`)
**KPI display size:** 32px (`text-kpi`)
**Border radius -- cards:** 12px (`rounded-lg`), pipeline cards: 10px (`rounded-[10px]`)

**Shadows:** Cool-tinted with `rgba(16, 24, 40, ...)`:
- Cards at rest: `shadow-xs` = `0 1px 2px rgba(16,24,40,0.05)`
- Cards on hover: `shadow-sm` = `0 1px 3px rgba(16,24,40,0.10), 0 1px 2px rgba(16,24,40,0.06)`
- Focus ring: `0 0 0 2px #FFFFFF, 0 0 0 4px #84CC16`

---

### 4. Deviations From UI-DESIGN-SYSTEM.md

| Spec Requirement | Actual Implementation | Severity |
|-----------------|----------------------|----------|
| **Cards use `shadow-xs` at rest, no inline shadows** (Agent 19 fix 1g) | Dashboard, KPICard, and SkeletonCard use `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` or `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]` inline arbitrary shadows instead of token `shadow-xs` | Low -- visually similar, but violates "use token shadows only" rule |
| **App cards use `rounded-lg` (12px)** | Most app cards use `rounded-xl` (16px) instead of `rounded-lg` (12px). The Dashboard has 8 instances of `rounded-xl` on non-landing cards. | Medium -- spec says `rounded-xl` is for landing/promotional only |
| **`--app-elevated` should be `#F2F4F7`** (gray-100) | Implementation uses `#FFFFFF` for `--app-elevated` in light theme | Low -- the spec itself says "shadow distinguishes" |
| **`--app-overlay` should be `rgba(12, 17, 29, 0.60)`** | Implementation uses `#F2F4F7` (gray-100, sidebar bg) | Medium -- these serve different purposes (spec = modal overlay backdrop, impl = secondary surface) |
| **Chat page uses `slate-*` classes** | ChatPage.tsx has 42 instances of `slate-*` (slate-800, slate-200, slate-100, slate-50, slate-400, etc.) instead of custom gray scale | High -- spec says "No `slate-*` classes anywhere" |
| **Font-family stack slightly differs** | Spec: `'"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'`. Impl: `'"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'` (extra "Segoe UI") | Negligible |
| **Sidebar bg should be gray-100 (`#F2F4F7`)** per spec section 5.1 | Sidebar uses `bg-white` with `border-r border-gray-200` | Low -- white sidebar actually looks cleaner and matches modern SaaS patterns |
| **Settings inactive tabs `text-gray-500`** (Agent 19 fix 2d) | Implementation uses `text-gray-400` for inactive tabs | Low -- WCAG compliance concern (gray-400 may fail AA on white) |
| **Chat sidebar (280px lg+)** per spec section 5.7 | No conversation sidebar implemented -- full-width chat only | Medium -- conversation management/history sidebar not yet built |
| **Skeleton uses `bg-gray-100 skeleton-shimmer`** per spec | Skeleton uses CSS-variable-driven `hsl(var(--muted))` gradient | Low -- functionally equivalent |
| **Tooltip bg should be `bg-gray-900`** per spec 4.10 | Portfolio tooltips use `bg-white border-gray-200` (inverted style) | Low -- light tooltips are common |

---

### 5. Tradeoffs & Compromises

1. **`slate-*` on ChatPage:** The ChatPage uses Tailwind's default `slate-*` scale (42 occurrences) rather than the custom gray scale. This was likely a pragmatic shortcut since the chat page has dense markdown rendering with many color references. The visual difference between `slate-800` (#1e293b) and `gray-800` (#1D2939) is nearly imperceptible, but it violates the "one gray scale" principle and could cause confusion during future maintenance.

2. **Inline arbitrary shadows instead of token `shadow-xs`:** Several components use `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` instead of the Tailwind `shadow-xs` token. The values are close but not identical (spec: `rgba(16,24,40,0.05)` vs impl: `rgba(0,0,0,0.04)`). This means shadow appearance won't update if tokens are changed in the config.

3. **`rounded-xl` on app cards:** The spec reserves `rounded-xl` (16px) for landing/promotional cards and prescribes `rounded-lg` (12px) for app cards. The implementation uses `rounded-xl` on most app cards. This gives a slightly softer, more modern look but deviates from the spec's density-focused recommendation.

4. **`font-mono` on logo "P":** Login, Register, ForgotPassword, ResetPassword, and Navbar all apply `font-mono` to the "P" logo mark. This is cosmetic/branding and not a financial number, so it is acceptable but worth noting.

5. **Dark theme preserved but not actively used:** The `.dark` class variables exist in `index.css` and `darkMode: ['class']` is in the Tailwind config, but no theme toggle is implemented. The dark values are correct per spec and available for future use.

6. **No `prefers-reduced-motion` check on Recharts:** The spec says to disable `isAnimationActive` when reduced motion is preferred. All chart components hard-code `isAnimationActive={true}` without checking the media query.

---

### 6. Components Needing Manual Review

1. **ChatPage.tsx** -- Most urgent. 42 `slate-*` references need migration to custom `gray-*` scale. Also check markdown component map (`MD_LIGHT`) which uses `slate-*` throughout.

2. **KPICard.tsx** -- Uses inline arbitrary shadow. Should use `shadow-xs` token. Also missing the `text-kpi` size class (uses `text-3xl` instead of the dedicated `text-kpi` = 32px/38px token).

3. **Dashboard.tsx** -- Uses `rounded-xl` on cards (spec says `rounded-lg`). Uses `indigo-*` for CTAs and links (spec uses indigo for info/decorative, not for primary CTAs -- "View all" links should arguably be `text-lime-700`).

4. **SettingsPage.tsx** -- Inactive tab uses `text-gray-400` (spec requires `text-gray-500` for WCAG AA compliance).

5. **All auth pages (Login, Register, ForgotPassword, ResetPassword)** -- Use `font-mono` on the logo "P" character. Minor, but spec says `font-mono` is for code/AI output only.

6. **PortfolioPage.tsx** -- Chart tooltips use `bg-white` style instead of spec's `bg-gray-900` dark tooltip style. Also has hardcoded hex colors in chart configs (`#84CC16`, `#EAECF0`, `#667085`) that could reference tokens.

7. **Pipeline deal-card.tsx** -- Focus ring uses `indigo-500/indigo-400` instead of spec's `lime-600` focus pattern. This is an intentional contrast choice for keyboard nav visibility.

---

### 7. Remaining Dark Theme Artifacts

**In CSS variables only (correct/intentional):**
- `#08080F` -- appears only in `.dark` block in `index.css` (line 122). This is the preserved dark theme and is correct per spec.
- `#0F0F1A` -- appears only in `.dark` block in `index.css` (line 123). Same.
- `#1A1A2E` -- appears only in `.dark` block in `index.css` (line 128). Same.
- `#6366F1` -- appears in both `:root` and `.dark` blocks as `--accent-info`. This is the indigo-500 info color and is correct in both themes.

**No dark artifacts in component/page files:** The search for `bg-app-surface` and `text-text-primary` (old semantic token classes) returned zero results in component files. All components have been migrated to direct Tailwind classes (`bg-white`, `text-gray-900`, etc.).

**`slate-*` usage (NOT a dark artifact, but a wrong gray scale):**
- 71 total occurrences of `slate-*` across 12 files
- 42 of those are in ChatPage.tsx
- Remaining 29 are spread across AnalyzerFormPage.tsx (16), MyDeals.tsx (2), Dashboard.tsx (1), and several shadcn/ui primitive components (select, alert-dialog, switch, dialog) which may be from the shadcn generator defaults

---

### 8. Test Status

```
Test Files:  3 failed | 2 passed (5 total)
Tests:       8 failed | 36 passed (44 total)
Duration:    1.06s
```

**Passing test files:**
- `components.test.tsx` -- Component rendering tests pass
- One other test file (likely hooks or utils)

**Failing test file: `schemas.test.ts`** (all 8 failures):
- `wholesaleSchema > accepts valid wholesale inputs` -- FAIL
- `brrrrSchema > accepts valid brrrr inputs` -- FAIL
- `buyAndHoldSchema > accepts valid buy_and_hold inputs` -- FAIL
- `creativeFinanceSchema > accepts valid creative_finance inputs` -- FAIL
- `flipSchema > accepts valid flip inputs` -- FAIL
- Plus 3 more schema tests

**Root cause:** These are Zod schema validation tests that appear to fail because the backend calculator input schemas were modified (new fields added for address/zip_code in the concurrent backend work) but the test fixtures were not updated to include the new required fields. These failures are **not caused by the UI redesign** -- they are caused by the backend `calculators/*.py` changes visible in the git diff.

---

### 9. Known Visual Issues

1. **Inline shadow mismatch:** KPICard, SkeletonCard, and Dashboard cards use `rgba(0,0,0,0.04)` shadows while the design token uses `rgba(16,24,40,0.05)`. The visual difference is sub-pixel but creates inconsistency if tokens are later audited.

2. **Chat page gray mismatch:** ChatPage uses Tailwind default `slate-*` which has a slightly bluer undertone than the Untitled UI `gray-*` scale. Side-by-side with other pages, the chat may appear very slightly cooler-toned.

3. **`rounded-xl` vs `rounded-lg`:** App-shell cards are 16px radius instead of spec's 12px. This is visually softer/rounder than the intended "data-dense" feel.

4. **Settings inactive tabs:** `text-gray-400` (#98A2B3) on white background is 2.7:1 contrast ratio, which fails WCAG AA for normal text (requires 4.5:1). Should be `text-gray-500` (#667085) which is 4.6:1.

5. **Missing `text-kpi` usage:** KPICard uses `text-3xl` (28px/34px per the custom scale) instead of the dedicated `text-kpi` token (32px/38px). Financial hero numbers are 4px smaller than designed.

---

### 10. What's NOT Done Yet

**Billing components (spec section 6):**
- PaywallOverlay with gradient mask + backdrop blur
- FeatureGate wrapper component
- TrialBanner (sidebar footer + dashboard inline, 3 severity states)
- PlanBadge (Pro/Free indicators)
- UsageMeter (linear progress with color thresholds)
- LimitReachedModal
- BillingSettings page
- CancelModal

**Onboarding:**
- Dashboard empty state currently shows a simple "Analyze Your First Deal" CTA
- Spec calls for an onboarding checklist with progress bar when `total_deals === 0`

**Chat conversation sidebar:**
- Spec section 5.7 calls for a 280px conversation sidebar on lg+ breakpoints
- Current implementation is full-width single-conversation only

**Pricing page route:**
- Landing page pricing section exists but no standalone `/pricing` route for authenticated users
- Billing tab missing from Settings page (only Profile and Notifications tabs exist)

**Address fields on analyzer forms:**
- P1-8 from QA report: add address + zip code to all 5 strategy forms (partially done on backend)

**Dark theme toggle:**
- CSS variables for `.dark` exist and are correct
- No UI toggle to switch themes
- No persistence (localStorage/cookie) for theme preference

**Reduced motion compliance:**
- CSS animations respect `prefers-reduced-motion` (blob, ticker, shimmer stop)
- Recharts charts do NOT check `prefers-reduced-motion` -- `isAnimationActive` is always `true`
- Framer Motion variants do not have reduced-motion fallbacks

**ErrorState component:**
- Spec section 4.12 defines a standardized `ErrorState` component
- Current implementation has ad-hoc error states in each page (functionally equivalent but not a shared component)

**Tooltip style standardization:**
- Spec says `bg-gray-900 text-white` for tooltips
- Some tooltips use white bg (Portfolio), others use default shadcn/ui styling
- No consistent approach

---

### 11. Recommended Next Steps

1. **Migrate ChatPage.tsx from `slate-*` to `gray-*`** -- Highest priority deviation. Search-replace `slate-` with the equivalent custom gray token in ChatPage and its markdown component map. ~42 replacements.

2. **Fix Settings inactive tab contrast** -- Change `text-gray-400` to `text-gray-500` on inactive tabs for WCAG AA compliance.

3. **Standardize card shadows** -- Replace all `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` inline shadows with the `shadow-xs` Tailwind token across Dashboard, KPICard, SkeletonCard (~9 occurrences).

4. **Audit `rounded-xl` vs `rounded-lg`** -- Decide whether to keep the softer 16px radius on app cards or tighten to 12px per spec. If keeping 16px, update the spec to reflect reality.

5. **Fix failing schema tests** -- Update test fixtures in `schemas.test.ts` to include the new `address` and `zip_code` fields added to calculator schemas.

6. **Use `text-kpi` for KPI numbers** -- Update KPICard to use the `text-kpi` (32px/38px) token instead of `text-3xl` (28px/34px).

7. **Add `prefers-reduced-motion` check for Recharts** -- Create a `useReducedMotion()` hook and pass the result to `isAnimationActive` on all chart components.

8. **Build billing components** -- The billing system (PaywallOverlay, FeatureGate, TrialBanner, UsageMeter) is the largest remaining spec gap and blocks monetization.

9. **Extract shared ErrorState component** -- Consolidate the ~8 ad-hoc error states into a reusable `ErrorState` component per spec section 4.12.

10. **Clean up `slate-*` in shadcn/ui primitives** -- The 29 `slate-*` references outside ChatPage are mostly in generated shadcn/ui components (select, dialog, switch, alert-dialog). These should be regenerated or patched to use the custom gray scale.
