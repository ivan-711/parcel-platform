# Premium Dark Color Science for Luxury SaaS

> Research document for Parcel (parceldesk.io) dark redesign.
> Covers warm-dark palette construction, gray scale engineering, opacity-based depth,
> text hierarchy, semantic colors, accent selection, financial color coding,
> WCAG compliance, and reference app analysis.

---

## 1. Warm-Dark vs Cold-Dark vs Neutral-Dark

The temperature of a near-black background defines the entire emotional register of an interface.

### Warm-Dark: `#0C0B0A` (brown/amber undertone)

- RGB breakdown: `R:12 G:11 B:10` — red channel leads by 1-2 points.
- Feels: intimate, premium, analog, leather-and-paper.
- Avoids the "cave effect" because the warm undertone tricks the eye into perceiving ambient light, like candlelight in a dark room.
- Best paired with cream whites (`#F0EDE8`) and warm accents (amber, violet, copper).
- Used by: premium editorial sites, luxury e-commerce, high-end fintech.

### Cold-Dark: `#0F172A` (blue/slate undertone)

- RGB breakdown: `R:15 G:23 B:42` — blue channel leads significantly.
- Feels: technical, corporate, spacious, digital-native.
- Can feel sterile or "developer-tool-ish" if not balanced with warm accents.
- Best paired with pure whites (`#FAFAFA`) and blue/cyan accents.
- Used by: Vercel (`#000000` true black), Tailwind docs, many DevTools.

### Neutral-Dark: `#141414` (equal RGB channels)

- RGB breakdown: `R:20 G:20 B:20` — perfectly balanced grayscale.
- Feels: modern, clean, Swiss-design, neither warm nor cold.
- Requires careful accent work to avoid feeling flat.
- Best paired with neutral grays and one strong chromatic accent.
- Used by: Linear (close to `#191919`), Raycast (`#151515`), Notion dark mode.

### Why warm-dark for Parcel

Real estate is a tactile, high-trust industry. Buyers care about physical spaces: hardwood floors, warm lighting, brick facades. A warm-dark background at `#0C0B0A` subconsciously references these materials. It says "this tool understands the physical world of property" in a way cold-dark never can. The 1-2 point red-channel bias is subtle enough to read as "elegant black" but warm enough to feel inviting during long analysis sessions.

---

## 2. The Complete Gray Scale (12 Steps)

A luxury dark interface needs a precisely tuned gray ramp. Each step serves a specific UI purpose. The key principle: every gray should carry the same warm undertone as the base background. This means slightly higher red values throughout.

| Step | Name             | Hex       | RGB              | Usage                                    |
|------|------------------|-----------|------------------|------------------------------------------|
| 0    | bg-base          | `#0C0B0A` | `12, 11, 10`     | Page background, root canvas             |
| 1    | bg-subtle        | `#131210` | `19, 18, 16`     | Recessed areas, sidebar backgrounds      |
| 2    | bg-surface       | `#1A1916` | `26, 25, 22`     | Cards, panels, modal backgrounds         |
| 3    | bg-elevated      | `#22211D` | `34, 33, 29`     | Dropdowns, popovers, tooltips            |
| 4    | bg-overlay       | `#2A2924` | `42, 41, 36`     | Hover states on surfaces, active panels  |
| 5    | border-subtle    | `#33322C` | `51, 50, 44`     | Subtle dividers, table row separators    |
| 6    | border-default   | `#3A3835` | `58, 56, 53`     | Default borders, input outlines          |
| 7    | border-strong    | `#4A4844` | `74, 72, 68`     | Strong borders, focus rings (non-accent) |
| 8    | text-disabled    | `#5C5A56` | `92, 90, 86`     | Disabled text, placeholder text          |
| 9    | text-muted       | `#7A7872` | `122, 120, 114`  | Tertiary labels, timestamps, captions    |
| 10   | text-secondary   | `#A09D98` | `160, 157, 152`  | Secondary text, descriptions, subtitles  |
| 11   | text-primary     | `#F0EDE8` | `240, 237, 232`  | Primary text, headings, body copy        |

Notice the pattern: the red channel consistently leads blue by 2-6 points across the entire scale. This is the warm undertone carried through every surface. The eye perceives this as cohesive warmth without being able to pinpoint why.

---

## 3. Depth Through Opacity Layers

Rather than defining dozens of surface colors, premium dark interfaces create depth by layering semi-transparent white over the base background. This is the technique Material Design codified and that Linear, Raycast, and others have refined.

### The opacity scale

```css
/* Depth layers — white overlays on #0C0B0A */
--layer-1: rgba(255, 255, 255, 0.02);  /* +2% — barely visible lift        */
--layer-2: rgba(255, 255, 255, 0.04);  /* +4% — card surfaces               */
--layer-3: rgba(255, 255, 255, 0.06);  /* +6% — elevated panels, dropdowns  */
--layer-4: rgba(255, 255, 255, 0.08);  /* +8% — hover states on surfaces    */
--layer-5: rgba(255, 255, 255, 0.12);  /* +12% — active/pressed states      */
--layer-6: rgba(255, 255, 255, 0.16);  /* +16% — extreme emphasis (rare)    */
```

### How this works visually

On `#0C0B0A`, a `rgba(255,255,255,0.04)` overlay computes to approximately `#161513` — a warm dark gray that is subtly lighter. The key advantage over hard-coded hex values is that opacity layers maintain the warm undertone of whatever sits beneath them. If you later adjust your base from `#0C0B0A` to `#0D0C0B`, every surface adjusts automatically.

### Stacking layers for complex UI

```css
/* A card with a hover state inside a sidebar */
.sidebar       { background: var(--layer-1); }       /* 2% lift   */
.sidebar .card { background: var(--layer-2); }       /* 4% lift   */
.sidebar .card:hover { background: var(--layer-4); } /* 8% lift   */

/* Dropdown on top of a card */
.card          { background: var(--layer-2); }        /* 4% lift   */
.card .dropdown { background: var(--layer-3); }       /* 6% lift   */
```

Material Design 2 used `#121212` as its dark base with white overlays at: 0% (0dp), 5% (1dp), 7% (2dp), 8% (3dp), 9% (4dp), 11% (6dp), 12% (8dp), 14% (12dp), 15% (16dp), 16% (24dp). Parcel's system simplifies this to six practical steps that cover the same perceptual range.

---

## 4. Border Colors: The Subtlety Spectrum

Borders on dark backgrounds are one of the most critical details. Too strong and they create a grid-like, boxy feeling. Too weak and elements bleed together. The right border communicates structure without drawing attention.

### The three tiers

| Opacity                       | Computed on #0C0B0A | Usage                                              |
|-------------------------------|---------------------|------------------------------------------------------|
| `rgba(255, 255, 255, 0.03)`  | ~`#0F0E0D`         | Ghost borders: card edges that only appear on focus  |
| `rgba(255, 255, 255, 0.04)`  | ~`#131210`         | Subtle borders: card separators, sidebar edges       |
| `rgba(255, 255, 255, 0.06)`  | ~`#181715`         | Standard borders: input fields, table dividers       |
| `rgba(255, 255, 255, 0.08)`  | ~`#1D1C19`         | Strong borders: active states, section dividers      |
| `rgba(255, 255, 255, 0.12)`  | ~`#252420`         | Emphasis borders: focus rings, selected items        |

### When to use each

- **0.03 (ghost)**: Default card edges in a grid where the background-surface difference already provides separation. The border exists so that on certain monitors or brightness settings the card edge remains perceivable.
- **0.04 (subtle)**: The "daily driver" border. Sidebar navigation edges, horizontal rules between sections, card outlines in non-active states.
- **0.06 (standard)**: Input fields at rest, dropdown menus, modal edges. This is where the border becomes intentionally visible.
- **0.08 (strong)**: Active/selected item borders, section dividers between major layout areas (e.g., between sidebar and main content).
- **0.12 (emphasis)**: Focus indicators and interactive element outlines when non-accent focus is needed.

### CSS implementation

```css
:root {
  --border-ghost:    rgba(255, 255, 255, 0.03);
  --border-subtle:   rgba(255, 255, 255, 0.04);
  --border-default:  rgba(255, 255, 255, 0.06);
  --border-strong:   rgba(255, 255, 255, 0.08);
  --border-emphasis: rgba(255, 255, 255, 0.12);
}
```

---

## 5. Text Color Hierarchy on Dark Backgrounds

### The four-tier system

| Role        | Hex       | RGB              | WCAG ratio vs #0C0B0A | Passes      |
|-------------|-----------|------------------|------------------------|-------------|
| Primary     | `#F0EDE8` | `240, 237, 232`  | **16.8:1**             | AAA (7:1)   |
| Secondary   | `#A09D98` | `160, 157, 152`  | **7.4:1**              | AAA (7:1)   |
| Muted       | `#5C5A56` | `92, 90, 86`     | **3.1:1**              | AA Large     |
| Disabled    | `#3A3835` | `58, 56, 53`     | **1.7:1**              | Decorative   |

### Contrast ratio calculations

The WCAG 2.2 relative luminance formula:

```
L = 0.2126 * R' + 0.7152 * G' + 0.0722 * B'
where R' = (R/255)^2.2 (simplified gamma)
```

**#0C0B0A (background):**
- R' = (12/255)^2.2 = 0.00147, G' = (11/255)^2.2 = 0.00119, B' = (10/255)^2.2 = 0.00096
- L_bg = 0.2126(0.00147) + 0.7152(0.00119) + 0.0722(0.00096) ≈ 0.00124

**#F0EDE8 (primary text):**
- R' = (240/255)^2.2 = 0.871, G' = (237/255)^2.2 = 0.851, B' = (232/255)^2.2 = 0.817
- L_primary = 0.2126(0.871) + 0.7152(0.851) + 0.0722(0.817) ≈ 0.853
- Ratio = (0.853 + 0.05) / (0.00124 + 0.05) = 0.903 / 0.0512 ≈ **17.6:1** (exceeds AAA)

**#A09D98 (secondary text):**
- L_secondary ≈ 0.335
- Ratio = (0.335 + 0.05) / (0.0512) ≈ **7.5:1** (exceeds AAA)

**#5C5A56 (muted text):**
- L_muted ≈ 0.103
- Ratio = (0.103 + 0.05) / (0.0512) ≈ **3.0:1** (passes AA for large text/UI components)

### Usage guidelines

- **Primary `#F0EDE8`**: All body copy, headings, input values, primary navigation labels, KPI values, monetary amounts. Never use pure white `#FFFFFF` — it vibrates against dark backgrounds and causes eye strain.
- **Secondary `#A09D98`**: Descriptions, subtitles, column headers in tables, form labels, secondary navigation items, metadata (dates, counts).
- **Muted `#5C5A56`**: Timestamps, helper text, tertiary labels, inactive tab labels, placeholder text in inputs. Must be 14px+ or used with supporting visual cues.
- **Disabled `#3A3835`**: Disabled button text, inactive form fields, decorative text. Does not meet WCAG text requirements — use only where the disabled state is also communicated through other means (reduced opacity container, strikethrough, icon).

---

## 6. Semantic Colors on Dark Backgrounds

The challenge with semantic colors (success, warning, error, info) on dark backgrounds is that saturated hues glow like neon signs. The solution: desaturate and shift lightness to the mid-range.

### The neon problem

On a light background, `#22C55E` (Tailwind green-500) reads as a clean success green. On `#0C0B0A`, the same green screams like a traffic light because dark backgrounds amplify perceived saturation. The retina's rod cells (dominant in low-light perception) are more sensitive to wavelength differences, making saturated colors feel louder.

### The solution: muted, tinted semantics

| Role    | Neon (avoid)    | Muted (use)     | Tinted bg (use)              | Description                |
|---------|-----------------|-----------------|------------------------------|----------------------------|
| Success | `#22C55E`       | `#6DBEA3`       | `rgba(109, 190, 163, 0.10)` | Desaturated sage-green     |
| Warning | `#EAB308`       | `#D4A867`       | `rgba(212, 168, 103, 0.10)` | Warm amber, not yellow     |
| Error   | `#EF4444`       | `#D4766A`       | `rgba(212, 118, 106, 0.10)` | Muted terracotta-red       |
| Info    | `#3B82F6`       | `#7B9FCC`       | `rgba(123, 159, 204, 0.10)` | Soft steel-blue            |

### Key principles

1. **Desaturate by 20-35%** from typical light-mode semantic colors.
2. **Raise lightness to 55-65%** in HSL terms so they read against dark without blinding.
3. **Use tinted backgrounds** (`rgba` at 8-12% opacity) instead of relying solely on color badges or icons. A success message gets a `rgba(109, 190, 163, 0.10)` background with `#6DBEA3` text — the tinted surface reinforces meaning without neon glow.
4. **Keep warm undertones**: notice the success green leans sage (blue-green, not yellow-green), and the error red leans terracotta (warm, not cool crimson). This maintains harmony with the warm-dark palette.

### WCAG check for semantic colors

| Color   | Hex       | Ratio vs #0C0B0A | Passes        |
|---------|-----------|-------------------|---------------|
| Success | `#6DBEA3` | ~8.5:1            | AAA           |
| Warning | `#D4A867` | ~8.0:1            | AAA           |
| Error   | `#D4766A` | ~5.6:1            | AA            |
| Info    | `#7B9FCC` | ~6.8:1            | AA (near AAA) |

---

## 7. Accent Color: Warm Violet `#8B7AFF`

### Why violet works on warm-dark

1. **Complementary temperature contrast**: Violet is a cool-leaning hue sitting on a warm-dark background. This temperature opposition creates natural visual pop without needing high saturation. The eye is drawn to the accent because it is the only "cool" element in a warm environment.

2. **Luxury association**: Violet has millennia of association with royalty, rarity, and premium quality (Tyrian purple, clerical vestments, haute couture). In fintech and proptech, it differentiates from the sea of blue and green accents.

3. **Readability**: `#8B7AFF` at HSL `(248, 100%, 74%)` has high enough lightness to read as text on `#0C0B0A` while remaining visually distinct from the warm gray text hierarchy.

4. **Harmony with cream**: Against `#F0EDE8` cream text, violet provides a clear third voice — it is neither the background nor the text, but unmistakably the "action" color.

### Building a violet scale

| Step  | Name             | Hex       | Usage                                          |
|-------|------------------|-----------|-------------------------------------------------|
| 50    | violet-faint     | `#F5F3FF` | Light-mode backgrounds (if ever needed)         |
| 100   | violet-wash      | `#EDEAFF` | Tinted pill backgrounds in light contexts       |
| 200   | violet-light     | `#C4BEFF` | Light accent on dark: tags, subtle highlights   |
| 300   | violet-soft      | `#A89FFF` | Secondary buttons, active nav indicators        |
| 400   | violet-base      | `#8B7AFF` | Primary accent: buttons, links, focus rings     |
| 500   | violet-mid       | `#7B6AEF` | Hover state for primary buttons                 |
| 600   | violet-deep      | `#6B5AD6` | Active/pressed state                            |
| 700   | violet-dark      | `#5A49BD` | Dark accent for high-contrast contexts          |
| 800   | violet-darker    | `#4A3AA3` | Dark mode borders when accent border needed     |
| 900   | violet-deepest   | `#3A2A8A` | Very dark accent, rarely used                   |

### Accent surfaces (tinted overlays)

```css
--accent-surface:       rgba(139, 122, 255, 0.08);  /* Tinted card background   */
--accent-surface-hover: rgba(139, 122, 255, 0.12);  /* Hover on tinted surface  */
--accent-border:        rgba(139, 122, 255, 0.20);  /* Accent-colored border    */
--accent-border-strong: rgba(139, 122, 255, 0.35);  /* Strong accent border     */
```

### WCAG check for accent

| Combination               | Ratio  | Passes    |
|---------------------------|--------|-----------|
| `#8B7AFF` on `#0C0B0A`   | ~6.3:1 | AA, near AAA |
| `#8B7AFF` on `#1A1916`   | ~5.5:1 | AA        |
| `#F0EDE8` on `#8B7AFF`   | ~2.8:1 | Fails for text — use for icons/decoration only |
| `#0C0B0A` on `#8B7AFF`   | ~6.3:1 | AA        |

**Important**: Do not use `#F0EDE8` cream text on a `#8B7AFF` violet button. Use `#0C0B0A` dark text on violet buttons for labels, or use `#F0EDE8` only when the button background is `#6B5AD6` or darker.

---

## 8. Financial Colors: Profit and Loss on Dark Backgrounds

Financial interfaces have special color requirements. Users need to instantly parse positive vs. negative values, and these colors carry strong cultural meaning.

### The problem with standard green/red

- Standard green (`#22C55E`) and red (`#EF4444`) create a Christmas-tree effect on dark backgrounds.
- Red-green colorblindness affects ~8% of male users — relying solely on hue is an accessibility failure.
- Highly saturated green/red clash with a warm-dark, premium aesthetic.

### Recommended profit/loss palette

| Role           | Hex       | HSL                    | Description                   |
|----------------|-----------|------------------------|-------------------------------|
| Profit text    | `#7CCBA5` | `155, 38%, 64%`        | Muted sage green              |
| Profit bg      | `rgba(124, 203, 165, 0.10)` | —         | Subtle green tint surface     |
| Profit strong  | `#5AB88E` | `155, 38%, 54%`        | Charts, large KPI values      |
| Loss text      | `#D4766A` | `8, 50%, 62%`          | Warm terracotta red           |
| Loss bg        | `rgba(212, 118, 106, 0.10)` | —         | Subtle red tint surface       |
| Loss strong    | `#C45E52` | `8, 50%, 54%`          | Charts, large KPI values      |
| Neutral        | `#A09D98` | Uses secondary text    | No change, break-even         |

### Supporting patterns beyond color

1. **Directional arrows**: Always accompany positive/negative values with up/down arrows (not just +/- signs).
2. **Prefix symbols**: `+$12,400` vs `-$3,200` — the sign is readable even without color.
3. **Position encoding**: Positive values in a dedicated "gains" column, negative in a "losses" column.
4. **Background tinting**: Wrap profit cells in `rgba(124, 203, 165, 0.08)` and loss cells in `rgba(212, 118, 106, 0.08)` so the semantic color extends beyond just the text.

### WCAG check for financial colors

| Color         | Hex       | Ratio vs #0C0B0A | Ratio vs #1A1916 | Passes    |
|---------------|-----------|-------------------|-------------------|-----------|
| Profit text   | `#7CCBA5` | ~9.6:1            | ~8.2:1            | AAA       |
| Profit strong | `#5AB88E` | ~7.4:1            | ~6.3:1            | AAA / AA  |
| Loss text     | `#D4766A` | ~5.6:1            | ~4.8:1            | AA        |
| Loss strong   | `#C45E52` | ~4.2:1            | ~3.6:1            | AA small  |

---

## 9. Reference App Analysis

### Raycast

- **Base background**: `#151515` — neutral dark, no warm or cool bias.
- **Surface elevation**: Uses very subtle opacity layers; cards are barely distinguishable from background.
- **Accent**: Multi-color gradient approach (pink-orange-purple) rather than a single accent.
- **Text**: Near-white primary with gray-400 level secondary.
- **Key takeaway**: Raycast proves that minimal surface differentiation (1-2% opacity difference) is enough when combined with clean typography and generous spacing.

### Arc Browser

- **Base background**: Dynamic, user-customizable per Space.
- **Design tokens**: Exposes CSS custom properties (`--arc-palette-background`, `--arc-palette-foregroundPrimary`, etc.) — a 12-token system.
- **Dark defaults**: Cool-leaning dark grays in the `#1A1F2E` range.
- **Key takeaway**: Arc's token architecture (background, foregroundPrimary, foregroundSecondary, foregroundTertiary, hover, focus, cutout) is an excellent semantic naming model to emulate.

### Linear

- **Base background**: Close to `#191919` — neutral, with their LCH-based color system.
- **Theme engine**: Three variables (base color, accent color, contrast) generate the entire palette using the LCH color space. LCH ensures perceptual uniformity — colors at the same lightness genuinely look equally light.
- **Surface system**: Background, foreground, panels, dialogs, modals — each at a different elevation.
- **Accent**: Signature indigo/violet (`#5E6AD2`) — notably similar to the violet family Parcel is considering.
- **Key takeaway**: Linear's LCH-based generation and three-variable system is the gold standard for theme flexibility. Their choice of violet/indigo as accent validates Parcel's direction.

### Vercel (Geist)

- **Base background**: True black `#000000` — the boldest choice in the group.
- **Surface system**: Two background levels (Background 1, Background 2) plus overlay surfaces for dropdowns and modals.
- **Gray scale**: The Geist gray ramp moves in ~10% lightness increments with a cool/neutral bias.
- **Accent**: No chromatic accent in the design system itself — relies on grayscale hierarchy with blue only for interactive links.
- **Key takeaway**: Vercel proves that true black can work for developer tools, but their audience is technical users who expect maximum contrast. For a real estate platform targeting investors and agents, warm-dark is more appropriate.

---

## 10. Tailwind Config and CSS Custom Properties

### CSS custom properties (root)

```css
:root {
  /* ── Base palette ── */
  --color-bg-base:       #0C0B0A;
  --color-bg-subtle:     #131210;
  --color-bg-surface:    #1A1916;
  --color-bg-elevated:   #22211D;
  --color-bg-overlay:    #2A2924;

  /* ── Opacity layers ── */
  --layer-1: rgba(255, 255, 255, 0.02);
  --layer-2: rgba(255, 255, 255, 0.04);
  --layer-3: rgba(255, 255, 255, 0.06);
  --layer-4: rgba(255, 255, 255, 0.08);
  --layer-5: rgba(255, 255, 255, 0.12);
  --layer-6: rgba(255, 255, 255, 0.16);

  /* ── Borders ── */
  --border-ghost:    rgba(255, 255, 255, 0.03);
  --border-subtle:   rgba(255, 255, 255, 0.04);
  --border-default:  rgba(255, 255, 255, 0.06);
  --border-strong:   rgba(255, 255, 255, 0.08);
  --border-emphasis: rgba(255, 255, 255, 0.12);

  /* ── Text ── */
  --color-text-primary:   #F0EDE8;
  --color-text-secondary: #A09D98;
  --color-text-muted:     #5C5A56;
  --color-text-disabled:  #3A3835;

  /* ── Accent (violet) ── */
  --color-accent:         #8B7AFF;
  --color-accent-hover:   #7B6AEF;
  --color-accent-active:  #6B5AD6;
  --color-accent-surface: rgba(139, 122, 255, 0.08);
  --color-accent-border:  rgba(139, 122, 255, 0.20);

  /* ── Semantic ── */
  --color-success:    #6DBEA3;
  --color-success-bg: rgba(109, 190, 163, 0.10);
  --color-warning:    #D4A867;
  --color-warning-bg: rgba(212, 168, 103, 0.10);
  --color-error:      #D4766A;
  --color-error-bg:   rgba(212, 118, 106, 0.10);
  --color-info:       #7B9FCC;
  --color-info-bg:    rgba(123, 159, 204, 0.10);

  /* ── Financial ── */
  --color-profit:     #7CCBA5;
  --color-profit-bg:  rgba(124, 203, 165, 0.10);
  --color-loss:       #D4766A;
  --color-loss-bg:    rgba(212, 118, 106, 0.10);
}
```

### Tailwind v4 config snippet

```ts
// tailwind.config.ts (relevant color extension)
import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        bg: {
          base:     "var(--color-bg-base)",
          subtle:   "var(--color-bg-subtle)",
          surface:  "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
          overlay:  "var(--color-bg-overlay)",
        },
        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted:     "var(--color-text-muted)",
          disabled:  "var(--color-text-disabled)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
          active:  "var(--color-accent-active)",
          surface: "var(--color-accent-surface)",
          border:  "var(--color-accent-border)",
        },
        border: {
          ghost:    "var(--border-ghost)",
          subtle:   "var(--border-subtle)",
          DEFAULT:  "var(--border-default)",
          strong:   "var(--border-strong)",
          emphasis: "var(--border-emphasis)",
        },
        success:  { DEFAULT: "var(--color-success)",  bg: "var(--color-success-bg)" },
        warning:  { DEFAULT: "var(--color-warning)",  bg: "var(--color-warning-bg)" },
        error:    { DEFAULT: "var(--color-error)",    bg: "var(--color-error-bg)" },
        info:     { DEFAULT: "var(--color-info)",     bg: "var(--color-info-bg)" },
        profit:   { DEFAULT: "var(--color-profit)",   bg: "var(--color-profit-bg)" },
        loss:     { DEFAULT: "var(--color-loss)",     bg: "var(--color-loss-bg)" },

        // Violet accent full scale
        violet: {
          50:  "#F5F3FF",
          100: "#EDEAFF",
          200: "#C4BEFF",
          300: "#A89FFF",
          400: "#8B7AFF",
          500: "#7B6AEF",
          600: "#6B5AD6",
          700: "#5A49BD",
          800: "#4A3AA3",
          900: "#3A2A8A",
        },
      },
    },
  },
} satisfies Config;
```

### Usage examples in JSX

```tsx
{/* Card with warm surface and subtle border */}
<div className="bg-bg-surface border border-border-subtle rounded-xl p-6">
  <h3 className="text-text-primary text-lg font-semibold">Cash-on-Cash Return</h3>
  <p className="text-text-secondary mt-1">Annual return relative to initial investment</p>
  <span className="text-profit text-3xl font-bold mt-4 block">+14.2%</span>
</div>

{/* Accent button */}
<button className="bg-accent hover:bg-accent-hover active:bg-accent-active
                    text-bg-base font-medium px-4 py-2 rounded-lg">
  Analyze Deal
</button>

{/* Error banner with tinted background */}
<div className="bg-error-bg border border-error/20 rounded-lg p-4">
  <p className="text-error">Negative cash flow detected in year 3</p>
</div>
```

---

## 11. WCAG Compliance Summary

All proposed text/background combinations with their contrast ratios:

| Foreground   | Background   | Ratio    | WCAG Level | Status    |
|-------------|--------------|----------|------------|-----------|
| `#F0EDE8`   | `#0C0B0A`   | ~17.6:1  | AAA        | Pass      |
| `#F0EDE8`   | `#1A1916`   | ~14.5:1  | AAA        | Pass      |
| `#A09D98`   | `#0C0B0A`   | ~7.5:1   | AAA        | Pass      |
| `#A09D98`   | `#1A1916`   | ~6.3:1   | AA         | Pass      |
| `#5C5A56`   | `#0C0B0A`   | ~3.0:1   | AA Large   | Conditional |
| `#8B7AFF`   | `#0C0B0A`   | ~6.3:1   | AA         | Pass      |
| `#8B7AFF`   | `#1A1916`   | ~5.5:1   | AA         | Pass      |
| `#0C0B0A`   | `#8B7AFF`   | ~6.3:1   | AA         | Pass (button text) |
| `#7CCBA5`   | `#0C0B0A`   | ~9.6:1   | AAA        | Pass      |
| `#D4766A`   | `#0C0B0A`   | ~5.6:1   | AA         | Pass      |
| `#D4A867`   | `#0C0B0A`   | ~8.0:1   | AAA        | Pass      |
| `#7B9FCC`   | `#0C0B0A`   | ~6.8:1   | AA         | Pass      |
| `#6DBEA3`   | `#0C0B0A`   | ~8.5:1   | AAA        | Pass      |

**Key compliance notes:**
- Muted text (`#5C5A56`) at 3.0:1 passes only for large text (18px+ or 14px+ bold) and non-text UI components. Never use for body copy.
- Disabled text (`#3A3835`) at 1.7:1 does not pass any WCAG level. This is intentional — disabled elements must communicate their state through multiple cues, not just color.
- All primary, secondary, accent, and semantic colors pass WCAG AA (4.5:1) at minimum against the base background.

---

## RECOMMENDATIONS FOR PARCEL

1. **Adopt `#0C0B0A` as the root background.** The warm undertone (R leads B by 2pts) aligns with real estate's tactile, physical-world associations. It reads as black but feels inviting. Do not use pure `#000000`.

2. **Build the surface system on opacity layers, not hard-coded grays.** Define `--layer-1` through `--layer-6` as `rgba(255,255,255, 0.02-0.16)`. This ensures every surface inherits the warm undertone automatically and simplifies future palette adjustments.

3. **Use the 12-step warm gray ramp from Section 2 as your token foundation.** Map these to semantic names (`bg-base`, `bg-surface`, `bg-elevated`, `text-primary`, `text-secondary`, `text-muted`, `text-disabled`) rather than numbered scales. This prevents misuse and makes the codebase self-documenting.

4. **Set borders at `rgba(255,255,255,0.04)` as the default** and reserve `0.06` for inputs and `0.08` for strong dividers. The `0.03` ghost border should be the card-edge default in grid layouts.

5. **Keep `#F0EDE8` cream as primary text — never use pure white.** The 8-point gap between R and B channels (240 vs 232) maintains warmth while delivering 17.6:1 contrast. Pure `#FFFFFF` would clash with the warm surfaces.

6. **Use `#8B7AFF` warm violet as the sole chromatic accent.** Build the full 50-900 scale from Section 7. For buttons, use dark text (`#0C0B0A`) on the violet-400 background. For links and interactive elements on dark surfaces, use violet-400 directly.

7. **Desaturate all semantic colors by 25-30%.** Use the muted semantic palette from Section 6 (`#6DBEA3` success, `#D4A867` warning, `#D4766A` error, `#7B9FCC` info). Pair text colors with 10%-opacity tinted backgrounds for reinforcement.

8. **For profit/loss, use `#7CCBA5` (sage green) and `#D4766A` (terracotta) instead of standard green/red.** Always supplement with directional arrows and +/- prefixes for colorblind accessibility. Use tinted row backgrounds in financial tables.

9. **Implement all colors as CSS custom properties first, then map to Tailwind.** This allows runtime theme switching (if ever needed) and keeps a single source of truth. The Tailwind config in Section 10 provides the exact mapping.

10. **Audit every text/background combination against the WCAG table in Section 11 before shipping.** Pay special attention to muted text on elevated surfaces — `#5C5A56` on `#1A1916` drops to ~2.6:1 which fails even for large text. On elevated surfaces, use `#A09D98` as the minimum text color.

11. **Follow Linear's lead on LCH color space.** When generating intermediate shades or custom accent tones, use OKLCH rather than HSL. HSL produces perceptually uneven lightness steps (a known deficiency), while OKLCH ensures that "50% lightness" genuinely looks 50% light to the human eye.

12. **Test on both OLED and LCD displays.** OLED screens render true black pixels as "off," creating stronger perceived contrast than LCD. The warm-dark `#0C0B0A` is above true black, so it will render as a lit pixel on OLED — this is intentional and prevents the "floating text" effect that occurs when text sits on true-black OLED pixels.
