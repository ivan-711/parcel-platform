# Parcel Design System: Dark-to-Light Theme Transition Research

## 1. Reference Analysis: Mercury, Linear, Stripe

### Mercury (Banking SaaS)
Mercury uses a restrained, trust-first palette. Their light theme relies on:
- **Background:** Pure white `#FFFFFF` for main content, off-white `#F7F7F8` for page bg
- **Surface:** `#FFFFFF` cards on `#F7F7F8` — subtle lift via shadow, not bg contrast
- **Text:** Near-black `#1A1A1A` (primary), `#6B7280` (secondary), `#9CA3AF` (muted)
- **Accent:** Deep blue `#1B1B3A` for primary actions — not a bright color, conveying seriousness
- **Borders:** `#E5E5E5` — thin, 1px, very subtle
- **Shadows:** Barely perceptible `0 1px 2px rgba(0,0,0,0.04)` on cards
- **Typography:** Inter, tight tracking, medium weight for headings, regular for body
- **Key pattern:** Mercury avoids bright accent colors for primary actions — their CTA is dark/navy, implying stability. Color enters only for status (green deposits, red withdrawals).

### Linear (Project Management)
Linear pioneered the "premium SaaS" aesthetic. Light mode specifics:
- **Background:** `#FFFFFF` (content), `#F9FAFB` (sidebar/secondary areas)
- **Surface:** White cards, no visible border — elevation via `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- **Text:** `#171717` (primary), `#6B6F76` (secondary), `#B4B4B4` (muted/placeholder)
- **Accent:** Violet `#5E6AD2` — used sparingly for active states, links, focus rings
- **Borders:** `#E8E8EC` — used on inputs and dividers, never on cards
- **Shadows:** Multi-layer: `0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)`
- **Typography:** Inter with -0.02em letter-spacing on headings, SF Pro on macOS
- **Key pattern:** Linear uses a sidebar with a tinted background (`#F2F2F5`) that is distinct from content. Cards have no border — just shadow. Lots of whitespace. Icons are 16px, stroke-1.5.

### Stripe Dashboard (Financial)
Stripe balances information density with clarity:
- **Background:** `#F6F8FA` (page), `#FFFFFF` (content panels)
- **Surface:** White with `border: 1px solid #E3E8EE` — Stripe prefers borders over shadows
- **Text:** `#1A1F36` (primary — dark navy, not pure black), `#697386` (secondary), `#A3ACB9` (muted)
- **Accent:** Stripe purple `#635BFF` — close to Parcel's current indigo
- **Borders:** `#E3E8EE` — consistent, used everywhere (cards, tables, inputs)
- **Shadows:** Used on dropdowns/modals only: `0 2px 5px rgba(60,66,87,0.08), 0 1px 1px rgba(0,0,0,0.12)`
- **Typography:** `-apple-system, BlinkMacSystemFont, "Segoe UI"` — system stack, 14px body
- **Key pattern:** Stripe uses color-coded status pills (green/yellow/red/blue) heavily — relevant for Parcel's deal pipeline. Tables are the primary data layout, not cards. Financial numbers use tabular-nums.

### Synthesis: What Works for Financial SaaS
All three share these principles:
1. **Near-white page backgrounds** (`#F6F8FA` to `#F9FAFB`) — not pure white, slightly cool
2. **Pure white content surfaces** — cards/panels are `#FFFFFF`
3. **Dark-navy text** — never pure `#000000`, always `#1A1A2E` to `#1A1F36`
4. **Single accent color** used sparingly — for interactive elements only
5. **Borders OR shadows, rarely both** — pick a strategy
6. **Tabular numerals** for financial data — `font-variant-numeric: tabular-nums`
7. **Subdued palettes** — bright colors reserved for status indicators

---

## 2. Color Palette

### Neutrals (Gray Scale)
The foundation. Built on a cool-tinted gray (slight blue undertone) for a professional financial feel:

| Token            | Hex       | Usage                              | Tailwind Class       |
|------------------|-----------|------------------------------------|----------------------|
| `gray-25`        | `#FCFCFD` | Subtle hover on white surfaces     | `bg-gray-25`         |
| `gray-50`        | `#F9FAFB` | Page background                    | `bg-gray-50`         |
| `gray-100`       | `#F2F4F7` | Sidebar bg, secondary surfaces     | `bg-gray-100`        |
| `gray-200`       | `#EAECF0` | Borders, dividers                  | `border-gray-200`    |
| `gray-300`       | `#D0D5DD` | Disabled borders, input borders    | `border-gray-300`    |
| `gray-400`       | `#98A2B3` | Placeholder text, disabled icons   | `text-gray-400`      |
| `gray-500`       | `#667085` | Secondary text, captions           | `text-gray-500`      |
| `gray-600`       | `#475467` | Body text (secondary emphasis)     | `text-gray-600`      |
| `gray-700`       | `#344054` | Strong secondary text              | `text-gray-700`      |
| `gray-800`       | `#1D2939` | Headings, primary text             | `text-gray-800`      |
| `gray-900`       | `#101828` | Maximum contrast text              | `text-gray-900`      |
| `gray-950`       | `#0C111D` | Rare: tooltip bg, dark accents     | `bg-gray-950`        |

This scale is based on the Untitled UI / Shadcn gray palette, which has a slight cool undertone that feels professional without being cold.

### Primary (Indigo)
Parcel's existing indigo `#6366F1` is strong. Keeping it maintains brand continuity and it aligns closely with Stripe's `#635BFF`. Full scale:

| Token            | Hex       | Usage                              |
|------------------|-----------|-------------------------------------|
| `primary-25`     | `#F5F5FF` | Subtle tinted backgrounds          |
| `primary-50`     | `#EEF0FF` | Selected row bg, light badges      |
| `primary-100`    | `#E0E2FF` | Hover states on tinted bg          |
| `primary-200`    | `#C7C9FF` | Focus ring (lighter)               |
| `primary-300`    | `#A5A7FC` | —                                  |
| `primary-400`    | `#8385F6` | —                                  |
| `primary-500`    | `#6366F1` | **Primary accent** (buttons, links)|
| `primary-600`    | `#4F46E5` | Hover state for primary buttons    |
| `primary-700`    | `#4338CA` | Active/pressed state               |
| `primary-800`    | `#3730A3` | —                                  |
| `primary-900`    | `#312E81` | Dark badges                        |

### Semantic Colors

**Success (Green):** For positive ROI, profitable deals, completed stages
| Token            | Hex       | Usage                    |
|------------------|-----------|--------------------------|
| `success-50`     | `#ECFDF5` | Success banner bg        |
| `success-100`    | `#D1FAE5` | Light badge bg           |
| `success-500`    | `#10B981` | Icons, text              |
| `success-600`    | `#059669` | Stronger emphasis        |
| `success-700`    | `#047857` | On-dark-bg text          |

**Warning (Amber):** For caution alerts, medium-risk deals, pending states
| Token            | Hex       | Usage                    |
|------------------|-----------|--------------------------|
| `warning-50`     | `#FFFBEB` | Warning banner bg        |
| `warning-100`    | `#FEF3C7` | Light badge bg           |
| `warning-500`    | `#F59E0B` | Icons, text              |
| `warning-600`    | `#D97706` | Stronger emphasis        |
| `warning-700`    | `#B45309` | On-dark-bg text          |

**Error (Red):** For negative cash flow, rejected deals, validation errors
| Token            | Hex       | Usage                    |
|------------------|-----------|--------------------------|
| `error-50`       | `#FEF2F2` | Error banner bg          |
| `error-100`      | `#FEE2E2` | Light badge bg           |
| `error-500`      | `#EF4444` | Icons, text              |
| `error-600`      | `#DC2626` | Stronger emphasis        |
| `error-700`      | `#B91C1C` | On-dark-bg text          |

**Info (Blue):** For informational states, tooltips, new features
| Token            | Hex       | Usage                    |
|------------------|-----------|--------------------------|
| `info-50`        | `#EFF6FF` | Info banner bg           |
| `info-100`       | `#DBEAFE` | Light badge bg           |
| `info-500`       | `#3B82F6` | Icons, text              |
| `info-600`       | `#2563EB` | Links on hover           |
| `info-700`       | `#1D4ED8` | Active links             |

### Surface & Border Colors (Light Theme)

| Token               | Hex       | Usage                                |
|----------------------|-----------|--------------------------------------|
| `bg-page`            | `#F9FAFB` | Main page background (gray-50)       |
| `bg-surface`         | `#FFFFFF` | Cards, panels, modals                |
| `bg-surface-secondary`| `#F2F4F7`| Sidebar, secondary panels (gray-100)|
| `bg-surface-hover`   | `#F9FAFB` | Row hover, card hover                |
| `bg-surface-active`  | `#EEF0FF` | Selected row (primary-50)            |
| `border-default`     | `#EAECF0` | Card borders, dividers (gray-200)    |
| `border-strong`      | `#D0D5DD` | Input borders, emphasized dividers   |
| `border-focus`       | `#6366F1` | Focus ring color (primary-500)       |

### Strategy Badge Colors (Light Theme Adapted)
These need lighter backgrounds and darker text compared to the current dark-theme badges:

| Strategy   | Badge BG    | Badge Text  | Current Dark BG | Notes                        |
|-----------|-------------|-------------|-----------------|------------------------------|
| Wholesale  | `#FEF3C7`  | `#92400E`   | `#451A03`       | Amber-100 bg, Amber-800 text|
| Creative   | `#EDE9FE`  | `#5B21B6`   | `#2E1065`       | Violet-100 bg, Violet-800   |
| BRRRR      | `#DBEAFE`  | `#1E40AF`   | `#0C1A4A`       | Blue-100 bg, Blue-800       |
| Buy & Hold | `#D1FAE5`  | `#065F46`   | `#064E3B`       | Emerald-100 bg, Emerald-800 |
| Flip       | `#FEE2E2`  | `#991B1B`   | `#431407`       | Red-100 bg, Red-800         |

---

## 3. Typography

### Font Family Selection

**Recommendation: Keep Satoshi as display/heading font, switch body to Inter**

Rationale:
- **Satoshi** (currently used site-wide) is a geometric sans with personality — excellent for headings and brand elements, but its letterforms can feel less legible at small sizes for dense data tables.
- **Inter** is purpose-built for screens, has true tabular figures, excellent x-height, and is the default for Linear, Vercel, and most modern SaaS. It excels at 13-14px body text.
- **Alternative: Plus Jakarta Sans** — slightly warmer than Inter, used by some fintech products. Slightly less sharp at small sizes.
- **Alternative: DM Sans** — geometric like Satoshi but with better small-size rendering. Could work as a single-font solution.

**Verdict:** Use Satoshi for headings (h1-h3) and brand elements, Inter for body text and UI elements. Keep JetBrains Mono for financial numbers. This gives Parcel a distinctive brand feel (Satoshi) while ensuring readability in data-heavy views (Inter).

If maintaining a single font is preferred (simpler), **DM Sans** or **Geist** are the strongest single-font alternatives to Satoshi.

### Type Scale

| Token      | Size  | Weight | Line Height | Letter Spacing | Usage                    |
|-----------|-------|--------|-------------|----------------|--------------------------|
| `display`  | 36px  | 700    | 1.2 (44px)  | -0.02em        | Page hero titles         |
| `h1`       | 30px  | 700    | 1.2 (36px)  | -0.02em        | Page titles              |
| `h2`       | 24px  | 600    | 1.3 (32px)  | -0.015em       | Section titles           |
| `h3`       | 20px  | 600    | 1.4 (28px)  | -0.01em        | Card titles, subsections |
| `h4`       | 16px  | 600    | 1.5 (24px)  | -0.005em       | Small headings           |
| `body-lg`  | 16px  | 400    | 1.5 (24px)  | 0              | Emphasized body text     |
| `body`     | 14px  | 400    | 1.5 (20px)  | 0              | Default body text        |
| `body-sm`  | 13px  | 400    | 1.5 (20px)  | 0              | Dense UI, table cells    |
| `caption`  | 12px  | 500    | 1.5 (16px)  | 0.01em         | Labels, captions, badges |
| `micro`    | 10px  | 500    | 1.4 (14px)  | 0.06em         | Overlines, tiny labels   |

**Key rules:**
- Negative letter-spacing on headings (tighter = more premium feel)
- Positive letter-spacing on micro/overline text (readability at small sizes)
- body-sm (13px) for data-dense views — matches Stripe's approach
- All financial numbers: JetBrains Mono, `font-variant-numeric: tabular-nums`

---

## 4. Spacing Scale

Tailwind's default 4px base scale is well-suited. No custom overrides needed:

| Token  | Value | Common Usage                          |
|--------|-------|---------------------------------------|
| `0.5`  | 2px   | Tight icon-text gap                   |
| `1`    | 4px   | Minimum padding, inline spacing       |
| `1.5`  | 6px   | Badge padding, compact gaps           |
| `2`    | 8px   | Small card padding, input padding-y   |
| `3`    | 12px  | Icon-text gap, list item gap          |
| `4`    | 16px  | Default card padding, section gap     |
| `5`    | 20px  | Card padding (comfortable)            |
| `6`    | 24px  | Section padding, large gaps           |
| `8`    | 32px  | Page section spacing                  |
| `10`   | 40px  | Major section breaks                  |
| `12`   | 48px  | Page-level padding                    |
| `16`   | 64px  | Hero spacing, page margins            |

**Key decisions:**
- Cards: `p-5` (20px) internal padding — matches Mercury/Linear density
- Card gap in grids: `gap-4` (16px) or `gap-5` (20px)
- Page content max-width: `max-w-6xl` (1152px) or `max-w-7xl` (1280px)
- Sidebar width: 240px (keep current ~216px or bump slightly for light theme readability)

---

## 5. Border Radius Scale

| Token    | Value | Usage                                       |
|----------|-------|---------------------------------------------|
| `none`   | 0px   | Never use — even tables get subtle rounding  |
| `sm`     | 4px   | Small badges, tiny chips                     |
| `DEFAULT`| 6px   | Inputs, small buttons                        |
| `md`     | 8px   | Cards, dropdowns, modals                     |
| `lg`     | 12px  | Large cards, hero sections                   |
| `xl`     | 16px  | Feature cards, promotional elements          |
| `2xl`    | 20px  | Very large containers (landing page)         |
| `full`   | 9999px| Pills, avatars, circular buttons             |

**Key decisions:**
- Inputs: `rounded` (6px) — matches Linear/Mercury
- Cards: `rounded-lg` (12px) — modern, softer feel than the industry standard 8px
- Buttons: `rounded-md` (8px) for default, `rounded-full` for icon-only buttons
- Mercury uses 8px cards, Linear uses 10-12px, Stripe uses 8px. **Recommend 10-12px** for Parcel to feel modern without being bubbly.

---

## 6. Shadow / Elevation Scale

For light themes, shadows are the primary depth mechanism. These are designed with cool undertones:

| Token     | Value                                                         | Usage                         |
|-----------|---------------------------------------------------------------|-------------------------------|
| `shadow-xs`| `0 1px 2px rgba(16,24,40,0.05)`                             | Subtle lift: inputs, badges   |
| `shadow-sm`| `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)` | Cards at rest               |
| `shadow-md`| `0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06)` | Cards on hover, dropdowns |
| `shadow-lg`| `0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)` | Modals, popovers          |
| `shadow-xl`| `0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)` | Command palette, dialogs   |
| `ring-focus`| `0 0 0 2px #FFFFFF, 0 0 0 4px #6366F1`                     | Focus ring (white gap + indigo)|

**Approach:** Use `border + shadow` together (Stripe-style). Cards get `border border-gray-200 shadow-xs` at rest, `shadow-sm` on hover. This prevents the "floating" feel that shadow-only approaches create.

---

## 7. CSS Variable Strategy for Theming

The current system uses HSL values in CSS variables (shadcn convention). This is the correct approach but needs expansion for light/dark switching:

```css
:root {
  /* ---- Surfaces ---- */
  --color-bg-page: 210 20% 98%;        /* #F9FAFB */
  --color-bg-surface: 0 0% 100%;       /* #FFFFFF */
  --color-bg-surface-secondary: 220 14% 96%; /* #F2F4F7 */
  --color-bg-surface-hover: 210 20% 98%;     /* #F9FAFB */
  --color-bg-surface-active: 239 100% 97%;   /* #EEF0FF */

  /* ---- Borders ---- */
  --color-border-default: 220 13% 91%;  /* #EAECF0 */
  --color-border-strong: 218 11% 82%;   /* #D0D5DD */
  --color-border-focus: 239 84% 67%;    /* #6366F1 */

  /* ---- Text ---- */
  --color-text-primary: 220 26% 14%;    /* #1D2939 → gray-800 */
  --color-text-secondary: 220 9% 46%;   /* #475467 → gray-600 */
  --color-text-muted: 217 10% 64%;      /* #98A2B3 → gray-400 */
  --color-text-placeholder: 217 10% 64%;/* #98A2B3 → gray-400 */
  --color-text-disabled: 218 11% 82%;   /* #D0D5DD → gray-300 */
  --color-text-inverse: 0 0% 100%;      /* #FFFFFF */

  /* ---- Primary ---- */
  --color-primary: 239 84% 67%;         /* #6366F1 */
  --color-primary-hover: 239 83% 59%;   /* #4F46E5 */
  --color-primary-active: 239 84% 50%;  /* #4338CA */
  --color-primary-subtle: 239 100% 97%; /* #EEF0FF */

  /* ---- Semantic ---- */
  --color-success: 160 84% 39%;         /* #10B981 */
  --color-warning: 38 92% 50%;          /* #F59E0B */
  --color-error: 0 84% 60%;             /* #EF4444 */
  --color-info: 217 91% 60%;            /* #3B82F6 */

  /* ---- Shadows (not HSL — use full value) ---- */
  --shadow-xs: 0 1px 2px rgba(16,24,40,0.05);
  --shadow-sm: 0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06);
  --shadow-md: 0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06);

  /* ---- Radius ---- */
  --radius: 0.5rem;
  --radius-sm: 0.25rem;
  --radius-lg: 0.75rem;
}

.dark {
  --color-bg-page: 240 50% 4%;          /* #08080F */
  --color-bg-surface: 240 43% 8%;       /* #0F0F1A */
  --color-bg-surface-secondary: 240 35% 12%; /* #16162A */
  /* ... dark overrides for all tokens ... */
}
```

**Why HSL:** Allows opacity manipulation with `hsl(var(--color) / 0.5)` for hover states, overlays, etc. This is the convention shadcn/ui already uses.

---

## 8. Tailwind Config Additions

```js
// tailwind.config.js additions for light theme
export default {
  theme: {
    extend: {
      colors: {
        // Semantic surface tokens (CSS variable driven)
        page:    'hsl(var(--color-bg-page))',
        surface: {
          DEFAULT:   'hsl(var(--color-bg-surface))',
          secondary: 'hsl(var(--color-bg-surface-secondary))',
          hover:     'hsl(var(--color-bg-surface-hover))',
          active:    'hsl(var(--color-bg-surface-active))',
        },

        // Neutral scale (direct hex for non-themed usage)
        gray: {
          25:  '#FCFCFD',
          50:  '#F9FAFB',
          100: '#F2F4F7',
          200: '#EAECF0',
          300: '#D0D5DD',
          400: '#98A2B3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
          950: '#0C111D',
        },
      },

      fontFamily: {
        display: ['"Satoshi"', 'system-ui', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      boxShadow: {
        xs:  '0 1px 2px rgba(16,24,40,0.05)',
        sm:  '0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)',
        md:  '0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06)',
        lg:  '0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)',
        xl:  '0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)',
        focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #6366F1',
      },

      borderRadius: {
        sm:  '4px',
        DEFAULT: '6px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
        '2xl': '20px',
      },
    },
  },
}
```

---

## 9. Dark Mode Future-Proofing

The architecture above supports a future dark mode toggle with zero component changes:

1. **All semantic tokens** (`bg-surface`, `text-primary`, etc.) resolve through CSS variables
2. **Adding `.dark` class** (via `darkMode: ['class']` already in config) flips all variables at once
3. **Strategy badge colors** need a dark variant map — store both sets in CSS variables
4. **Shadows in dark mode** become lighter overlays or subtle glows (not dark shadows on dark bg)
5. **Charts (Recharts)** need a theme context that reads CSS variables for gridline/axis colors

Pattern for components:
```tsx
// This works in both themes automatically — no conditional logic
<div className="bg-surface border border-default text-primary shadow-sm rounded-lg p-5">
  <h3 className="font-display text-h3 text-primary">Deal Summary</h3>
  <p className="text-body text-secondary">...</p>
</div>
```

---

## RECOMMENDATIONS FOR PARCEL

### 1. Color: Adopt the cool-gray neutral scale
Replace the current hard-coded dark colors with CSS-variable-driven semantic tokens. The gray scale above (`gray-25` through `gray-950`) provides the full range needed. Keep `#6366F1` as the primary accent — it is close to Stripe's purple, already established in the brand, and works well in both light and dark contexts.

### 2. Typography: Satoshi headings + Inter body
Satoshi gives Parcel a distinctive brand voice for headings. Inter handles body text, tables, and dense UI with superior legibility. JetBrains Mono remains non-negotiable for financial numbers. If maintaining a single font family is preferred for simplicity, switch entirely to **Inter** or **Geist** — both handle the full range from display to caption.

### 3. Elevation: Border + subtle shadow (Stripe model)
Do not rely on shadows alone. Cards should have `border border-gray-200 shadow-xs` at rest. This ensures clarity on low-contrast monitors and in bright environments (relevant for mobile users in daylight). Shadows increase on hover/focus for interactivity feedback.

### 4. Spacing: Use Tailwind defaults with discipline
No custom spacing tokens needed. Enforce consistency: cards get `p-5`, card grids get `gap-4`, page sections get `py-8` or `py-10`. Document these as conventions, not config.

### 5. Border radius: 12px cards, 8px buttons, 6px inputs
Slightly larger than Mercury/Stripe (which use 8px cards) for a more modern, approachable feel. This aligns with the trend seen in newer fintech products (Ramp, Brex, Arc).

### 6. Migration path: CSS variables first
Before touching any components, define all CSS variables in `:root` for the light theme. Then systematically replace hard-coded color values (`#08080F`, `bg-app-bg`, etc.) with semantic tokens (`bg-page`, `bg-surface`, `text-primary`). This is the highest-leverage change — once tokens are in place, every component automatically themes correctly.

### 7. Strategy badge colors: Pastel backgrounds in light mode
The current dark-mode badges (dark bg + bright text) need to invert: light pastel bg + dark saturated text. The mappings in Section 2 provide exact values. These should also be CSS-variable-driven for future dark mode support.

### 8. Chart theming: Create a Recharts theme object
Define a single `chartTheme` object that reads CSS variable values for grid lines (`gray-200`), axis text (`gray-500`), and tooltip backgrounds (`white`). Pass this to all Recharts components. This prevents scattered color values across chart components.

### 9. Skeleton/loading states: Gray shimmer instead of indigo
The current indigo-tinted skeleton shimmer is dark-theme-specific. In light mode, use a neutral `gray-100` to `gray-200` shimmer. The animation remains the same; only the gradient colors change.

### 10. Focus management: White gap ring
Use the double-ring focus pattern: `ring-2 ring-white ring-offset-2 ring-offset-primary-500`. This ensures focus rings are visible on both white and colored backgrounds — critical for accessibility.
