# Landing Page Redesign V2 — Comprehensive Spec

> Synthesized from 12 parallel subagent audits (Hero Critic, Visual Rhythm Designer,
> Micro-Interaction Specialist, Typography Purist, Conversion Optimizer, Animation Director,
> Mobile Critic, Problem Section Redesigner, Social Proof Strategist, Product Preview Reimaginer,
> Dark Theme Specialist, CTA & Pricing Critic).
>
> Quality bar: Linear, Stripe, Vercel, Apple, fey.com
> Date: 2026-04-09

---

## 1. Section-by-Section Redesign Spec

### 1.1 Hero Section

**Problems identified:**
- Headline "We build the full picture" is abstract — doesn't communicate what Parcel does
- Left/right split layout underuses the 121-frame animation
- Zero trust signals in the hero
- "Get Started Free" is safe but not urgent
- Mobile: static fallback image with translate-x-[25%] can overlap text on narrow screens

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Headline | "We build the full picture." | **"Every deal. Every angle. 60 seconds."** |
| Subhead | "AI-powered deal analysis across 5 investment strategies..." | **"Analyze any US property across wholesale, BRRRR, buy & hold, flip, and creative finance — with AI narrative."** |
| CTA text | "Get Started Free" | **"Analyze Your First Deal Free"** |
| CTA disclaimer | "No credit card required" | **"No credit card required. Results in 60 seconds."** |
| Trust line | (none) | **Add below CTA: "Trusted by 500+ real estate investors"** in text-xs text-text-muted |
| H1 line-height | 1.1 | **1.08** (tighter, more Apple-like) |
| font-medium span | "full picture." | **"60 seconds."** in the new headline |
| Mobile image | translate-x-[25%] visible | **hidden on mobile** — show text-only hero with bg gradient on small screens |

**File:** `HeroSection.tsx`

---

### 1.2 StatsStrip

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Stats count | 4 stats | **Keep 4** (adding more creates clutter) |
| Stat labels | "Strategy Calculators", "Deals Analyzed", "Calculation Accuracy", "Average Analysis Time" | **Rename:** "Investment Strategies", "Deals Analyzed", "Accuracy Rate", "Avg. Analysis" |
| Stagger | delay: index * 0.1 | Keep as-is (already good) |

**File:** `StatsStrip.tsx`

---

### 1.3 ProblemSection

**Problems identified:**
- Just two lines of text — not enough for the "tension" section
- No visual reinforcement of the pain point
- "60 seconds" in subtext is buried

**Changes (Concept 2 from Problem Redesigner):**

| Element | Current | New |
|---------|---------|-----|
| Headline | Single line | **Staggered line-by-line reveal** — each clause fades in separately with 120ms delay |
| Visual element | None | **Add animated counter icons** below headline: three pill badges showing "4 Tabs", "3 Spreadsheets", "1 Prayer" that fade+scale in staggered |
| Subtext | Static | **"60 seconds"** gets a count-up animation from 0 to 60 on viewport entry |
| Background | bare #0C0B0A | **Add subtle grain texture overlay** at 5% opacity for depth |

**File:** `ProblemSection.tsx`

---

### 1.4 ProductPreview

**Problems identified:**
- Placeholder gray boxes are the weakest element on the page
- Supposed to SHOW the product but shows nothing
- Kills credibility before the user reaches pricing

**Changes (Concept 1 from Product Preview Reimaginer — Structured Mockup):**

Left browser frame — "Deal Analysis":
- Address input bar: "250 Oak St, Austin TX 78704" in monospace
- 3-column KPI grid: Cap Rate (7.2%), Monthly Cash Flow ($1,240/mo), ROI (18.4%)
- Strategy badges using existing token colors (BRRRR blue, Buy & Hold green)
- Numbers count up on viewport entry

Right browser frame — "AI Narrative":
- Flowing narrative text mimicking the AI output
- Key metrics inline colored with profit green (#7CCBA5) and loss red (#D4766A)
- Text reveals line-by-line with typing effect or stagger

**File:** `ProductPreview.tsx` — replace placeholder divs with `DealAnalysisPreview` and `NarrativePreview` components

---

### 1.5 HowItWorks

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Step numbers | Static "01", "02", "03" | **Count up** as section scrolls into view |
| Card hover | y:-8, scale:1.02 | Keep — already satisfying |
| Icons | Static Lucide icons | **Add scale:1.1 on card hover** so icon lifts with card |
| Border | border-t border-border-default | **Gradient fade border** — `bg-gradient-to-r from-transparent via-border-default to-transparent h-px` |

**File:** `HowItWorks.tsx`

---

### 1.6 StrategyTabs

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Background | bg-app-surface | Keep (good contrast) |
| Tab indicator | Active tab gets background color | **Add `layoutId` sliding indicator** for smooth tab switch animation |
| Tab content card | border-border-default | **hover:border-border-strong** transition (already added) |
| Content transition | AnimatePresence crossfade | **Add y:-8/+8 on enter/exit** for more directional motion |
| Section padding | py-16 md:py-24 | **py-20 md:py-32** (generous — deserves it as interactive section) |

**File:** `StrategyTabs.tsx`

---

### 1.7 AINarrativeDemo (PEAK Moment)

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Background | bare #0C0B0A | **Add radial green glow** behind glass card: `radial-gradient(circle 400px at 50% 50%, rgba(109,190,163,0.08), transparent 70%)` |
| Glass card border | Static | **Add pulse-glow animation**: border color breathes between rgba(255,255,255,0.06) and rgba(109,190,163,0.12) over 4s |
| Confidence badge | Fade in | **Scale entrance**: initial={{ scale: 0.8, opacity: 0 }} with spring physics |
| Badge after typing | Static | **Add subtle pulse glow**: `animate={{ boxShadow: ['0 0 0px rgba(109,190,163,0.2)', '0 0 16px rgba(109,190,163,0.3)'] }}` repeating |

**File:** `AINarrativeDemo.tsx`

---

### 1.8 PricingSection

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Background | bare #0C0B0A + border-t | **bg-app-recessed** (#131210) + border-t — signals "commitment zone" |
| Card hover | y:-8, scale:1.02 | Keep (already good) |
| Carbon CTA | "Start 7-Day Free Trial" | Keep — good urgency |
| Feature list | Full list visible | Consider **collapsible on mobile** (top 3-4 shown, "View all" toggle) |
| Toggle animation | Basic button swap | **Add layoutId sliding indicator** on active toggle |
| Section padding | py-16 md:py-32 | Keep |

**File:** `PricingSection.tsx`

---

### 1.9 CTASection

**Changes:**

| Element | Current | New |
|---------|---------|-----|
| Headline | "Ready to see what your next deal is really worth?" | **"Your next deal is waiting."** (shorter, more urgent) |
| Subtext | "Join investors making data-driven decisions..." | **"Join 500+ investors analyzing deals smarter."** |
| Background glow | radial-gradient 4% violet | **Add breathing pulse**: opacity animates 0.03→0.06 over 4s infinite |
| CTA button | Standard | **Add shimmer effect** on hover — gradient sweep across button |
| Stagger | Already staggered | Keep (h2 → p → button → disclaimer) |

**File:** `CTASection.tsx`

---

### 1.10 Footer

No changes needed — it's functional and minimal.

---

## 2. New Elements to Add

### 2.1 Scroll Progress Indicator
Thin violet bar at top of viewport that fills left→right as user scrolls.
```tsx
const { scrollYProgress } = useScroll()
<motion.div
  style={{ scaleX: scrollYProgress }}
  className="fixed top-0 left-0 right-0 h-[2px] bg-accent-primary origin-left z-[60]"
/>
```
**File:** `LandingPage.tsx`

### 2.2 Mobile Hamburger Menu
The navbar currently hides all links on mobile — only shows logo + "Get Started". Add a hamburger menu for <md screens.
**File:** `navbar.tsx`

### 2.3 Gradient Fade Dividers
Replace solid border-t with gradient fades between sections:
```tsx
<div className="h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />
```
Apply between: ProductPreview↔HowItWorks, HowItWorks↔StrategyTabs, StrategyTabs↔AINarrativeDemo

---

## 3. Elements to Delete

| Element | Reason |
|---------|--------|
| ProductPreview placeholder text ("Deal Analysis" / "AI Narrative") | Replace with structured mockup content |
| "No credit card required" standalone line in hero | Merge into CTA disclaimer line |

Nothing else should be deleted — every section serves a purpose in the conversion funnel.

---

## 4. Priority Order (Maximum Impact First)

### P0 — Implement Now (highest conversion impact)

1. **Hero copy rewrite** — new headline, subhead, CTA text, trust line. Most impactful single change. (~15 min)

2. **ProductPreview structured mockup** — replace gray boxes with synthetic dashboard content. Eliminates the #1 credibility gap. (~45 min)

3. **AINarrativeDemo ambient glow + badge pulse** — makes the PEAK moment feel magical. (~15 min)

4. **ProblemSection staggered reveal** — line-by-line text entrance + counter badges. (~20 min)

### P1 — Implement Next (visual polish)

5. **CTA section copy + breathing glow** — stronger closing per Peak-End Rule. (~10 min)

6. **PricingSection bg change** — bg-app-recessed for "commitment zone" feel. (~5 min)

7. **Gradient fade dividers** — replace solid borders with gradient fades. (~10 min)

8. **Scroll progress indicator** — thin violet bar. (~10 min)

### P2 — Implement Later (micro-polish)

9. **CTA button shimmer effect** — hover shimmer across all gradient buttons. (~20 min)

10. **StrategyTabs layoutId indicator** — smooth sliding tab indicator. (~15 min)

11. **HowItWorks icon hover animation** — icons scale with card. (~5 min)

12. **Mobile hamburger nav** — proper mobile navigation. (~30 min)

13. **StrategyTabs content enter/exit direction** — y offset on tab switch. (~10 min)

---

## Reference Sources

- Apple DESIGN.md: hero layout, tight line-heights, product-as-hero pattern
- Stripe DESIGN.md: weight 300 confidence, progressive tracking, blue-tinted shadows
- Linear DESIGN.md: dark-mode luminance stepping, semi-transparent borders, single accent
- Vercel DESIGN.md: shadow-as-border, fluid typography, gallery whitespace
- fey.com: section borders, card hover states, ambient glow, staggered reveals
- SAD/VIDEO-RESEARCH-DEEP-DIVE.md: animation budget, restraint principle, Peak-End Rule
- SAD/TYPOGRAPHY-AND-STYLING-AUDIT.md: 11 action items (all implemented)
