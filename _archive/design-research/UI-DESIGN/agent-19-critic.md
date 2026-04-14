# Agent 19 -- Adversarial Design Review

Critical review of all 18 Parcel light-theme design documents. Every issue is specific, references exact agent numbers and sections, and is prioritized by severity.

---

## 1. INCONSISTENCIES

### 1a. Gray Scale Collision: Two Incompatible Gray Systems

**Severity: HIGH -- will cause bugs during implementation.**

Agent 01 defines a gray scale based on the Untitled UI palette (gray-50 = `#F9FAFB`, gray-200 = `#EAECF0`, gray-500 = `#667085`, etc.). Agent 18 (tailwind config) faithfully reproduces this in `colors.gray`.

However, Agent 04 (Dashboard), Agent 07 (Chat), Agent 08 (Documents), and Agent 09 (Portfolio) all use **Tailwind's built-in Slate scale** (`slate-50`, `slate-100`, `slate-200`, `text-slate-800`, `bg-slate-50/60`, etc.) instead of the custom gray tokens. Specific violations:

- Agent 04 references `#F8FAFC` as page background (line 1) -- this is **Slate-50**, NOT Gray-50 (`#F9FAFB`). A 1-hex difference.
- Agent 04 chart theme uses `#64748B` (Slate-500), `#CBD5E1` (Slate-300), `#F1F5F9` (Slate-100) -- none of these exist in Agent 01's gray scale.
- Agent 07 (Chat) uses `slate-200`, `slate-50/60`, `slate-800`, `slate-400`, `slate-100` throughout every message row and sidebar.
- Agent 08 (Documents) uses `slate-200/60`, `slate-300/80`, `slate-500`, `slate-900` throughout card and detail specs.
- Agent 09 (Portfolio) starts with `#F8FAFC` (Slate-50) and mixes `slate-*` classes with `gray-*` classes in the same component.

**Impact:** Developers will have two gray scales fighting. `text-gray-500` (`#667085`) and `text-slate-500` (`#64748B`) are subtly different hues. Cards will have inconsistent borders, backgrounds, and text colors depending on which agent's spec was followed. The Tailwind config in Agent 18 does NOT include a custom `slate` scale, so any `slate-*` usage falls through to Tailwind's default Slate, creating an undocumented parallel color system.

**Fix:** Search-and-replace all `slate-*` references in Agents 04, 07, 08, and 09 with the equivalent `gray-*` token from Agent 01. Pick one gray scale. The Untitled UI palette from Agent 01 is correct; kill Slate entirely.

### 1b. Page Background: `#F9FAFB` vs `#F8FAFC`

Agent 01 says `#F9FAFB` (gray-50). Agent 03 says `bg-gray-50` which resolves to `#F9FAFB`. Agent 04 says `#F8FAFC` in the opening line. Agent 08 says `#F8FAFC`. Agent 09 says `#F8FAFC`. Agent 12 says `#F9FAFB`.

`#F8FAFC` is Tailwind's default Slate-50. `#F9FAFB` is the custom Gray-50 from Agent 01. They are different colors. Three agents use the wrong one.

### 1c. Card Border Radius: Three Conflicting Values

- Agent 01 tokens: cards get `rounded-lg` = **12px**
- Agent 02 component library: cards get `rounded-lg` = 12px (consistent)
- Agent 04 dashboard KPI cards: `rounded-xl` = **16px**
- Agent 05 results page: form card `rounded-2xl` = **20px**, section cards `rounded-2xl`
- Agent 06 pipeline: deal cards `rounded-[10px]` = **10px**
- Agent 08 documents: cards `rounded-xl` = **16px**
- Agent 12 settings: cards `rounded-xl` = **16px**
- Agent 13 onboarding: modal `rounded-2xl` = **20px**

The token system says cards are 12px. Four agents use 16px. Two use 20px. Pipeline uses a bespoke 10px. This is not a design system -- it is five different opinions about card roundness.

**Fix:** Enforce Agent 01/02's `rounded-lg` (12px) for all standard cards. Allow `rounded-xl` (16px) for promotional/hero cards only. `rounded-2xl` (20px) is for landing page elements only -- never inside the app shell.

### 1d. Sidebar Width: 216px vs 240px

Agent 03 (App Shell) explicitly says sidebar is **240px** (`w-60`) and documents this as a deliberate change from the current 216px. Agent 04 (Dashboard) diagram says sidebar is **216px**. Agent 12 (Settings) says **216px**. Agent 15 (Responsive) says **216px** throughout the breakpoint table.

Three agents did not get the memo about the sidebar width change.

**Fix:** Global find-replace: 216px references must become 240px. Content area calculations in Agent 15 Section 1 (`1024 - 216 = 808px`) need updating to `1024 - 240 = 784px`.

### 1e. Button Primary Fill: `indigo-500` vs `indigo-600`

- Agent 01 tokens: `indigo-500` (`#6366F1`) is brand primary. `indigo-600` (`#4F46E5`) is for text and hover.
- Agent 02 component library: primary button fill is `bg-indigo-600` (not 500). Explicitly states 600 passes WCAG AA for white text.
- Agent 03 app shell: logo mark uses `bg-indigo-500`.
- Agent 05 results page: submit button uses `bg-indigo-600`.
- Agent 08 documents: upload button uses `bg-indigo-500`.
- Agent 10 pricing: toggle uses `bg-accent-primary` which resolves to `#6366F1` (500).
- Agent 13 onboarding: CTA button uses `bg-indigo-500`.

The component library says primary buttons are `indigo-600`. Three agents use `indigo-500` on their buttons. Since `#6366F1` on white text yields 3.95:1 contrast (fails WCAG AA), every `bg-indigo-500` button with white text is an accessibility violation.

### 1f. Font Family Naming: `font-display` vs `font-brand`

Agent 01 defines Satoshi as `font-display`. Agent 18 defines Satoshi as `font-brand`. These are different Tailwind class names. Any component referencing `font-display` will fail silently (no such class in Agent 18's config). Agent 01 and Agent 18 were written by different agents who did not coordinate.

### 1g. Shadow Scale: Cards at Rest

- Agent 01: "Cards use `border border-gray-200 shadow-xs` at rest, upgrading to `shadow-sm` on hover."
- Agent 02: default card variant uses `shadow-xs`. `elevated` uses `shadow-sm`.
- Agent 04 dashboard: KPI cards use `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]` -- a **custom shadow** that matches neither `shadow-xs` nor `shadow-sm` from the token system.
- Agent 09 portfolio: KPI cards use `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` -- yet another custom shadow.

Agent 04 and 09 both ignore the shadow token system and inline custom shadow values. This defeats the purpose of having a shadow scale.

### 1h. Shimmer Implementation: Two Approaches

- Agent 01 defines shimmer using `background-size: 200%` with `background-position` animation.
- Agent 06 pipeline defines shimmer using `transform: translateX()` animation on an absolutely positioned overlay div.
- Agent 02 component library defines shimmer using `background-position` animation (matches Agent 01).
- Agent 18 CSS uses `background-position` with `hsl(var(--muted))` (different gradient source than Agent 01).

Three different shimmer implementations exist across the specs. Pick one.

---

## 2. ACCESSIBILITY VIOLATIONS

### 2a. `#6366F1` (Indigo-500) on White Fails WCAG AA

Agent 01 explicitly acknowledges this: "The brand color `#6366F1` fails WCAG AA for normal text on white (3.95:1 -- needs 4.5:1)." Yet multiple agents use it as text or button fill color:

- Agent 03: logo mark `bg-indigo-500` with white "P" text
- Agent 08: upload button `bg-indigo-500` with white text
- Agent 10: active toggle `bg-accent-primary` (`#6366F1`) with white text
- Agent 13: CTA button `bg-indigo-500` with white text
- Agent 16: chart tooltip values in `font-mono text-sm font-semibold text-gray-900` is fine, but the legend uses Indigo-500 as a dot color (non-text, OK)

The logo mark issue (Agent 03) is marginal -- the "P" is large bold text on a 28px square, so effective contrast may pass for large text (3:1 threshold). But buttons in Agents 08, 10, and 13 with normal-size white text on `#6366F1` fail AA.

### 2b. Danger Color: `text-danger-600` vs `text-red-600`

Agent 02 defines a `danger` button variant using `bg-error-600`. Agent 03 (App Shell) uses `text-red-600` for the logout button. Agent 05 uses `text-red-600` for negative values. These reference different Tailwind tokens:
- `error-600` = `#DC2626` (from Agent 01 semantic scale)
- `red-600` = Tailwind's default Red-600 = `#DC2626` (happens to match)

They coincidentally resolve to the same hex, but the abstraction leak means if the error scale ever changes, the hardcoded `text-red-600` usages will not update. This is a maintainability issue, not an accessibility one, but it undermines the design system.

### 2c. Chat Message Backgrounds Have No Visible Boundary for Screen Readers

Agent 07 differentiates user and assistant messages by background color only (`bg-white` vs `bg-slate-50/60`). There is no structural indicator (border, icon position labeling) that screen readers can use to distinguish message origin. The `border-b border-slate-100` divider separates messages but does not convey role.

**Fix:** Each message row needs an `aria-label` like `"Your message"` or `"Parcel AI response"`.

### 2d. Insufficient Focus Indicators on Several Components

- Agent 06 pipeline: toolbar search input has `focus: ring-2 ring-indigo-500/30 border-indigo-300` -- the `ring-indigo-500/30` at 30% opacity may be invisible on white. Agent 02 specifies `ring-indigo-500/40` for inputs.
- Agent 08 documents: search input uses `focus:ring-2 focus:ring-indigo-500/20` -- 20% opacity ring is nearly invisible.
- Agent 12 settings: tab inactive state is `text-gray-400` (#98A2B3) which has 2.68:1 contrast on white -- fails WCAG AA for text (needs 4.5:1).

### 2e. Pipeline `role="grid"` Is Incorrect

Agent 06 uses `role="grid"` on the Kanban board and `role="listbox"` on columns. A grid implies a tabular data structure with rows and columns of cells. Kanban columns are lists, not grid cells. The correct ARIA pattern is `role="list"` on the board, `role="list"` on each column, and `role="listitem"` on each card. Or use the WAI-ARIA drag-and-drop pattern with `aria-grabbed`.

---

## 3. PERFORMANCE CONCERNS

### 3a. AnimatePresence on Every Route Change

Agent 03 wraps the entire `<main>` content in `<AnimatePresence mode="wait">` keyed on `pathname`. This means:
1. Every route change unmounts the old page, waits for the exit animation (150ms), then mounts the new page with enter animation (250ms).
2. Total transition overhead: 400ms of animation per navigation.
3. React Query cached data is preserved, but all component state (scroll position, form inputs, local state) is destroyed on unmount.
4. `mode="wait"` blocks the new page from rendering until the old one finishes exiting.

For a data-heavy app where users navigate frequently between Dashboard, Pipeline, and Deals, this 400ms tax per navigation adds up. Consider `mode="popLayout"` or removing exit animations entirely.

### 3b. Framer Motion on Every KPI Card, Every Risk Bar, Every Chart

Agent 05 stagger-animates 8-9 sections on the Results page with overlapping timings (arc animation 1s, count-up 800ms, risk bars 700ms each). Agent 14 specifies `staggerContainer(60)` on list items. Combined with Agent 03's page transition, the Results page has:
- 250ms page enter
- 60ms x 9 = 540ms stagger cascade
- 1000ms arc animation
- 800ms count-up on 4 KPIs
- 1200ms risk gauge
- 700ms per risk factor bar

Total animation budget: ~2.5 seconds of concurrent animations on a single page. On a mid-range phone, this will cause jank. Each `motion.div` creates a separate composite layer.

**Fix for v1:** Skip stagger animations on pages with more than 3 animated sections. Use CSS transitions for count-up effects instead of RAF-based JavaScript animation. Reserve Framer Motion for page enter/exit and modals only.

### 3c. Three Font Files = 250KB

Agent 01 budgets ~250KB for Inter + Satoshi + JetBrains Mono. But Agent 01 also demotes JetBrains Mono to "code/AI output only." If it only appears in chat messages and chart Y-axis ticks, loading 110KB of JetBrains Mono is a poor tradeoff.

**Fix:** Subset JetBrains Mono to digits, period, comma, dollar sign, percent, minus, and basic Latin. This reduces it from ~110KB to ~15KB. Or drop it entirely and use Inter monospace features + system monospace fallback.

### 3d. Recharts + Framer Motion on the Same Page

Agent 05 uses Recharts for the cash flow chart and Framer Motion for everything else on the Results page. Recharts manages its own animation system (SVG tweens). Having both animation systems running concurrently doubles the animation overhead. Agent 16 even specifies `isAnimationActive animationDuration={800}` on chart components.

**Fix:** Disable Recharts built-in animation (`isAnimationActive={false}`) on pages that already use Framer Motion stagger. Chart draws are fast enough to not need tweened entry.

---

## 4. OVER-ENGINEERING (Cut for v1)

### 4a. Dark Theme CSS Variables

Agent 01 and Agent 18 both define a complete `.dark` theme block with ~60 CSS variables. Agent 18 says "dark is preserved" and maintains all current hex values. This is 120+ lines of CSS for a feature that has no toggle UI and no ship date.

**Cut for v1.** Ship light only. Add dark mode when there is customer demand.

### 4b. Onboarding Checklist (Agent 13)

Agent 13 specifies a 5-step onboarding checklist with a custom `useOnboardingProgress` hook, celebration animation (confetti reference), completion percentages, and dismissal logic. This is 200+ lines of component code for a flow that benefits first-time users only.

**Defer.** Ship the WelcomeModal (simple, one-time), skip the persistent checklist. Add it when user activation data shows a drop-off problem.

### 4c. Sidebar Collapse Animation (Agent 03 Section 9)

Agent 03 specifies a full Framer Motion collapse animation for the sidebar (0px collapsed state, floating expand button, localStorage persistence). Then explicitly says "deferred" in the critical decisions. Remove the spec entirely -- it adds 40 lines of implementation-ready code that should not exist yet.

### 4d. Step Progress Component (Agent 02 Section 12c)

Agent 02 defines a multi-step progress indicator "for future onboarding, deal workflow." No current page uses it. Cut it.

### 4e. Pricing Page Comparison Table (Agent 10)

Agent 10 specifies a full feature comparison table with 20+ rows, expandable sections, check/X icons, and hover states. For a solo founder with two plans (Free and Pro), a comparison table is premature. The pricing cards themselves communicate the difference.

**Defer** until a third plan (Team) ships.

### 4f. Team Plan Badge (Agent 02)

Agent 02 defines a `team` badge variant (`bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300`). There is no Team plan. Remove it.

---

## 5. UNDER-ENGINEERING (Missing from designs)

### 5a. No Error State Design for Page-Level Failures

None of the 18 agents define what happens when an API call fails at the page level. Agent 02 has a table empty state ("No deals found") but nothing for:
- Network timeout on Dashboard load
- 500 error on Results page
- Rate limit on Chat

The QA report (memory) lists P2-7 through P2-12 as "error states + retry buttons" that were already implemented. But the design docs provide no visual spec for these. Developers will ad-hoc the error UI.

**Fix:** Add a standard `ErrorState` component to Agent 02 with icon, title, description, and retry button.

### 5b. No Loading State for Page Transitions

Agent 03 specifies AnimatePresence for route changes but does not define what happens if the target page's data has not loaded yet. Is it a skeleton? A blank animated div? The current code uses React Query `isLoading` checks with skeleton components, but the design docs do not specify the interplay between page transition animations and data loading states.

### 5c. No Design for the Landing Page Light Theme

Agents 01-18 cover the app shell, dashboard, analysis, pipeline, chat, documents, portfolio, pricing, billing, settings, onboarding, animations, responsive, charts, PDF, and config. **There is no landing page design spec.** The Landing.tsx is 700+ lines of dark-themed marketing page. Converting it to light theme is a significant effort with hero gradients, ticker, DemoCard, and pricing section -- all of which need new colors.

### 5d. No Login/Register Page Light Theme Spec

The auth pages (Login, Register, ForgotPassword, ResetPassword) have no design spec in any of the 18 documents. These are the first pages a new user sees.

### 5e. No Share Deal Page Design

The existing `ShareDealPage.tsx` (public, unauthenticated deal view page) has 35 hardcoded hex values and no light-theme spec.

### 5f. No Command Palette Light Theme Spec

Agent 03 references `<CommandPalette>` but provides no light-theme styling for it. The current implementation uses dark-theme colors.

---

## 6. MIGRATION RISK

### 6a. HIGHEST RISK: `fontSize` Replacement Breaks Every Page

Agent 18 puts `fontSize` at the **top level** of the Tailwind config (not inside `extend`), which REPLACES Tailwind's default type scale. This means:
- `text-base` changes from 16px to **13px** (a 19% size reduction)
- `text-sm` changes from 14px to **12px**
- `text-lg` changes from 18px to **16px**
- `text-xl` changes from 20px to **18px**

Every component in the codebase that uses `text-base`, `text-sm`, `text-lg`, or `text-xl` will silently shrink. On the landing page, this will make headings dramatically smaller. On forms, labels will shrink. This is a **global breaking change** that touches every single component.

Agent 18 acknowledges this in migration notes but underestimates the blast radius. The landing page alone uses `text-4xl`, `text-5xl`, `text-xl`, `text-lg`, and `text-base` extensively.

**Mitigation:** Use `extend.fontSize` instead of top-level `fontSize`. Add new tokens (`text-md`, `text-micro`, `text-kpi`) without removing defaults. Then migrate components one at a time to the new scale.

### 6b. HIGH RISK: Removing `class="dark"` from `<html>` Is All-or-Nothing

Agent 18 says to remove `class="dark"` from `<html>` when "ready to flip." But the 209 hardcoded hex values across 28 files (acknowledged in Agent 18 Section 9) mean the app will be a chimera: some elements use CSS variables (auto-themed), others use hardcoded dark-theme hex (broken on light). There is no incremental path.

**Mitigation:** Do NOT remove `class="dark"` until all hardcoded hex values are migrated to CSS variable tokens. Ship the CSS variable infrastructure first, then audit each file, then flip the switch.

### 6c. MEDIUM RISK: `borderRadius` Override Changes shadcn Components

Agent 18's `borderRadius` override makes `rounded-lg` = 12px (was `calc(var(--radius))` = 8px). Every shadcn Dialog, Popover, Sheet, and Select that uses `rounded-lg` will get rounder. The `rounded-md` change (from 6px to 8px) affects every Button and Input. These are subtle but noticeable visual changes across the entire component library.

### 6d. MEDIUM RISK: Agent 10 (Pricing) Uses Legacy Dark-Theme Tokens

Agent 10 references `text-accent-primary`, `bg-app-elevated`, `border-border-subtle`, `text-text-primary`, `text-text-secondary`, `bg-accent-primary/10`, `bg-accent-success/20`. These are the **old** CSS variable names from the current dark theme. Agent 18 preserves these names in the Tailwind config, but Agent 01 introduces a parallel `--color-*` namespace. Agent 10 was clearly written against the old token names and never updated for the new system.

### 6e. LOW RISK: JetBrains Mono Removal from Financial Numbers

Agent 01 demotes JetBrains Mono from financial numbers. The codebase has 149 `font-mono` usages across 40 files. Each needs auditing: keep for code/AI, remove for financial data. This is tedious but low-risk because it is a visual change, not a functional one.

---

## 7. MOBILE GAPS

### 7a. Chat Page Height: `100dvh` vs Viewport Units

Agent 07 uses `h-[100dvh]` for mobile chat height. Agent 15 also specifies `h-[100dvh]`. However, `dvh` (dynamic viewport height) is not supported on Safari < 15.4 or older Android WebViews. The existing codebase already uses `100dvh`, so this is not a new risk, but it is worth noting.

### 7b. No Design for Landscape Phone Orientation

Agent 15 covers portrait phone breakpoints extensively but never mentions landscape. An iPhone 15 Pro in landscape is 852x393px -- wider than `sm:` (640px) but extremely short (393px). The sidebar does NOT appear (below `md:768px`), but KPI grids go to 2-col, which may create a cramped layout at 393px height. The dashboard's 5 KPI cards + chart + two-column bottom will require significant scrolling.

### 7c. Pipeline Mobile: No Batch Operations

Agent 06 specifies single-card operations on mobile (context menu with "Move to...", "Close Deal", "Remove"). But there is no way to multi-select cards on mobile for batch stage changes. Desktop has no multi-select either, but the limitation is more painful on mobile where moving 5 cards one at a time through context menus is tedious.

### 7d. Sticky Bottom Bars Stack

Agent 05 (Results) has a fixed bottom action bar on mobile. Agent 15 also specifies sticky bottom bars for AnalyzerForm and Settings. If a user navigates from the form to results without the page fully unmounting (e.g., during a transition animation), two sticky bars could briefly overlap. Each uses `z-40`, so stacking order is undefined.

### 7e. Touch Target Violations Remain

Agent 15 identifies the hamburger button at 32px as a touch target violation. But Agent 03's implementation still uses `w-9 h-9` (36px) -- which is better but still below 44px. Agent 15 proposes `min-w-[44px] min-h-[44px]` as the fix, but Agent 03's final JSX does not incorporate this. The User Menu avatar is `w-8 h-8` (32px) in Agent 03's final code with no touch target fix.

---

## 8. CONVERSION CONCERNS

### 8a. Paywall Blur Is Too Aggressive

Agent 05 uses `blur-sm` (4px blur) on gated content, while Agent 06 uses `backdrop-blur-[6px]`, and Agent 11 uses `backdrop-blur-md` (12px). Three different blur levels for the same "locked content" concept. The `backdrop-blur-md` in Agent 11 is strong enough that the blurred content is unreadable, defeating the "see what you're missing" purpose.

**Fix:** Standardize on `blur-[6px]` (Agent 06's value) across all paywalls. Strong enough to indicate locked, weak enough to show the content shape.

### 8b. Trial Banner Could Fatigue Users

Agent 03 shows a trial banner in the sidebar footer for the entire trial period. When urgent (<=3 days), it switches to amber. There is no "dismiss" behavior -- it is permanently visible for 14 days. Trial banners that cannot be dismissed create resentment. The user already knows they are on a trial.

**Fix:** Allow dismissal with a 24-hour snooze. Re-show only when <= 3 days remain.

### 8c. Free Plan Has No Value Demonstration Path

Agent 05 gates PDF export, 3+ deal comparison, and offer letters behind Pro. But the free plan allows "5 analyses" and basic results. If a free user runs 5 analyses and sees full results each time without hitting a paywall, they may never feel the need to upgrade. The paywall appears only when they try to export or compare -- features they may not discover organically.

**Recommendation:** Show the AI Insights section as a skeleton/teaser on free plans (not full text), with a "Unlock AI Insights with Pro" prompt. This creates a visible value gap on the page users visit most (Results).

### 8d. Pricing Page Uses Dark Theme Tokens

As noted in 6d, Agent 10 (Pricing) was written against the old dark-theme token system (`text-accent-primary`, `bg-app-elevated`). If the light theme ships without updating the pricing page, it will render with broken/mismatched colors. The pricing page is the highest-intent conversion page -- having it visually broken is a direct revenue risk.

---

## 9. FONT CONFLICT

### 9a. Three Names for the Same Concept

| Agent | Body Font | Display Font | Tailwind Class for Display | Mono Usage |
|-------|-----------|--------------|---------------------------|------------|
| Agent 01 | Inter (`font-sans`) | Satoshi (`font-display`) | `font-display` | JetBrains Mono for code/AI only |
| Agent 02 | Inter | "Inter replaces JetBrains Mono for numbers" | -- | JetBrains Mono for code/AI |
| Agent 03 | Inter | -- | -- | `font-mono` on kbd badge |
| Agent 04 | Inter tabular-nums | -- | -- | -- |
| Agent 05 | Inter on inputs... | -- | -- | `font-mono` on KPI values, output table values |
| Agent 07 | Inter (implied via slate-*) | -- | -- | `font-mono` on code blocks, AI chat |
| Agent 16 | Inter for X-axis labels | -- | -- | JetBrains Mono for Y-axis values |
| Agent 18 | Inter (`font-sans`) | Satoshi (`font-brand`) | `font-brand` | JetBrains Mono (`font-mono`) |

**The conflict:** Agent 01 calls Satoshi's class `font-display`. Agent 18 calls it `font-brand`. They are both the Tailwind config source of truth, and they disagree. Any landing page code using `font-display` will silently fail with Agent 18's config.

### 9b. `font-mono` on Financial Numbers: Contradictory Guidance

Agent 01 (Critical Decision #4) says: "Financial numbers now render in Inter with `font-variant-numeric: tabular-nums lining-nums`." Agent 02 (Critical Decision #5) says the same. Agent 18 (Critical Decision #4) explicitly says: "`.financial` no longer switches to JetBrains Mono."

Yet Agent 05 Results page uses `font-mono` on KPI values, output table values, and cash flow table values. Agent 04 Dashboard KPI spec line 81 says `font-mono`. Agent 09 Portfolio uses `font-mono` on table cells. Agent 05 line 192 uses `font-mono` on currency input fields and line 704 uses `font-mono` on output values.

The design token agents (01, 02, 18) say Inter. The page-level agents (04, 05, 09) say JetBrains Mono. **This must be resolved before implementation or developers will get contradictory instructions.**

### 9c. Chart Axis Fonts: Inconsistent Between Agents

- Agent 04 Dashboard chart: X-axis uses `fontFamily: 'JetBrains Mono'` for all ticks (line 892).
- Agent 16 Recharts theme: X-axis uses `fontFamily: '"Inter", sans-serif'`, Y-axis uses `fontFamily: '"JetBrains Mono", monospace'`.

Agent 04 puts JetBrains Mono on the X-axis (month names like "Apr", "May" -- text, not numbers). Agent 16 correctly restricts JetBrains Mono to the Y-axis (financial values). Agent 04 is wrong.

---

## 10. FINAL RECOMMENDATION

### Migration Order (5 Phases)

**Phase 0: Foundation (Day 1, ~4 hours)**
1. Install `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono`
2. Deploy Agent 18's `index.css` with CSS variables (KEEP `class="dark"` on `<html>`)
3. Deploy Agent 18's `tailwind.config.ts` but use `extend.fontSize` (NOT top-level replacement) to avoid breaking every page
4. Add `font-brand` class for Satoshi
5. Add font imports to `main.tsx`

**Phase 1: App Shell + Navigation (Day 2-3, ~8 hours)**
1. Agent 03: AppShell, Sidebar (240px), Topbar, UserMenu, MobileSidebar
2. Fix all touch targets during this pass
3. Fix `font-display` -> `font-brand` discrepancy
4. Update command palette to light theme

**Phase 2: Core Pages (Day 4-8, ~20 hours)**
1. Agent 04: Dashboard (fix slate -> gray, fix card radius, fix shadows)
2. Agent 05: Deal Analysis form + Results page
3. Agent 06: Pipeline (already the most detailed and consistent spec)
4. Agent 09: Portfolio (fix slate -> gray)
5. Agent 12: Settings

**Phase 3: Secondary Pages (Day 9-11, ~12 hours)**
1. Agent 07: Chat (fix slate -> gray throughout)
2. Agent 08: Documents (fix slate -> gray, fix page bg)
3. Agent 16: Recharts theme (apply to all chart components)
4. Agent 17: PDF report colors
5. Auth pages (Login, Register, ForgotPassword -- no spec exists, follow Agent 02 patterns)

**Phase 4: Marketing + Billing (Day 12-14, ~10 hours)**
1. Landing page light theme (NO SPEC EXISTS -- write one or convert manually)
2. Agent 10: Pricing page (must rewrite from dark tokens to light)
3. Agent 11: Billing components
4. Agent 13: Onboarding (WelcomeModal only -- defer checklist)
5. ShareDealPage

**Phase 5: Flip the Switch (Day 15, ~2 hours)**
1. Remove `class="dark"` from `<html>`
2. Audit all remaining hardcoded hex values
3. Run full visual regression across all routes

### What to Cut for v1

| Item | Agent | Reason | Effort Saved |
|------|-------|--------|-------------|
| Dark theme `.dark` CSS block | 01, 18 | No toggle UI, no customer demand | 2 hours maintenance |
| Onboarding checklist | 13 | Ship WelcomeModal only | 6 hours |
| Sidebar collapse animation | 03 | Explicitly deferred | 3 hours |
| Step progress component | 02 | No current usage | 1 hour |
| Pricing comparison table | 10 | Two plans only | 4 hours |
| Team badge variant | 02 | No Team plan | 30 min |
| Custom sidebar collapse toggle | 03 | Future enhancement | 2 hours |
| `slideRight` variant | 14 | No current usage | 30 min |

### What to Defer

| Item | Defer Until | Reason |
|------|------------|--------|
| Per-stage risk thresholds (Pipeline) | User feedback | Flat 14d/30d thresholds are good enough for v1 |
| Filter state in URL params (Pipeline) | Post-launch | State management overhead for a feature users may not share |
| Print-friendly CSS (Agent 05) | Post-launch | PDF export covers the print use case |
| Collapsible sidebar | 10+ users requesting it | Low ROI for solo founder |
| Dark mode toggle UI | Customer demand | Infrastructure is ready but UI is unneeded |
| Bottom tab bar (mobile) | Mobile usage exceeds 30% | Hamburger + command palette is sufficient |

### Estimated Total Effort

| Phase | Hours | Risk Level |
|-------|-------|-----------|
| Phase 0: Foundation | 4h | Low |
| Phase 1: App Shell | 8h | Low |
| Phase 2: Core Pages | 20h | Medium (font-mono audit, radius fixes) |
| Phase 3: Secondary Pages | 12h | Medium (no spec for auth/command palette) |
| Phase 4: Marketing + Billing | 10h | High (no landing page spec, pricing uses wrong tokens) |
| Phase 5: Flip | 2h | High (all-or-nothing moment) |
| **Total** | **56h** | -- |

With the cuts and deferrals above, this could compress to ~40 hours of focused implementation. The riskiest single item is the `fontSize` replacement in Agent 18 -- get that wrong and every page breaks simultaneously.
