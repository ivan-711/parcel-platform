# Landing Page Redesign — Implementation Plan

> Synthesized from 4 research agents: Stack Documentation Researcher, Research Findings Analyst, Landing Page Inspector, Codebase Architecture Inspector.
> Date: 2026-03-03

---

## SECTION 1 — PAGE ARCHITECTURE

Full landing page section order, top to bottom:

```
┌─────────────────────────────────────────────────────┐
│  1. Skip-to-content link (sr-only, focus:visible)   │  <- a11y, above everything
├─────────────────────────────────────────────────────┤
│  2. Scroll progress bar (fixed top, indigo scaleX)  │  <- fixed z-50
├─────────────────────────────────────────────────────┤
│  3. Navbar (existing + focus rings + mobile menu)   │  <- KEEP & ENHANCE
├─────────────────────────────────────────────────────┤
│  4. ParallaxBackground (existing, fixed z-0)        │  <- KEEP & ENHANCE
├─────────────────────────────────────────────────────┤
│  5. Hero (existing + cursor spotlight + trust        │  <- KEEP & ENHANCE
│     badges below CTAs)                              │
│     └── DemoCard (existing + keyboard nav)          │
├─────────────────────────────────────────────────────┤
│  6. Ticker (existing, reduce to 40s, add hover)     │  <- KEEP & ENHANCE
├─────────────────────────────────────────────────────┤
│  7. StatsStrip (count-up animation, dollar-first    │  <- ENHANCE SIGNIFICANTLY
│     reorder, icons per stat)                        │
├─────────────────────────────────────────────────────┤
│  8. Testimonials (NEW — animated carousel with      │  <- NEW SECTION
│     investor persona badges, auto-advance 5s)       │
├─────────────────────────────────────────────────────┤
│  9. FeaturesBento (existing layout + live animated  │  <- ENHANCE
│     cell content: mini KPIs, animated pipeline)     │
├─────────────────────────────────────────────────────┤
│  10. Comparison Table (NEW — Parcel vs Spreadsheets │  <- NEW SECTION
│      vs Competitors, 3-column with check/x icons)   │
├─────────────────────────────────────────────────────┤
│  11. HowItWorks (existing + visual connectors +     │  <- ENHANCE
│      improved stagger animation)                    │
├─────────────────────────────────────────────────────┤
│  12. Interactive Deal Calculator (NEW — property     │  <- NEW SECTION
│      price input → instant KPI output)              │
├─────────────────────────────────────────────────────┤
│  13. Pricing (existing + hover lift + annual toggle) │  <- ENHANCE
├─────────────────────────────────────────────────────┤
│  14. FinalCTA (strengthen glow, avatar stack,       │  <- ENHANCE SIGNIFICANTLY
│      friction-reducer copy, compliance badges)      │
├─────────────────────────────────────────────────────┤
│  15. Footer (3-column upgrade: Product | Resources  │  <- ENHANCE
│      | Legal + status dot + social icons)           │
└─────────────────────────────────────────────────────┘
```

**Rationale for order changes:**
- Testimonials (8) placed after StatsStrip to maintain momentum from quantified claims → human voices
- Comparison Table (10) placed after FeaturesBento to handle the "I already have a spreadsheet" objection before workflow explanation
- Interactive Calculator (12) placed before Pricing so a prospect who just ran numbers is primed to see tier differences

---

## SECTION 2 — COMPONENT REGISTRY

Every component needed, with source, file path, complexity, and which agent informed the decision.

### Existing Components (Keep / Enhance)

| # | Component | Source | File Path | Action | Complexity | Agent |
|---|-----------|--------|-----------|--------|------------|-------|
| 1 | `Navbar` | Custom | `components/landing/navbar.tsx` | Add focus-visible rings, mobile hamburger menu | Low | Agent 3 |
| 2 | `Hero` | Custom | `components/landing/hero.tsx` | Add cursor spotlight, compliance badges below CTAs | Medium | Agent 2, 3 |
| 3 | `DemoCard` | Custom | `components/landing/demo-card.tsx` | Add keyboard nav (arrow keys), tab hover effects | Low | Agent 3 |
| 4 | `ParallaxBackground` | Custom | `components/landing/ParallaxBackground.tsx` | Hide ghost cards on mobile (`hidden md:block`), add reduced-motion guard | Low | Agent 3 |
| 5 | `Ticker` | Custom | `components/landing/ticker.tsx` | Reduce animation to 40s, add per-deal hover effect | Low | Agent 3 |
| 6 | `StatsStrip` | Custom | `components/landing/stats-strip.tsx` | Wire useCountUp, add icons, reorder to dollar-first | Medium | Agent 2, 3 |
| 7 | `FeaturesBento` | Custom | `components/landing/features-bento.tsx` | Live cell content: mini KPIs with count-up, animated pipeline card movement | High | Agent 2, 3 |
| 8 | `HowItWorks` | Custom | `components/landing/how-it-works.tsx` | Add visual step connectors (SVG lines), improve stagger | Medium | Agent 2, 3 |
| 9 | `Pricing` | Custom | `components/landing/pricing.tsx` | Add hover lift, annual/monthly toggle | Medium | Agent 3 |
| 10 | `FinalCTA` | Custom | `components/landing/final-cta.tsx` | Avatar stack, friction copy, stronger glow, compliance badges | Medium | Agent 2, 3 |
| 11 | `Footer` | Custom | `components/landing/footer.tsx` | 3-column layout, social icons, status indicator, real links | Medium | Agent 2, 3 |

### New Components (Build)

| # | Component | Source | File Path | Complexity | Agent |
|---|-----------|--------|-----------|------------|-------|
| 12 | `ScrollProgressBar` | Custom (Framer Motion) | `components/landing/scroll-progress.tsx` | Low (1h) | Agent 2 |
| 13 | `SkipToContent` | Custom (Tailwind) | `components/landing/skip-to-content.tsx` | Low (0.5h) | Agent 2 |
| 14 | `CursorSpotlight` | Custom (Framer Motion useMotionValue + useSpring) | `components/landing/cursor-spotlight.tsx` | Medium (2h) | Agent 1, 2 |
| 15 | `TestimonialCarousel` | Custom (Framer Motion AnimatePresence) | `components/landing/testimonials.tsx` | Medium (2.5h) | Agent 2 |
| 16 | `ComparisonTable` | Custom (Tailwind + Lucide Check/X) | `components/landing/comparison-table.tsx` | Low (2h) | Agent 2 |
| 17 | `InteractiveDealCalc` | Custom (react-hook-form + zod + Recharts) | `components/landing/deal-calculator.tsx` | High (4.5h) | Agent 2 |
| 18 | `AvatarStack` | Custom (Tailwind) | `components/landing/avatar-stack.tsx` | Low (0.5h) | Agent 2 |
| 19 | `TrustBadges` | Custom (Lucide icons + Tailwind) | `components/landing/trust-badges.tsx` | Low (1h) | Agent 2 |
| 20 | `AnnualToggle` | Custom (shadcn Switch) | Inline in `pricing.tsx` | Low (1h) | Agent 3 |

### Reusable Components Already Available (No Work Needed)

| Component | Location | Relevance |
|-----------|----------|-----------|
| `KPICard` | `components/ui/KPICard.tsx` | Use inside bento cells for live metrics |
| `StrategyBadge` | `components/ui/StrategyBadge.tsx` | Use in testimonials and calculator output |
| `useCountUp` | `hooks/useCountUp.ts` | Wire into StatsStrip and bento cells |
| `Button` | `components/ui/button.tsx` | All CTAs |
| `Switch` | `components/ui/switch.tsx` | Annual/monthly pricing toggle |
| `Badge` | `components/ui/badge.tsx` | Trust badges, labels |
| `Tooltip` | `components/ui/tooltip.tsx` | Metric explanations |
| `motion.ts` | `lib/motion.ts` | fadeIn, slideUp, staggerContainer, hoverLift variants |

---

## SECTION 3 — ANIMATION PLAN

Every animation on the page, organized by section.

### Global Animations

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion Fallback |
|-----------|---------|-----|----------|--------|---------|------------------------|
| Scroll progress bar | Scroll | `useScroll` → `useTransform` → `scaleX` | Continuous | Linear | N/A | Hide entirely |
| Page-level smooth scroll | Always | Lenis `ReactLenis` root wrapper | N/A | `lerp: 0.08` | N/A | Disable Lenis, use native scroll |

### Navbar

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Backdrop blur on scroll | Scroll > 60px | Tailwind `transition-all duration-300` | 300ms | ease | Keep (functional) |
| Focus ring on nav links | Focus | Tailwind `focus-visible:ring-2 ring-accent-primary` | Instant | N/A | Keep (functional) |

### Hero Section

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion |
|-----------|---------|-----|----------|--------|---------|----------------|
| Badge pill entrance | Mount | `motion.div` initial/animate | 400ms | easeOut | Delay: 0s | Instant appear |
| Headline entrance | Mount | `motion.div` initial/animate | 500ms | [0.22, 1, 0.36, 1] | Delay: 0.1s | Instant appear |
| Subhead entrance | Mount | `motion.div` initial/animate | 500ms | [0.22, 1, 0.36, 1] | Delay: 0.2s | Instant appear |
| CTA buttons entrance | Mount | `motion.div` initial/animate | 500ms | [0.22, 1, 0.36, 1] | Delay: 0.3s | Instant appear |
| DemoCard entrance | Mount | `motion.div` initial/animate | 600ms | [0.22, 1, 0.36, 1] | Delay: 0.55s | Instant appear |
| Cursor spotlight | Mousemove | `useMotionValue` + `useSpring` on radial gradient | Continuous | Spring: damping 25, stiffness 200 | N/A | Disable (static ambient glow) |
| Background blob drift | Always (CSS) | CSS keyframes `drift1/2/3` | 15/12/18s | ease-in-out | N/A | Disable keyframes |
| Trust badges entrance | Mount | `motion.div` initial/animate | 400ms | easeOut | Delay: 0.4s | Instant appear |

### DemoCard

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Tab content swap | Click / Arrow key | `AnimatePresence mode="wait"` | 120ms crossfade | easeOut | Instant swap |
| Tab active indicator | Click | Tailwind `transition-colors` | 150ms | ease | Keep (functional) |

### Ticker

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Marquee scroll | Always (CSS) | CSS `animation: ticker 40s linear infinite` | 40s | linear | Pause animation (static) |
| Pause on hover | Hover | CSS `animation-play-state: paused` | Instant | N/A | Keep |
| Per-deal hover lift | Hover | Tailwind `hover:-translate-y-0.5 transition-transform` | 150ms | ease | Disable translate |

### StatsStrip

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion |
|-----------|---------|-----|----------|--------|---------|----------------|
| Count-up animation | Viewport entry | `useCountUp(target, 1500)` + `whileInView` | 1500ms | ease-out cubic | 100ms between stats | Show final value instantly |
| Stat card entrance | Viewport entry | `motion.div` whileInView | 350ms | snappy | 60ms per item | Instant appear |

### Testimonials (NEW)

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Card entrance | Viewport entry | `motion.div` whileInView | 500ms | smooth | Instant appear |
| Auto-advance | Timer (5s interval) | `AnimatePresence mode="wait"` | 400ms crossfade | easeInOut | Keep timer, no crossfade |
| Pause on hover | Hover | `clearInterval` / `setInterval` | N/A | N/A | Keep |

### FeaturesBento

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion |
|-----------|---------|-----|----------|--------|---------|----------------|
| Card entrance | Viewport entry | `motion.div` whileInView | 400ms | snappy | 80ms per card | Instant appear |
| Card hover lift | Hover | `hoverLift` variant (y: -2) | 200ms | spring default | N/A | Disable |
| Mini KPI count-up (large cell) | Viewport entry | `useCountUp` | 1200ms | ease-out | 200ms per KPI | Show final value |
| Pipeline card movement (bottom cell) | Viewport entry | CSS `@keyframes` translateX | 3s per cycle, 2s pause | ease-in-out | N/A | Static card positions |

### Comparison Table (NEW)

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion |
|-----------|---------|-----|----------|--------|---------|----------------|
| Table entrance | Viewport entry | `motion.div` whileInView | 400ms | smooth | N/A | Instant appear |
| Row stagger | Viewport entry | `staggerContainer(60)` | 350ms per row | snappy | 60ms | Instant appear |

### HowItWorks

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion |
|-----------|---------|-----|----------|--------|---------|----------------|
| Step entrance (slide from left) | Viewport entry | `motion.div` whileInView | 400ms | snappy | 100ms per step | Instant appear |
| Decorative number fade | Viewport entry | `motion.span` whileInView (separate) | 600ms | smooth | +150ms after step | Instant appear |
| Connector line draw | Viewport entry | SVG `pathLength` 0→1 | 800ms | easeOut | After step entrance | Static line |

### Interactive Calculator (NEW)

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Section entrance | Viewport entry | `motion.div` whileInView | 500ms | smooth | Instant appear |
| Output KPI update | Input change (debounced) | `useCountUp` on output values | 800ms | ease-out | Instant update |
| Chart redraw | Input change | Recharts `isAnimationActive` + 800ms duration | 800ms | ease-out | Instant redraw |

### Pricing

| Animation | Trigger | API | Duration | Easing | Stagger | Reduced-Motion |
|-----------|---------|-----|----------|--------|---------|----------------|
| Card entrance | Viewport entry | `motion.div` whileInView | 400ms | snappy | 70ms per tier | Instant appear |
| Card hover lift | Hover | `hoverLift` variant (y: -4, shadow increase) | 200ms | spring default | N/A | Disable |
| Annual toggle transition | Click | Tailwind `transition-all` on price text | 300ms | ease | N/A | Instant swap |
| Pro glow pulse | Always (CSS) | Tailwind `animate-pulse` on glow div, very subtle | 4s | ease-in-out | Disable |

### FinalCTA

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Section entrance | Viewport entry | `motion.div` whileInView | 500ms | smooth | Instant appear |
| Avatar stack entrance | Viewport entry | `staggerContainer(80)` | 300ms per avatar | spring | 80ms | Instant appear |
| Ambient glow breathe | Always (CSS) | CSS `animation: glow-breathe 6s ease-in-out infinite` | 6s | ease-in-out | Static glow |

### Footer

| Animation | Trigger | API | Duration | Easing | Reduced-Motion |
|-----------|---------|-----|----------|--------|----------------|
| Status dot pulse | Always (CSS) | Tailwind `animate-pulse` on green dot | 2s | ease-in-out | Static green dot |
| No other animations | — | — | — | — | Footer should feel stable and reliable |

---

## SECTION 4 — INSTALL MANIFEST

### npm Packages

**Required new install (1 package):**

```bash
cd frontend && npm install lenis
```

**Rationale:** Lenis provides smooth scroll behavior that elevates the page feel from "React app" to "Stripe-quality marketing site." Weight: ~7KB gzipped. No alternatives at this quality level.

**Already installed — no action needed:**
- `framer-motion` v11.15.0 (animations)
- `recharts` v2.14.1 (charts in calculator and bento)
- `react-hook-form` v7.71.2 (calculator inputs)
- `zod` v4.3.6 (calculator validation)
- `lucide-react` v0.468.0 (icons)
- All shadcn/ui base components (button, badge, card, switch, tooltip)

**Explicitly NOT installing:**
- `cobe` — Globe component exceeds 200KB budget (Agent 2 conflict flag)
- `aceternity-ui` npm package — unofficial, outdated; patterns will be built manually (Agent 1, 2)
- `magicui` npm package — components will be adapted manually or via shadcn registry if needed
- `gsap` — Framer Motion covers all animation needs; adding GSAP creates competing animation systems
- `canvas-confetti` — prohibited by design brief

### shadcn/ui Components to Install

```bash
cd frontend
npx shadcn@latest add separator    # section dividers
npx shadcn@latest add avatar       # testimonials, avatar stack
npx shadcn@latest add tabs         # pricing annual/monthly toggle (alternative to switch)
```

### Tailwind Config Additions

Add to `tailwind.config.js` → `theme.extend.keyframes`:

```js
keyframes: {
  // ... existing keyframes (drift1, drift2, drift3, shimmer, blink) ...
  'glow-breathe': {
    '0%, 100%': { opacity: '0.12' },
    '50%': { opacity: '0.2' },
  },
  'pipeline-slide': {
    '0%': { transform: 'translateX(0)' },
    '40%': { transform: 'translateX(0)' },
    '50%': { transform: 'translateX(calc(100% + 12px))' },
    '90%': { transform: 'translateX(calc(100% + 12px))' },
    '100%': { transform: 'translateX(0)' },
  },
}
```

Add to `theme.extend.animation`:

```js
animation: {
  // ... existing ...
  'glow-breathe': 'glow-breathe 6s ease-in-out infinite',
  'pipeline-slide': 'pipeline-slide 5s ease-in-out infinite',
}
```

### Lenis + Framer Motion Integration

Add to `components/landing/lenis-provider.tsx`:

```tsx
import { ReactLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'
import { frame, cancelFrame } from 'framer-motion'

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<ReactLenis>(null)

  useEffect(() => {
    function update(data: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(data.timestamp)
    }
    frame.update(update, true)
    return () => cancelFrame(update)
  }, [])

  return (
    <ReactLenis ref={lenisRef} root options={{ autoRaf: false, lerp: 0.08 }}>
      {children}
    </ReactLenis>
  )
}
```

**Scope:** Wrap only `Landing.tsx` — NOT the authenticated app shell (Lenis conflicts with dnd-kit on Pipeline page).

---

## SECTION 5 — IMPLEMENTATION SEQUENCE

Ordered task list a developer executes top-to-bottom. Tasks within the same phase can be parallelized. Tasks across phases are sequential.

### Phase A — Zero-Risk Foundation (no structural changes, ~3 hours)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| A1 | Add skip-to-content link | `Landing.tsx` + `skip-to-content.tsx` | 0.5 | None | Agent 2: T1-4 |
| A2 | Add focus-visible rings to all interactive landing page elements | `navbar.tsx`, `hero.tsx`, `demo-card.tsx`, `pricing.tsx`, `footer.tsx` | 1 | None | Agent 3: a11y audit |
| A3 | Update FinalCTA copy: "Analyze 5 deals free. Export to PDF. No card required." | `final-cta.tsx` | 0.25 | None | Agent 2: T1-6 |
| A4 | Add trust badges (Shield, Lock icons + text pills) below Hero CTAs | `hero.tsx` + `trust-badges.tsx` | 1 | None | Agent 2: T1-5 |
| A5 | Add trust badges to FinalCTA section | `final-cta.tsx` | 0.5 | A4 (reuse component) | Agent 2: T1-5 |
| A6 | Add avatar stack to FinalCTA | `avatar-stack.tsx` + `final-cta.tsx` | 0.5 | None | Agent 2: T2-6 |
| A7 | Upgrade Footer to 3-column (Product / Resources / Legal) + social icons + status dot | `footer.tsx` | 1 | None | Agent 2: T3-2, Agent 3 |
| A8 | Fix all broken footer `href="#"` links (stub real pages or use route paths) | `footer.tsx` | 0.25 | A7 | Agent 3 |

### Phase B — Animation System Hardening (~2 hours)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| B1 | Add `prefers-reduced-motion` global guard: wrap all CSS continuous animations in `@media` query, add `useReducedMotion()` hook check for Framer Motion continuous animations | `index.css`, `ParallaxBackground.tsx`, `ticker.tsx`, `hero.tsx` | 1 | None | Agent 2: T1-8, Agent 1: FM v11 |
| B2 | Install Lenis, create `LenisProvider` with Framer Motion RAF sync, wrap Landing.tsx only | `package.json`, `lenis-provider.tsx`, `Landing.tsx` | 1 | None | Agent 1: Lenis section |

### Phase C — Existing Section Upgrades (~5 hours, can parallelize C1-C4)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| C1 | Wire `useCountUp` into StatsStrip: parse numeric values from strings, trigger on viewport entry, reorder to dollar-denominated first stat, add small Lucide icons per stat | `stats-strip.tsx`, `constants.ts` | 1.5 | Phase B done | Agent 2: T1-1, T2-8 |
| C2 | Add scroll progress bar: thin 2px indigo bar fixed top, `scaleX` driven by `scrollYProgress` | `scroll-progress.tsx`, `Landing.tsx` | 1 | Phase B done | Agent 2: T1-3 |
| C3 | Improve HowItWorks stagger: use `staggerChildren` variant, add SVG connector lines between steps, separate decorative number fade delay | `how-it-works.tsx` | 1.5 | Phase B done | Agent 2: T1-2 |
| C4 | Ticker tweaks: reduce CSS duration from 55s to 40s, add `hover:-translate-y-0.5 transition-transform` on individual deal items | `ticker.tsx`, `index.css` | 0.5 | None | Agent 3 |
| C5 | DemoCard keyboard navigation: arrow keys cycle tabs, Enter selects, focus ring on active tab | `demo-card.tsx` | 0.5 | None | Agent 3 |

### Phase D — Hero Enhancement (~2 hours)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| D1 | Build cursor spotlight: `useMotionValue(0)` for x/y, `useSpring` for smooth follow, radial gradient background that tracks cursor position. Wrap in `@media (pointer: fine)` and `prefers-reduced-motion: no-preference`. Disable on touch devices. | `cursor-spotlight.tsx`, `hero.tsx` | 2 | Phase B done | Agent 2: T1-7, Agent 1: FM useMotionValue |

### Phase E — New Sections (~9 hours, E1-E3 can parallelize)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| E1 | Build Testimonials section: 3-5 testimonial cards with avatar initials, investor type badge (StrategyBadge), quote text, one key metric in JetBrains Mono. Auto-advance every 5s with AnimatePresence mode="wait". Pause on hover. Mobile: single card, swipe arrows. | `testimonials.tsx`, `constants.ts` | 2.5 | Phase B done | Agent 2: T2-4 |
| E2 | Build Comparison Table: 3-column (Parcel / Spreadsheets / Competitors), 8-10 feature rows, Check/X icons, Parcel column highlighted with `border-accent-primary/50`. Responsive: horizontal scroll on mobile with sticky first column. | `comparison-table.tsx` | 2 | None | Agent 2: T2-5 |
| E3 | Build Interactive Deal Calculator: left side has 3-4 inputs (purchase price, down payment %, rent estimate, strategy dropdown via shadcn Select). Right side shows 4 KPI output cards using KPICard component pattern. Mini Recharts AreaChart showing 12-month projection. Debounced computation (not API call). Simplified front-end formulas (visitor-facing approximation). Wrap with react-hook-form + zod validation. | `deal-calculator.tsx` | 4.5 | None (all deps installed) | Agent 2: T2-3 |

### Phase F — Bento & Pricing Upgrades (~5 hours)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| F1 | Animate FeaturesBento cells: (a) Large cell — replace static KPI strings with 3 mini KPICard instances triggered by whileInView count-up. (b) Pipeline cell — add CSS `pipeline-slide` keyframe animation on one deal card moving between columns. (c) All cards — add `hoverLift` variant (y: -2, shadow increase on hover). | `features-bento.tsx` | 3 | Phase C done (KPICard pattern verified) | Agent 2: T2-1 |
| F2 | Pricing enhancements: (a) Add hover lift effect on all 3 cards. (b) Add annual/monthly toggle (shadcn Switch or Tabs) with 20% discount on annual. (c) Animate price text transition on toggle. | `pricing.tsx`, `constants.ts` | 2 | None | Agent 3 |

### Phase G — Polish & Performance (~3 hours)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| G1 | Add `LazyMotion` wrapper with async `domMax` to Landing.tsx — reduces initial Framer Motion bundle by ~29KB. Use `m.div` instead of `motion.div` inside the boundary (or keep motion.div if not using strict mode). | `Landing.tsx` | 1 | All phases done | Agent 1: FM LazyMotion |
| G2 | Hide ParallaxBackground ghost cards on mobile: `hidden md:block` on the cards container. Keep dot grid and blobs visible on all sizes. | `ParallaxBackground.tsx` | 0.25 | None | Agent 3 |
| G3 | Lazy-load below-fold sections: wrap Testimonials, ComparisonTable, InteractiveDealCalc, Pricing, FinalCTA in `React.lazy()` + `<Suspense fallback={<SkeletonCard />}>` | `Landing.tsx` | 1 | All sections built | Agent 1: React 18 |
| G4 | Run Lighthouse audit. Target: Performance 90+, Accessibility 95+, Best Practices 95+. Fix any issues found. | N/A (audit) | 1 | All phases done | Agent 2: constraints |
| G5 | Run `npx tsc --noEmit` and `npm run build` — fix any TypeScript errors or build warnings | N/A (verification) | 0.5 | All phases done | CLAUDE.md |

### Phase H — Tier 3 Picks (Optional, ~5 hours, pick 2 maximum)

| # | Task | File Target | Hours | Dependencies | Agent Reference |
|---|------|-------------|-------|--------------|-----------------|
| H1 | Magnetic cursor CTA button: `useMotionValue` + `useSpring` on button x/y within ±8px magnetic radius. Apply to Hero "Get Started Free" and FinalCTA button. Disable on touch. | `hero.tsx`, `final-cta.tsx` | 2.5 | Phase D done | Agent 2: T3-1 |
| H2 | Animated beam in bento: SVG `<path>` from "Document Upload" → "Claude AI" → "Analysis Output" nodes, `motion.circle` traveling along path using `offsetDistance`. Contained in one bento cell. | `features-bento.tsx` | 3.5 | Phase F done | Agent 2: T3-3 |

---

## SECTION 6 — RISK AND TRADE-OFF LOG

### Resolved Conflicts

| # | Conflict | Resolution | Source |
|---|----------|------------|--------|
| 1 | **Aceternity UI not compatible without adaptation** — imports from `motion/react`, uses Tailwind v4 `@theme inline` syntax, some components are 15-40KB each | DO NOT install Aceternity UI as a library. Extract patterns and implement manually using existing Framer Motion + Tailwind v3 stack. Convert all `@theme inline` keyframes to `tailwind.config.js extend.keyframes`. | Agent 1, 2 |
| 2 | **Lamp Effect violates design brief** — design brief says "Motion only supports comprehension — never decorative." Lamp Effect is purely decorative. | DO NOT implement Lamp Effect. Keep existing FinalCTA ambient glow; increase intensity from `rgba(99,102,241,0.08)` to `rgba(99,102,241,0.15)` and add breathe animation. | Agent 2 |
| 3 | **Shimmer/Rainbow CTA buttons conflict with design system** — design brief specifies "indigo filled, 44px height" CTAs with `transition-colors duration-150` | DO NOT implement animated button borders. Use existing indigo button with a subtle `box-shadow` on hover: `hover:shadow-lg hover:shadow-accent-primary/20`. | Agent 2 |
| 4 | **Globe component exceeds 200KB budget** — `cobe` WebGL globe is 100-300KB | DO NOT install Globe. If geographic visualization is needed later, use a static SVG US map or Recharts BarChart by market. | Agent 1, 2 |
| 5 | **CSS `animation-timeline` not in Tailwind v3** — v4 only feature, 88% browser support | DO NOT use CSS scroll-driven animations. Use Framer Motion `useScroll` + `useTransform` for all scroll-linked animations (proven in existing `ParallaxBackground.tsx`). | Agent 1, 2 |
| 6 | **Lenis conflicts with dnd-kit** — Lenis intercepts scroll events, breaks drag-and-drop | Scope `ReactLenis` wrapper to Landing.tsx ONLY. Do not apply to authenticated app routes (Pipeline page uses dnd-kit). | Agent 1 |
| 7 | **Lenis + Framer Motion RAF conflict** — competing requestAnimationFrame loops | Use `autoRaf: false` on Lenis + `frame.update()` sync from Framer Motion. Pattern documented in install manifest. | Agent 1 |
| 8 | **Lenis breaks position: sticky** — may affect sticky scroll sections | Test any sticky scroll implementations (HowItWorks upgrade if applied) specifically with Lenis enabled. Fallback: disable Lenis on that section. | Agent 1 |
| 9 | **Cursor tracking perf (spotlight + magnetic button)** — naive `useState` on mousemove causes layout thrash | Use Framer Motion `useMotionValue` + `useSpring` exclusively (bypasses React render cycle). NEVER use `useState` for pointer position. Pattern already proven in `ParallaxBackground.tsx`. | Agent 1, 2 |
| 10 | **Framer Motion v11 AnimatePresence fast-state bug** — when state changes very quickly, AnimatePresence may get stuck | Known issue in FM v11.0.12. Mitigate by ensuring DemoCard tab switches are debounced (120ms mode="wait" already provides natural debounce). | Agent 1 |

### Performance Risks

| Risk | Mitigation |
|------|------------|
| Initial JS bundle exceeds 200KB | LazyMotion reduces FM by ~29KB. React.lazy on below-fold sections code-splits them. Lenis is only 7KB. No new heavy deps added. |
| Recharts in calculator adds to bundle | Already installed app-wide; no additional bundle cost for landing page. The AreaChart component is shared. |
| Too many scroll event listeners | Framer Motion's `useScroll` uses a single passive scroll listener shared across all hooks. Lenis RAF sync ensures single tick loop. |
| Ghost card parallax on low-end mobile | Hide ghost cards on mobile (`hidden md:block`). Dot grid + blobs remain (CSS-only, GPU-composited). |
| Count-up animations running off-screen | All count-ups gated by `viewport={{ once: true }}` / `whileInView`. `useCountUp` only activates when `isInView = true`. |

### Accessibility Concerns

| Concern | Resolution |
|---------|------------|
| No skip-to-content link on landing page | Phase A1: add `<a href="#main-content" className="sr-only focus:not-sr-only">` above navbar |
| Focus rings not visible on interactive elements | Phase A2: add `focus-visible:ring-2 ring-accent-primary ring-offset-2 ring-offset-app-bg` to all links, buttons, tabs |
| DemoCard tabs not keyboard-navigable | Phase C5: add `onKeyDown` handler for ArrowLeft/Right to cycle tabs, Enter to select |
| Continuous animations for vestibular disorder users | Phase B1: global `prefers-reduced-motion` guard on all CSS keyframes + `useReducedMotion()` for Framer Motion continuous animations |
| Ticker/carousel auto-advance is inaccessible | Add `aria-live="polite"` to carousel content region; pause on focus (not just hover) |
| Comparison table may be hard to read on screen reader | Add `scope="col"` on header cells, `aria-label` on Check/X icons ("Parcel: Yes", "Spreadsheets: No") |

---

## SECTION 7 — AGENT SUMMARY

### Agent 1 — Stack Documentation Researcher
**Mission:** Research current best practices, new APIs, and deprecated patterns across React 18, Tailwind v3, shadcn/ui, Framer Motion v11, Recharts, Aceternity UI, Magic UI, and Lenis.

**Key Findings:** Framer Motion's `LazyMotion` reduces initial bundle by ~29KB (critical for 200KB budget). Aceternity UI and Magic UI both require import translation from `motion/react` to `framer-motion` and Tailwind v4-to-v3 config syntax conversion. Lenis requires `autoRaf: false` with Framer Motion RAF sync to prevent competing animation loops. `useMotionValue` + `useSpring` is the correct cursor-tracking pattern (bypasses React render). CSS `animation-timeline` is v4-only and should not be used. The Globe component (via `cobe`) is 100-300KB and must be excluded.

**Influence on Plan:** Shaped the Install Manifest (Lenis sync pattern), Performance strategy (LazyMotion), and resolved 5 of 10 conflicts in the Risk Log.

### Agent 2 — Research Findings Analyst
**Mission:** Analyze the comprehensive fintech landing page research document and produce a tiered, actionable feature priority list tailored to Parcel's real estate analysis context.

**Key Findings:** Produced 21 prioritized features across 3 tiers. All Tier 1 (7.25h) and Tier 2 (24.5h) recommendations require zero new npm packages — they build entirely on existing infrastructure (useCountUp, KPICard, Framer Motion, Recharts, react-hook-form, zod). Identified 8 critical conflicts: Lamp Effect violates design brief, Globe exceeds bundle budget, CSS animation-timeline incompatible with Tailwind v3, Shimmer/Rainbow buttons conflict with indigo-only design system. Recommended comparison table and interactive calculator as highest-ROI new sections for Parcel specifically (real estate investors are number-oriented; the "but I have a spreadsheet" objection is the primary conversion barrier).

**Influence on Plan:** Defined the entire Implementation Sequence ordering, page architecture section layout, and all Tier ratings. The 6-phase dependency map became the backbone of the execution order.

### Agent 3 — Landing Page Inspector
**Mission:** Audit every file contributing to the current landing page, producing a section-by-section quality assessment with keep/extend/replace recommendations.

**Key Findings:** Rated landing page 7.5/10 — "Good but not Fintech-Grade." All 11 existing sections rated "KEEP & ENHANCE" (none need replacement). Key gaps: no micro-interactions (hover effects, scale shifts), no social proof beyond static stats, no count-up animation despite useCountUp hook being available, no keyboard navigation on DemoCard tabs, accessibility gaps (no focus-visible rings, no aria-labels on decorative elements), broken footer links (all `href="#"`). ParallaxBackground.tsx at 276 lines is the most sophisticated existing component, demonstrating the team already handles Framer Motion scroll-linked animations proficiently.

**Influence on Plan:** Determined that no section needs rebuilding from scratch, reducing scope significantly. Every "ENHANCE" recommendation mapped directly to a specific implementation task. The accessibility audit defined Phase A priorities.

### Agent 4 — Codebase Architecture Inspector
**Mission:** Catalog the full frontend infrastructure to prevent the implementation plan from duplicating existing work or creating inconsistencies.

**Key Findings:** Documented all 35 production dependencies with exact versions, 18 installed shadcn/ui components, the complete `motion.ts` animation system (durations, easings, springs, 10 exported variants), and all reusable components. Confirmed that KPICard (count-up + sparkline + delta badge), StrategyBadge (5 strategies), CashFlowProjection (Recharts AreaChart), useCountUp, useShake, and useDebouncedValue are all production-ready and directly reusable. The established pattern for pages (AppShell → PageHeader → PageContent), data fetching (React Query hooks), and animation (motion.ts variants) means every new component must follow these conventions. TypeScript strict mode with path alias `@/` → `src/` is confirmed.

**Influence on Plan:** Prevented recommending any duplicate infrastructure. Confirmed zero new dependencies needed for Tier 1 and Tier 2 features. The component registry references exact file paths from this audit. Every new component in the plan follows the naming conventions (kebab-case files, PascalCase exports) documented by this agent.

---

## TOTAL ESTIMATED EFFORT

| Phase | Hours | New Deps |
|-------|-------|----------|
| A — Zero-Risk Foundation | 4 | 0 |
| B — Animation Hardening | 2 | 1 (lenis) |
| C — Section Upgrades | 5 | 0 |
| D — Hero Enhancement | 2 | 0 |
| E — New Sections | 9 | 0 |
| F — Bento & Pricing | 5 | 0 |
| G — Polish & Performance | 2.75 | 0 |
| **Total (Tier 1 + 2)** | **~30h** | **1 package** |
| H — Tier 3 (optional, pick 2) | +5.5 | 0 |
