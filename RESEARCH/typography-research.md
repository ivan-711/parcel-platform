# Typography Research for Parcel Platform

> Comprehensive research on typography choices for a dark-mode, data-heavy real estate/fintech SaaS.
> Researched March 2026.

---

## Table of Contents

1. [What Fonts Top Fintech/SaaS Products Use](#1-what-fonts-top-fintechsaas-products-use)
2. [Google Fonts vs Self-Hosted vs Variable Fonts](#2-google-fonts-vs-self-hosted-vs-variable-fonts)
3. [Font Pairing Patterns for Dark-Mode Data-Heavy Interfaces](#3-font-pairing-patterns-for-dark-mode-data-heavy-interfaces)
4. [Type Scale Systems](#4-type-scale-systems)
5. [How to Implement a Custom Font in Tailwind v3](#5-how-to-implement-a-custom-font-in-tailwind-v3)
6. [Fonts to Avoid](#6-fonts-to-avoid)
7. [Top 5 Font Recommendations for Parcel](#7-top-5-font-recommendations-for-parcel)

---

## 1. What Fonts Top Fintech/SaaS Products Use

### Stripe

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Sohne** (by Klim Type Foundry) | Licensed premium typeface. Variable font version (`Sohne-var`). Replaced Camphor in 2020 redesign. |
| **Mono** | **Sohne Mono** | Part of the same Sohne collection |
| **Fallback stack** | `system-ui, sans-serif` | Clean system fallback |

**Why:** Sohne is derived from Akzidenz-Grotesk (1898), giving it gravitas and heritage while feeling contemporary. Its geometric precision conveys trust and technical competence. The variable font version gives Stripe full weight/width flexibility from a single file. Stripe's brand demands a font that says "we handle your money seriously" without feeling stuffy -- Sohne nails this balance.

**Source:** [Stripe website (2020) - Fonts In Use](https://fontsinuse.com/uses/35338/stripe-website-2020), [Sohne Collection - Klim Type Foundry](https://klim.co.nz/collections/soehne/)

---

### Linear

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Inter** | Open-source, variable font |
| **Mono** | System monospace | For code snippets |
| **Fallback stack** | `SF Pro Display, Segoe UI, Roboto, sans-serif` | Platform-native fallbacks |

**Why:** Linear's founder Karri Saarinen chose Inter because it renders pixel-perfectly at small sizes, which matters for a dense project management UI. The font's tall x-height ensures readability in sidebar labels, issue titles, and compact list views. Linear's entire brand is built around the "dark coding environment" aesthetic that engineers prefer -- Inter's neutrality lets the UI disappear so the content speaks.

**Typography details:** Headers up to weight 800 at 62px. Body at weight 400, 20px/31px line height. Uppercase headers with 11px letter-spacing for section labels. Text colors: `#95A2B3` (secondary) and `#F7F8F8` (primary) against dark backgrounds.

**Source:** [Linear uses Inter - type.fan](https://www.type.fan/site/linear-app), [Fonts in use on linear.app - Typ.io](https://typ.io/s/2jmp)

---

### Vercel

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Geist Sans** | Custom, open-source (SIL OFL), variable font |
| **Mono** | **Geist Mono** | Companion monospace |
| **Pixel** | **Geist Pixel** | Bitmap variant for decorative use |

**Why:** Vercel built Geist in collaboration with Basement Studio specifically for developer-facing interfaces. It draws from Swiss typographic principles (influenced by Inter, Univers, SF Pro, Suisse International, ABC Diatype). Geist is designed for legibility in documentation, dashboards, and code-heavy contexts. By owning their typeface, Vercel controls every aspect of their visual identity and can optimize for their exact rendering needs.

**Source:** [Geist Font - Vercel](https://vercel.com/font), [The Birth of Geist - Basement Studio](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)

---

### Robinhood

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Robinhood Phonic** (custom) | Custom sans-serif with ink traps |
| **Legacy body** | **Maison** (by Milieu Grotesque) | Used previously across app/web/marketing |
| **Legacy web** | **DIN Web** | Earlier web presence |

**Why:** Robinhood invested in a custom typeface (Robinhood Phonic) with delicate ink traps that add personality without sacrificing precision -- critical for a financial app where every digit matters. The ink traps also improve rendering at small sizes on mobile screens. Their typography strategy pairs with a restrained color palette (black, white, neutrals + "Robin Neon" accent) to create clear visual hierarchy.

**Source:** [Robinhood - Porto Rocha](https://portorocha.com/robinhood/), [Fonts in use on robinhood.com - Typ.io](https://typ.io/s/b5ow)

---

### Coinbase

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Coinbase Sans** (custom) | 36 styles, 29,000+ glyphs |
| **Mono** | **Coinbase Sans Mono** | Part of the family |
| **Micro** | **Coinbase Sans Micro** | Optimized for small sizes |

**Why:** Coinbase Sans was designed by Moniker SF to balance the "trusted elements of the financial world" with accessibility. The type family includes optical versions (Display, Text, Micro, Mono) -- each optimized for its size context. Drawing from "forgotten" 20th-century sans serifs like Mercator, Neuzeit S, and Folio, it avoids the generic feel of popular geometric sans serifs while maintaining the durability of battle-tested typefaces. The Mono variant takes cues from monospaced typefaces historically used in financial documents.

**Source:** [Coinbase - Moniker](https://monikersf.com/project/coinbase), [Coinbase in use - Fonts In Use](https://fontsinuse.com/typefaces/237137/coinbase)

---

### Notion

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Inter** | Consistent across all platforms |
| **Fallback stack** | `San Francisco (iOS), Roboto (Android)` | System fallbacks |
| **In-app options** | Default (Inter), Serif, Mono | User-selectable |

**Why:** Inter was chosen for its superior screen legibility, wide character support, multiple weights, and consistent rendering across desktop, web, and mobile. Its tall x-height and wide character spacing improve reading comfort during extended work sessions. Notion's minimalist philosophy demands a font that gets out of the way -- Inter's neutrality serves this perfectly.

**Source:** [What font does Notion use - DesignYourWay](https://www.designyourway.net/blog/what-font-does-notion-use/), [The Notion font - DesignYourWay](https://www.designyourway.net/blog/notion-font/)

---

### Mercury (Bank)

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **Avenir Next** | Geometric sans-serif by Adrian Frutiger |
| **Fallback** | System sans-serif stack | Standard fallbacks |

**Why:** Mercury (the startup bank) uses Avenir Next for its clean, professional geometric aesthetic that conveys modernity and trust. Avenir Next's refined geometry strikes the right balance between warmth and precision -- important for a banking product that serves startups. The font reads well in data tables, account balances, and transaction lists that dominate the banking dashboard experience.

**Source:** [finance font pairings - Typ.io](https://typ.io/tags/finance)

---

### Ramp

| Role | Font | Notes |
|------|------|-------|
| **Display/Body** | **TWK Lausanne** (by WELTKERN) | Premium neo-grotesque |
| **Logo** | Custom wordmark based on Lausanne | With modifications |
| **Secondary** | **Burgess** | Used in identity materials |

**Why:** Ramp chose TWK Lausanne for its clean, modern neo-grotesque character that communicates sophistication without pretension. As a corporate expense management tool, Ramp needs typography that reads as "serious finance" while still feeling like a modern tech product. Lausanne provides that bridge -- it is refined enough for banking contexts but sharp enough for a SaaS interface.

**Source:** [Ramp identity - Fonts In Use](https://fontsinuse.com/uses/38468/ramp-identity), [Ramp 2023 campaign - Fonts In Use](https://fontsinuse.com/uses/56961/ramp-2023-campaign)

---

### Summary Matrix

| Product | Display/Body | Mono | Custom? | Open Source? |
|---------|-------------|------|---------|-------------|
| Stripe | Sohne | Sohne Mono | Licensed | No |
| Linear | Inter | System | No | Yes |
| Vercel | Geist Sans | Geist Mono | Yes | Yes (SIL OFL) |
| Robinhood | Robinhood Phonic | -- | Yes | No |
| Coinbase | Coinbase Sans | Coinbase Sans Mono | Yes | No |
| Notion | Inter | -- | No | Yes |
| Mercury (Bank) | Avenir Next | -- | Licensed | No |
| Ramp | TWK Lausanne | -- | Licensed | No |

**Key pattern:** The biggest companies (Stripe, Robinhood, Coinbase) invest in custom or premium licensed typefaces. Mid-tier products (Linear, Notion) use Inter. Developer-facing tools (Vercel) create open-source fonts. All of them avoid the "default Google Fonts" look (Poppins, Montserrat, Open Sans).

---

## 2. Google Fonts vs Self-Hosted vs Variable Fonts

### Delivery Method Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Google Fonts CDN** | Zero config, automatic subsetting, global CDN | Extra DNS lookup + TLS handshake, no cross-domain cache benefit (since 2020), privacy concerns (GDPR), render-blocking external CSS | Quick prototypes, MVPs |
| **Self-Hosted (static)** | No external requests, full control, better privacy, works offline | Manual subsetting, manual WOFF2 conversion, more setup | Production apps, privacy-sensitive |
| **Self-Hosted (variable)** | Single file for all weights, smallest total payload (3+ weights), no external requests | Larger single file than one static weight, requires modern browser | Production apps needing multiple weights |

### Performance Numbers

| Metric | Google Fonts CDN | Self-Hosted Static (2 weights) | Self-Hosted Variable |
|--------|-----------------|-------------------------------|---------------------|
| **Extra DNS lookups** | 2 (fonts.googleapis.com + fonts.gstatic.com) | 0 | 0 |
| **Extra TLS handshakes** | 2 | 0 | 0 |
| **HTTP requests for 4 weights** | 4 font files + 1 CSS | 4 font files | 1 font file |
| **Total payload (4 weights)** | ~400-800KB | ~400-800KB | ~100-200KB |
| **FCP impact** | +100-300ms (DNS+TLS overhead) | Baseline | Baseline or better |
| **Real-world example** | -- | -- | Roboto variable cut load time 30% (700ms to 490ms), halved FCP (1.6s to 0.8s) |

**Source:** [Variable fonts performance - LogRocket](https://blog.logrocket.com/variable-fonts-is-the-performance-trade-off-worth-it/), [Self-hosting vs Google Fonts - Capital Numbers](https://www.capitalnumbers.com/blog/self-hosting-vs-google-fonts/)

### FOUT / FOIT Handling

| Strategy | `font-display` Value | Behavior | Layout Shift (CLS) | Best For |
|----------|---------------------|----------|--------------------|---------|
| **Block (FOIT)** | `block` | Text invisible for up to 3s while font loads | None if font loads fast, bad if slow | Never recommended for body text |
| **Swap (FOUT)** | `swap` | Fallback shown immediately, swaps when font arrives | Yes -- can cause visible shift | Display text, headings |
| **Fallback** | `fallback` | 100ms block period, then fallback for up to 3s | Minimal | Good middle ground |
| **Optional** | `optional` | 100ms to load; if missed, fallback stays for the page view | None | Body text, performance-critical |

**Current best practice (2025/2026):**

1. Use `font-display: swap` for headings/display text (visual impact matters more than CLS).
2. Use `font-display: optional` for body text (prevents layout shift, fallback is acceptable).
3. Combine with `<link rel="preload">` for critical fonts.
4. Use `size-adjust`, `ascent-override`, `descent-override` on fallback `@font-face` to minimize CLS when swapping.

**Source:** [Best practices for fonts - web.dev](https://web.dev/articles/font-best-practices), [Font Display - WP Rocket](https://wp-rocket.me/google-core-web-vitals-wordpress/font-display-insight/)

### Variable Fonts

**What they are:** A single font file containing an entire design space along one or more "axes" (weight, width, slant, optical size, etc.). Instead of separate files for Regular, Medium, Semibold, Bold, you get one file that can render any weight between 100-900.

**Browser support (2026):** ~97% global support. All modern browsers (Chrome, Firefox, Safari, Edge, mobile browsers) fully support variable fonts. The only gaps are IE11 (dead) and some very old Android WebView versions.

**When to use variable fonts:**
- You need 3+ weights: Variable font is almost always smaller.
- You need 1-2 weights: Static files may be smaller (a single static weight ~40-80KB vs a variable file ~100-200KB).
- You want fine-grained control: Variable fonts let you use weight 450 or 550, not just predefined weights.
- You want smooth CSS transitions on weight (e.g., hover effects).

**When to stick with static:**
- Single weight usage (e.g., only body Regular).
- Legacy browser requirement (IE11).

**Source:** [Variable fonts - Can I Use](https://caniuse.com/variable-fonts), [Variable Fonts in UX - DeveloperUX](https://developerux.com/2025/06/02/variable-fonts-in-ux-benefits-and-challenges/), [Why variable fonts are winning in 2026 - Kittl](https://www.kittl.com/blogs/why-variable-fonts-are-winning-fnt/)

---

## 3. Font Pairing Patterns for Dark-Mode Data-Heavy Interfaces

### The Halation Problem

When light text sits on a dark background, the bright characters appear to "bleed" or "bloom" into the surrounding dark area. This is called **halation**. It is especially pronounced for:
- Users with astigmatism (~33% of the population)
- Pure white (`#FFFFFF`) on pure black (`#000000`)
- Thin font weights (Light, Thin)
- Small text sizes

**Mitigation strategies:**
- Use off-white text (`#E2E2E2` to `#F0F0F0`) instead of pure white
- Use dark gray backgrounds (`#08080F`, `#0F0F1A`, `#121212`) instead of pure black
- Avoid font weights below 400 for body text on dark backgrounds

### Font Weight Adjustments for Dark Mode

| Context | Light Mode Weight | Dark Mode Weight | Reasoning |
|---------|-------------------|------------------|-----------|
| Body text | 400 (Regular) | 400-450 | Light text on dark bg appears thinner due to halation |
| Secondary text | 400 | 450-500 (Medium) | Needs extra weight to compensate for lower contrast ratios |
| Headings | 600-700 | 500-600 | Bold on dark bg can appear heavier than intended |
| Small labels | 500 (Medium) | 500 | Thin weights become illegible at small sizes on dark bg |
| Financial numbers | 500-600 | 500-600 | Numbers must always be crisp and unambiguous |

**Pro tip with variable fonts:** You can use CSS `@media (prefers-color-scheme: dark)` to bump font weight by 25-50 units. With variable fonts, `font-weight: 425` is perfectly valid.

**Source:** [Typography in Dark Mode - Design Shack](https://designshack.net/articles/typography/dark-mode-typography/), [Dark Mode Font Readability - RAIS Project](https://raisproject.com/dark-mode-font-readability/)

### Letter Spacing Adjustments

| Element | Light Mode | Dark Mode | Why |
|---------|-----------|-----------|-----|
| Body text (14-16px) | `0` to `0.01em` | `0.01em` to `0.02em` | Slight opening prevents character blending from halation |
| Small labels (<12px) | `0.02em` | `0.03em` to `0.05em` | Extra breathing room at small sizes |
| Uppercase labels | `0.05em` to `0.1em` | `0.06em` to `0.12em` | Uppercase needs more tracking; dark bg amplifies need |
| Large headings (24px+) | `-0.02em` to `0` | `-0.01em` to `0.01em` | Tighten less aggressively on dark bg |
| Monospace numbers | `0` (tabular) | `0` (tabular) | Tabular figures should maintain fixed width |

### Contrast Ratios for Dark Surfaces

| Text Role | Min Contrast Ratio (WCAG AA) | Recommended for Dark UI | Example Colors |
|-----------|------------------------------|------------------------|----------------|
| Primary text | 4.5:1 | 7:1+ | `#F0F0F0` on `#08080F` = ~17:1 |
| Secondary text | 4.5:1 | 5:1-7:1 | `#A0A0B0` on `#0F0F1A` = ~6:1 |
| Disabled/hint text | 3:1 (large text) | 3.5:1-4.5:1 | `#6B6B80` on `#0F0F1A` = ~3.5:1 |
| Accent on surface | 3:1 | 4.5:1+ | `#6366F1` on `#0F0F1A` = ~4.2:1 |

**Avoid:** Pure `#FFFFFF` text on any surface darker than `#333333`. The excessive contrast causes eye strain and halation. Soft whites (`#E8E8ED`, `#F0F0F5`) are universally more comfortable.

**Source:** [Beyond Dark Mode - The Brain Blog](https://the-brain.blog/white-on-black-text-accessibility-38435/), [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

### What Makes a Font Readable on Dark Backgrounds

1. **Tall x-height:** Fonts with a high x-height (like Inter, Geist, Manrope) have larger lowercase letters relative to capitals, increasing the "readable area" of each character.
2. **Open apertures:** Letters like `c`, `e`, `a`, `s` with wide openings are easier to distinguish at small sizes on dark backgrounds.
3. **Even stroke width:** Fonts with consistent stroke thickness (geometric/grotesque sans serifs) render more predictably than high-contrast serif faces where thin strokes can disappear.
4. **Clear character differentiation:** `1`, `l`, `I` must be visually distinct. `0` and `O` must be distinguishable. Critical for financial data.
5. **Tabular figures:** For financial dashboards, monospaced (tabular) numbers that align in columns are essential. Not all fonts default to this -- check for OpenType `tnum` feature.

---

## 4. Type Scale Systems

### Common Modular Scales

| Scale Name | Ratio | Sequence (base 16px) | Character |
|-----------|-------|----------------------|-----------|
| **Minor Second** | 1.067 | 16, 17, 18, 19, 21 | Almost flat -- too subtle for most UIs |
| **Major Second** | 1.125 | 16, 18, 20, 23, 25 | Very compact -- good for dense mobile UIs |
| **Minor Third** | 1.200 | 16, 19, 23, 28, 33 | Balanced -- versatile for data-heavy apps |
| **Major Third** | 1.250 | 16, 20, 25, 31, 39 | Clear hierarchy -- the sweet spot for dashboards |
| **Perfect Fourth** | 1.333 | 16, 21, 28, 38, 50 | Pronounced steps -- good for marketing pages |
| **Golden Ratio** | 1.618 | 16, 26, 42, 67, 109 | Dramatic -- too extreme for data-dense interfaces |

### Which Scale for Data-Heavy Dashboards?

**Recommendation: Major Third (1.250) or Minor Third (1.200)**

Rationale:
- Data-heavy dashboards have many levels of hierarchy (page title, section header, card title, label, value, footnote) -- you need 6-8 distinct sizes.
- With a high ratio (1.333+), the larger sizes become wasteful (50px+ headings eat space).
- With a low ratio (1.125), the sizes are too similar -- hierarchy collapses.
- 1.200-1.250 gives clear visual hierarchy while keeping every size useful.

For a dashboard with dense data:
- **Minor Third (1.200)** if space is tight (lots of tables, small cards).
- **Major Third (1.250)** if you have room for breathing space (KPI cards, charts).

### Tailwind's Default Scale vs Modular Scales

| Tailwind Class | Size | Approx. Ratio Step | Modular Equivalent |
|---------------|------|--------------------|--------------------|
| `text-xs` | 12px / 0.75rem | -- | -- |
| `text-sm` | 14px / 0.875rem | 1.167 | Between Major Second and Minor Third |
| `text-base` | 16px / 1rem | 1.143 | Near Major Second |
| `text-lg` | 18px / 1.125rem | 1.125 | Major Second |
| `text-xl` | 20px / 1.25rem | 1.111 | Near Major Second |
| `text-2xl` | 24px / 1.5rem | 1.200 | Minor Third |
| `text-3xl` | 30px / 1.875rem | 1.250 | Major Third |
| `text-4xl` | 36px / 2.25rem | 1.200 | Minor Third |
| `text-5xl` | 48px / 3rem | 1.333 | Perfect Fourth |

**Observation:** Tailwind's default scale is not mathematically consistent -- it uses different ratios at different levels. This is actually practical for real-world use (tight spacing at small sizes, bigger jumps for headings), but means it doesn't follow a single modular scale.

### Recommended Scale for Parcel

For a real estate/fintech dashboard with financial data, KPI cards, tables, and charts:

```
// Major Third scale (1.250), base 14px for body
10px  -- caption, footnotes, chart axis labels
12px  -- small labels, metadata, timestamps
14px  -- body text, table cells, form inputs
16px  -- card titles, list item primary text
18px  -- section headers within cards
20px  -- subsection headings
24px  -- section headings, KPI values
30px  -- page titles
36px  -- hero numbers (dashboard aggregate KPIs)
48px  -- landing page headings only
```

This gives enough range for both the dense app interface (10-20px) and the marketing/landing pages (30-48px).

**Source:** [Generate type scales with ease - UX Planet](https://uxplanet.org/generate-type-scales-with-ease-99777390bda1), [What Is a Type Scale? - Supercharge Design](https://supercharge.design/blog/what-is-a-type-scale)

---

## 5. How to Implement a Custom Font in Tailwind v3

### Method 1: Google Fonts Link Tag (Simplest, Not Recommended for Production)

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
  },
}
```

**Pros:** Zero configuration. **Cons:** External dependency, extra DNS lookups, no offline support, GDPR concerns.

### Method 2: Self-Hosted with @font-face (Recommended for Production)

```css
/* src/index.css or src/fonts.css */
@layer base {
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900; /* Variable font range */
    font-display: swap;
    src: url('/fonts/InterVariable.woff2') format('woff2-variations');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
                   U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
                   U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
                   U+FEFF, U+FFFD;
  }
}
```

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
  },
}
```

**Pros:** Full control, best performance, no external dependencies. **Cons:** Manual setup, need to download and convert font files.

### Method 3: CSS Variables Approach (Most Flexible)

```css
/* src/index.css */
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Outfit', 'Inter', system-ui, sans-serif;
}
```

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['var(--font-sans)'],
      mono: ['var(--font-mono)'],
      display: ['var(--font-display)'],
    },
  },
}
```

**Pros:** Easy to swap fonts, works well with theming, can change fonts at runtime. **Cons:** Slight CSS specificity complexity.

### Method 4: Variable Font with Feature Settings

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: [
        '"Inter var"', 'sans-serif',
        {
          fontFeatureSettings: '"cv11", "ss01"',
          fontVariationSettings: '"opsz" 32',
        },
      ],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
  },
}
```

This enables OpenType features (like the cv11 alternate "1" character in Inter) and variation settings directly in the Tailwind config.

### Complete Setup for a Project Like Parcel

```
frontend/
├── public/
│   └── fonts/
│       ├── InterVariable.woff2          # ~300KB, all weights
│       ├── InterVariable-italic.woff2   # ~300KB, if you need italics
│       └── JetBrainsMono-Variable.woff2 # ~200KB, already being used
```

```css
/* src/index.css */
@layer base {
  /* Display/Body font */
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/InterVariable.woff2') format('woff2-variations');
  }

  /* Already using JetBrains Mono for financial numbers */
  @font-face {
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 100 800;
    font-display: swap;
    src: url('/fonts/JetBrainsMono-Variable.woff2') format('woff2-variations');
  }
}
```

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
    },
  },
}
```

**Source:** [Font Family - Tailwind CSS v3](https://v3.tailwindcss.com/docs/font-family), [Custom fonts in Tailwind - LogRocket](https://blog.logrocket.com/custom-fonts-tailwind-css/)

---

## 6. Fonts to Avoid

### The "Generic SaaS" Tier (Overused to the Point of Meaninglessness)

| Font | Problem | How Many SaaS Sites Use It | Alternative |
|------|---------|---------------------------|-------------|
| **Poppins** | Everywhere. Template sites, Canva projects, every AI-generated landing page. Overly round, mediocre at small sizes. | Tens of thousands | Outfit, Plus Jakarta Sans |
| **Montserrat** | Once fresh, now ubiquitous. Signals "I Googled 'modern font'." Inconsistent at text sizes. | Extremely common | General Sans, Satoshi |
| **Open Sans** | The default-default. So neutral it communicates nothing. Aging character shapes. | Google's most-used font | Inter, Geist |
| **Lato** | Similar problem to Open Sans. Fine quality but zero personality. | Very common | Manrope, Plus Jakarta Sans |
| **Roboto** | Signals "Android default" or "Material Design template." | Google's second most-used | Inter (literally designed to replace it for web) |
| **Raleway** | Thin weights are illegible. Overused in "creative agency" templates. | Common in templates | Outfit, Syne |
| **Nunito** | Too rounded and playful for any professional financial application. | Common in ed-tech/health | Not a fintech font |
| **Quicksand** | Same problem as Nunito but worse -- reads as "children's app." | Common in templates | Not a fintech font |

### What Makes a Font Choice Feel "Vibe-Coded" or Generic

A font selection feels generic or AI-generated when:

1. **It is the first result on Google Fonts sorted by popularity.** Poppins, Roboto, Open Sans, Montserrat, Lato -- these are the top 5 by usage. Using them signals no intentional design decision was made.

2. **The pairing is a Google Fonts "suggested pairing."** Montserrat + Open Sans, Poppins + Lato -- these pairings have appeared on millions of sites. They are not bad fonts, but they are the typographic equivalent of stock photography.

3. **Every weight and style is loaded but only Regular and Bold are used.** Loading 8 weights and only using 2 is a vibe-coded tell -- an AI generated the `<link>` tag without understanding font loading optimization.

4. **The display font and body font are from the same geometric family.** Using Poppins for both headings and body text creates a flat, monotone reading experience with no visual tension.

5. **No monospace font for data.** Financial numbers in the same sans-serif as body text looks unprofessional. Every serious fintech product uses a monospace or tabular-figure font for numbers.

6. **No attention to weight variance.** Using only Regular (400) and Bold (700) with no Medium (500) or Semibold (600) creates a binary visual hierarchy that feels unsophisticated.

**The cure:** Pick a font that is not in the Google Fonts top 20 by popularity, or invest in a premium/Fontshare font. Pair it intentionally with a contrasting mono. Use at least 3-4 weights with purpose.

**Source:** [5 Overused Google Fonts Combinations - Medium](https://medium.com/@sejodesign/5-overused-google-fonts-combinations-you-should-avoid-and-what-to-use-instead-5409cf14a17f), [Google Fonts Alternatives - Pangram Pangram](https://pangrampangram.com/blogs/journal/google-font-alternatives-part2)

---

## 7. Top 5 Font Recommendations for Parcel

**Context:** Parcel is a dark-mode, data-heavy real estate/fintech SaaS. It already uses **JetBrains Mono** for all financial numbers (locked in, not changing). The display/body font must:
- Pair well with JetBrains Mono's geometric character
- Read well on dark backgrounds (`#08080F` base, `#0F0F1A` surface)
- Handle dense data (tables, KPI cards, sidebar labels)
- Not look generic or "vibe-coded"
- Be free or reasonably licensable

---

### Recommendation 1: Inter (The Safe Pick)

**Name:** Inter
**Category:** Neo-grotesque sans-serif
**Designer:** Rasmus Andersson
**License:** SIL Open Font License (free)
**Variable font:** Yes (weight 100-900, optical size)
**Google Fonts:** Yes

**Why it works for Parcel:**
- Designed explicitly for computer screens with a focus on high x-height, open apertures, and carefully crafted letterforms optimized for 11-16px.
- Used by Linear, Notion, Vercel (partially), and hundreds of serious SaaS products -- proven in dark-mode, data-dense contexts.
- Outstanding tabular figures (`font-feature-settings: 'tnum'`) for when you need numbers to align in non-monospace contexts.
- OpenType features like `cv01` (alternate 1), `cv11` (single-story a), `ss01` (open digits) let you customize character shapes.
- Variable font version means one ~300KB file for all weights.

**Pairing with JetBrains Mono:**
Inter and JetBrains Mono share similar x-heights and geometric DNA. JetBrains Mono handles all `$`, `%`, financial figures while Inter handles everything else. The transition between them feels natural, not jarring.

**Risk:** Inter is extremely popular. It won't make Parcel look bad, but it won't make it look distinctive either. It is the "you can't go wrong" choice.

**Implementation:**
```js
fontFamily: {
  sans: ['"Inter"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
}
```

---

### Recommendation 2: Geist Sans (The Developer-Native Pick)

**Name:** Geist Sans
**Category:** Geometric sans-serif
**Designer:** Vercel + Basement Studio
**License:** SIL Open Font License (free)
**Variable font:** Yes
**Google Fonts:** No (npm install or self-host from GitHub)

**Why it works for Parcel:**
- Built for developer/data interfaces from the ground up. Inspired by Swiss typography principles.
- Slightly more character than Inter -- distinctive lowercase `g`, sharper geometry.
- Comes with Geist Mono as a companion, though Parcel would keep JetBrains Mono for financial numbers.
- Excellent rendering on dark backgrounds due to even stroke width and generous spacing.
- Growing adoption in the developer/SaaS community without being overused.

**Pairing with JetBrains Mono:**
Both are geometrically influenced with even stroke widths. Geist is slightly warmer than Inter, creating a subtle but pleasant contrast with JetBrains Mono's more mechanical character.

**Risk:** Associated strongly with Vercel/Next.js ecosystem. Some users may perceive it as a "Vercel template" font. Still relatively new (released 2023).

**Implementation:**
```bash
npm install geist
```
```js
fontFamily: {
  sans: ['"Geist"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
}
```

---

### Recommendation 3: Outfit (The Distinctive Free Pick)

**Name:** Outfit
**Category:** Geometric sans-serif
**Designer:** Rodrigo Fuenzalida
**License:** SIL Open Font License (free)
**Variable font:** Yes (weight 100-900)
**Google Fonts:** Yes

**Why it works for Parcel:**
- Modern geometric sans-serif that avoids the cold, mechanical feel through subtle curves and slightly flared letter endings.
- Letters are slightly tall and narrow, creating upward energy that feels aspirational -- fitting for a platform where users are evaluating investment opportunities.
- Less common than Inter/Poppins/Montserrat, so Parcel would stand out from the "default SaaS" look.
- Clean rendering at all sizes, from 10px chart labels to 48px landing page headings.
- Variable font on Google Fonts means easy loading and small payload.

**Pairing with JetBrains Mono:**
Outfit's geometric character harmonizes well with JetBrains Mono. Outfit's slightly narrower proportions create a pleasant density contrast -- the UI text is compact and efficient while financial numbers in JetBrains Mono get breathing room.

**Risk:** No italics in the family (9 weights, no italic variants). You would need to handle emphasis through weight changes or color rather than italics, or use a different font for italic needs.

**Implementation:**
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```
```js
fontFamily: {
  sans: ['"Outfit"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
}
```

---

### Recommendation 4: Satoshi (The Premium-Feeling Free Pick)

**Name:** Satoshi
**Category:** Modernist sans-serif
**Designer:** Indian Type Foundry (ITF)
**License:** Free for personal and commercial use (Fontshare)
**Variable font:** Yes (weight 300-900)
**Google Fonts:** No (available via Fontshare / CDNFonts)

**Why it works for Parcel:**
- Swiss-style modernist with sharp angular details balanced by elegant rounded shapes. Feels premium without being pretentious.
- Double-storey `a` and `g` by default (with single-storey alternates via OpenType) -- the double-storey forms improve readability in body text on dark backgrounds.
- Includes 10 ligatures per style and alternate `G` and `t` characters for brand customization.
- Used by many award-winning sites (frequently featured on Awwwards) but not overexposed on mainstream SaaS.
- 5 weights (Light through Black) with italics, plus variable font.

**Pairing with JetBrains Mono:**
Satoshi's modernist precision shares DNA with JetBrains Mono's engineering-focused design. Both feel "designed by someone who thinks about details" -- they complement each other without competing. Satoshi's slightly softer curves provide warmth next to JetBrains Mono's mechanical precision.

**Risk:** Not on Google Fonts, so requires self-hosting (download from Fontshare). The licensing is generous but not SIL OFL -- check Fontshare's specific terms. Slightly less extensive weight range than Inter or Outfit.

**Implementation:**
```css
@font-face {
  font-family: 'Satoshi';
  font-style: normal;
  font-weight: 300 900;
  font-display: swap;
  src: url('/fonts/Satoshi-Variable.woff2') format('woff2-variations');
}
```
```js
fontFamily: {
  sans: ['"Satoshi"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
}
```

---

### Recommendation 5: Plus Jakarta Sans (The Warm Geometric Pick)

**Name:** Plus Jakarta Sans
**Category:** Geometric sans-serif
**Designer:** Gumpita Rahayu (Tokotype)
**License:** SIL Open Font License (free)
**Variable font:** Yes (weight 200-800)
**Google Fonts:** Yes

**Why it works for Parcel:**
- Geometric sans-serif with a warm, approachable character that balances professionalism with friendliness -- important for a platform where users are making significant financial decisions and need to feel confident, not intimidated.
- Slightly softer geometry than Inter or Geist, with rounded terminals that feel more human.
- Excellent at small sizes (dashboard labels, table headers) and large sizes (landing page headings).
- Includes stylistic sets: "Lancip" alternates (sharp terminals) and "Lurus" alternates (mini serifs) that can be activated for specific contexts.
- Growing adoption in fintech and SaaS without being overexposed.

**Pairing with JetBrains Mono:**
Plus Jakarta Sans's warmth and roundness provide a deliberate contrast with JetBrains Mono's sharper, more technical character. This creates a "human context / machine precision" dynamic that works well for a tool where narrative text (deal descriptions, AI chat) wraps around precise financial data.

**Risk:** Can feel slightly "friendly" for a hardcore financial tool. The rounded character might not convey enough gravitas for users expecting a Bloomberg-terminal aesthetic. Weight range caps at 800 (no Black/900).

**Implementation:**
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```
```js
fontFamily: {
  sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
}
```

---

### Final Comparison Matrix

| Criterion | Inter | Geist | Outfit | Satoshi | Plus Jakarta Sans |
|-----------|-------|-------|--------|---------|-------------------|
| **Dark mode readability** | 10/10 | 9/10 | 8/10 | 9/10 | 8/10 |
| **Pairs with JetBrains Mono** | 9/10 | 9/10 | 8/10 | 9/10 | 7/10 |
| **Distinctiveness** | 5/10 | 7/10 | 8/10 | 9/10 | 7/10 |
| **Data density handling** | 10/10 | 9/10 | 8/10 | 8/10 | 8/10 |
| **Availability (Google Fonts)** | Yes | No (npm) | Yes | No (Fontshare) | Yes |
| **Variable font** | Yes | Yes | Yes | Yes | Yes |
| **Italics** | Yes | Yes | No | Yes | Yes |
| **Tabular figures** | Yes (tnum) | Yes | Limited | Yes | Limited |
| **Community trust** | Very high | Growing | Moderate | Moderate | Growing |
| **"Vibe-coded" risk** | Medium | Low | Low | Very low | Low |

### My Recommendation for Parcel

**Primary choice: Satoshi** -- It hits the sweet spot of looking premium and distinctive without requiring a paid license. The modernist Swiss DNA pairs naturally with JetBrains Mono and reads beautifully on dark backgrounds. Self-hosting via Fontshare is straightforward.

**Safe alternative: Inter** -- If the team prefers maximum ecosystem support, proven reliability, and zero risk, Inter is the industry standard for a reason. It will never look bad, and it pairs perfectly with JetBrains Mono.

**Bold alternative: Outfit** -- If the team wants Parcel to feel visually distinctive from the Linear/Notion/Vercel crowd, Outfit's geometric warmth and narrow proportions create a unique identity. The no-italics limitation is manageable in a dashboard context where emphasis is typically communicated through weight and color.

---

## Sources

- [Stripe website (2020) - Fonts In Use](https://fontsinuse.com/uses/35338/stripe-website-2020)
- [Sohne Collection - Klim Type Foundry](https://klim.co.nz/collections/soehne/)
- [Linear uses Inter - type.fan](https://www.type.fan/site/linear-app)
- [Geist Font - Vercel](https://vercel.com/font)
- [The Birth of Geist - Basement Studio](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)
- [Robinhood - Porto Rocha](https://portorocha.com/robinhood/)
- [Coinbase - Moniker](https://monikersf.com/project/coinbase)
- [Coinbase in use - Fonts In Use](https://fontsinuse.com/typefaces/237137/coinbase)
- [Notion font - DesignYourWay](https://www.designyourway.net/blog/what-font-does-notion-use/)
- [Ramp identity - Fonts In Use](https://fontsinuse.com/uses/38468/ramp-identity)
- [Variable fonts performance - LogRocket](https://blog.logrocket.com/variable-fonts-is-the-performance-trade-off-worth-it/)
- [Why variable fonts are winning in 2026 - Kittl](https://www.kittl.com/blogs/why-variable-fonts-are-winning-fnt/)
- [Variable fonts - Can I Use](https://caniuse.com/variable-fonts)
- [Self-hosting vs Google Fonts - Capital Numbers](https://www.capitalnumbers.com/blog/self-hosting-vs-google-fonts/)
- [Best practices for fonts - web.dev](https://web.dev/articles/font-best-practices)
- [Font Display - WP Rocket](https://wp-rocket.me/google-core-web-vitals-wordpress/font-display-insight/)
- [Typography in Dark Mode - Design Shack](https://designshack.net/articles/typography/dark-mode-typography/)
- [Dark Mode Font Readability - RAIS Project](https://raisproject.com/dark-mode-font-readability/)
- [Beyond Dark Mode - The Brain Blog](https://the-brain.blog/white-on-black-text-accessibility-38435/)
- [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Generate type scales - UX Planet](https://uxplanet.org/generate-type-scales-with-ease-99777390bda1)
- [Font Family - Tailwind CSS v3](https://v3.tailwindcss.com/docs/font-family)
- [5 Overused Google Fonts - Medium](https://medium.com/@sejodesign/5-overused-google-fonts-combinations-you-should-avoid-and-what-to-use-instead-5409cf14a17f)
- [Google Fonts Alternatives - Pangram Pangram](https://pangrampangram.com/blogs/journal/google-font-alternatives-part2)
- [Satoshi - Fontshare](https://www.fontshare.com/fonts/satoshi)
- [Plus Jakarta Sans - Google Fonts](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- [Outfit - Google Fonts](https://fonts.google.com/specimen/Outfit)
- [General Sans - Fontshare](https://www.fontshare.com/fonts/general-sans)
- [JetBrains Mono pairings - Fontpair](https://www.fontpair.co/fonts/google/jetbrains-mono)
- [Best Fonts for Web Design 2025 - Shakuro](https://shakuro.com/blog/best-fonts-for-web-design)
- [Best Free Fonts for UI Design 2026 - Untitled UI](https://www.untitledui.com/blog/best-free-fonts)
- [Fintech typography guide - Smashing Magazine](https://www.smashingmagazine.com/2023/10/choose-typefaces-fintech-products-guide-part1/)
- [Typography in design systems - EightShapes](https://medium.com/eightshapes-llc/typography-in-design-systems-6ed771432f1e)
