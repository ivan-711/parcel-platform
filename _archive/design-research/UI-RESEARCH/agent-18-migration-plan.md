# Parcel Platform: UI Redesign Migration Plan

**Date:** 2026-03-30
**Scope:** Full codebase audit + migration strategy for theming/design-system overhaul
**Codebase:** React 18 + TypeScript + Tailwind 3 + shadcn/ui + Framer Motion

---

## 1. Complete File Inventory

### Pages (18 files, 7,750 lines total)

| File | Lines | Uses AppShell | Key Dependencies |
|------|-------|---------------|------------------|
| `pages/analyze/AnalyzerFormPage.tsx` | 1,302 | Yes | 5 strategy forms, validation, API submit |
| `pages/portfolio/PortfolioPage.tsx` | 747 | Yes | Recharts (Area/Bar/Pie), KPICard, Sheet, Select |
| `pages/analyze/ResultsPage.tsx` | 605 | Yes | KPICard, RiskGauge, CashFlowProjection, PDF export |
| `pages/Dashboard.tsx` | 432 | Yes | KPICard, StrategyBadge, SkeletonCard, motion stagger |
| `pages/MyDeals.tsx` | 432 | Yes | FilterBar, DealGrid, CompareBar, AlertDialog |
| `pages/Pipeline.tsx` | 416 | Yes | @dnd-kit, KanbanColumn, MobilePipeline, AlertDialog |
| `pages/chat/ChatPage.tsx` | 395 | Yes | SSE streaming, ReactMarkdown, custom MD components |
| `pages/compare/ComparePage.tsx` | 374 | Yes | ComparisonRadar, side-by-side table |
| `pages/share/ShareDealPage.tsx` | 362 | No | Standalone public page, many hardcoded colors |
| `pages/settings/SettingsPage.tsx` | 322 | Yes | Input, Label, Switch, profile/password forms |
| `pages/ResetPassword.tsx` | 276 | No | Standalone auth page |
| `pages/Register.tsx` | 195 | No | Standalone auth page |
| `pages/ForgotPassword.tsx` | 175 | No | Standalone auth page |
| `pages/documents/DocumentsPage.tsx` | 151 | Yes | UploadZone, DocumentList, DocumentDetail |
| `pages/Login.tsx` | 116 | No | Standalone auth page, shake animation |
| `pages/Landing.tsx` | 113 | No | Orchestrator only; delegates to 12+ landing components |
| `pages/analyze/StrategySelectPage.tsx` | 93 | Yes | Strategy cards, navigation |
| `pages/NotFound.tsx` | 34 | No | Minimal 404 |

### Components (60 files, ~4,500 lines total)

**Layout (3 files):**
- `layout/AppShell.tsx` (291 lines) -- sidebar, topbar, mobile drawer, command palette host
- `layout/PageHeader.tsx` (21 lines) -- title + subtitle + action slot
- `layout/PageContent.tsx` (14 lines) -- thin wrapper

**UI Primitives / shadcn (14 files):**
- `ui/button.tsx` -- cva variants, uses CSS variables for shadcn tokens
- `ui/input.tsx`, `ui/label.tsx`, `ui/card.tsx`, `ui/tooltip.tsx`
- `ui/sheet.tsx`, `ui/badge.tsx`, `ui/select.tsx`, `ui/dialog.tsx`
- `ui/popover.tsx`, `ui/switch.tsx`, `ui/alert-dialog.tsx`, `ui/sonner.tsx`
- These all reference `hsl(var(--*))` CSS variables

**Custom UI (4 files):**
- `ui/KPICard.tsx` (104 lines) -- Recharts sparkline, countUp, delta badge
- `ui/SkeletonCard.tsx` (29 lines) -- shimmer loading placeholder
- `ui/StrategyBadge.tsx` (28 lines) -- hardcoded hex bg/text per strategy
- `ui/ConceptTooltip.tsx` -- educational tooltip
- `ui/RiskGauge.tsx` -- SVG gauge

**Landing Page (16 files, ~2,563 lines):**
- `landing/hero.tsx` (151), `landing/features-bento.tsx` (259), `landing/pricing.tsx` (183)
- `landing/demo-card.tsx` (159), `landing/comparison-table.tsx` (156), `landing/how-it-works.tsx` (175)
- `landing/testimonials.tsx` (348), `landing/deal-calculator.tsx` (444), `landing/footer.tsx` (128)
- `landing/final-cta.tsx` (61), `landing/ticker.tsx` (35), `landing/navbar.tsx` (72)
- `landing/stats-strip.tsx` (110), `landing/ParallaxBackground.tsx` (282)
- `landing/avatar-stack.tsx`, `landing/scroll-progress.tsx`, `landing/cursor-spotlight.tsx`
- `landing/skip-to-content.tsx`, `landing/lenis-provider.tsx`, `landing/trust-badges.tsx`

**Charts (2 files):**
- `charts/CashFlowProjection.tsx` (390 lines) -- Recharts AreaChart, hardcoded colors
- `charts/ComparisonRadar.tsx` (314 lines) -- Recharts RadarChart, hardcoded colors

**Pipeline (6 files):**
- `pipeline/kanban-column.tsx`, `pipeline/deal-card.tsx`, `pipeline/mobile-pipeline.tsx`
- `pipeline/column-skeleton.tsx`, `pipeline/pipeline-empty.tsx`, `pipeline/pipeline-error.tsx`

**Deals (6 files):**
- `deals/deal-card.tsx`, `deals/deal-grid.tsx`, `deals/filter-bar.tsx`
- `deals/compare-bar.tsx`, `deals/preset-chips.tsx`, `deals/constants.ts`

**Documents (3 files):**
- `documents/document-list.tsx`, `documents/document-detail.tsx`, `documents/upload-zone.tsx`
- `documents/processing-steps.tsx`

**Standalone Components:**
- `command-palette.tsx` (342 lines) -- cmdk + Framer Motion
- `error-boundary.tsx` (128 lines) -- ErrorBoundary + PageErrorBoundary
- `edit-portfolio-modal.tsx`, `offer-letter-modal.tsx`, `close-deal-modal.tsx`

### Library / Utility Files (8 files)

- `lib/utils.ts` -- `cn()` (clsx + tailwind-merge), `timeAgo()`
- `lib/motion.ts` (154 lines) -- DURATION, EASING, SPRING, variants, useShake
- `lib/api.ts` -- fetch wrapper, auth refresh logic
- `lib/chat-stream.ts` -- SSE streaming for AI chat
- `lib/format.ts` -- formatCurrency, formatPercent, formatLabel
- `lib/strategy-kpis.ts` -- KPI definitions per strategy
- `lib/schemas.ts` -- Zod form schemas
- `lib/pdf-report.ts` (577 lines) -- jsPDF branded report generation

### Hooks (7 files) and Stores (1 file)

- `hooks/useAuth.ts`, `hooks/useDeals.ts`, `hooks/useDashboard.ts`
- `hooks/usePortfolio.ts`, `hooks/useCountUp.ts`, `hooks/useDebouncedValue.ts`
- `hooks/useKanbanKeyboard.ts`
- `stores/authStore.ts` (Zustand)

---

## 2. Current Tailwind Config Analysis

### Color System (tailwind.config.js)

**Two parallel token systems exist:**

1. **App-specific semantic tokens** (direct hex, used ~727 times across 60 files):
   - Backgrounds: `app-bg` (#08080F), `app-surface` (#0F0F1A), `app-elevated` (#16162A), `app-overlay` (#1C1C30)
   - Borders: `border-subtle` (#1A1A2E), `border-default` (#252540), `border-strong` (#303055)
   - Accent: `accent-primary` (#6366F1), `accent-hover` (#4F46E5), `accent-secondary` (#8B5CF6), + success/warning/danger/info
   - Text: `text-primary` (#F1F5F9), `text-secondary` (#94A3B8), `text-muted` (#475569), `text-disabled` (#334155)
   - Strategy badges: 5 strategy-specific bg/text color pairs

2. **shadcn/ui CSS variable tokens** (HSL-based, used by shadcn primitives):
   - `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`
   - `--destructive`, `--border`, `--input`, `--ring`, `--radius`
   - Defined in `index.css` `:root` block

**Hardcoded hex colors** appear ~209 times across 28 files, concentrated in:
- `ChatPage.tsx` (34 occurrences) -- markdown component styles
- `ShareDealPage.tsx` (35 occurrences) -- public page, standalone styles
- `PortfolioPage.tsx` (42 occurrences) -- chart colors
- `pipeline/deal-card.tsx` (13 occurrences)
- `close-deal-modal.tsx` (13 occurrences)

### Font Setup

- **Satoshi** (variable weight 300-900): Self-hosted via `@font-face` in index.css, preloaded in index.html
- **JetBrains Mono** (400/500/600): Loaded via Google Fonts `<link>` in index.html
- Tailwind config maps: `font-sans` -> Satoshi, `font-mono` -> JetBrains Mono
- Financial data uses `.financial` / `[data-financial]` CSS class + `font-mono` Tailwind utility
- `font-mono` referenced ~149 times across 40 files

### Custom Animations

- Keyframes in both `index.css` and `tailwind.config.js` (drift1-3, shimmer, blink, glow-breathe, pipeline-slide, accordion, ticker, typing)
- `prefers-reduced-motion` media query disables blob/ticker/shimmer in CSS
- Framer Motion animation system in `lib/motion.ts` (DURATION, EASING, SPRING, variants)

---

## 3. Shared vs Page-Specific Components

### Shared (used by 3+ pages)

| Component | Used By |
|-----------|---------|
| `AppShell` | 11 protected pages |
| `KPICard` | Dashboard, ResultsPage, PortfolioPage |
| `SkeletonCard` | Dashboard, MyDeals, Pipeline, Settings, Portfolio, Documents, App.tsx |
| `StrategyBadge` | Dashboard, ResultsPage, Pipeline, Portfolio, MyDeals, Compare |
| `Button` (shadcn) | ErrorBoundary, ResultsPage, Settings, auth pages |
| `AlertDialog` | Pipeline, MyDeals, ResultsPage |
| `PageHeader` / `PageContent` | Pipeline (likely others) |
| `cn()` utility | Every component |

### Page-Specific

| Component | Sole User |
|-----------|-----------|
| All `landing/*` (16 files) | Landing.tsx only |
| `pipeline/*` (6 files) | Pipeline.tsx only |
| `deals/*` (6 files) | MyDeals.tsx only |
| `documents/*` (4 files) | DocumentsPage.tsx only |
| `charts/CashFlowProjection` | ResultsPage only |
| `charts/ComparisonRadar` | ComparePage only |
| `command-palette.tsx` | AppShell only |
| `close-deal-modal.tsx` | Pipeline only |
| `offer-letter-modal.tsx` | ResultsPage only |
| `edit-portfolio-modal.tsx` | PortfolioPage only |

---

## 4. Migration Strategy Analysis

### Option A: Big Bang (NOT recommended)

Update all tokens, colors, and components at once in a single branch.

- **Pro:** Clean single-cut; no coexistence of old + new tokens
- **Con:** Massive diff (~7,750 lines of pages + ~4,500 lines of components). Extremely high visual regression risk. Untestable until completely finished. Blocks all other work.
- **Verdict:** Too risky for a production app with this many pages

### Option B: Incremental Page-by-Page (NOT recommended alone)

Migrate one page at a time, mixing old and new tokens.

- **Pro:** Smaller PRs, testable in isolation
- **Con:** Requires both old and new token values to coexist in Tailwind config. Results in divergent visual states. Users see inconsistency between pages during migration.
- **Verdict:** Workable but creates UX whiplash

### Option C: Design Tokens First, Then Propagate (RECOMMENDED)

**Phase 1 -- Token Layer:** Update CSS variables + Tailwind config first. Because all colors flow through semantic tokens (`app-bg`, `text-primary`, `accent-primary`, etc.), changing their hex values in one place propagates everywhere simultaneously.

**Phase 2 -- Structural Changes:** After tokens are swapped, address component-level layout/spacing/typography changes page-by-page.

**Phase 3 -- Hardcoded Cleanup:** Replace the ~209 hardcoded hex values with token references.

- **Pro:** Smallest initial diff (2 files: `index.css` + `tailwind.config.js`). Instant global color change. Low regression risk because layout/spacing stays the same. Pages can be structurally updated incrementally afterward.
- **Con:** Only covers color changes in Phase 1; structural changes still need per-page work.
- **Verdict:** Best risk/reward ratio. 90% of visual change achieved in the first PR.

---

## 5. Tailwind Config Changes for New Design System

### What to change in `tailwind.config.js`

```
1. Update hex values for all app-* tokens (backgrounds, borders)
2. Update hex values for accent-* tokens (primary, hover, secondary)
3. Update hex values for text-* tokens (primary, secondary, muted)
4. Update strategy badge color pairs if redesign changes them
5. Update shadcn CSS variable values in index.css to match
6. Add any new semantic tokens the redesign introduces
7. Update --radius if border radius changes
8. Update fontFamily if body/heading fonts change
9. Add new fontSize entries if type scale changes
```

### What NOT to change

- The token NAME structure (`app-bg`, `text-primary`, etc.) should remain the same. Only VALUES change. This means zero class name changes across 727 utility usages.
- shadcn/ui HSL variable names remain the same; only `:root` values update.
- `font-mono` for financial numbers is non-negotiable per project rules.

---

## 6. CSS Variable Strategy for Theming

### Current Architecture

```
index.css :root {
  --background: 240 50% 4%;     (HSL components, no hsl() wrapper)
  --primary: 239 84% 67%;
  ...
}

tailwind.config.js {
  colors: {
    background: 'hsl(var(--background))',   // shadcn tokens
    'app-bg': '#08080F',                     // app tokens (direct hex)
  }
}
```

### Recommended Change

Convert app-specific tokens from direct hex to CSS variables too, enabling runtime theme switching if ever needed:

```css
:root {
  /* Existing shadcn tokens -- update values */
  --background: 240 50% 4%;

  /* New: app-level tokens as CSS vars */
  --app-bg: #08080F;
  --app-surface: #0F0F1A;
  --app-elevated: #16162A;
  --accent-primary: #6366F1;
  --text-primary: #F1F5F9;
  /* ... etc ... */
}
```

Then in tailwind.config.js, reference them:
```js
'app-bg': 'var(--app-bg)',
'app-surface': 'var(--app-surface)',
```

**Benefit:** Future redesigns only touch CSS variables. No Tailwind config changes. Also enables potential light mode in the future with a single class toggle.

**Risk:** Low. `var()` syntax works everywhere Tailwind outputs color values. Only exception: hardcoded hex in `style={}` JSX attributes (StrategyBadge, charts) -- those need manual updates regardless.

---

## 7. Font Loading Setup for Vite

### Current Setup (Working Well)

- **Satoshi:** Self-hosted `.woff2` in `/public/fonts/`, `@font-face` in index.css, `<link rel="preload">` in index.html. This is optimal.
- **JetBrains Mono:** Loaded from Google Fonts via `<link>` tag in index.html with `display=swap`.

### If Fonts Change in Redesign

1. **New body font:** Place variable `.woff2` files in `public/fonts/`. Add `@font-face` in index.css with `font-display: swap`. Add `<link rel="preload">` in index.html. Update `fontFamily.sans` in tailwind.config.js.
2. **New mono font:** Either self-host or update Google Fonts URL. Update `fontFamily.mono` in tailwind.config.js.
3. **Remove old fonts:** Delete unused files from `public/fonts/`, remove old `@font-face` rules, remove old preload links.

Files to touch: `index.html`, `index.css`, `tailwind.config.js`, and `public/fonts/` directory.

---

## 8. Testing During Migration: Visual Regression Risk

### Risk Assessment

| Risk Level | Area | Reason |
|------------|------|--------|
| LOW | Token-only color swap | Changes propagate through Tailwind classes automatically |
| LOW | shadcn primitives | All reference CSS variables; variable updates propagate |
| MEDIUM | Hardcoded hex values | 209 occurrences in 28 files need manual find-and-replace |
| MEDIUM | Recharts components | Colors passed as props/config objects, not Tailwind classes |
| MEDIUM | `style={{}}` JSX | StrategyBadge, pipeline deal cards, activity icons use inline styles |
| HIGH | Landing page | 16 components with custom animations, gradients, glows |
| HIGH | ChatPage markdown | 34 hardcoded hex values in markdown component map |
| HIGH | PDF report | 577 lines with hardcoded hex colors for jsPDF output |

### Testing Strategy

1. **Before migration:** Screenshot every page in current state (or use Chromatic/Percy snapshot)
2. **After Phase 1 (token swap):** Compare screenshots. Expect ~85% of the visual change to land correctly. Flag files with hardcoded hex for Phase 3.
3. **After Phase 3 (hardcoded cleanup):** Final screenshot comparison.
4. **Manual QA checklist:**
   - All 5 strategy badge colors render correctly
   - Charts (Recharts) use new palette
   - Chat markdown renders with correct text/code colors
   - PDF export uses new brand colors
   - Skeleton shimmer animation uses new accent tint
   - Blob animations on landing page use new palette

---

## 9. Estimated Effort Per Page (Ranked by Complexity)

Assumes Phase 1 token swap is already done; this is the per-page structural/hardcoded cleanup effort.

| Rank | Page | Est. Hours | Reason |
|------|------|-----------|--------|
| 1 | AnalyzerFormPage | 4-6h | 1,302 lines, 5 strategy forms, 40 font-mono refs, 105 token usages |
| 2 | PortfolioPage | 3-5h | 747 lines, 42 hardcoded hex, 3 Recharts chart types, 14 font-mono |
| 3 | ResultsPage | 3-4h | 605 lines, KPIs + charts + actions + PDF trigger |
| 4 | Landing (all sections) | 3-5h | 16 sub-components totaling ~2,563 lines, gradients, animations |
| 5 | ChatPage | 2-3h | 395 lines, 34 hardcoded hex in markdown components |
| 6 | Pipeline | 2-3h | 416 lines + 6 sub-components, drag overlay has hardcoded styles |
| 7 | Dashboard | 1-2h | 432 lines, mostly uses tokens already |
| 8 | MyDeals | 1-2h | 432 lines + 6 sub-components, well-tokenized |
| 9 | ComparePage | 1-2h | 374 lines, ComparisonRadar has hardcoded chart colors |
| 10 | ShareDealPage | 1-2h | 362 lines, 35 hardcoded hex (standalone public page) |
| 11 | SettingsPage | 1h | 322 lines, mostly form inputs, 6 hardcoded hex |
| 12 | DocumentsPage | 1h | 151 lines + 3 sub-components, well-structured |
| 13 | Auth pages (4) | 1-2h total | Login(116) + Register(195) + Forgot(175) + Reset(276), similar structure |
| 14 | AppShell | 1h | 291 lines, sidebar/topbar tokens |
| 15 | StrategySelectPage | 0.5h | 93 lines, simple cards |
| 16 | NotFound | 0.25h | 34 lines |

**Total estimated effort for Phase 2+3:** 22-38 hours

---

## 10. Recommended Migration Order

### Phase 1: Token Swap (2-3 hours)

Touch only these files:
1. `frontend/src/index.css` -- update `:root` CSS variable values
2. `frontend/tailwind.config.js` -- update hex values for app-*/accent-*/text-*/border-* tokens
3. `frontend/index.html` -- update font links if fonts change
4. Add new font files to `public/fonts/` if applicable

This single change visually updates **60 files / 727 token usages** instantly.

### Phase 2: Core Shell + Shared Components (3-4 hours)

Migrate in this order (high leverage, seen on every page):
1. `AppShell.tsx` -- sidebar, topbar, mobile drawer
2. `KPICard.tsx`, `SkeletonCard.tsx`, `StrategyBadge.tsx` -- used on 3-6 pages each
3. `command-palette.tsx` -- global search overlay
4. `error-boundary.tsx` -- error states
5. shadcn primitives (`button.tsx`, `input.tsx`, etc.) -- already reference CSS vars, may need no changes

### Phase 3: High-Traffic App Pages (6-10 hours)

1. **Dashboard** -- first page users see after login
2. **Pipeline** -- second most-used page (Kanban board)
3. **MyDeals** -- deal list with filters
4. **ResultsPage** -- deal analysis output

### Phase 4: Remaining App Pages (5-8 hours)

5. **AnalyzerFormPage** -- largest file, but mostly form layout
6. **PortfolioPage** -- heavy chart usage, many hardcoded colors
7. **ChatPage** -- markdown component hardcoded colors
8. **ComparePage** -- radar chart colors
9. **SettingsPage**, **DocumentsPage**, **StrategySelectPage**

### Phase 5: Public Pages (3-5 hours)

10. **Landing page** (16 sub-components) -- separate visual identity possible
11. **Auth pages** (Login, Register, ForgotPassword, ResetPassword)
12. **ShareDealPage** -- public deal sharing, standalone
13. **NotFound** -- trivial

### Phase 6: Non-UI Files (1-2 hours)

14. `lib/pdf-report.ts` -- 577 lines with hex colors for jsPDF canvas
15. Chart components (`CashFlowProjection.tsx`, `ComparisonRadar.tsx`) -- Recharts color props

---

## 11. Rollback Strategy

### Option A: CSS Variable Override (Recommended)

Since the recommendation is to move all tokens to CSS variables, rollback is a single CSS swap:

```css
/* new-theme.css */
:root { --app-bg: #NEW_VALUE; ... }

/* To rollback, just revert index.css :root values */
:root { --app-bg: #08080F; ... }
```

Git revert of the token-swap commit instantly restores the old theme across all pages.

### Option B: Feature Flag with Class Toggle

Add a `data-theme="v2"` attribute on `<html>` and scope new variables:

```css
:root { --app-bg: #08080F; }                /* old */
[data-theme="v2"] { --app-bg: #NEW_VALUE; } /* new */
```

Toggle via a feature flag in the auth store or env variable. This allows A/B testing the redesign with real users before committing.

**Cost:** Minimal. Only requires the CSS variable migration in Phase 1 plus one conditional class on `<html>`.

### Option C: Git Branch (Simplest)

Keep the redesign on a branch. Merge when ready. Revert the merge commit if issues arise.

---

## RECOMMENDATIONS FOR PARCEL

1. **Migrate to CSS-variable-based tokens first.** Convert the 4 background tokens, 7 accent tokens, 4 text tokens, and 3 border tokens from hardcoded hex in `tailwind.config.js` to `var(--token)` references. This is a one-time ~50 line change across 2 files that unlocks instant global theme control.

2. **Do NOT attempt a big-bang rewrite.** The codebase has 7,750 lines of pages and 4,500 lines of components with 727 semantic token usages and 209 hardcoded hex values. A single-PR rewrite is too risky and too large to review meaningfully.

3. **Start with the token layer, then update shared components, then pages.** Phase 1 (tokens) gives you 85% of the visual change in 2-3 hours. Phases 2-4 (shared components + app pages) clean up the remaining 15% over 14-22 hours. This is interruptible -- you can ship Phase 1 alone and iterate.

4. **Prioritize the hardcoded hex hotspots.** The five worst offenders are: `PortfolioPage.tsx` (42 occurrences), `ShareDealPage.tsx` (35), `ChatPage.tsx` (34), `close-deal-modal.tsx` (13), and `pipeline/deal-card.tsx` (13). Extract these to tokens during Phase 3.

5. **Treat the landing page as a separate migration track.** Its 16 components (2,563 lines) have their own visual language with parallax, blobs, gradients, and ticker animations. It may deliberately keep a different palette from the app. Migrate it last or independently.

6. **Do not forget `lib/pdf-report.ts`.** Its 577 lines of jsPDF code use hardcoded hex colors for the branded PDF output. This file is invisible in the UI but ships customer-facing artifacts. Schedule it as a deliberate task, not an afterthought.

7. **Consider the feature-flag approach for the theme.** Adding `[data-theme="v2"]` scoped CSS variables costs almost nothing and enables safe rollback, A/B testing, and gradual rollout. It is the single highest-leverage defensive measure.

8. **Preserve `font-mono` for financial data.** The 149 usages of `font-mono` / JetBrains Mono across 40 files are a core design principle. Any redesign should keep tabular numeric rendering for financial figures. If the mono font changes, update `fontFamily.mono` in tailwind.config.js -- it propagates to all 149 usages automatically.
