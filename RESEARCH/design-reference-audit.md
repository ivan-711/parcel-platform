# Design Reference Audit: Fey.com & Mercury.com

> Date: April 6, 2026
> Purpose: Extract visual design patterns for Parcel's landing page evolution

---

## Part 1: Fey.com

### 1.1 Product Image Blending (Hero + Feature Sections)

**What they do:** Every product screenshot sits on a pure black or near-black background (`rgb(0, 0, 0)` body). The screenshots themselves have dark UI chrome, so the edges dissolve seamlessly into the page. There's no visible border, card, or container — the product floats in space.

**How it works:**
- Body background: `rgb(0, 0, 0)` (pure black)
- Product screenshots rendered with transparent or black canvas backgrounds
- No `border`, no `box-shadow`, no `border-radius` on screenshot containers
- Subtle radial gradient glow behind certain images (orange/copper tones)
- Images use CSS `mix-blend-mode: normal` — the blending is baked into the assets, not CSS

**Screenshots:** `fey-01-hero.png` (dashboard floating in black), `fey-02-section.png` (cards emerging from void), `fey-07-section.png` (landscape blending into product)

**Parcel application:**
- Export product screenshots with Parcel's dark theme active (`#0C0B0A` background)
- Remove any browser chrome, use borderless frames
- Place on matching `#0C0B0A` background — edges vanish naturally
- Add subtle violet radial glow behind key screenshots: `radial-gradient(ellipse at center, rgba(139,122,255,0.06) 0%, transparent 70%)`
- **Feasibility: Easy** — requires asset preparation, not code. 2-3 hours of screenshot work + CSS gradients.

### 1.2 Typography System

**Extracted values:**
| Element | Font | Size | Weight | Line Height | Color |
|---------|------|------|--------|-------------|-------|
| h1 | Calibre | 54px | 600 | 54px (1.0) | `rgba(255,255,255,0.047)` (ghost text — decorative) |
| h2 | Calibre | 26px | 600 | 26px (1.0) | `rgba(255,255,255,0.5)` (muted) |
| p | Calibre | 14px | 600 (!) | 19px (1.36) | `rgb(230, 230, 230)` |

**Key patterns:**
- Single font family throughout (Calibre) — similar to Parcel's Satoshi-only approach
- H1 is used as decorative ghost text (4.7% opacity!) — the real headline is styled differently
- Body text is a bold 600 weight even for paragraphs — unusual, creates a dense, confident feel
- Very tight line heights (1.0 for headings) — compact, app-like density
- Section headings use gradient text or high contrast white, not the h2 style

**Parcel application:**
- Parcel already uses Satoshi 300 (light) which is the opposite approach — lighter and more airy
- Consider: Parcel's light weight works for luxury/fintech, Fey's bold weight works for data/density
- Keep Satoshi 300 for Parcel — it's a stronger differentiator in the RE space
- **Steal the ghost text pattern**: Use a large decorative number or word at 3-5% opacity behind section headings
- **Feasibility: Easy** — CSS opacity on a decorative `<span>`. 30 minutes.

### 1.3 Accent Color Application

**Fey's accent:** Warm copper/orange (`rgb(231, 94, 206)` pink-magenta and `rgba(78, 190, 150, 0.16)` teal-green appear in surfaces)

**How they apply it:**
- Accent used sparingly — only on interactive elements and status indicators
- Feature section labels ("Highlights", "Learn more >") use the copper/orange
- Glow effects behind product images use warm orange radial gradients
- Status colors (green for positive, red for negative) are standard — accent is NOT used for status

**Parcel parallel:**
- Parcel's `#8B7AFF` violet fills the same role — CTA buttons, badges, interactive highlights
- Parcel already does this well. The key insight from Fey: **never use the accent for background fills**. It's always text, borders, or glows.
- **Feasibility: Already implemented** in Parcel's design system.

### 1.4 Surface Levels

**Extracted surfaces:**
1. `rgb(0, 0, 0)` — page background (pure black)
2. `rgb(11, 11, 11)` — card/section backgrounds (nearly indistinguishable)
3. `rgb(19, 19, 19)` — elevated cards
4. `rgba(26, 27, 32, 0.6)` — glass panels (semi-transparent)
5. `rgba(62, 62, 62, 0.4)` — borders/dividers
6. `rgba(230, 230, 230, 0.08)` — hover states
7. `rgba(255, 255, 255, 0.04)` — subtle highlights

**Pattern:** 3 solid levels + 4 alpha levels. The alpha surfaces create depth through transparency rather than color steps. Cards feel like they're floating rather than stacked.

**Parcel comparison:**
- Parcel uses `#0C0B0A` (bg), `#141311` (surface), `#1E1D1B` (elevated) — same 3-level approach
- Fey goes darker and uses more transparency. Parcel's warm tones are a better fit for RE investors.
- **Steal:** More use of `rgba` surfaces for glass-card effects on the landing page feature sections.
- **Feasibility: Easy** — Parcel already has the token system. Add `bg-white/[0.03]` and `bg-white/[0.05]` variants.

---

## Part 2: Mercury.com

### 2.1 Background Color Transitions (The Scroll Effect)

**What they do:** The page shifts between 3 distinct color zones as you scroll:
1. **Hero zone** (scroll 0-2): Light warm beige/cream with nature photography — `rgb(211, 210, 209)` tones
2. **Dark product zone** (scroll 3-5): Deep navy-black `rgb(23, 23, 33)` — product demo area
3. **Light feature zone** (scroll 6-10): Clean white/light gray for feature cards
4. **Dark trust zone** (scroll 11-13): Back to navy `rgb(39, 39, 53)` for security, press, footer

**How it works technically:**
- NOT scroll-snap (confirmed: `scrollSnapType` is empty)
- NOT pure CSS scroll-driven animations
- Sections have a themed CSS class applied: `dark-neutral-theme` with `bg-background-default`
- Each section simply has a different background color — the "transition" is the visual contrast between adjacent sections, not an animated gradient
- The navbar adapts: text color and logo invert between light and dark zones (likely Intersection Observer toggling a class on the `<nav>`)
- Some sections have CSS transitions on their elements (opacity, transform) triggered by scroll position

**The illusion:** It feels like a smooth color transition, but it's actually hard section boundaries. The hero has a full-bleed photograph that creates a natural gradient from light sky to dark ground, and the dark product section sits right below — the photograph itself IS the transition.

**Parcel application:**
- Parcel's landing page is currently all-dark. Adding a light zone in the middle would break the brand.
- **Instead, steal the concept with dark-to-darker transitions:**
  - Hero: `#0C0B0A` (current)
  - Feature demo: `#000000` (pure black — product screenshots float)
  - Social proof: `#0C0B0A` (return to warm dark)
  - Pricing: `#0F0E0D` (slightly elevated)
- **Or:** Add a single "light burst" section for social proof — testimonials on a `#F5F3EF` cream background. This creates the Mercury effect of breaking visual monotony.
- **Feasibility: Easy CSS** — just change `background-color` per section. The navbar adaptation requires an Intersection Observer (~20 lines of JS). Medium effort overall.

### 2.2 Typography Scale

**Extracted values:**
| Element | Font | Size | Weight | Line Height | Letter Spacing | Color |
|---------|------|------|--------|-------------|----------------|-------|
| h1 | Arcadia Display | 49px | 480 | 54px (1.1) | normal | `rgb(237, 237, 243)` |
| h2 | Arcadia Display | 42px | 480 | 48px (1.15) | 0.42px | `rgb(237, 237, 243)` |
| p | Arcadia Display | 21px | 480 | 25px (1.2) | 0.42px | `rgb(237, 237, 243)` |

**Key patterns:**
- Custom display font (Arcadia Display) — premium, distinctive
- Weight 480 everywhere — an unusual "medium-light" weight that creates a refined, airy feel
- Consistent letter-spacing on body (0.42px) — adds breathing room
- Very large body text (21px!) — confident, easy to read, feels like a premium publication
- Same text color for all elements on dark backgrounds — hierarchy through size alone, not opacity

**Parcel comparison:**
- Parcel uses Satoshi 300 (lighter than Mercury's 480)
- Parcel's body text is likely 14-16px — significantly smaller than Mercury's 21px
- **Steal:** Increase landing page body text to 18-20px for the hero and feature sections. Keep 14px for the app.
- **Steal:** Use size-only hierarchy (no opacity differences) for headings vs body on the landing page.
- **Feasibility: Easy** — font-size change on landing page sections only. 15 minutes.

### 2.3 Card & Surface Treatment

**Light sections:**
- Cards have very subtle borders (`rgb(206, 205, 203)` — warm gray)
- No box shadows on cards — depth comes from background color contrast
- Product images sit inside cards with generous padding
- Cards use `border-radius` ~12px
- Some cards have a subtle background fill (warm off-white vs pure white)

**Dark sections:**
- Cards on dark backgrounds use `rgba(175, 178, 206, 0.2)` borders — blue-tinted semi-transparent
- Some cards have `rgba(175, 178, 206, 0.36)` — more visible border for emphasis
- Background fill: `rgb(39, 39, 53)` — slightly lighter than section background
- The security section (scroll 11) uses a 2x2 grid of cards with icon illustrations in each
- Glass effect on some panels: semi-transparent backgrounds with subtle borders

**Parcel application:**
- Parcel's current card style (`border-border-subtle`, `bg-app-surface`) is already close
- **Steal:** Mercury's dark card borders have a blue/purple tint. Parcel could use violet-tinted borders on landing page feature cards: `border: 1px solid rgba(139, 122, 255, 0.08)` instead of neutral gray
- **Steal:** The 2x2 feature grid pattern (scroll 10-11) with icon illustrations — Parcel could use this for the "5 strategies" or "why Parcel" section
- **Feasibility: Easy** — border-color change. The grid layout already exists in Parcel's feature sections.

### 2.4 The Navbar Adaptation

**What Mercury does:**
- On light sections: dark text, dark logo, light background nav
- On dark sections: light text, light logo, dark background nav
- Transition is instant (class swap), not animated

**Technical implementation:**
- Intersection Observer watches section elements
- When a dark-themed section enters the viewport, toggle `dark` class on nav
- CSS handles the color swap via the class

**Parcel application:**
- Only relevant if Parcel adds light sections to the landing page
- Current all-dark landing doesn't need this
- **Feasibility: Medium** — ~50 lines of React (IntersectionObserver hook + conditional nav classes). But only needed if light sections are added.

---

## Part 3: Recommendations for Parcel's Landing Page

### Tier 1 — Easy CSS Wins (< 2 hours total)

| # | Pattern | Source | Implementation | Impact |
|---|---------|--------|----------------|--------|
| 1 | **Floating product screenshots** | Fey | Export screenshots with dark theme, place on matching bg, add violet radial glow | High — makes the product feel premium |
| 2 | **Larger landing page body text** | Mercury | `text-lg` (18px) or `text-xl` (20px) for hero/feature descriptions | Medium — improves readability and premium feel |
| 3 | **Ghost text decoration** | Fey | Large decorative text at 3-5% opacity behind section headings | Low-medium — adds visual depth |
| 4 | **Violet-tinted card borders** | Mercury | `border-color: rgba(139, 122, 255, 0.08)` on feature cards | Low — subtle polish |
| 5 | **Section background variation** | Mercury | Alternate between `#0C0B0A` and `#080807` for visual rhythm | Medium — breaks monotony |

### Tier 2 — Moderate Effort (2-4 hours)

| # | Pattern | Source | Implementation | Impact |
|---|---------|--------|----------------|--------|
| 6 | **Scroll-triggered section reveals** | Both | Intersection Observer + CSS transform/opacity transitions (Parcel already has `useFadeInOnScroll`) | High — adds life to the page |
| 7 | **Single contrast section** | Mercury | One light/cream section mid-page for testimonials or social proof | High — dramatic visual break |
| 8 | **2x2 feature grid with icons** | Mercury | Grid layout for "Why Parcel" section with Lucide icons | Medium — better information architecture |

### Tier 3 — Significant Engineering (4+ hours)

| # | Pattern | Source | Implementation | Impact |
|---|---------|--------|----------------|--------|
| 9 | **Adaptive navbar** | Mercury | IntersectionObserver + theme class toggle on nav | Medium — only needed if light sections added |
| 10 | **Interactive product demo** | Mercury (scroll 3-5) | Embedded product walkthrough with scroll-driven state changes | Very high — but very expensive to build |

### Priority Recommendation

**Do items 1, 2, and 5 first.** Floating screenshots + larger text + section rhythm will transform the landing page feel with minimal code changes. These are purely CSS/asset changes.

Then evaluate item 7 (contrast section) — it's the highest-impact pattern from Mercury but requires careful brand consideration. A single cream `#F5F3EF` testimonial section sandwiched between dark sections creates a "Mercury moment" without abandoning Parcel's dark identity.

Skip item 10 (interactive demo) — it's weeks of work and Parcel's current strategy demo already works.

---

## Appendix: Raw CSS Data

### Fey.com
- **Body:** `rgb(0, 0, 0)`
- **Font:** Calibre, weight 600 throughout
- **Surfaces:** 7 levels (3 solid + 4 alpha)
- **Accent:** Copper/orange for labels, green teal for status

### Mercury.com
- **Body:** transparent (sections carry their own backgrounds)
- **Font:** Arcadia Display, weight 480 throughout
- **Dark sections:** `rgb(23, 23, 33)` navy-black, `rgb(39, 39, 53)` elevated
- **Light sections:** `rgb(211, 210, 209)` warm gray, white
- **Borders (dark):** `rgba(175, 178, 206, 0.2)` blue-tinted
- **Accent:** `rgb(205, 221, 255)` light blue for interactive elements
- **Scroll technique:** Hard section boundaries, NOT scroll-snap or CSS scroll-driven animations. Visual transition comes from photography and adjacent section contrast.

### Screenshots Index
All saved to `RESEARCH/screenshots/`:
- `fey-01-hero.png` through `fey-07-section.png` + `fey-full-page.png`
- `mercury-01-hero.png` through `mercury-13-scroll.png` + `mercury-full-page.png`
