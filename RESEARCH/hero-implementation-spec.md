# Hero Implementation Spec — Parcel Landing Page

> Adapted from Fey.com's hero composition
> Date: April 6, 2026

---

## 1. Fey Hero Anatomy (Measured from Production)

### Layout Summary

Fey's hero is a single `100vh` section containing:
- **One large product screenshot** (1140 x 702px on a 1440px viewport) as a flat image — not a 3D transform, not a mockup frame. Just a dark-themed dashboard screenshot.
- **Three glass-morphism panels** stacked vertically on the right side, overlapping the screenshot. These show contextual AI content (Morning Recap, market data).
- **Two SVG glow blobs** behind the glass panels (blurred 54-64px) for ambient light.
- **A gradient `::after` overlay** on the screenshot that fades the bottom 40% to black, dissolving the image into the page background.
- **Headline text at the very bottom** of the viewport: "Fey" (26px, 50% opacity label) above "Make better investments." (54px, 4.7% opacity ghost text).
- **Portfolio value metrics** overlaid at top-left of the screenshot.

### Exact Measurements (1440px viewport)

```
Viewport:         1440 x 900

Nav:              x:110  y:30   w:1220 h:48     z:100  position:absolute
Main image:       x:150  y:128  w:1140 h:702           position:static (inside relative container)
Image fade:       inset:0        ::after gradient       position:absolute  pointer-events:none
Portfolio label:  x:239  y:209  w:151  h:33             position:absolute
Glass panel 1:    x:675  y:213  w:627  h:151            backdrop-filter:blur(18px)
Glass panel 2:    x:675  y:375  w:627  h:133            backdrop-filter:blur(18px)
Glass panel 3:    x:675  y:518  w:627  h:133            backdrop-filter:blur(18px)
SVG glow 1:       x:612  y:153  w:264  h:179            filter:blur(64px)
SVG glow 2:       x:994  y:300  w:336  h:114            filter:blur(54px) scale(1.2)
"Fey" label:      x:150  y:698  w:554  h:26    26px 600 color:rgba(255,255,255,0.5)
"Make better...": x:150  y:724  w:554  h:54    54px 600 color:rgba(255,255,255,0.047)
```

### Key Techniques

1. **Image fade to black**: `::after` pseudo-element with `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 64%, #000 80%)`. This dissolves the bottom ~40% of the screenshot into the page background.

2. **Glass panels**: `background: linear-gradient(182.51deg, rgba(255,255,255,0.04) 27%, rgba(90,90,90,0.04) 59%, rgba(0,0,0,0.04) 93%), rgba(51,51,57,0.7)`. Combined with `backdrop-filter: blur(18px)` and a 3-layer box-shadow stack.

3. **Ambient glow**: Two filled SVG shapes (warm orange-ish) with `filter: blur(64px)` positioned behind the glass panels. Creates the sense of panels generating their own light.

4. **Ghost headline**: The main H1 is at 4.7% opacity — a decorative typographic element, not meant to be "read" in the traditional sense. The brand label "Fey" at 50% opacity is the readable element.

---

## 2. Parcel Panel Mapping

### Which UI elements to show

Fey shows 4 distinct visual types: (1) a data-rich dashboard with chart, (2) AI text cards, (3) numeric metrics, (4) a stock ticker. For Parcel, we need equivalent visual diversity:

| Fey Panel | Shows | Parcel Equivalent | Why |
|-----------|-------|-------------------|-----|
| Main dashboard (screenshot) | Stock chart + sidebar + metrics | **Analysis results page** — strategy tabs, verdict badge, key metrics grid, cash flow chart | Most visually rich surface. The violet chart fill creates a focal point. |
| Glass panel 1 (Morning Recap) | AI-generated text summary | **AI narrative card** — Claude's deal analysis paragraph | Direct parallel — AI text on glass. |
| Glass panel 2 (Market data) | Tabular data with numbers | **Cash flow breakdown** — proportional expense bars with numbers | Dense numeric data, colored bars provide visual contrast. |
| Glass panel 3 (Second summary) | More text + small chart | **Verdict badge + key metrics** — "Good Deal" badge with CoC, cap rate, DSCR | The verdict badge is visually distinctive with its color coding. |

### Why these four specifically

1. **Analysis results page** (main screenshot): This is Parcel's richest visual surface — it has the strategy tabs across the top, the verdict badge, the 2x3 metrics grid, and the cash flow projection chart with the violet gradient fill. The chart provides a strong visual anchor (like Fey's stock chart line). No other page in Parcel has this density of visual information.

2. **AI narrative card** (glass panel): The AI deal narrative is unique to Parcel — no competitor has this. Showing AI-generated analysis text in a glass panel signals sophistication. The text content is inherently interesting ("Strong cash flow fundamentals...").

3. **Cash flow breakdown** (glass panel): The horizontal proportional bars (mortgage, taxes, insurance, maintenance, vacancy) with color-coded amounts create visual variety. They're NOT another metric grid — they're a different visual language (bars vs numbers).

4. **Verdict badge + key metrics** (glass panel): The verdict badge ("Good Deal" / "Strong Buy" with green/violet/amber coloring) is Parcel's most distinctive UI element. It's the thing that makes someone go "I want that."

### What NOT to include

- Pipeline kanban: Too complex, reads as "project management" not "deal analysis"
- Reverse calculator modal: Dark chrome, not enough visual contrast
- Break-even chart: Too similar to the cash flow chart — two charts in the hero is redundant
- Sensitivity matrix: Too data-dense, unreadable at hero size

---

## 3. Implementation Spec

### 3.1 HTML Structure

```html
<section class="hero">
  <!-- Ambient glow behind panels -->
  <div class="hero-glow" aria-hidden="true">
    <div class="hero-glow__violet"></div>
    <div class="hero-glow__warm"></div>
  </div>

  <!-- Main product screenshot -->
  <div class="hero-product">
    <img
      src="/images/hero/analysis-results.png"
      alt="Parcel deal analysis showing cash flow projections and investment metrics"
      width="1140"
      height="702"
      loading="eager"
      fetchpriority="high"
    />
  </div>

  <!-- Glass overlay panels (right side) -->
  <div class="hero-panels">
    <div class="hero-panel hero-panel--narrative">
      <img
        src="/images/hero/ai-narrative.png"
        alt="AI-generated deal analysis narrative"
        width="580"
        height="140"
      />
    </div>
    <div class="hero-panel hero-panel--breakdown">
      <img
        src="/images/hero/cashflow-breakdown.png"
        alt="Monthly cash flow expense breakdown"
        width="580"
        height="120"
      />
    </div>
    <div class="hero-panel hero-panel--verdict">
      <img
        src="/images/hero/verdict-metrics.png"
        alt="Deal verdict badge with key investment metrics"
        width="580"
        height="120"
      />
    </div>
  </div>

  <!-- Headline block (bottom of viewport) -->
  <div class="hero-headline">
    <p class="hero-headline__brand">Parcel</p>
    <h1 class="hero-headline__title">
      Five strategies. One address. Under a minute.
    </h1>
    <p class="hero-headline__sub">
      Paste any US address and get a full investment analysis — wholesale, BRRRR, flip, buy&nbsp;&amp;&nbsp;hold, and creative finance — with AI&#8209;driven insights, in under 60&nbsp;seconds.
    </p>
    <a href="/register" class="hero-headline__cta">
      Analyze Your First Deal
    </a>
  </div>
</section>
```

### 3.2 CSS — Section Container

```css
.hero {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 700px;
  max-height: 1000px;
  overflow: hidden;
  background: #0C0B0A;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
```

### 3.3 CSS — Main Product Screenshot

The screenshot is centered horizontally, starts ~14% from the top, fills ~80% of the viewport width. A `::after` gradient fades the bottom to the page background.

```css
.hero-product {
  position: relative;
  width: 100%;
  max-width: 1140px;
  margin: 0 auto;
  padding-top: clamp(80px, 14vh, 128px);
  z-index: 1;
}

.hero-product img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px 12px 0 0;
  pointer-events: none;
  user-select: none;
}

/* Bottom fade — dissolves screenshot into page background */
.hero-product::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 35%,
    rgba(12, 11, 10, 0.5) 58%,
    rgba(12, 11, 10, 0.85) 72%,
    #0C0B0A 88%
  );
  pointer-events: none;
  z-index: 2;
  border-radius: 12px 12px 0 0;
}
```

Note: Fey uses `transparent → rgba(0,0,0,0.6) → #000` but Parcel's background is `#0C0B0A` (warm dark, not pure black), so the gradient must fade to `#0C0B0A`.

### 3.4 CSS — Glass Overlay Panels

Three panels stacked vertically on the right side of the viewport, overlapping the screenshot. Each is a glass-morphism card containing a cropped screenshot of a Parcel UI component.

```css
.hero-panels {
  position: absolute;
  top: clamp(160px, 24vh, 213px);
  right: clamp(40px, 6vw, 100px);
  width: clamp(340px, 42vw, 627px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 3;
}

.hero-panel {
  position: relative;
  border-radius: 10px;
  overflow: hidden;

  /* Glass background — matches Fey exactly */
  background:
    linear-gradient(
      182.51deg,
      rgba(255, 255, 255, 0.04) 27.09%,
      rgba(90, 90, 90, 0.04) 58.59%,
      rgba(0, 0, 0, 0.04) 92.75%
    ),
    rgba(51, 51, 57, 0.7);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  /* 3-layer shadow stack — Fey's exact values */
  box-shadow:
    0px 53px 87px rgba(0, 0, 0, 0.66),
    0px 20px 28px rgba(0, 0, 0, 0.40),
    0px 4px 7px rgba(0, 0, 0, 0.26);
}

.hero-panel img {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
}

/* Individual panel sizing — controls aspect ratio via the images */
.hero-panel--narrative { /* tallest — AI text paragraph */ }
.hero-panel--breakdown { /* medium — expense bars */ }
.hero-panel--verdict   { /* medium — verdict badge + metrics */ }
```

### 3.5 CSS — Ambient Glow

Two blurred elements positioned behind the glass panels, creating the ambient light effect. Fey uses SVGs; for Parcel, simple divs with background-color and blur are equivalent and simpler.

```css
.hero-glow {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

/* Violet glow — top-left of the panel cluster */
.hero-glow__violet {
  position: absolute;
  top: clamp(100px, 16vh, 153px);
  right: clamp(280px, 40vw, 560px);
  width: 264px;
  height: 180px;
  background: rgba(139, 122, 255, 0.15);
  filter: blur(64px);
  border-radius: 50%;
}

/* Warm glow — bottom-right of the panel cluster */
.hero-glow__warm {
  position: absolute;
  top: clamp(250px, 34vh, 300px);
  right: clamp(20px, 4vw, 60px);
  width: 336px;
  height: 114px;
  background: rgba(212, 168, 103, 0.10);
  filter: blur(54px);
  transform: scale(1.2);
  border-radius: 50%;
}
```

Parcel differs from Fey: the primary glow is **violet** (`#8B7AFF` at low opacity) instead of Fey's warm copper. The secondary glow is a warm accent (`#D4A867` — Parcel's existing warm tone) for visual variety.

### 3.6 CSS — Headline Block

The headline sits at the bottom of the viewport, overlapping the faded bottom of the screenshot. This is the Fey pattern: product fills the viewport, text anchors the bottom.

```css
.hero-headline {
  position: absolute;
  bottom: clamp(40px, 6vh, 64px);
  left: clamp(40px, 6vw, 150px);
  z-index: 4;
  max-width: 600px;
}

/* Brand label — "Parcel" */
.hero-headline__brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(139, 122, 255, 0.6);
  margin-bottom: 8px;
}

/* Main headline */
.hero-headline__title {
  font-family: 'Satoshi', sans-serif;
  font-size: clamp(32px, 4.5vw, 54px);
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #F0EDE8;
  margin-bottom: 16px;

  /* Vertical fade — bright at top, dims at bottom */
  background: linear-gradient(
    180deg,
    rgba(240, 237, 232, 1.0) 0%,
    rgba(240, 237, 232, 0.5) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Subheadline */
.hero-headline__sub {
  font-family: 'Satoshi', sans-serif;
  font-size: clamp(14px, 1.25vw, 18px);
  font-weight: 300;
  line-height: 1.5;
  color: rgba(240, 237, 232, 0.5);
  margin-bottom: 24px;
  max-width: 480px;
}

/* CTA button */
.hero-headline__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8B7AFF, #6C5CE7);
  color: #fff;
  font-family: 'Satoshi', sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: opacity 0.15s ease;
  cursor: pointer;
}

.hero-headline__cta:hover {
  opacity: 0.9;
}
```

### 3.7 CSS — Navigation Bar

Floating glass-pill nav positioned at the top, matching Fey's treatment.

```css
/* Nav already exists in AppShell — for landing page only: */
.landing-nav {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: 100%;
  max-width: 1220px;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### 3.8 CSS — Responsive Behavior

```css
/* Tablet (< 1024px) */
@media (max-width: 1024px) {
  .hero-panels {
    width: 50vw;
    right: 24px;
    top: 20vh;
  }

  .hero-glow__violet {
    width: 200px;
    height: 140px;
  }

  .hero-glow__warm {
    width: 240px;
    height: 100px;
  }
}

/* Mobile (< 768px) */
@media (max-width: 768px) {
  .hero {
    min-height: 100svh;
    max-height: none;
  }

  .hero-product {
    padding-top: 72px;
  }

  .hero-product img {
    border-radius: 8px 8px 0 0;
  }

  /* Panels hide on mobile — just show the main screenshot + headline */
  .hero-panels {
    display: none;
  }

  .hero-glow__warm {
    display: none;
  }

  .hero-glow__violet {
    top: 30vh;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 200px;
    background: rgba(139, 122, 255, 0.10);
  }

  .hero-headline {
    position: absolute;
    bottom: 32px;
    left: 24px;
    right: 24px;
    max-width: none;
  }

  .hero-headline__title {
    font-size: 28px;
  }

  .hero-headline__sub {
    font-size: 14px;
  }
}

/* Small mobile (< 375px) */
@media (max-width: 375px) {
  .hero-headline__title {
    font-size: 24px;
  }

  .hero-headline__brand {
    font-size: 12px;
  }
}
```

### 3.9 Load Animations

Fey keeps hero animations minimal. The panels and image appear immediately — no slide-ins, no fades. The only animation is the subtle wipe mask effect (a shine that sweeps across elements).

For Parcel, keep it even simpler:

```css
/* Optional: subtle fade-in on the glass panels (300ms stagger) */
.hero-panel {
  opacity: 0;
  animation: heroFadeIn 0.6s ease-out forwards;
}

.hero-panel--narrative { animation-delay: 0.1s; }
.hero-panel--breakdown { animation-delay: 0.3s; }
.hero-panel--verdict   { animation-delay: 0.5s; }

@keyframes heroFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Main image appears instantly — no animation */
/* Headline appears instantly — no animation */
/* Glow appears instantly — no animation */
```

### 3.10 Screenshot Preparation Guide

Each screenshot must be captured from Parcel's dark theme at high resolution (2x or 3x), then cropped and prepared:

**Main screenshot: Analysis Results Page**
- Capture at 2880 x 1774 (2x of 1440 x 887)
- Show: Strategy tabs (all 5 visible), verdict badge, key metrics 2x3 grid, cash flow chart with violet gradient fill
- Crop: Include from the top of the strategy tabs down through the cash flow chart. Do NOT include the AppShell sidebar or header — just the content area.
- Background: Must match `#0C0B0A` exactly so edges dissolve
- Export as PNG, optimize to < 200KB

**Panel 1: AI Narrative**
- Capture the AI narrative card component in isolation
- Show 3-4 lines of AI text: "Strong cash flow fundamentals. The rent-to-price ratio of 1.02% sits in the top quartile for Memphis..."
- Crop tight — just the card with ~12px padding
- Width: 1160px (2x of 580px target)
- Background: transparent (the glass panel provides the background)

**Panel 2: Cash Flow Breakdown**
- Capture the monthly expense breakdown component
- Show: Proportional bars for Mortgage, Property Tax, Insurance, Maintenance, Vacancy with dollar amounts
- Must show the Gross Rent → Net Cash Flow flow
- Width: 1160px
- Background: transparent

**Panel 3: Verdict + Key Metrics**
- Capture: The verdict badge ("Good Deal" in green) alongside 3 key metrics (CoC Return, Cap Rate, Monthly Cash Flow)
- Arrange horizontally: badge on left, 3 metrics on right
- Width: 1160px
- Background: transparent

### 3.11 Viewport Height and Spacing Summary

```
┌─────────────────────────────────────────────────────┐
│ Nav (absolute, z:100)                          30px │ ← from top
│                                                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │ ← 128px from top
│  │    Main Product Screenshot (z:1)            │    │
│  │    1140px wide, centered                    │    │
│  │    ┌──────────────────────────┐             │    │
│  │    │                          │  Panel 1    │    │ ← 213px from top
│  │    │        (screenshot       │  (glass, z:3)    │
│  │    │         content)         ├─────────────┤    │
│  │    │                          │  Panel 2    │    │ ← 375px
│  │    │                          │  (glass, z:3)    │
│  │    │                          ├─────────────┤    │
│  │    │   ░░░░ Gradient fade ░░░ │  Panel 3    │    │ ← 518px
│  │    │   ░░░ to #0C0B0A ░░░░░░ │  (glass, z:3)    │
│  │    └──────────░░░░░░░░░░░░░──┘             │    │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Parcel                                             │ ← ~698px from top
│  Five strategies. One address.                      │ ← ~724px from top
│  Under a minute.                                    │
│  [Analyze Your First Deal]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
                        900px viewport height
```

---

## 4. Design Differences from Fey

| Aspect | Fey | Parcel (this spec) |
|--------|-----|-------------------|
| Background | `#000000` (pure black) | `#0C0B0A` (warm dark) |
| Glow color | Warm copper/amber | Violet `#8B7AFF` + warm `#D4A867` |
| Font | Calibre 600 | Satoshi 300 |
| Headline opacity | 4.7% (ghost text) | 100% with vertical gradient fade |
| Brand label color | `rgba(255,255,255,0.5)` | `rgba(139,122,255,0.6)` (violet tinted) |
| Panel content | Live AI text rendered as HTML | Static screenshots of Parcel UI |
| Main image | Embedded dashboard (possibly rendered, not screenshot) | Static screenshot PNG |
| Panel count | 3 glass panels | 3 glass panels (same) |
| Panel border | None (no visible border) | None (match Fey) |
| Image fade | `transparent 40% → black 80%` | `transparent 35% → #0C0B0A 88%` (extended fade) |
| Mobile | Panels scale down, remain visible | Panels hidden, screenshot + headline only |

---

## 5. Implementation Checklist

1. [ ] Capture 4 screenshots from Parcel at 2x resolution (analysis results, AI narrative, breakdown, verdict)
2. [ ] Crop and prepare screenshots per Section 3.10
3. [ ] Create `HeroSection.tsx` component with the HTML structure from Section 3.1
4. [ ] Add CSS (can be Tailwind utility classes or a CSS module — spec provides raw CSS for reference)
5. [ ] Position glass panels with responsive `clamp()` values
6. [ ] Add ambient glow divs with blur filters
7. [ ] Add `::after` gradient fade on the product screenshot
8. [ ] Style headline block with Satoshi, vertical gradient, violet brand label
9. [ ] Add staggered panel fade-in animation (0.1s, 0.3s, 0.5s)
10. [ ] Test responsive: 1440px, 1024px, 768px, 375px
11. [ ] Optimize images: PNG < 200KB each, `loading="eager"` on main, `loading="lazy"` on panels
12. [ ] Verify gradient fade blends seamlessly with the section below (background colors must match exactly)
