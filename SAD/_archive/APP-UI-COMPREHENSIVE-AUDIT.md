# APP UI COMPREHENSIVE AUDIT — 2026-04-12

> 18 parallel audit agents. 100+ files read. Every page and component scored.
> Scope: All in-app pages and components (NOT landing page).
> Landing page baseline: 38/40 (from FINAL-LANDING-AUDIT.md).

---

## 1. Executive Summary

### Overall App Health Score: 28.2 / 40 (Adequate)

| Metric | Value |
|--------|-------|
| Landing page score | 38/40 (Excellent) |
| **App average score** | **28.2/40 (Adequate)** |
| Gap | **-9.8 points (26% lower)** |
| Design consistency | 6.5/10 |
| Typography compliance | 84.6% (100 violations across 37 files) |
| Hardcoded colors | ~890 instances across 69 files |
| Accessibility issues | 46 total (5 P0, 18 P1, 14 P2, 9 P3) |
| Focus state coverage | ~35% of interactive elements |

### Biggest Wins
1. **Zero Inter font leakage** — clean across all 214 non-landing files
2. **No banned anti-patterns in most code** — no gradient text, no bounce easing
3. **Excellent Pipeline kanban a11y** — custom keyboard hook, ARIA roles, stage announcements
4. **Chat panel a11y** — proper `aria-live`, streaming support, citation badges
5. **Skip navigation implemented** — sr-only/focus:not-sr-only in AppShell with route-change focus management
6. **Chart theme system is well-architected** — dual-theme getters exist, just underused
7. **Design system foundation is excellent** — tokens, motion library, utility classes all defined

### Biggest Problems
1. **Button component renders `rounded-lg` not `rounded-full`** — every CTA in the app has wrong shape (P0, cascades everywhere)
2. **~890 hardcoded colors** — blocks light theme, bypasses design system (P0)
3. **62 inline `fontFamily: 'Satoshi'`** instead of `font-brand` class — fragile, wrong fallback stack (P1)
4. **Wrong financial colors everywhere** — #4ADE80/#F87171 (neon Tailwind) instead of #7CCBA5/#D4766A (muted system) in 15+ files (P1)
5. **3 custom modals with no focus trap** — ContactModal, AddInstrumentModal, LimitReachedModal (P0 a11y)
6. **Zero `aria-describedby` on form errors** — screen readers can't hear validation (P0 a11y)
7. **`focus-ring` utility unused in app** — defined in CSS, applied on landing, but ~65% of in-app interactive elements lack focus styles (P1 a11y)
8. **Page titles use `font-semibold` not Satoshi 300** — the signature brand voice changes on entering the app (P1)
9. **No card hover lift** — landing cards animate with `y: -4`, app cards are static rectangles (P1)
10. **Clerk auth pages render in non-system fonts** — no `@clerk/themes` dark baseTheme installed (P1)

---

## 2. Page-by-Page Scores

| Page/Group | Typo | Color | Layout | Visual | Motion | A11y | Writing | **Total** | **/40** |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard + Today | 4 | 3 | 5 | 3 | 3 | 2 | 5 | **25** | 62% |
| Analysis Input | 4 | 4 | 5 | 4 | 4 | 3 | 5 | **29** | 72% |
| Analysis Results | 4 | 4 | 5 | 4 | 4 | 3 | 5 | **29** | 72% |
| Pipeline + Deals | 4 | 4 | 5 | 4.5 | 4.5 | 3.5 | 4 | **29.5** | 74% |
| Portfolio + Financing | 4 | 4 | 5 | 4 | 4 | 3 | 5 | **29** | 72% |
| CRM (Contacts/Buyers/Skip) | 4 | 5 | 5 | 4 | 2 | 2 | 5 | **27** | 68% |
| Communications (Mail/Seq) | 4 | 4 | 5 | 4 | 4 | 2 | 4 | **27** | 68% |
| Documents + Reports | 5 | 4 | 5 | 5 | 4 | 3 | 5 | **31** | 78% |
| Settings + Billing | 3 | 4 | 5 | 4 | 4 | 3 | 4 | **27** | 68% |
| App Shell + Navigation | 4 | 4 | 5 | 4 | 3 | 3 | 5 | **28** | 70% |
| Shared UI Components | 4 | 5 | 5 | 5 | 4 | 4 | 3 | **30** | 75% |
| Charts + Data Viz | 5 | 4 | 5 | 5 | 4 | 3 | 4 | **30** | 75% |
| Auth + Onboarding | 3 | 5 | 5 | 3 | 4 | 3 | 4 | **27** | 68% |
| Misc Pages | 4 | 4 | 5 | 4 | 4 | 3 | 4 | **28** | 70% |

### Dimension Averages (across all pages)

| Dimension | Average | Max | % |
|-----------|---------|-----|---|
| Typography | 4.0 | 6 | 67% |
| Color | 4.1 | 6 | 69% |
| Layout & Space | 5.0 | 6 | 83% |
| Visual Details | 4.1 | 6 | 69% |
| Motion | 3.7 | 5 | 74% |
| Interaction & A11y | 2.9 | 5 | 58% |
| UX Writing | 4.4 | 6 | 74% |

**Weakest dimension: Interaction & A11y (58%)** — the single biggest area for improvement.
**Strongest dimension: Layout & Space (83%)** — grid systems, spacing, and responsive design are solid.

---

## 3. Global Issues (Cross-Page)

### G1: Hardcoded Colors Block Light Theme (~890 instances, P0)

Every page uses raw hex values instead of CSS variable tokens. The most common offenders:

| Hardcoded | Count | Should Be |
|-----------|-------|-----------|
| `bg-[#141311]` | 150+ | `bg-app-recessed` |
| `border-[#1E1D1B]` | 120+ | `border-border-default` |
| `text-[#F0EDE8]` | 100+ | `text-text-primary` |
| `text-[#8A8580]` | 80+ | `text-text-muted` |
| `text-[#C5C0B8]` | 60+ | `text-text-secondary` |
| `bg-[#0C0B0A]` | 40+ | `bg-app-bg` |
| `text-white` on accent | 55+ | `text-accent-text-on-accent` |

**Worst files:** RehabDetailPage (~80), BuyerDetailPage (~70), TodayPage (~55), SharedPacketPage (~60), BatchSkipTracePage (~50).

**Note:** `#8A8580` and `#C5C0B8` are NOT in the token system at all. `#8A8580` falls between `--text-muted` (#7A7872) and `--text-secondary` (#A09D98). `#C5C0B8` falls between `--text-secondary` and `--text-primary`. These need mapping decisions.

### G2: Wrong Financial Colors (P1, 15+ files)

Tailwind defaults `#4ADE80` (green-400) and `#F87171` (red-400) used instead of the muted design system palette:

| Wrong | Correct | Token |
|-------|---------|-------|
| `#4ADE80` | `#7CCBA5` / `#6DBEA3` | `text-profit` / `text-success` |
| `#F87171` | `#D4766A` | `text-loss` / `text-error` |
| `#FBBF24` | `#D4A867` | `text-warning` |
| `#60A5FA` | `#7B9FCC` | `text-info` |

Files affected: KeyMetrics, ManualCalculator, NarrativeCard, FinancialInputs, StrategyComparison, AnalysisLoadingState, SensitivityMatrix, Dashboard, TodayPage, PortfolioPage, FinancingDashboardPage, ObligationsPage, DealSidePanel, CampaignAnalyticsPage, RehabsPage, RehabDetailPage, BatchSkipTracePage.

### G3: Inline `fontFamily` Instead of `font-brand` (P1, 62 instances)

Pattern: `style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}`
Should be: `className="font-brand font-light"`

The inline version uses a degraded fallback stack missing `Satoshi Fallback` (the metric override font that prevents layout shift). 37 files affected. A bulk find-and-replace fixes this.

### G4: Page Titles Missing Satoshi (P1, 10 pages)

These `<h1>` elements render in General Sans (body font) instead of Satoshi (brand font):
- MyDeals.tsx:183, PricingPage.tsx:254, ReportsListPage.tsx:144, ShareDealPage.tsx:222, SharedReportPage.tsx:297, NotFound.tsx:10, RehabDetailPage.tsx:167, StrategySelectPage.tsx:61, AnalyzerFormPage.tsx:1289, ResultsPage.tsx:400.

### G5: Banned Side-Stripe Borders (P1, 8 locations)

`border-l-[3px]` or `border-l-4` with colored left borders — explicitly banned in DESIGN.md:

| File | Line | Context |
|------|------|---------|
| AppShell.tsx | 210, 307 | Sidebar active nav indicator |
| BriefingCards.tsx | 37, 76 | Urgency cards |
| NarrativeCard.tsx | 91, 109 | AI narrative callout |
| AnalysisResultsPage.tsx | 327 | Strategy selector |
| StrategyComparison.tsx | 115 | Recommended row |
| ComparePage.tsx | 245 | Summary verdict |
| ShareDealPage.tsx | 234 | Primary KPI card |
| sonner.tsx | 45-48 | Toast notifications |

### G6: Missing Focus States (~65% of interactive elements, P1)

The `focus-ring` utility class exists in index.css but is not used anywhere in app code. The landing page applies it to ~18 elements. The app relies on ad-hoc `focus:border` or `focus:ring` patterns that are inconsistent.

### G7: No Reduced-Motion Support in App (P1)

`prefersReducedMotion` is exported from `motion.ts` but no page uses it. The `safePageVariants` and `safeCardVariants` exist but are not imported anywhere. The global CSS rule in index.css:537-544 handles CSS animations but NOT Framer Motion JS animations.

### G8: Button Component Wrong Shape (P0)

`button.tsx:25` renders `rounded-lg` (12px) instead of `rounded-full` (pill). Every primary button in the entire app inherits this. The design system specifies gradient pill CTAs. The landing page independently adds `rounded-full` to each CTA link, proving this is expected.

### G9: Modals Without Focus Traps (P0, 3 instances)

ContactModal.tsx, AddInstrumentModal.tsx, LimitReachedModal.tsx are raw `<div>` overlays with no `role="dialog"`, no `aria-modal`, no focus trapping, no Escape key handling. Tab key escapes into background content.

### G10: Form Labels Not Programmatically Associated (P0)

Zero forms use `htmlFor`/`id` pairing. Labels are visual-only `<label>` elements without programmatic association. Zero forms use `aria-describedby` for error messages. Screen reader users cannot navigate forms effectively.

---

## 4. Page-Specific Issues (P0/P1 only, grouped by page)

### Dashboard + Today (25/40)
- P0: BriefingCards buttons lack accessible names
- P0: TodayPage ActivityRow is non-interactive dead-end
- P1: Portfolio KPI numbers undersized at 16px (should be 32px Satoshi)
- P1: BriefingCards uses banned side-stripe borders
- P1: 30+ hardcoded hex colors
- P1: Financial colors use wrong green/red
- P1: Zero card hover interactions
- P1: No reduced-motion support
- P1: Missing focus rings on 5+ button groups

### Analysis Input (29/40)
- P0: PlaceAutocompleteInput has zero ARIA combobox attributes
- P0: No keyboard path to submit when Maps is active
- P1: Inline fontFamily on headings
- P1: Loading state green #4ADE80 (should be #6DBEA3)
- P1: Strategy cards missing hover lift

### Analysis Results (29/40)
- P1: Wrong financial colors in 7 of 12 sub-components
- P1: Missing aria-labels on icon-only buttons
- P1: Side-stripe borders in NarrativeCard, AnalysisResultsPage, StrategyComparison

### Pipeline + Deals (29.5/40)
- P1: DealSidePanel entirely hardcoded dark-only
- P1: DndContext missing screen reader announcements
- P1: MyDeals h1 uses General Sans instead of Satoshi

### Portfolio + Financing (29/40)
- P0: AddInstrumentModal has no focus trap
- P1: Banned side-stripe on portfolio hero card
- P1: Wrong financial colors across all 3 pages
- P1: Table sort headers missing aria-sort

### CRM (27/40)
- P0: ContactModal — no role="dialog", no focus trap, no Escape
- P1: All Satoshi references use inline style
- P1: No entrance animations on any CRM page
- P1: BuyerCard missing hover lift
- P1: Skip tracing grid not responsive

### Communications (27/40)
- P0: MatchResultsPage checkbox has zero keyboard a11y
- P0: CreatePacketModal has no focus trap
- P1: SharedPacketPage references non-existent gray scale values

### Documents + Reports (31/40)
- P0: DocRow missing aria-selected
- P1: SharedReportPage hardcoded dark bg on sticky header
- P1: ReportsListPage 7-column table breaks mobile
- P1: Action buttons lack aria-label

### Settings + Billing (27/40)
- P0: PricingPage has zero ARIA markup
- P0: LimitReachedModal has no focus trap
- P1: Zero font-brand usage across all settings pages
- P1: Gradient CTAs on mundane form submissions (profile save, password update)
- P1: PlanBadge applies violet to Titanium (should be Carbon only)
- P1: SMS section entirely hardcoded

### App Shell + Navigation (28/40)
- P1: Active sidebar uses banned side-stripe border
- P1: Command palette has no focus trap
- P1: No reduced-motion support in shell animations
- P1: All borders hardcoded #1E1D1B

### Auth + Onboarding (27/40)
- P0: Clerk renders in non-system fonts (no dark baseTheme)
- P1: Register heading uses font-semibold, not Satoshi 300
- P1: CTA buttons use rounded-lg not rounded-full
- P1: No focus rings on onboarding persona cards
- P1: Silent error on persona save failure

### Charts + Data Viz (30/40)
- P0: CompsCard uses 21 hardcoded dark-theme colors
- P1: RiskGauge text invisible in light theme
- P1: KPICard has no ARIA attributes
- P1: RiskGauge has no role="meter"

### Misc Pages (28/40)
- P0: ShareDealPage gradient CTAs (banned)
- P0: ShareDealPage side-stripe on KPI card (banned)
- P0: NotFound page gradient CTA (banned)
- P1: Properties/Transactions/Rehabs hardcode all colors
- P1: ShareDealPage h1 uses font-semibold

---

## 5. Gap Analysis: App vs Landing Page

**Design Consistency Score: 6.5 / 10**

> "The gap is not in the tokens — it is in how they are used."

| Dimension | Landing | App | Gap |
|-----------|---------|-----|-----|
| Typography weight | Satoshi 300 everywhere | font-semibold on headings | **Critical** |
| Card hover/interaction | whileHover y:-4, shadow | Static rectangles | **Critical** |
| Pricing page parity | Same tiers, different visual | font-bold prices, rounded-lg cards | **High** |
| Entrance animations | Every section fades in | Inconsistent — some pages, not others | Moderate |
| Accent discipline | 13 earned violet uses | Violet creep + wrong shade (violet-400) | Moderate |
| Token usage | 100% semantic tokens | ~890 hardcoded hex values | Moderate |
| Fluid typography | CSS clamp() on all headings | Fixed Tailwind breakpoints | Low |
| Scroll feel | Lenis smooth scroll | Native browser scroll | Low |

### What Users Feel

A visitor who falls in love with the featherlight Satoshi 300 headlines and responsive card surfaces on parceldesk.io will experience a **typographic weight shift** the moment they sign up. Page titles become heavy (semibold), cards become static, and the violet accent loses its restraint. The design system's "quiet confidence" becomes "functional dashboard."

The architectural foundation (tokens, motion library, CSS vars) is excellent — the gap is purely in application discipline.

---

## 6. Recommended Fix Order

### Phase 1: Cascade Fixes (Maximum impact, minimum files)

| # | Fix | Files | Impact |
|---|-----|-------|--------|
| 1 | **Button `rounded-full` + `hover:scale-[1.02]`** | button.tsx (1 file) | Every CTA in the app |
| 2 | **PageHeader `font-brand font-light`** | PageHeader.tsx (1 file) | Every page using PageHeader |
| 3 | **AppShell topbar h1 add `font-brand`** | AppShell.tsx (1 line) | Every page title |
| 4 | **Sonner toast remove side-stripe** | sonner.tsx (1 file) | Every toast notification |
| 5 | **Install @clerk/themes dark baseTheme** | ClerkProviderWrapper.tsx (1 file) | Login + Register pages |

### Phase 2: Global Find-and-Replace

| # | Fix | Scope | Tool |
|---|-----|-------|------|
| 6 | Replace inline `fontFamily: 'Satoshi'` with `font-brand font-light` | 62 instances, 37 files | sed/grep |
| 7 | Replace `#4ADE80` → `#7CCBA5`, `#F87171` → `#D4766A`, `#FBBF24` → `#D4A867` | ~60 instances, 15+ files | sed/grep |
| 8 | Replace `text-white` on accent buttons → `text-accent-text-on-accent` | ~55 instances | sed/grep |
| 9 | Replace `bg-[#141311]` ��� `bg-app-recessed`, `border-[#1E1D1B]` → `border-border-default` | ~270 instances | sed/grep |
| 10 | Replace `text-[#F0EDE8]` → `text-text-primary`, `text-[#8A8580]` → `text-text-muted` | ~180 instances | sed/grep |

### Phase 3: Accessibility Fundamentals

| # | Fix | Files |
|---|-----|-------|
| 11 | Migrate ContactModal, AddInstrumentModal, LimitReachedModal to Radix Dialog | 3 files |
| 12 | Add `htmlFor`/`id` pairing to all form labels | ~10 files |
| 13 | Add `aria-describedby` to form error messages | ~8 files |
| 14 | Add focus-ring to inline buttons/links across pages | ~20 files |
| 15 | Add `role="dialog" aria-modal="true"` to command palette | 1 file |

### Phase 4: Motion & Interaction Polish

| # | Fix | Files |
|---|-----|-------|
| 16 | Replace local animation variants with `safePageVariants`/`safeCardVariants` | ~15 files |
| 17 | Add `whileHover={{ y: -2 }}` to KPICard and major card surfaces | ~5 files |
| 18 | Add entrance stagger to pages missing it (CRM, AnalysisResults, Settings) | ~8 files |
| 19 | Replace banned side-stripe borders with background tints or dot indicators | 8 locations |

### Phase 5: Page-Specific Polish

| # | Fix | Files |
|---|-----|-------|
| 20 | Align PricingPage to landing: font-brand, rounded-xl, muted badge | PricingPage.tsx |
| 21 | Fix SharedPacketPage gray scale references | SharedPacketPage.tsx |
| 22 | Add ARIA to PlaceAutocompleteInput (combobox pattern) | PlaceAutocompleteInput.tsx |
| 23 | Add role="meter" to RiskGauge | RiskGauge.tsx |
| 24 | Migrate chart components from static to theme-aware getters | 3-4 chart files |

---

## 7. Quick Wins (< 5 lines each)

These are implemented in this audit session:

| # | Fix | File | Lines Changed |
|---|-----|------|---:|
| 1 | Button rounded-full + hover:scale | button.tsx | 3 |
| 2 | PageHeader font-brand font-light | PageHeader.tsx | 1 |
| 3 | AppShell topbar h1 font-brand | AppShell.tsx | 1 |
| 4 | CardTitle text-text-primary | card.tsx | 1 |
| 5 | CardDescription text-text-secondary | card.tsx | 1 |
| 6 | RiskGauge role="meter" + aria attrs | RiskGauge.tsx | 1 |
| 7 | AnimatedNumber tabular-nums default | AnimatedNumber.tsx | 1 |

---

## Appendix: Cross-Reference Tables

### A. Files by Violation Count (Top 20)

| File | Color | Typo | A11y | Visual | Total |
|------|-------|------|------|--------|-------|
| RehabDetailPage.tsx | 80 | 3 | 2 | 1 | 86 |
| BuyerDetailPage.tsx | 70 | 6 | 3 | 0 | 79 |
| SharedPacketPage.tsx | 60 | 2 | 1 | 0 | 63 |
| TodayPage.tsx | 55 | 3 | 3 | 1 | 62 |
| BatchSkipTracePage.tsx | 50 | 1 | 1 | 0 | 52 |
| SkipTracingPage.tsx | 45 | 1 | 1 | 0 | 47 |
| BuyersListPage.tsx | 40 | 1 | 1 | 0 | 42 |
| RehabsPage.tsx | 40 | 2 | 1 | 1 | 44 |
| AppShell.tsx | 12 | 2 | 3 | 2 | 19 |
| Dashboard.tsx | 30 | 4 | 5 | 2 | 41 |

### B. Token Mapping Reference

| Hardcoded | Token Class |
|-----------|-------------|
| `#0C0B0A` | `bg-app-bg` |
| `#131210` / `#141311` | `bg-app-recessed` |
| `#1A1916` / `#1A1918` | `bg-app-surface` |
| `#22211D` | `bg-app-elevated` |
| `#2A2924` | `bg-app-overlay` |
| `#1E1D1B` (border) | `border-border-default` |
| `#2A2826` (border) | `border-border-strong` |
| `#F0EDE8` (text) | `text-text-primary` |
| `#A09D98` (text) | `text-text-secondary` |
| `#8A8580` / `#7A7872` (text) | `text-text-muted` |
| `#C5C0B8` (text) | `text-text-secondary` (nearest) |
| `#5C5A56` (text) | `text-text-disabled` |
| `#4ADE80` (green) | `text-profit` / `text-success` |
| `#F87171` (red) | `text-loss` / `text-error` |
| `#FBBF24` (amber) | Use `warning` token |
| `#60A5FA` (blue) | Use `info` token |
| `text-white` on accent | `text-accent-text-on-accent` |

### C. Scoring Legend

| Score Range | Rating |
|-------------|--------|
| 36-40 | Excellent (ship-ready) |
| 30-35 | Good (minor polish) |
| 24-29 | Adequate (needs work) |
| 18-23 | Below Standard |
| <18 | Critical |
