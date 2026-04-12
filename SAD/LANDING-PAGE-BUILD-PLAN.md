# Landing Page Build Plan — "The Architect"

**Date:** 2026-04-09
**Inputs:** LANDING-PAGE-CREATIVE-DIRECTIONS.md (Chosen Direction), LANDING-PAGE-REDESIGN-RESEARCH.md, component inventory audit, shadcn registry scan, impeccable.style skills

---

## Component & Pattern Discovery Results

### shadcn/ui — Already Installed
badge, button, card, dialog, alert-dialog, input, label, popover, select, sheet, sonner, switch, tooltip

### shadcn/ui — Available & Needed
| Component | Section | Install Command |
|-----------|---------|----------------|
| `accordion` | Strategy Breakdown (Section 5) | `npx shadcn@latest add @shadcn/accordion` |
| `tabs` | Strategy Breakdown (Section 5) | `npx shadcn@latest add @shadcn/tabs` |
| `separator` | Visual dividers | `npx shadcn@latest add @shadcn/separator` |
| `avatar` | Testimonials/Social Proof | `npx shadcn@latest add @shadcn/avatar` |
| `toggle-group` | Pricing monthly/annual | Already custom-built, no need |

### impeccable.style — 21 Skills Available
Key skills for the build: `/audit` (technical quality), `/polish` (refinement), `/typeset` (typography), `/animate` (motion), `/arrange` (layout), `/critique` (design review), `/optimize` (performance)

### 21st.dev — Limited Usefulness
Primarily AI chat components, not landing page sections. Skip for this project.

### Existing Components — Reuse Summary
| Component | Verdict | Notes |
|-----------|---------|-------|
| LandingPage.tsx | **KEEP** | Remove scroll hijack refs |
| HeroSection.tsx | **REPLACE** | New scroll-sync video hero |
| SpiralBackground.tsx | **DELETE** | GSAP removal |
| FeatureSection.tsx | **KEEP** | Replace placeholder images |
| FeatureSections.tsx | **KEEP** | Update copy if needed |
| StatsStrip.tsx | **KEEP** | Already high quality |
| HowItWorks.tsx | **KEEP** | Maps to "How It Works" (Section 4) |
| PricingSection.tsx | **KEEP** | Already polished |
| Testimonials.tsx | **KEEP** | Add real avatars later |
| CTASection.tsx | **KEEP** | Update copy per spec |
| Footer.tsx | **KEEP** | Minimal changes |
| navbar.tsx | **KEEP** | Excellent as-is |
| landing-utils.ts | **KEEP** | Essential hooks |
| constants.ts | **KEEP** | Data-driven copy |
| BackgroundPaths.tsx | **EVALUATE** | Unused, possible accent |

---

## Build Plan — 10 Sections

### Section 1: Hero — Scroll-Driven Building Assembly

**Status:** REPLACE `HeroSection.tsx` + DELETE `SpiralBackground.tsx`

**Component sources:**
- New `HeroSection.tsx` — custom component, no shadcn needed
- Framer Motion `useScroll` + `useTransform` for scroll-video sync
- Lenis for smooth scroll normalization
- HTML5 `<video>` element (no Three.js)

**Reuse vs rebuild:**
- REPLACE: Entire HeroSection.tsx (307 lines → ~120 lines)
- DELETE: SpiralBackground.tsx (375 lines)
- KEEP: Skip link accessibility pattern from current hero (lines 184-191)
- KEEP: Navbar interaction callback (`onSkipHijack` → rename to `onScrollPast`)

**Animation spec:**
```
Entry: Headline fades in (opacity 0→1, y: 8→0, 400ms, ease-luxury)
Scroll: <video> currentTime = scrollProgress * video.duration
  - scrollProgress from Framer Motion useScroll({ target: heroRef, offset: ["start start", "end start"] })
  - Mapped via useTransform to video.currentTime in a useMotionValueEvent or RAF callback
Headline exit: opacity 1→0 mapped to scrollProgress 0.6→1.0 via useTransform
Reduced motion: Static completed building image, no scroll sync
Mobile: Video autoplays as loop (no scroll sync), 720p
```

**Copy:**
```
Headline (Satoshi 300, 56px): "We build the full picture."
Subhead (Inter 400, 16px, text-secondary): "AI-powered deal analysis across 5 investment strategies. Any US address. Under 60 seconds."
```

**Design notes:**
- Full viewport height (100vh), #0C0B0A background
- Video fills 80% of viewport width, centered, rounded-lg corners
- Headline overlays video with text-shadow for legibility
- No decorative gradients or particles — the video IS the visual
- Video files: `/public/videos/building-assembly.webm` (VP9, ~1-2MB) + `.mp4` (H.264, ~2-3MB)
- Preload `metadata` only. Full load on viewport entry via IntersectionObserver.

**Video generation (pre-build task):**
1. Nano Banana 2 (2048 res): Image A = partially constructed building, Image B = fully assembled
2. Wan 2.7: Start frame A → End frame B → 3-5 second transition
3. Export as WebM + MP4

---

### Section 2: Product Preview — Real App Screenshots

**Status:** NEW section (doesn't exist in current landing page)

**Component sources:**
- Reuse `FeatureSection.tsx` layout pattern (two-column, alternating)
- Wrap screenshots in browser chrome frame (adapt from current HeroSection lines 246-302)
- No new shadcn components needed

**Reuse vs rebuild:**
- REUSE: `FeatureSection.tsx` component structure
- ADAPT: Browser chrome mockup from current HeroSection
- NEW: Screenshot images (placeholders initially, real screenshots when analysis page is polished)

**Animation spec:**
```
Entry: Framer Motion whileInView
  - opacity: 0→1, y: 24→0
  - duration: 0.6s, ease: ease-luxury
  - Stagger: text block 0ms, image 100ms
Hover: Browser frame lifts 2px, shadow transitions to card-hover (300ms)
```

**Copy:**
```
Label (Inter 500, 11px, caps tracking, text-muted): "THE PRODUCT"
Headline (Satoshi 300, 40px): "See every angle of the deal."
Description (Inter 400, 16px, text-secondary): "Parcel analyzes any US property across wholesale, BRRRR, buy & hold, flip, and creative finance — with AI-narrated insights, risk scoring, and 14 financial calculators."
```

**Design notes:**
- Two or three screenshot showcases in alternating layout
- Browser chrome frame: dark with subtle border, rounded-xl, edge-highlight
- Screenshots can be placeholder gradient/grid patterns (existing pattern from FeatureSection) until real ones are ready
- This section IS `FeatureSections.tsx` repurposed — just update the FEATURES array for product-focused content

---

### Section 3: Problem — Confrontational Statement

**Status:** NEW section

**Component sources:**
- No shadcn components — pure styled div with text
- Framer Motion for subtle entrance

**Reuse vs rebuild:**
- NEW: Simple component, ~30 lines

**Animation spec:**
```
Entry: whileInView, opacity: 0→1, duration: 0.8s, ease: ease-luxury
No hover, no interaction. Static text. Words do the work.
```

**Copy:**
```
Main line (Satoshi 300, 32px, text-primary, centered):
"You're running numbers across 4 tabs, 3 spreadsheets, and a prayer."

Sub line (Inter 400, 16px, text-muted, centered, mt-4):
"Your competitor just did it in 60 seconds."
```

**Design notes:**
- Full-width section, generous vertical padding (py-24 md:py-32)
- #0C0B0A background (seamless with hero)
- Max-width 640px for the text block (tight column for impact)
- No cards, no borders, no decoration. Just two lines of centered text.
- The contrast between the large Satoshi headline and the small Inter subline creates tension

---

### Section 4: How It Works — 3-Step Flow

**Status:** KEEP `HowItWorks.tsx` as-is

**Component sources:**
- Existing `HowItWorks.tsx` (86 lines) — already clean
- Lucide icons: Building2, Calculator, CheckCircle2 (already imported)

**Reuse vs rebuild:**
- KEEP: Entire component unchanged
- Optional: Update step descriptions for tighter copy

**Animation spec (already implemented):**
```
Entry: Framer Motion staggered whileInView
  - Each card: opacity 0→1, y: 16→0
  - Stagger: i * 0.15s delay
  - Duration: 0.6s, ease: ease-vercel
Desktop: Dashed connecting line between steps (CSS border-dashed)
```

**Copy (current, keep):**
```
01. Input Your Deal → "Enter a property address or paste deal details. Parcel handles the rest."
02. Get Instant Analysis → "Five strategy calculators run simultaneously, powered by real-time market data and AI."
03. Make Confident Decisions → "See which strategy maximizes your returns — backed by data, not guesswork."
```

**Design notes:**
- bg-app-surface cards with border-default, rounded-xl
- Step numbers in violet (#8B7AFF)
- Mobile: stacks vertically, dashed line becomes vertical

---

### Section 5: Strategy Breakdown — Tabbed/Accordion

**Status:** REPLACE the 5 alternating `FeatureSections` blocks with a compact tabbed layout

**Component sources:**
- Install `@shadcn/tabs` — cleaner than 5 full-width alternating blocks
- Existing `constants.ts` for strategy data (STRATEGIES, STRATEGY_COLORS, DEMO_METRICS)
- Existing `StrategyBadge.tsx` from `ui/` (already installed)

**Reuse vs rebuild:**
- REPLACE: The 5 `FeatureSection` blocks with a single `Tabs` component
- REUSE: Strategy copy from `constants.ts` DEMO_METRICS
- REUSE: Strategy colors from STRATEGY_COLORS
- NEW: Tab content layout showing key metrics per strategy

**Animation spec:**
```
Section entry: whileInView, opacity: 0→1, y: 16→0, 0.6s, ease-luxury
Tab switch: Content fades (opacity 0→1, 150ms, ease-luxury). No slide.
```

**Copy:**
```
Label: "STRATEGIES"
Headline (Satoshi 300, 40px): "Five strategies. One address."
Tab labels: Wholesale | BRRRR | Buy & Hold | Flip | Creative Finance

Per tab:
- Strategy name + color badge
- 3 key metrics it calculates (e.g., "Cap Rate · Cash-on-Cash · DSCR")
- One-line explanation
- Example output snippet from DEMO_METRICS
```

**Design notes:**
- Tabs bar: horizontal, pill-style active state with strategy color
- Tab content: single card, max-width 800px, centered
- Background: app-recessed or subtle gradient
- Much more compact than 5 full-width alternating sections — better for mobile and cognitive load
- Install tabs: `npx shadcn@latest add @shadcn/tabs`

---

### Section 6: AI Narrative Demo — Peak Moment (Typing Reveal)

**Status:** NEW section (the signature interaction)

**Component sources:**
- Framer Motion `useMotionValue` + `animate` for character-by-character typing
- CSS `@keyframes blink` for cursor (already exists in design system)
- Glass-style card (`.glass` utility from index.css)
- Badge component (already installed) for confidence indicator

**Reuse vs rebuild:**
- NEW: ~80 lines, custom component
- REUSE: `.glass` CSS utility, Badge component, existing easing

**Animation spec:**
```
Card entry: whileInView, opacity: 0→1, y: 16→0, 0.5s, ease-luxury
Typing trigger: Starts 300ms after card enters viewport
Typing speed: 30ms per character, 200ms pause on ".", 100ms on ","
Cursor: CSS blink animation (opacity 0→1, 530ms), disappears after typing completes
Badge reveal: "Confidence: HIGH" fades in 500ms after typing completes (opacity 0→1, scale 0.95→1)
  - Badge has subtle green glow: box-shadow 0 0 12px rgba(109, 190, 163, 0.2)
```

**Copy:**
```
Label: "AI-POWERED INSIGHTS"
Headline (Satoshi 300, 40px): "Not just numbers — narrative."

Typing text (Inter 400, 16px, inside glass card):
"The data shows an 8% equity cushion — tight for a 1965 build. At 7.25% financing, monthly cash flow is $127 — positive but thin. Consider negotiating below asking or budgeting 7-8% for CapEx given the age."

Badge: "Confidence: HIGH" (green accent, small)

Below card (Inter 400, 14px, text-muted):
"Every analysis includes an AI-generated narrative that speaks like an analyst, not a chatbot."
```

**Design notes:**
- Glass card: `backdrop-filter: blur(20px); background: rgba(12,11,10,0.75); border: 1px solid rgba(255,255,255,0.06)`
- Edge highlight on card top (`.edge-highlight` utility)
- Generous inner padding (p-8)
- Max-width 640px, centered
- The typing animation MUST work on reduced motion — fallback: full text appears instantly

---

### Section 7: Social Proof — Stats + Trust Signals

**Status:** KEEP `StatsStrip.tsx` — already high quality

**Component sources:**
- Existing `StatsStrip.tsx` (78 lines) — count-up animation, responsive grid
- Existing `useCountUp` hook from `landing-utils.ts`

**Reuse vs rebuild:**
- KEEP: Entire component unchanged
- Optional: Update stat numbers if needed

**Animation spec (already implemented):**
```
Count-up: useCountUp(target, 800ms, easeOutCubic)
Triggered: whileInView via IntersectionObserver
```

**Copy (current, keep or update):**
```
5 → "Strategy Calculators"
10,000+ → "Deals Analyzed"
98% → "Calculation Accuracy"
30sec → "Average Analysis Time"
```

**Design notes:**
- bg-app-recessed with border-subtle top/bottom
- 4-column grid (desktop), 2x2 (mobile)
- Dividers between items
- Already well-polished — don't touch

---

### Section 8: Pricing — Steel / Carbon / Titanium

**Status:** KEEP `PricingSection.tsx` — already polished

**Component sources:**
- Existing `PricingSection.tsx` (210 lines)
- AnimatePresence for price toggle
- All pricing data from constants.ts

**Reuse vs rebuild:**
- KEEP: Entire component unchanged
- The pricing section is one of the strongest parts of the current page

**Animation spec (already implemented):**
```
Section entry: whileInView, staggered card entrance
Price toggle: AnimatePresence mode="wait", y: -8→0, opacity 0→1, 200ms
Card hover: translate-y -2px, shadow transition
```

**Copy (current, keep):**
```
Steel: $0/mo — 3 analyses, 5 AI messages, 5 deals
Carbon: $79/mo ($63 annual) — Unlimited analyses, 150 AI, pipeline, portfolio, docs
Titanium: $149/mo ($119 annual) — Everything + 500 AI, 5 team members, direct mail
```

**Design notes:**
- Carbon card: violet border glow (border-[#8B7AFF]/25, shadow violet)
- "MOST POPULAR" badge on Carbon
- "Save 20%" badge on annual toggle
- 7-day free trial callout
- Don't touch — it works

---

### Section 9: CTA — Final Conversion

**Status:** KEEP `CTASection.tsx` with copy update

**Component sources:**
- Existing `CTASection.tsx` (46 lines)
- Button component (already installed)

**Reuse vs rebuild:**
- KEEP: Component structure and animation
- UPDATE: Copy per chosen direction

**Animation spec (already implemented):**
```
Entry: whileInView, opacity 0→1, y: 16→0, 0.6s, ease-vercel
```

**Copy (UPDATE):**
```
Headline (Satoshi 300, 32px): "Ready to see what your next deal is really worth?"
Description (Inter 400, 16px, text-secondary): "Join investors making data-driven decisions with AI-powered analysis."
Button: "Get Started Free" (violet gradient)
Sub-button: "No credit card required" (text-muted, 12px)
```

**Design notes:**
- Ambient violet gradient background (existing)
- Keep simple — one headline, one button, one reassurance line
- The CTA should feel like a natural conclusion, not a hard sell

---

### Section 10: Footer — Links & Legal

**Status:** KEEP `Footer.tsx` as-is

**Component sources:**
- Existing `Footer.tsx` (92 lines)

**Reuse vs rebuild:**
- KEEP: Entire component unchanged

**Copy (current, keep):**
```
Columns: Product (Features, Pricing) | Company (About, Blog, Contact) | Legal (Terms, Privacy)
Tagline: "Real estate deal analysis for serious investors."
Copyright: "© 2026 Parcel. All rights reserved."
```

**Design notes:**
- bg-app-recessed, border-subtle top border
- Responsive 4-column → 2-column on mobile
- Minimal — don't over-design the footer

---

## New Components to Create

| # | Component | Lines (est.) | Purpose |
|---|-----------|-------------|---------|
| 1 | `HeroSection.tsx` (rewrite) | ~120 | Scroll-driven video hero |
| 2 | `ProblemSection.tsx` | ~30 | Confrontational two-line statement |
| 3 | `AINarrativeDemo.tsx` | ~80 | Typing reveal peak moment |
| 4 | `StrategyTabs.tsx` | ~100 | 5-strategy tabbed breakdown |
| 5 | `ProductPreview.tsx` | ~60 | App screenshots section |

## Files to Delete

| File | Reason |
|------|--------|
| `SpiralBackground.tsx` (375 lines) | GSAP removal, replaced by scroll-sync video |

## shadcn Components to Install

```bash
npx shadcn@latest add @shadcn/tabs
```

## Pre-Build Asset Requirements

Before coding starts, these assets must exist:
1. **Building assembly video** — generated via Nano Banana 2 + Wan 2.7
   - WebM (VP9, ~1-2MB) at `/public/videos/building-assembly.webm`
   - MP4 (H.264, ~2-3MB) at `/public/videos/building-assembly.mp4`
   - Fallback static image at `/public/images/building-complete.webp`
2. **App screenshots** (optional, can use placeholders initially)

## Build Order

| Phase | Sections | Effort | Dependencies |
|-------|----------|--------|-------------|
| **1** | Hero (scroll video) | Large | Video asset must exist |
| **2** | Problem + AI Narrative Demo | Small | None |
| **3** | Strategy Tabs + Product Preview | Medium | Install @shadcn/tabs |
| **4** | Orchestrator update (LandingPage.tsx) | Small | Phases 1-3 |
| **5** | Polish pass (`/impeccable audit`) | Small | Phase 4 |

Sections that are KEPT (HowItWorks, StatsStrip, Pricing, CTA, Footer, Navbar) require zero build effort.

## Section Order on Page

```
LandingPage.tsx (orchestrator)
├── LandingNavbar ............... KEEP (scroll-aware glass pill)
├── HeroSection ................. REBUILD (scroll-driven video)
├── ProductPreview .............. NEW (app screenshots)
├── ProblemSection .............. NEW (confrontational statement)
├── HowItWorks .................. KEEP (3-step flow)
├── StrategyTabs ................ NEW (replaces 5x FeatureSections)
├── AINarrativeDemo ............. NEW (typing reveal, peak moment)
├── StatsStrip .................. KEEP (social proof counters)
├── PricingSection .............. KEEP (Steel/Carbon/Titanium)
├── CTASection .................. KEEP (copy update only)
└── Footer ...................... KEEP (minimal)
```

## Verification Checklist

After build:
- [ ] `npx tsc --noEmit` — clean
- [ ] `npx vite build` — succeeds, no GSAP in bundle
- [ ] `/impeccable audit` on landing page — score 3+ on all 5 dimensions
- [ ] Scroll-driven video plays forward/backward correctly
- [ ] AI narrative typing animation fires once on viewport entry
- [ ] All sections lazy-loaded below hero
- [ ] Reduced motion: all animations disabled, static fallbacks work
- [ ] Mobile (375px): all sections stack properly, video autoplays as loop
- [ ] Lighthouse: LCP < 3s, FID < 100ms
- [ ] No GSAP imports remain in the landing page code
- [ ] Lenis smooth scroll active
