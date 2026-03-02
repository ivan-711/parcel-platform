# Parcel Platform -- Animation & Micro-Interaction Plan

> Comprehensive animation strategy for a premium dark-theme real estate SaaS.
> Combines web research findings with a full codebase audit.
> Last updated: 2026-03-02

---

## Table of Contents

1. [Animation Research Findings](#1-animation-research-findings)
2. [Current Codebase Animation Audit](#2-current-codebase-animation-audit)
3. [Page-by-Page Animation Recommendations](#3-page-by-page-animation-recommendations)
4. [Animation System Design](#4-animation-system-design)
5. [Implementation Priority Roadmap](#5-implementation-priority-roadmap)
6. [Animations to Avoid](#6-animations-to-avoid)
7. [Performance Guidelines](#7-performance-guidelines)

---

## 1. Animation Research Findings

### 1.1 Industry Trends (2025-2026)

**Functional motion is the gold standard.** Teams at Linear, Notion, and Arc Browser lead with minimal, context-driven interactions that respect user focus. In 2026, users expect smooth, context-aware transitions -- not just buttons that move. Micro-interactions are no longer optional in premium SaaS; they are baseline expectations.

**Key principles from research:**

- Duration sweet spot: **200-500ms** -- long enough to be noticed, short enough to maintain flow
- Prefer **transform and opacity** (GPU-accelerated, no reflows) over layout-triggering properties
- **Purposeful motion only** -- every animation must communicate state change, hierarchy, or feedback
- Mobile performance is critical: reduce complexity or disable blur on older devices

### 1.2 Button Hover Effects

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Subtle lift | hover | `y: -2px`, slight shadow increase | 150ms ease-out | Communicates interactivity without being distracting |
| Scale tap | click/press | `scale: 0.97` on press, `scale: 1` release | spring (stiffness: 400, damping: 17) | Physics-based feel, like pressing a real button |
| Background shift | hover | Background opacity/color transition | 150ms ease | Minimal but clear state change |
| Icon nudge | hover | Arrow icon translates 2-4px in direction | 200ms ease-out | Directional hint reinforces action |
| Indigo glow | hover (CTA only) | `box-shadow: 0 0 20px rgba(99,102,241,0.3)` | 200ms ease | Premium ambient lighting on dark backgrounds |

**Best practice:** Combine `whileHover={{ y: -2 }}` with `whileTap={{ scale: 0.97 }}` for a complete tactile feel. Never use `whileHover={{ scale: 1.1 }}` -- too aggressive for SaaS.

### 1.3 Page Transitions

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Fade + slide up | Route change | `opacity: 0 -> 1, y: 8 -> 0` | 300ms ease-out | Suggests content rising into view |
| Cross-fade | Route change | Old page fades out, new fades in via `AnimatePresence mode="wait"` | 200ms each | Clean handoff between views |
| Stagger reveal | Page mount | Container children animate in sequence | 0.05-0.08s stagger, 180ms per item | Creates visual hierarchy, draws eye top-to-bottom |

**Implementation note:** Wrap routes in `AnimatePresence` with `mode="wait"` and give each page a unique `key`. Use layout-level motion components, not per-element delays.

### 1.4 Card Animations

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Hover lift | hover | `y: -2`, border color brightens | 150ms ease-out | Indicates clickability, creates depth |
| Stagger on load | Mount/data change | Cards enter with `opacity: 0, y: 6` -> visible, 40-80ms stagger | 180ms ease-out | Grid feels alive, not dumped onto screen |
| Exit shrink | Deletion | `opacity: 0, scale: 0.95, height: 0` via AnimatePresence | 200ms ease-in | Smooth removal instead of jump |
| Expand detail | Click | Card expands to show more content, `layoutId` for shared element | spring (damping: 25) | Spatial continuity between states |

### 1.5 KPI Number Counting

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Count-up on mount | Component mount | Number animates 0 -> target via RAF | 1200ms cubic ease-out | Financial dashboards always count up -- it's expected |
| Delta pulse | Value changes | Brief green/red flash on delta badge | 600ms, opacity pulse | Draws attention to change without being disruptive |
| Odometer style | Real-time update | Digits roll/slide into new position | 400ms spring | Higher polish than simple count-up (additional library) |

**Current state in Parcel:** `useCountUp` hook already implements RAF-based count-up with 1.2s cubic ease-out. This is solid. Consider adding a value-change pulse for when data refreshes.

### 1.6 Skeleton Loaders

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Shimmer sweep | Loading state | Gradient moves left-to-right across placeholder | 1.4-1.5s infinite linear | Directional movement indicates progress |
| Content-aware shapes | Loading state | Skeleton mimics exact layout of final content | N/A | Prevents layout shift (CLS), user knows what's coming |
| Fade to content | Data arrives | Skeleton fades out, real content fades in | 200ms cross-fade | Smooth handoff instead of flash replacement |

**Current state in Parcel:** `SkeletonCard` uses `animate-pulse` (opacity pulse). Pipeline uses custom shimmer. Consider standardizing on shimmer across all loading states.

### 1.7 Toast Notifications

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Slide in from bottom-right | Toast created | `y: 100% -> 0, opacity: 0 -> 1` | 300ms spring | Natural "popping up" feel |
| Stack push | Multiple toasts | Previous toasts animate upward via `layout` prop | spring (damping: 20) | Toasts don't jump, they flow |
| Auto-dismiss | Timer expires | Slide out + opacity fade | 200ms ease-in | Clean exit, not jarring |
| Progress bar | Auto-dismiss timer | Thin bar shrinks from right to left | Linear, matches timer duration | User knows how long toast will stay |

**Current state in Parcel:** Using Sonner with dark theme styling. Sonner handles stack behavior natively. Consider customizing transition timing.

### 1.8 Kanban Drag-and-Drop

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Pickup scale + rotate | Drag start | Card scales to 1.02, rotates 1-2deg, shadow deepens | 150ms ease-out | Physical "lifting off surface" metaphor |
| Column highlight | Drag over column | Column bg shifts to `stage.color` at 12% opacity, dashed border appears | 150ms ease | Clear drop target indication |
| Drop settle | Drag end | Card snaps to position with spring physics, slight overshoot | spring (damping: 20, stiffness: 300) | Physics-based landing, not robotic snap |
| Placeholder gap | Drag over list | Gap opens where card would be inserted | 200ms spring | Spatial preview of drop position |
| Ghost opacity | Drag active | Original position shows 40% opacity ghost | Instant | User knows where card came from |

**Current state in Parcel:** Pipeline already has: opacity ghost (0.4), column highlight with color, rotate-1 on drag overlay, staggered card entry, AnimatePresence exit. This is well-implemented. Consider adding spring settle on drop and shadow depth change.

### 1.9 Chart Entry Animations

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Area draw | Mount | Line draws from left to right, fill fades in | 1000ms ease-out (Recharts `animationDuration`) | Classic data visualization reveal |
| Bar grow | Mount | Bars grow from bottom to full height | 800ms ease-out with 50ms stagger per bar | Staggered growth creates visual rhythm |
| Tooltip fade | Hover on data point | Tooltip fades in at cursor position | 150ms ease-out | Instant-appearing tooltips feel cheap |
| Data point pulse | Hover | Dot scales 1.5x with glow | 200ms ease | Highlights exact data point being inspected |

**Current state in Parcel:** Portfolio AreaChart uses Recharts default animation (enabled by default with `isAnimationActive={true}`). Consider customizing `animationDuration` and `animationEasing` for a more branded feel.

### 1.10 Table Row Animations

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Waterfall enter | Mount | Rows enter top-to-bottom with index-based delay | 180ms ease-out, 0.04s stagger | Table builds itself, not instant dump |
| Row highlight | Hover | Background shifts to elevated color | 150ms transition-colors (CSS) | Already standard, but consistent timing matters |
| Row exit | Delete | Row slides left + fades out via AnimatePresence | 200ms ease-in | Smooth removal, list reflows naturally |
| Sort transition | Column sort | Rows rearrange with layout animation | 300ms spring (layout prop) | Rows slide to new positions instead of re-rendering |

**Current state in Parcel:** Dashboard and Portfolio tables use CSS `hover:bg-app-elevated/50 transition-colors`. No entry/exit animations. Activity feed in Dashboard has staggered entry. Tables would benefit from `motion.tr` for row animations.

### 1.11 Modal / Dialog Animations

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Backdrop blur + darken | Open | Background blurs (8px) and darkens to 60% black | 200ms ease-out | Focus isolation without harsh overlay |
| Scale + fade in | Open | Dialog scales 0.95 -> 1.0 + opacity 0 -> 1 | 200ms spring (stiffness: 300, damping: 24) | Physics-based entrance, not a flat pop |
| Scale + fade out | Close | Reverse of open animation | 150ms ease-in | Slightly faster exit (feel snappy) |
| Slide from edge | Sheet/drawer open | Panel slides from right edge | 300ms spring (damping: 26) | Spatial metaphor: panel emerges from off-screen |

**Current state in Parcel:** Using Radix Dialog/Sheet/AlertDialog with default shadcn animations (data-state CSS transitions). These work but could be enhanced with Framer Motion for spring physics. The Close Deal Modal and Offer Letter Modal use Radix Dialog defaults.

### 1.12 Navigation Transitions

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Active indicator slide | Route change | A `motion.div` with `layoutId="nav-indicator"` slides behind active nav item | spring (stiffness: 300, damping: 30) | Continuous visual connection between navigation states |
| Sidebar collapse | Toggle | Width animates 216px -> 64px, labels fade out, icons remain | 250ms ease-out | Smooth transition, not a jump |
| Breadcrumb update | Route change | Old breadcrumb fades, new slides in from right | 200ms ease-out | Contextual navigation feels alive |

**Current state in Parcel:** AppShell sidebar uses a static `border-l-2 border-accent-primary` for active state. No animated indicator. The sidebar is fixed at 216px with no collapse. The active indicator slide would be the highest-impact navigation improvement.

### 1.13 Scroll-Triggered Animations

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Fade up on enter | Element enters viewport | `opacity: 0, y: 12 -> opacity: 1, y: 0` | 350ms ease-out, `whileInView` | Content reveals itself as user scrolls |
| Parallax layers | Scroll position | Background elements move at different speeds via `useScroll + useTransform` | Tied to scroll (0.5kb overhead) | Depth illusion without heavy 3D |
| Sticky header morph | Scroll past threshold | Navbar gets backdrop-blur, border-bottom appears | 300ms transition-all | Progressive disclosure of chrome |

**Current state in Parcel:** Landing page already has: whileInView for stats/features/how-it-works, parallax ghost cards via `ParallaxBackground`, and navbar blur-on-scroll. This is well-implemented. App pages (behind login) don't need scroll-triggered animations since content loads via API.

### 1.14 Form Interactions

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Focus glow | Input focus | `box-shadow: 0 0 0 2px rgba(99,102,241,0.3)` (indigo ring) | 150ms ease | Clear focus state without harsh border change |
| Validation shake | Submit with errors | Input translates `[-4, 4, -4, 4, 0]` horizontally | 400ms, 4 keyframes | Physical "no" gesture, universally understood |
| Success checkmark | Valid input / save | Small check icon appears with scale 0 -> 1 | 200ms spring | Positive reinforcement |
| Label float | Input focus + has value | Label translates up and scales down | 200ms ease-out | Space-efficient, modern form pattern |

**Current state in Parcel:** Forms use shadcn Input with `focus:border-accent-primary` (CSS transition). No shake validation, no success checkmarks, no floating labels. The Analyzer form is the most form-heavy page and would benefit from better focus states.

### 1.15 Loading States

| Pattern | Trigger | What Happens | Duration / Easing | Why It Feels Premium |
|---------|---------|--------------|-------------------|---------------------|
| Progressive reveal | Data arrives in stages | Sections appear as data loads, not all-at-once | 200ms stagger per section | Page feels responsive even if full load takes time |
| Optimistic UI | User action | UI updates instantly, rolls back on error | Instant update, 200ms rollback animation | App feels fast, user gets immediate feedback |
| Shimmer placeholders | Waiting for API | Content-aware skeleton shapes with shimmer gradient | 1.4s infinite linear | Better than spinner, communicates expected layout |

---

## 2. Current Codebase Animation Audit

### 2.1 Installed Animation Libraries

| Library | Version | Usage |
|---------|---------|-------|
| `framer-motion` | ^11.15.0 | Primary animation library. Used across Landing, Dashboard, Pipeline, MyDeals, Chat, Portfolio, Compare, Documents, Settings, ShareDeal pages |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop for Pipeline Kanban |
| `@dnd-kit/sortable` | ^8.0.0 | Sortable lists within Kanban columns |
| `sonner` | ^2.0.7 | Toast notifications with built-in animations |
| `recharts` | ^2.14.1 | Chart animations (built-in) |
| `tailwindcss-animate` | ^1.0.7 | CSS animation utilities (`animate-pulse`, `animate-spin`, etc.) |

**No additional animation libraries needed.** The current stack (Framer Motion + Tailwind animate + dnd-kit + Sonner + Recharts) covers all use cases. Adding react-countup or Odometer.js is unnecessary since `useCountUp` already handles number animation.

### 2.2 Existing Animation Patterns

#### Framer Motion Usage

| File | Animations Used |
|------|----------------|
| `Landing.tsx` | `whileInView`, `AnimatePresence mode="wait"`, staggered entry, parallax cards, blob drift keyframes |
| `Dashboard.tsx` | `containerVariants` + `itemVariants` stagger (0.08s), `whileHover={{ y: -2 }}`, activity feed stagger (0.05 * index) |
| `Pipeline.tsx` | `AnimatePresence` for card enter/exit, staggered card entry (0.04 * index), DragOverlay with rotate(1deg) |
| `MyDeals.tsx` | Container/item stagger (0.04s), preset chip enter/exit, floating compare bar enter, AnimatePresence for presets |
| `ChatPage.tsx` | Message enter/exit via AnimatePresence, empty state fade-in |
| `DocumentsPage.tsx` | `fadeUp` variants for detail panel sections with sequential delays (0.05, 0.1, 0.15, 0.2) |
| `PortfolioPage.tsx` | Container/item stagger (same as Dashboard), Recharts default chart animation |
| `ComparePage.tsx` | Page-level `opacity: 0, y: 8 -> visible` |
| `SettingsPage.tsx` | Container/item stagger (same as Dashboard) |
| `ShareDealPage.tsx` | Page-level `opacity: 0, y: 8 -> visible` |
| `StrategySelectPage.tsx` | Container/item stagger (0.05s) |
| `ParallaxBackground.tsx` | `useScroll`, `useTransform`, floating drift animation per ghost card |

#### CSS Animation Usage

| File | Animations Used |
|------|----------------|
| `index.css` | `drift1/2/3` (blob animation, 12-18s), `ticker` (marquee, 55s), `prefers-reduced-motion` media query |
| `Pipeline.tsx` | Inline `@keyframes shimmer` for skeleton shimmer |
| `SkeletonCard.tsx` | Tailwind `animate-pulse` |
| `DocumentsPage.tsx` | `animate-pulse` for processing indicator, `animate-spin` for Loader2 |
| `sonner.tsx` | Sonner built-in toast animations |

#### Custom Animation Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useCountUp` | `hooks/useCountUp.ts` | RAF-based number animation, 1.2s cubic ease-out. Used by KPICard and RiskGauge |

### 2.3 Animation Variant Duplication

The following variant pattern is copy-pasted across 5+ pages:

```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}
```

**Found in:** Dashboard.tsx, MyDeals.tsx, PortfolioPage.tsx, SettingsPage.tsx, StrategySelectPage.tsx (with 0.05s stagger)

**Recommendation:** Extract to a shared `lib/motion.ts` config file.

### 2.4 Gaps Identified

| Gap | Where | Impact |
|-----|-------|--------|
| No page transitions between routes | App.tsx / Router | Medium -- pages pop in without transition |
| No sidebar active indicator animation | AppShell.tsx | High -- misses premium navigation feel |
| No table row animations | Dashboard, Portfolio, Compare | Medium -- tables appear instantly |
| No skeleton-to-content transition | SkeletonCard.tsx | Medium -- loading to loaded is a hard cut |
| No form focus animations | AnalyzerFormPage, Login, Register, Settings | Low -- functional but not premium |
| No chart animation customization | PortfolioPage.tsx | Low -- Recharts defaults are acceptable |
| Inconsistent shimmer vs pulse | SkeletonCard (pulse) vs Pipeline (shimmer) | Low -- should standardize on shimmer |
| No validation feedback animation | AnalyzerFormPage | Medium -- errors appear without animation |
| No modal enter/exit spring physics | close-deal-modal, offer-letter-modal, edit-portfolio-modal | Low -- Radix defaults are functional |
| Duplicated motion variants | 5+ files | Low -- code quality, not UX |

---

## 3. Page-by-Page Animation Recommendations

### 3.1 Landing Page (`Landing.tsx`)

**Current state:** Well-animated. Parallax, whileInView, stagger, AnimatePresence, ticker, blob drift.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Button hover glow on "Get Started" CTA | hover | Tailwind transition | Nice-to-have | Quick | `className="... hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] transition-shadow duration-200"` |
| Strategy tab underline slide | Tab switch in DemoCard | Framer Motion `layoutId` | High-impact | Quick | See snippet below |
| Pricing card hover lift | hover | Framer Motion `whileHover` | Nice-to-have | Quick | `<motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>` |

**Strategy tab underline slide:**
```tsx
// Inside strategy tab buttons in DemoCard
{STRATEGIES.map((s) => (
  <button key={s} onClick={() => setActive(s)} className="relative ...">
    {s}
    {active === s && (
      <motion.div
        layoutId="strategy-tab-indicator"
        className="absolute bottom-0 inset-x-0 h-0.5 bg-accent-primary"
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    )}
  </button>
))}
```

---

### 3.2 Dashboard (`Dashboard.tsx`)

**Current state:** Staggered entry for sections, whileHover on CTA, staggered activity feed.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| KPI value change pulse | Data refresh | Framer Motion `animate` | High-impact | Medium | See snippet below |
| Table row hover highlight (already exists) | hover | Tailwind transition | N/A (done) | N/A | Already has `hover:bg-app-elevated/50 transition-colors` |
| Recent deals row stagger on mount | Page load | Framer Motion stagger | High-impact | Quick | Wrap `<tbody>` rows in motion.tr with index-based delay |
| Pipeline summary bar animation | Mount | CSS width transition | Nice-to-have | Quick | Animate bar width from 0% to proportional width |

**KPI pulse on data change:**
```tsx
// In KPICard.tsx -- flash background briefly when value changes
import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef } from 'react'

export function KPICard({ label, value, format, delta, loading, className }: KPICardProps) {
  const animated = useCountUp(value)
  const prevValue = useRef(value)
  const controls = useAnimationControls()

  useEffect(() => {
    if (prevValue.current !== value && prevValue.current !== 0) {
      controls.start({
        backgroundColor: ['rgba(99,102,241,0.1)', 'rgba(99,102,241,0)'],
        transition: { duration: 0.6 },
      })
    }
    prevValue.current = value
  }, [value, controls])

  // Wrap in motion.div with animate={controls}
}
```

**Table row stagger:**
```tsx
// Wrap each table row
{stats.recent_deals.map((deal, index) => (
  <motion.tr
    key={deal.id}
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.18, delay: index * 0.04 }}
    className="border-b border-border-subtle last:border-0 hover:bg-app-elevated/50 transition-colors"
  >
    {/* ... cells ... */}
  </motion.tr>
))}
```

---

### 3.3 Pipeline (`Pipeline.tsx`)

**Current state:** Strong. AnimatePresence, stagger, DragOverlay with rotate, column highlight, shimmer skeletons.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Drop settle spring | Drag end | dnd-kit dropAnimation config | High-impact | Quick | `<DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>` |
| Card shadow depth on drag | Drag start | Framer Motion or inline style | Nice-to-have | Quick | Add `shadow-2xl` class to DragOverlay card (already done) |
| Column count badge animate | Card moves | Framer Motion `layout` | Nice-to-have | Quick | Add `layout` prop to count span for smooth number position change |
| Empty column drop zone pulse | Drag active over empty column | CSS animation | Nice-to-have | Quick | Add subtle pulse to "Drop here" text when column is hovered |

**Improved drop animation with spring overshoot:**
```tsx
<DragOverlay
  dropAnimation={{
    duration: 200,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // slight overshoot
  }}
>
```

---

### 3.4 My Deals (`MyDeals.tsx`)

**Current state:** Staggered grid, preset chip animations, floating compare bar enter.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Card hover lift | hover | Framer Motion whileHover | Must-have | Quick | See snippet below |
| Selection checkbox scale | Toggle select | CSS transition | Nice-to-have | Quick | `transition-transform` + `scale-100` / `scale-0` on check icon |
| Delete row exit | Delete confirmed | AnimatePresence | High-impact | Medium | Wrap card grid items in AnimatePresence with exit animation |
| Compare bar spring entrance | 2 selected | Already exists | N/A (done) | N/A | Already uses `motion.div initial/animate` |
| Pagination page transition | Page change | Framer Motion | Nice-to-have | Medium | Cross-fade grid contents on page change |

**Card hover lift:**
```tsx
<motion.div
  key={deal.id}
  variants={itemVariants}
  whileHover={{ y: -2 }}
  transition={{ duration: 0.15 }}
>
  <Link to={`/analyze/results/${deal.id}`} className="...">
    {/* card content */}
  </Link>
</motion.div>
```

**Delete exit animation:**
```tsx
<AnimatePresence>
  {deals.map((deal) => (
    <motion.div
      key={deal.id}
      variants={itemVariants}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      layout // smooth reflow when items are removed
    >
      {/* card */}
    </motion.div>
  ))}
</AnimatePresence>
```

---

### 3.5 Analyzer Form (`AnalyzerFormPage.tsx`)

**Current state:** Minimal animation. No Framer Motion on this page.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Page enter stagger | Mount | Framer Motion stagger | Must-have | Quick | Apply containerVariants/itemVariants pattern |
| Input focus glow | Focus | CSS transition | High-impact | Quick | `focus:shadow-[0_0_0_2px_rgba(99,102,241,0.3)] transition-shadow` |
| Validation shake | Submit with errors | Framer Motion keyframes | High-impact | Quick | See snippet below |
| "Analyzing..." button state | Submit | CSS transition + Framer Motion | Must-have | Quick | Button shrinks icon, shows loading text |
| Strategy badge entrance | Mount | Framer Motion | Nice-to-have | Quick | Badge scales from 0.9 to 1 with opacity |

**Validation shake:**
```tsx
const shakeVariants = {
  shake: {
    x: [0, -6, 6, -6, 6, 0],
    transition: { duration: 0.4 },
  },
}

// On the input wrapper when error exists
<motion.div
  variants={shakeVariants}
  animate={hasError ? 'shake' : undefined}
>
  <Input ... />
  {hasError && <p className="text-accent-danger text-xs mt-1">{error}</p>}
</motion.div>
```

---

### 3.6 Results Page (`ResultsPage.tsx`)

**Current state:** Uses KPICard (has count-up) and RiskGauge (has animated arc). No page-level stagger.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| KPI row stagger | Mount | Framer Motion stagger | Must-have | Quick | Wrap KPI grid in motion.div with containerVariants |
| Output table row stagger | Mount | Framer Motion | High-impact | Quick | Apply waterfall delay to each output row |
| Risk gauge arc draw | Mount | Already exists | N/A (done) | N/A | CSS `transition: stroke-dashoffset 1.2s ease-out` |
| Action button hover effects | Hover | Framer Motion whileHover/whileTap | Nice-to-have | Quick | `whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}` |
| "In Pipeline" success transition | Button state change | Framer Motion | Nice-to-have | Quick | Cross-fade from blue button to green badge |

**Page stagger for Results:**
```tsx
<motion.div
  className="max-w-5xl mx-auto space-y-6"
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  <motion.div variants={itemVariants}>
    {/* KPI row */}
  </motion.div>
  <motion.div variants={itemVariants}>
    {/* Two column layout */}
  </motion.div>
  <motion.div variants={itemVariants}>
    {/* Actions */}
  </motion.div>
</motion.div>
```

---

### 3.7 Strategy Select (`StrategySelectPage.tsx`)

**Current state:** Good. Has staggered card entry.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Card hover lift + border glow | hover | Framer Motion whileHover | Must-have | Quick | `whileHover={{ y: -3 }}` + CSS `hover:border-accent-primary hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]` |
| Arrow icon nudge | hover | CSS transition | Nice-to-have | Quick | `group-hover:translate-x-1 transition-transform` (already partially done) |

---

### 3.8 Chat Page (`ChatPage.tsx`)

**Current state:** Good. AnimatePresence for messages, streaming cursor.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Suggested question hover | hover | CSS transition | Nice-to-have | Quick | `hover:translate-y-[-1px] transition-transform` |
| Message typing indicator | AI streaming | CSS animation | Nice-to-have | Quick | Three dot pulse animation before first token |
| Send button active state | Has text input | CSS transition | Nice-to-have | Quick | Already changes color, could add subtle scale |
| Skeleton chat bubbles | History loading | Already exists | N/A (done) | N/A | Uses animate-pulse skeletons |

**Typing indicator (before first token):**
```tsx
// Show while assistant message content is empty and isStreaming
{msg.isStreaming && msg.content === '' && (
  <div className="flex gap-1 px-1 py-2">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/60"
        style={{
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </div>
)}
```

---

### 3.9 Portfolio Page (`PortfolioPage.tsx`)

**Current state:** Staggered entry for sections, Recharts area chart.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Chart entry animation config | Mount | Recharts props | Nice-to-have | Quick | `<Area animationDuration={1200} animationEasing="ease-out" />` |
| Table row stagger | Mount | Framer Motion | High-impact | Quick | motion.tr with index-based delay |
| Edit button fade-in on hover | Row hover | CSS transition | N/A (done) | N/A | Already has `opacity-0 group-hover:opacity-100 transition-all` |
| Sheet slide-in | Open add entry | Already handled by Radix Sheet | N/A (done) | N/A | Radix Sheet has slide animation |

---

### 3.10 Compare Page (`ComparePage.tsx`)

**Current state:** Page-level fade-in. Static comparison table.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Comparison rows stagger | Data loads | Framer Motion | High-impact | Quick | Each ComparisonRow enters with stagger delay |
| Winner highlight pulse | Winner calculated | CSS animation | Nice-to-have | Quick | Brief green flash on the winning value's border |
| Deal selector transition | Deal changes | AnimatePresence | Nice-to-have | Medium | Cross-fade comparison table when deal selection changes |

**Comparison rows stagger:**
```tsx
{strategyRows.map((key, index) => (
  <motion.div
    key={key}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.2, delay: index * 0.03 }}
  >
    <ComparisonRow ... />
  </motion.div>
))}
```

---

### 3.11 Documents Page (`DocumentsPage.tsx`)

**Current state:** Good. fadeUp variants with sequential delays, AnimatePresence for detail panel, dropzone state changes.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Upload progress animation | File uploading | CSS animation | High-impact | Medium | Progress bar or file icon fill animation during upload |
| Document list item enter | New upload completes | Framer Motion | Nice-to-have | Quick | New item slides in at top of list |
| Processing steps checkmark | Step completes | Framer Motion | Nice-to-have | Quick | Green check scales in with spring |

---

### 3.12 Settings Page (`SettingsPage.tsx`)

**Current state:** Staggered section entry.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Success message fade | Save succeeds | Framer Motion | Nice-to-have | Quick | `<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>` |
| Switch toggle animation | Toggle notification | Already handled by Radix Switch | N/A (done) | N/A | Radix Switch has built-in transition |

---

### 3.13 Login / Register Pages

**Current state:** No animations at all. Static forms.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Card entrance | Mount | Framer Motion | Must-have | Quick | `<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>` |
| Input focus glow | Focus | CSS transition | High-impact | Quick | `focus:shadow-[0_0_0_2px_rgba(99,102,241,0.25)]` |
| Error message entrance | Login error | Framer Motion | Nice-to-have | Quick | Error slides down with opacity |
| Submit button loading state | Submitting | CSS transition | Nice-to-have | Quick | Already shows "Signing in..." text |

---

### 3.14 Share Deal Page (`ShareDealPage.tsx`)

**Current state:** Page-level fade + slide up.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| KPI cards stagger | Mount | Framer Motion | High-impact | Quick | Stagger KPI card entry like Dashboard |
| Breakdown expand | Toggle | Framer Motion AnimatePresence | Nice-to-have | Medium | Smooth height animation when expanding/collapsing breakdown |

---

### 3.15 App Shell (`AppShell.tsx`)

**Current state:** Static sidebar, static topbar.

| Animation | Trigger | Approach | Priority | Effort | Code Snippet |
|-----------|---------|----------|----------|--------|-------------|
| Active nav indicator slide | Route change | Framer Motion layoutId | Must-have | Medium | See snippet below |
| Page content transition | Route change | Framer Motion AnimatePresence in App.tsx | High-impact | Medium | Wrap route outlet in AnimatePresence |
| Search pill focus expand | Focus | CSS transition | Nice-to-have | Quick | Width expands from pill to full search bar |

**Active nav indicator slide:**
```tsx
// In NavGroup component
function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const { pathname } = useLocation()

  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {items.map((item) => {
        const active = pathname === item.path
        const Icon = item.icon
        return (
          <Link key={item.path} to={item.path} className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ...">
            {active && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent-primary rounded-full"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <Icon size={16} className="shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
```

**Note:** The `layoutId` must be unique across all NavGroups. Since the indicator should slide across groups (Main, Tools, Account), use a single `layoutId="sidebar-active"` string. When navigating from "Dashboard" (Main) to "AI Chat" (Tools), the indicator will animate between groups.

---

## 4. Animation System Design

### 4.1 Shared Motion Config (`frontend/src/lib/motion.ts`)

Extract all repeated variants and transition configs into one file:

```typescript
// frontend/src/lib/motion.ts

import type { Variants, Transition } from 'framer-motion'

// ── Standard Durations ──
export const DURATION = {
  fast: 0.15,      // hover, tap feedback
  normal: 0.2,     // most transitions
  medium: 0.3,     // page-level transitions
  slow: 0.5,       // hero animations, emphasis
} as const

// ── Standard Easings ──
export const EASE = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],  // smooth deceleration
  inOut: [0.45, 0, 0.55, 1] as [number, number, number, number], // symmetric
  spring: { type: 'spring' as const, stiffness: 300, damping: 24 },
  springStiff: { type: 'spring' as const, stiffness: 400, damping: 30 },
  springGentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
} as const

// ── Stagger Container ──
export function staggerContainer(staggerMs = 80): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: staggerMs / 1000 },
    },
  }
}

// ── Standard Item (fade + slide up) ──
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: 'easeOut' },
  },
}

// ── Page Enter ──
export const pageEnter: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATION.fast },
  },
}

// ── Table Row Enter ──
export function tableRowVariant(index: number): {
  initial: { opacity: number; y: number }
  animate: { opacity: number; y: number; transition: Transition }
} {
  return {
    initial: { opacity: 0, y: 4 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.normal, delay: index * 0.04 },
    },
  }
}

// ── Hover Lift (for interactive cards) ──
export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

// ── Shake (for validation errors) ──
export const shake: Variants = {
  shake: {
    x: [0, -6, 6, -6, 6, 0],
    transition: { duration: 0.4 },
  },
}
```

### 4.2 Skeleton-to-Content Transition Component

```tsx
// frontend/src/components/ui/AnimatedSkeleton.tsx

import { motion, AnimatePresence } from 'framer-motion'
import { SkeletonCard } from './SkeletonCard'

interface AnimatedSkeletonProps {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
}

/** Cross-fades between skeleton loading state and real content. */
export function AnimatedSkeleton({ isLoading, skeleton, children }: AnimatedSkeletonProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### 4.3 Shimmer CSS (Global Standard)

Add to `index.css` to replace Pipeline's inline shimmer and standardize across all skeletons:

```css
/* ── Shimmer loading animation ── */
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.shimmer {
  position: relative;
  overflow: hidden;
}

.shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.04) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .shimmer::after { animation: none; }
}
```

### 4.4 Route Transition Wrapper

```tsx
// In App.tsx, wrap the route outlet
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* <Outlet /> or route rendering */}
      </motion.div>
    </AnimatePresence>
  )
}
```

**Note:** Keep page transitions subtle (opacity only, 150ms). Slide animations between routes feel heavy in data-dense SaaS apps. Opacity cross-fade is the safest choice.

---

## 5. Implementation Priority Roadmap

### Phase A: Foundation (2-3 hours)

These changes create the animation infrastructure and affect every page:

| # | Task | Files | Effort | Impact |
|---|------|-------|--------|--------|
| A1 | Create `lib/motion.ts` shared config | New file | 30 min | Eliminates duplication across 5+ pages |
| A2 | Replace duplicated variants with imports from `lib/motion.ts` | Dashboard, MyDeals, Portfolio, Settings, StrategySelect | 30 min | Code quality |
| A3 | Add shimmer CSS to `index.css`, remove inline shimmer from Pipeline | index.css, Pipeline.tsx | 15 min | Consistent loading aesthetic |
| A4 | Upgrade SkeletonCard from `animate-pulse` to shimmer class | SkeletonCard.tsx | 15 min | All loading states look premium |
| A5 | Add sidebar active indicator with `layoutId` | AppShell.tsx | 30 min | Highest-impact single change across all pages |
| A6 | Add page content opacity transition | App.tsx | 30 min | Every route change feels smooth |

### Phase B: Must-Have Page Animations (2-3 hours)

These are the highest-impact animations per page:

| # | Task | Files | Effort | Impact |
|---|------|-------|--------|--------|
| B1 | Login/Register card entrance animation | Login.tsx, Register.tsx | 20 min | First impression for new users |
| B2 | Login/Register input focus glow | Login.tsx, Register.tsx | 10 min | Form feels responsive |
| B3 | Results page stagger | ResultsPage.tsx | 15 min | Deal results page currently has no stagger |
| B4 | Analyzer form page stagger + input focus glow | AnalyzerFormPage.tsx | 20 min | Core workflow page needs polish |
| B5 | My Deals card hover lift | MyDeals.tsx | 10 min | Cards feel interactive |
| B6 | Strategy select card hover lift + glow | StrategySelectPage.tsx | 10 min | Strategy cards feel clickable |
| B7 | Share deal KPI stagger | ShareDealPage.tsx | 15 min | Shared links need to impress external viewers |
| B8 | Dashboard table row stagger | Dashboard.tsx | 15 min | Recent deals table enters smoothly |
| B9 | Portfolio table row stagger | PortfolioPage.tsx | 15 min | Closed deals table enters smoothly |

### Phase C: High-Impact Enhancements (2-3 hours)

| # | Task | Files | Effort | Impact |
|---|------|-------|--------|--------|
| C1 | Analyzer form validation shake | AnalyzerFormPage.tsx | 20 min | Clear error feedback |
| C2 | My Deals delete exit animation | MyDeals.tsx | 30 min | Smooth card removal |
| C3 | Compare page rows stagger | ComparePage.tsx | 15 min | Table builds progressively |
| C4 | DemoCard strategy tab indicator slide | Landing.tsx | 20 min | Hero section looks more polished |
| C5 | Chat typing indicator dots | ChatPage.tsx | 20 min | AI feels more responsive |
| C6 | Pipeline drop animation spring overshoot | Pipeline.tsx | 10 min | Kanban feels more physical |
| C7 | KPI value change pulse | KPICard.tsx | 30 min | Data refresh is noticeable |
| C8 | Document upload progress animation | DocumentsPage.tsx | 30 min | Upload feels more responsive |

### Phase D: Nice-to-Have Polish (3+ hours)

| # | Task | Files | Effort | Impact |
|---|------|-------|--------|--------|
| D1 | Landing pricing card hover lift | Landing.tsx | 10 min | Subtle polish |
| D2 | Skeleton-to-content cross-fade component | New AnimatedSkeleton.tsx | 30 min | Smoother loading transitions |
| D3 | Compare winner highlight pulse | ComparePage.tsx | 20 min | Draws eye to winning metric |
| D4 | Share deal breakdown expand animation | ShareDealPage.tsx | 30 min | Smooth height transition |
| D5 | Settings success message animation | SettingsPage.tsx | 10 min | Polished feedback |
| D6 | Recharts custom animation timing | PortfolioPage.tsx | 15 min | Branded chart feel |
| D7 | Modal spring physics (override Radix defaults) | dialog.tsx, sheet.tsx | 60 min | Spring-based modal open/close |

---

## 6. Animations to Avoid

### Explicitly Prohibited (from design-brief.jsonc)

| Animation | Reason |
|-----------|--------|
| Confetti | Not appropriate for financial SaaS |
| Particles | Performance overhead, no functional purpose |
| Bounce animations | Feels juvenile, undermines credibility |
| Decorative animations | No animation without purpose |

### Additionally Avoid

| Animation | Reason |
|-----------|--------|
| Page slide transitions (left/right) | Too heavy for data-dense navigation; use opacity fade only |
| Number odometer (digit-roll) | Requires additional library, useCountUp is sufficient |
| Parallax on app pages | Only appropriate for landing/marketing pages |
| Auto-playing Lottie animations | Not installed, adds weight, design brief says no decorative animation |
| Hover scale > 1.05 | Too aggressive; max hover scale should be 1.02 on cards |
| Text typewriter effect | Except for AI chat streaming, which naturally types |
| Color cycling / rainbow | Conflicts with the restrained dark theme |
| 3D transforms / perspective | GPU-intensive, not needed for this product |
| Delay > 500ms on user-triggered actions | User perceives delays > 500ms as sluggishness |
| Animation on scroll within app pages | Only appropriate for landing page; app pages load data via API |

---

## 7. Performance Guidelines

### 7.1 GPU-Accelerated Properties Only

Only animate these CSS properties (they don't trigger layout reflow):

- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (blur, brightness -- use sparingly)
- `box-shadow` (animated via transition, not keyframes)

**Never animate:** `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`, `border-width`

### 7.2 `will-change` Usage

Apply `will-change` only to elements that are actively animating:

```css
/* Good: Applied to element that will animate */
.ticker-animate {
  will-change: transform;
}

/* Bad: Applied to everything "just in case" */
* { will-change: transform; } /* DO NOT DO THIS */
```

Framer Motion handles `will-change` automatically for `motion.div` components.

### 7.3 Reduced Motion Media Query

**All animations must respect `prefers-reduced-motion`.** This is a hard requirement.

For Framer Motion, add a global reduced motion check:

```tsx
// frontend/src/lib/motion.ts
import { useReducedMotion } from 'framer-motion'

// Use in components:
const shouldReduceMotion = useReducedMotion()
```

For CSS animations, already partially done in `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .blob-1, .blob-2, .blob-3 { animation: none; }
  .ticker-animate { animation: none; }
  .shimmer::after { animation: none; }

  /* Disable all Tailwind animate-* utilities */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7.4 Animation Budget

| Category | Max Count Per Page | Max Duration |
|----------|--------------------|--------------|
| Page enter animations | 1 container stagger | 500ms total (including stagger) |
| Hover/tap responses | Unlimited (they're reactive) | 200ms max |
| Loading animations | 3 concurrent shimmer elements | Infinite (loading state) |
| Data change animations | 2-3 simultaneous | 600ms max |
| Background animations | 1 (landing page only) | Infinite |

### 7.5 Bundle Impact

Current Framer Motion is ~30KB gzipped. No additional libraries are recommended. The shared `lib/motion.ts` config adds negligible bytes (pure JS objects).

Recharts has built-in animation; no Recharts animation plugins needed.

### 7.6 Mobile Considerations

- Disable `backdrop-filter: blur()` on devices with `navigator.hardwareConcurrency < 4`
- Reduce stagger count: on mobile, animate 3 items max then show rest instantly
- Landing page parallax ghost cards: reduce to 1 layer on mobile
- Touch drag on Pipeline: increase `activationConstraint.distance` to 10px (from 6px) to prevent accidental drags during scroll

### 7.7 Debugging

Use Framer Motion's built-in motion devtools:

```tsx
// In development only
import { MotionConfig } from 'framer-motion'

// Wrap app to slow down all animations for debugging:
<MotionConfig transition={{ duration: 2 }}>
  <App />
</MotionConfig>
```

---

## Research Sources

- [Web Design Trends 2026 - index.dev](https://www.index.dev/blog/web-design-trends)
- [SaaS Interactive Hero Animations - DEV Community](https://dev.to/uianimation/why-saas-websites-are-moving-to-interactive-hero-animations-in-2026-16l4)
- [Micro-Interactions vs Animations in SaaS - DEV Community](https://dev.to/hashbyt/micro-interactions-vs-animations-which-converts-better-and-why-it-matters-in-saas-ux-5d1l)
- [CSS/JS Animation Trends 2026 - Web Peak](https://webpeak.org/blog/css-js-animation-trends/)
- [Motion Design Expectations 2026 - TechQware](https://www.techqware.com/blog/motion-design-micro-interactions-what-users-expect)
- [Advanced Animation Patterns with Framer Motion - Maxime Heckel](https://blog.maximeheckel.com/posts/advanced-animation-patterns-with-framer-motion/)
- [Framer Motion + Tailwind 2025 Stack - DEV Community](https://dev.to/manukumar07/framer-motion-tailwind-the-2025-animation-stack-1801)
- [Framer Motion Official Docs - motion.dev](https://motion.dev/docs/react-transitions)
- [Stagger Function - Framer Motion](https://www.framer.com/motion/stagger/)
- [AnimatePresence - Framer Motion](https://motion.dev/docs/react-animate-presence)
- [Layout Animations - Framer Motion](https://motion.dev/docs/react-layout-animations)
- [useInView - Framer Motion](https://motion.dev/docs/react-use-in-view)
- [useScroll - Framer Motion](https://www.framer.com/motion/use-scroll/)
- [Kanban Board with dnd-kit - LogRocket](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/)
- [dnd-kit + Framer Motion Integration - GitHub Issue #605](https://github.com/clauderic/dnd-kit/issues/605)
- [Animated Toasts in React - LogRocket](https://blog.logrocket.com/implementing-animated-toasts-in-react/)
- [Animated Toast Recipe - buildui.com](https://buildui.com/recipes/animated-toast)
- [Animated Modal with shadcn - shadcn.io](https://www.shadcn.io/components/interactive/animated-modal)
- [Active Link Animation - Cruip](https://cruip.com/active-link-animation-with-tailwind-css-and-framer-motion/)
- [Sidebar Animation Performance - Joshua Wootonn](https://www.joshuawootonn.com/sidebar-animation-performance)
- [Recharts Animation Configuration - StudyRaid](https://app.studyraid.com/en/read/11352/354993/animation-configuration-options)
- [Glowing Input Highlights - CSS-Tricks](https://css-tricks.com/snippets/css/glowing-blue-input-highlights/)
- [Best Practices for Animating Forms - PixelFreeStudio](https://blog.pixelfreestudio.com/best-practices-for-animating-forms-and-inputs/)
- [Shimmer Loading with Tailwind - Sling Academy](https://www.slingacademy.com/article/tailwind-css-creating-shimmer-loading-placeholder-skeleton/)
- [react-countup - npm](https://www.npmjs.com/package/react-countup)
- [Table Row Animation with Framer Motion - jstodev](https://www.jstodev.com/how-to-create-a-waterfall-like-animation-for-table-rows-in-react-using-framer-motion/)
- [Dribbble Dashboard Animations](https://dribbble.com/tags/dashboard_animation)
- [Dribbble Fintech Dashboard Dark Theme](https://dribbble.com/shots/15120400-Fintech-Dashboard-Dark-Theme-User-Interface)
- [aura.build Documentation](https://www.aura.build/learn/documentation)
- [21st.dev Reviews](https://sourceforge.net/software/product/21st.dev/)
