# Parcel Platform -- Luxury Dark Design System

> Final synthesis of 18 agent specifications with all conflicts resolved.
> This is THE implementation document. Every value is canonical and final.
> Date: 2026-03-31

---

## Agent 19 Resolutions

Every blocking and non-blocking issue identified by the adversarial critic (Agent 19), resolved with a single canonical answer.

### Blocking Issues

| # | Issue | Resolution | Canonical Value |
|---|-------|-----------|-----------------|
| BLOCK-01 | Surface hierarchy color conflicts -- Agents 02, 03, 05, 06 use rogue hex values (`#111110`, `#1A1918`) not in Agent 01's gray scale | **Agent 01 wins.** All surfaces use the 12-step warm gray scale exclusively. Map: Base = gray-0 `#0C0B0A`, Sidebar = gray-1 `#131210`, Surface/Card = gray-2 `#1A1916`, Elevated = gray-3 `#22211D`, Overlay = gray-4 `#2A2924`. Rogue values `#111110`, `#141312`, `#1A1918`, `#161514` are replaced everywhere. |
| BLOCK-02 | Strategy badge colors -- Agent 02 uses custom hex, Agent 05 uses Tailwind named, Agent 06 uses a third set | **Agent 02 wins.** One set defined in CSS variables (see Section 3). All pages reference `var(--strategy-*)` tokens. Agent 05/06 named colors are replaced. |
| BLOCK-03 | KPI number font weight -- Agent 01 says 300, Agent 04 says 500, Agent 05 says 600 | **Agent 01 wins.** KPI display numbers use Satoshi weight 300. This is the luxury signal. The `.text-kpi-display` utility enforces this. |
| BLOCK-04 | Easing curve conflicts -- three different "default" curves across agents | **Agent 13 wins for Framer Motion.** Two curves only: `ease.luxury` = `cubic-bezier(0.25, 0.1, 0.25, 1)` for all CSS transitions; `ease.vercel` = `cubic-bezier(0.22, 1, 0.36, 1)` for Framer Motion page entrances and landing sections. Agent 02's `(0.16, 1, 0.3, 1)` is retired. |
| BLOCK-05 | Muted text accessibility -- `#7A7872` fails AA at normal text sizes; `#57534E` and `#5C5A56` used at 10-11px for informational text | **All informational text below 14px must use `#A09D98` (secondary) or higher.** `#7A7872` (muted) is restricted to 14px+ only. `#5C5A56` (disabled) is restricted to decorative elements with a second visual cue. Agent 08's `text-[#57534E]` timestamps at 10px are promoted to `text-[#A09D98]`. |
| BLOCK-06 | No global reduced-motion policy | **Added.** A `prefersReducedMotion` flag in `lib/motion.ts` disables all Framer Motion animations. A `@media (prefers-reduced-motion: reduce)` block in `index.css` disables CSS animations and transitions. See Section 8 for implementation. |

### Non-Blocking Issues

| # | Issue | Resolution |
|---|-------|-----------|
| NB-01 | Border opacity naming mismatch (Agent 02 calls 0.04 "default"; Agent 01 calls it "subtle") | **Agent 01 naming wins.** 5-level scale: ghost 0.03, subtle 0.04, default 0.06, strong 0.08, emphasis 0.12. Agent 02's header updated. |
| NB-02 | Three different success greens (`#6DBEA3`, `#7CCBA5`, `#6DD4A0`) | **Two greens only.** Semantic success = `#6DBEA3`. Financial profit = `#7CCBA5`. `#6DD4A0` is removed. Dashboard chart lines use `#7CCBA5` for profit, `#8B7AFF` for brand/neutral. |
| NB-03 | Modal backdrop inconsistency (three different opacity/blur combos) | **Agent 02's values are canonical.** All modals: `bg-[#0C0B0A]/75 backdrop-blur-[20px] backdrop-saturate-[180%]`. Agent 13 and 11's values are overridden. |
| NB-04 | Card border radius (pricing uses `rounded-2xl` 20px, Agent 01 says max 16px for standard cards) | **Pricing cards may use `rounded-2xl` (20px) as a special context.** Standard data cards remain `rounded-xl` (16px). |
| NB-05 | Chart gradient top-stop opacity (0.20 vs 0.30) | **Agent 14 wins.** Area charts: 0.30 top stop. Sparklines: 0.20 top stop. Dashboard main chart uses 0.30. |
| NB-06 | Mobile bottom tab bar blur performance | **Solid background on mobile.** Replace `backdrop-blur-xl` with `bg-[#0C0B0A]` (100% opacity). Saves GPU cost. |
| NB-07 | Satoshi font load concern | **Keep Satoshi but preload.** Add `<link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin>` to `index.html`. Satoshi at weight 300 is the core luxury signal and worth the 80KB. |
| NB-08 | No print stylesheet | **Add `@media print` block** to `index.css` that hides the app and shows a message: "Use Export PDF for printable reports." See Section 3. |
| NB-09 | Border opacity 0.10 (Agent 06 pipeline hover) not in scale | **Use 0.12 (emphasis) instead.** Pipeline deal card hover: `hover:border-white/[0.12]`. |

---

## 1. Design Tokens

### 1.1 Warm Gray Scale (12 Steps)

All grays carry a warm undertone: red channel leads blue by 2-6 points.

| Step | Token | Hex | Usage |
|------|-------|-----|-------|
| 0 | `gray-0` | `#0C0B0A` | Page background, root canvas |
| 1 | `gray-1` | `#131210` | Sidebar bg, recessed areas, input backgrounds |
| 2 | `gray-2` | `#1A1916` | Card surfaces, panels |
| 3 | `gray-3` | `#22211D` | Elevated surfaces, dropdowns, modals |
| 4 | `gray-4` | `#2A2924` | Overlay surfaces, hover on elevated |
| 5 | `gray-5` | `#33322C` | Subtle dividers, table separators |
| 6 | `gray-6` | `#3A3835` | Default borders, input outlines |
| 7 | `gray-7` | `#4A4844` | Strong borders, non-accent focus rings |
| 8 | `gray-8` | `#5C5A56` | Disabled text (decorative only, multi-cue required) |
| 9 | `gray-9` | `#7A7872` | Muted labels (14px+ only, AA-large) |
| 10 | `gray-10` | `#A09D98` | Secondary text, descriptions |
| 11 | `gray-11` | `#F0EDE8` | Primary text, headings, body copy |

### 1.2 Violet Accent Scale (8 Steps)

| Step | Token | Hex | Usage |
|------|-------|-----|-------|
| 1 | `violet-1` | `#1A1726` | Barely-visible tint on dark surfaces |
| 2 | `violet-2` | `#2A2545` | Tinted card backgrounds |
| 3 | `violet-3` | `#4A3AA3` | Dark accent borders |
| 4 | `violet-4` | `#6B5AD6` | Active/pressed button state |
| 5 | `violet-5` | `#7B6AEF` | Hover state for primary buttons |
| 6 | `violet-6` | `#8B7AFF` | PRIMARY accent: buttons, links, rings |
| 7 | `violet-7` | `#A89FFF` | Secondary buttons, active nav indicators |
| 8 | `violet-8` | `#C4BEFF` | Light accent: tags, pills on dark |

Gradient for primary CTA buttons: `linear-gradient(135deg, #8B7AFF, #6C5CE7)`.

### 1.3 Semantic Colors

| Role | Text Hex | Tinted BG | WCAG vs `#0C0B0A` |
|------|----------|-----------|-------------------|
| Success | `#6DBEA3` | `rgba(109, 190, 163, 0.10)` | 8.5:1 AAA |
| Warning | `#D4A867` | `rgba(212, 168, 103, 0.10)` | 8.0:1 AAA |
| Error | `#D4766A` | `rgba(212, 118, 106, 0.10)` | 5.6:1 AA |
| Info | `#7B9FCC` | `rgba(123, 159, 204, 0.10)` | 6.8:1 AA |

### 1.4 Financial Colors

Always pair with directional arrows and +/- prefixes.

| Role | Hex | WCAG vs `#0C0B0A` | WCAG vs `#1A1916` |
|------|-----|-------------------|-------------------|
| Profit text | `#7CCBA5` | 9.6:1 AAA | 8.2:1 AAA |
| Profit strong | `#5AB88E` | 7.4:1 AAA | 6.3:1 AA |
| Loss text | `#D4766A` | 5.6:1 AA | 4.8:1 AA |
| Loss strong | `#C45E52` | 4.2:1 AA | 3.6:1 AA-large |
| Neutral | `#A09D98` | 7.5:1 AAA | 6.3:1 AA |

### 1.5 Surface Hierarchy (Canonical -- 4 Levels)

| Level | Token | Hex | Gray Step | Usage |
|-------|-------|-----|-----------|-------|
| Base | `--app-bg` | `#0C0B0A` | gray-0 | Page background |
| Surface | `--app-surface` | `#1A1916` | gray-2 | Cards, panels, sidebar |
| Elevated | `--app-elevated` | `#22211D` | gray-3 | Modals, popovers, dropdowns |
| Overlay | `--app-overlay` | `#2A2924` | gray-4 | Command palette, full overlays |

Sidebar background: `#131210` (gray-1) -- one step below Surface for recessed feel.
Input background: `#131210` (gray-1) -- recessed below card surface.

### 1.6 Text Hierarchy

| Role | Hex | Min Size | WCAG Note |
|------|-----|----------|-----------|
| Primary | `#F0EDE8` | Any | 17.6:1 on base, AAA |
| Secondary | `#A09D98` | Any | 7.5:1 on base, AAA |
| Muted | `#7A7872` | 14px+ | 3.9:1 on base, AA-large only |
| Disabled | `#5C5A56` | N/A | 3.0:1, decorative + multi-cue required |

Never use `#FFFFFF`. Cap brightness at `#F0EDE8`.

### 1.7 Border Opacity Scale (5 Levels)

| Level | Token | Opacity | Usage |
|-------|-------|---------|-------|
| Ghost | `--border-ghost` | 0.03 | Card edges in grids (barely seen) |
| Subtle | `--border-subtle` | 0.04 | Default card borders, sidebar edges |
| Default | `--border-default` | 0.06 | Input fields, table dividers |
| Strong | `--border-strong` | 0.08 | Active states, section dividers |
| Emphasis | `--border-emphasis` | 0.12 | Focus rings, selected items, hover highlights |

All borders use `rgba(255, 255, 255, N)`.

### 1.8 Strategy Badge Colors (Canonical)

One source of truth. All pages reference these exact values.

| Strategy | Text | Background | Border |
|----------|------|-----------|--------|
| Wholesale | `#E5A84B` | `rgba(229, 168, 75, 0.08)` | `rgba(229, 168, 75, 0.20)` |
| Creative Finance | `#C4BEFF` | `rgba(139, 122, 255, 0.08)` | `rgba(139, 122, 255, 0.20)` |
| BRRRR | `#7B9FCC` | `rgba(123, 159, 204, 0.08)` | `rgba(123, 159, 204, 0.20)` |
| Buy & Hold | `#7CCBA5` | `rgba(124, 203, 165, 0.08)` | `rgba(124, 203, 165, 0.20)` |
| Flip | `#D4766A` | `rgba(212, 118, 106, 0.08)` | `rgba(212, 118, 106, 0.20)` |

CSS variables for these are defined in Section 3.

### 1.9 Typography

**Font Families:**
- **Display/KPI:** `'Satoshi', 'Satoshi Fallback', system-ui, sans-serif`
- **Body/UI:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Mono:** `'JetBrains Mono', 'Fira Code', monospace`

**Type Scale:**

| Token | Size | Line-Height | Weight | Tracking | Font | Usage |
|-------|------|-------------|--------|----------|------|-------|
| `hero` | 56px | 1.05 | 300 | -0.04em | Satoshi | Landing hero |
| `display` | 40px | 1.10 | 300 | -0.035em | Satoshi | Page titles |
| `kpi` | 32px | 1.15 | 300 | -0.03em | Satoshi | KPI headline numbers |
| `h1` | 28px | 1.20 | 400 | -0.025em | Satoshi | Major section headings |
| `h2` | 22px | 1.30 | 500 | -0.02em | Satoshi | Section headings |
| `h3` | 18px | 1.40 | 500 | -0.015em | Inter | Card headings |
| `body` | 14px | 1.60 | 400 | -0.006em | Inter | Body text |
| `sm` | 13px | 1.50 | 400 | 0 | Inter | UI chrome, sidebar |
| `xs` | 11px | 1.45 | 500 | 0.01em | Inter | Badges, metadata |
| `micro` | 10px | 1.40 | 500 | 0.04em | Inter | Pill labels |

**Weight Rules:**
- Display/KPI (28px+): Satoshi weight **300**.
- Section headings (18-22px): weight 500.
- Body and UI (13-14px): Inter weight 400.
- Labels and caps: Inter weight 500-600.
- Monospace: JetBrains Mono weight 350.

**OpenType Features:**
```css
body { font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11', 'zero'; }
[data-financial], .financial { font-variant-numeric: tabular-nums lining-nums; }
```

### 1.10 Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-inset` | `inset 0 1px 0 0 rgba(255,255,255,0.05)` | Top-edge card highlight |
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle small elements |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)` | Buttons, small cards |
| `shadow-md` | `0 4px 8px -2px rgba(0,0,0,0.5), 0 2px 4px -2px rgba(0,0,0,0.3)` | Dropdowns, tooltips |
| `shadow-lg` | `0 12px 16px -4px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.3)` | Modals |
| `shadow-xl` | `0 20px 24px -4px rgba(0,0,0,0.5), 0 8px 8px -4px rgba(0,0,0,0.3)` | Full overlays |
| `shadow-glow` | `0 0 20px -5px rgba(139,122,255,0.15)` | Accent glow |
| `shadow-focus` | `0 0 0 2px #0C0B0A, 0 0 0 4px rgba(139,122,255,0.5)` | Focus ring |

### 1.11 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | Small inputs, inline badges |
| `DEFAULT` | 6px | Buttons (small) |
| `md` | 8px | Input fields, nav items |
| `lg` | 12px | Standard cards, panels |
| `xl` | 16px | Large cards, modal containers |
| `2xl` | 20px | Pricing cards (special context only) |
| `full` | 9999px | Pill buttons, avatars |

### 1.12 Transition Timing

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `--ease-luxury` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | ALL CSS transitions (default) |
| `--ease-vercel` | `cubic-bezier(0.22, 1, 0.36, 1)` | Framer Motion page entrances, landing sections only |
| Duration instant | 75ms | Hover color changes |
| Duration fast | 150ms | Button states, toggles |
| Duration normal | 200ms | Nav transitions, card hovers |
| Duration slow | 300ms | Layout shifts, accordions |
| Duration enter | 400ms | Page entrance animations |

---

## 2. Tailwind Config

Complete drop-in `tailwind.config.ts`. Replace `/frontend/tailwind.config.ts` entirely.

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      // Warm Gray Scale (12-step)
      gray: {
        0:   '#0C0B0A',
        1:   '#131210',
        2:   '#1A1916',
        3:   '#22211D',
        4:   '#2A2924',
        5:   '#33322C',
        6:   '#3A3835',
        7:   '#4A4844',
        8:   '#5C5A56',
        9:   '#7A7872',
        10:  '#A09D98',
        11:  '#F0EDE8',
      },

      // Violet Accent Scale
      violet: {
        50:  '#F5F3FF',
        100: '#EDEAFF',
        200: '#C4BEFF',
        300: '#A89FFF',
        400: '#8B7AFF',
        500: '#7B6AEF',
        600: '#6B5AD6',
        700: '#5A49BD',
        800: '#4A3AA3',
        900: '#3A2A8A',
      },

      // Semantic Colors
      success: {
        DEFAULT: '#6DBEA3',
        bg:      'rgba(109, 190, 163, 0.10)',
        strong:  '#5AB88E',
      },
      warning: {
        DEFAULT: '#D4A867',
        bg:      'rgba(212, 168, 103, 0.10)',
        strong:  '#C49A52',
      },
      error: {
        DEFAULT: '#D4766A',
        bg:      'rgba(212, 118, 106, 0.10)',
        strong:  '#C45E52',
      },
      info: {
        DEFAULT: '#7B9FCC',
        bg:      'rgba(123, 159, 204, 0.10)',
        strong:  '#6889B5',
      },

      // Financial Colors
      profit: {
        DEFAULT: '#7CCBA5',
        bg:      'rgba(124, 203, 165, 0.10)',
        strong:  '#5AB88E',
      },
      loss: {
        DEFAULT: '#D4766A',
        bg:      'rgba(212, 118, 106, 0.10)',
        strong:  '#C45E52',
      },

      // CSS-variable-driven semantic tokens
      'app-bg':       'var(--app-bg)',
      'app-surface':  'var(--app-surface)',
      'app-elevated': 'var(--app-elevated)',
      'app-overlay':  'var(--app-overlay)',
      'border-subtle':  'var(--border-subtle)',
      'border-default': 'var(--border-default)',
      'border-strong':  'var(--border-strong)',
      'accent-primary':   'var(--accent-primary)',
      'accent-hover':     'var(--accent-hover)',
      'text-primary':   'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted':     'var(--text-muted)',
      'text-disabled':  'var(--text-disabled)',

      // Strategy badge colors (CSS-variable-driven)
      'strategy-wholesale': { bg: 'var(--strategy-wholesale-bg)', text: 'var(--strategy-wholesale-text)' },
      'strategy-creative':  { bg: 'var(--strategy-creative-bg)',  text: 'var(--strategy-creative-text)' },
      'strategy-brrrr':     { bg: 'var(--strategy-brrrr-bg)',     text: 'var(--strategy-brrrr-text)' },
      'strategy-buyhold':   { bg: 'var(--strategy-buyhold-bg)',   text: 'var(--strategy-buyhold-text)' },
      'strategy-flip':      { bg: 'var(--strategy-flip-bg)',      text: 'var(--strategy-flip-text)' },

      // shadcn/ui tokens
      border:     'hsl(var(--border))',
      input:      'hsl(var(--input))',
      ring:       'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
      secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
      destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      muted:       { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
      accent:      { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      popover:     { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
      card:        { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
    },

    fontSize: {
      'hero':    ['56px', { lineHeight: '1.05', letterSpacing: '-0.04em',  fontWeight: '300' }],
      'display': ['40px', { lineHeight: '1.1',  letterSpacing: '-0.035em', fontWeight: '300' }],
      'kpi':     ['32px', { lineHeight: '1.15', letterSpacing: '-0.03em',  fontWeight: '300' }],
      'h1':      ['28px', { lineHeight: '1.2',  letterSpacing: '-0.025em', fontWeight: '400' }],
      'h2':      ['22px', { lineHeight: '1.3',  letterSpacing: '-0.02em',  fontWeight: '500' }],
      'h3':      ['18px', { lineHeight: '1.4',  letterSpacing: '-0.015em', fontWeight: '500' }],
      'body-lg': ['16px', { lineHeight: '1.6',  letterSpacing: '-0.011em', fontWeight: '400' }],
      'body':    ['14px', { lineHeight: '1.6',  letterSpacing: '-0.006em', fontWeight: '400' }],
      'sm':      ['13px', { lineHeight: '1.5',  letterSpacing: '0',        fontWeight: '400' }],
      'xs':      ['11px', { lineHeight: '1.45', letterSpacing: '0.01em',   fontWeight: '500' }],
      'micro':   ['10px', { lineHeight: '1.4',  letterSpacing: '0.04em',   fontWeight: '500' }],
    },

    fontFamily: {
      brand: ['"Satoshi"', '"Satoshi Fallback"', 'system-ui', 'sans-serif'],
      sans:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      body:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
    },

    borderRadius: {
      none:    '0',
      sm:      '4px',
      DEFAULT: '6px',
      md:      '8px',
      lg:      '12px',
      xl:      '16px',
      '2xl':   '20px',
      '3xl':   '24px',
      full:    '9999px',
    },

    boxShadow: {
      'none':    'none',
      'xs':      '0 1px 2px rgba(0, 0, 0, 0.3)',
      'sm':      '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
      'md':      '0 4px 8px -2px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
      'lg':      '0 12px 16px -4px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      'xl':      '0 20px 24px -4px rgba(0, 0, 0, 0.5), 0 8px 8px -4px rgba(0, 0, 0, 0.3)',
      '2xl':     '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
      'card-hover': '0 4px 24px -4px rgba(0, 0, 0, 0.4)',
      'glow-violet':  '0 0 20px -5px rgba(139, 122, 255, 0.15)',
      'glow-success': '0 0 20px -5px rgba(109, 190, 163, 0.12)',
      'glow-error':   '0 0 20px -5px rgba(212, 118, 106, 0.12)',
      'focus-violet': '0 0 0 2px #0C0B0A, 0 0 0 4px rgba(139, 122, 255, 0.5)',
      'inset-sm':  'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
      'inset-md':  'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
      'edge-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },

    backdropBlur: {
      none: '0', sm: '4px', DEFAULT: '8px', md: '12px',
      lg: '16px', xl: '20px', '2xl': '24px', '3xl': '40px',
    },

    extend: {
      letterSpacing: {
        'display': '-0.035em', 'heading': '-0.025em', 'tight': '-0.015em',
        'body': '-0.006em', 'normal': '0em', 'caps': '0.04em',
      },
      backdropSaturate: { '180': '1.8' },
      backgroundColor: {
        'layer-1': 'rgba(255, 255, 255, 0.02)', 'layer-2': 'rgba(255, 255, 255, 0.04)',
        'layer-3': 'rgba(255, 255, 255, 0.06)', 'layer-4': 'rgba(255, 255, 255, 0.08)',
        'layer-5': 'rgba(255, 255, 255, 0.12)', 'layer-6': 'rgba(255, 255, 255, 0.16)',
      },
      borderColor: {
        'ghost': 'rgba(255, 255, 255, 0.03)', 'subtle': 'rgba(255, 255, 255, 0.04)',
        'default': 'rgba(255, 255, 255, 0.06)', 'strong': 'rgba(255, 255, 255, 0.08)',
        'emphasis': 'rgba(255, 255, 255, 0.12)',
        'accent': 'rgba(139, 122, 255, 0.20)', 'accent-strong': 'rgba(139, 122, 255, 0.35)',
      },
      transitionTimingFunction: {
        'ease-luxury':        'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ease-vercel':        'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-in-out-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '75': '75ms', '100': '100ms', '150': '150ms', '200': '200ms',
        '250': '250ms', '300': '300ms', '500': '500ms',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px -3px rgba(139, 122, 255, 0.0)' },
          '50%': { boxShadow: '0 0 12px -3px rgba(139, 122, 255, 0.25)' },
        },
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        shimmer:          'shimmer 2s linear infinite',
        'pulse-glow':     'pulse-glow 3s ease-in-out infinite',
        'fade-in':        'fade-in 0.3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-up':       'slide-up 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        blink:            'blink 1s step-end infinite',
      },
    },
  },

  plugins: [animate],
} satisfies Config

export default config
```

---

## 3. CSS Variables

Complete replacement for `/frontend/src/index.css`.

```css
/* ================================================================
   PARCEL DESIGN SYSTEM -- Luxury Dark
   ================================================================ */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---- FONT FACES ---- */
@layer base {
  @font-face {
    font-family: 'Satoshi';
    font-style: normal;
    font-weight: 300 900;
    font-display: swap;
    src: url('/fonts/Satoshi-Variable.woff2') format('woff2-variations');
  }
  @font-face {
    font-family: 'Satoshi';
    font-style: italic;
    font-weight: 300 900;
    font-display: swap;
    src: url('/fonts/Satoshi-VariableItalic.woff2') format('woff2-variations');
  }
  @font-face {
    font-family: 'Satoshi Fallback';
    src: local('BlinkMacSystemFont'), local('Segoe UI'), local('system-ui');
    ascent-override: 100%; descent-override: 22%; line-gap-override: 0%; size-adjust: 104%;
  }
}

/* ---- DARK THEME (default) ---- */
@layer base {
  :root {
    /* App Backgrounds */
    --app-bg:       #0C0B0A;
    --app-surface:  #1A1916;
    --app-elevated: #22211D;
    --app-overlay:  #2A2924;

    /* Borders */
    --border-ghost:    rgba(255, 255, 255, 0.03);
    --border-subtle:   rgba(255, 255, 255, 0.04);
    --border-default:  rgba(255, 255, 255, 0.06);
    --border-strong:   rgba(255, 255, 255, 0.08);
    --border-emphasis: rgba(255, 255, 255, 0.12);

    /* Text */
    --text-primary:   #F0EDE8;
    --text-secondary: #A09D98;
    --text-muted:     #7A7872;
    --text-disabled:  #5C5A56;

    /* Accent */
    --accent-primary:   #8B7AFF;
    --accent-hover:     #7B6AEF;
    --accent-secondary: #A89FFF;
    --accent-active:    #6B5AD6;
    --accent-success:   #6DBEA3;
    --accent-warning:   #D4A867;
    --accent-danger:    #D4766A;
    --accent-info:      #7B9FCC;

    /* Accent Surfaces */
    --accent-surface:       rgba(139, 122, 255, 0.08);
    --accent-surface-hover: rgba(139, 122, 255, 0.12);
    --accent-border:        rgba(139, 122, 255, 0.20);

    /* Financial */
    --color-profit:    #7CCBA5;
    --color-profit-bg: rgba(124, 203, 165, 0.10);
    --color-loss:      #D4766A;
    --color-loss-bg:   rgba(212, 118, 106, 0.10);

    /* Strategy Badges (canonical -- BLOCK-02 resolution) */
    --strategy-wholesale-bg:   rgba(229, 168, 75, 0.08);
    --strategy-wholesale-text: #E5A84B;
    --strategy-creative-bg:    rgba(139, 122, 255, 0.08);
    --strategy-creative-text:  #C4BEFF;
    --strategy-brrrr-bg:       rgba(123, 159, 204, 0.08);
    --strategy-brrrr-text:     #7B9FCC;
    --strategy-buyhold-bg:     rgba(124, 203, 165, 0.08);
    --strategy-buyhold-text:   #7CCBA5;
    --strategy-flip-bg:        rgba(212, 118, 106, 0.08);
    --strategy-flip-text:      #D4766A;

    /* Easing (canonical -- BLOCK-04 resolution) */
    --ease-luxury: cubic-bezier(0.25, 0.1, 0.25, 1);
    --ease-vercel: cubic-bezier(0.22, 1, 0.36, 1);

    /* shadcn/ui HSL tokens */
    --background:           30 9% 4%;
    --foreground:           30 6% 93%;
    --card:                 36 8% 8%;
    --card-foreground:      30 6% 93%;
    --popover:              36 8% 8%;
    --popover-foreground:   30 6% 93%;
    --primary:              248 100% 74%;
    --primary-foreground:   30 9% 4%;
    --secondary:            36 7% 12%;
    --secondary-foreground: 30 6% 93%;
    --muted:                36 7% 12%;
    --muted-foreground:     36 5% 47%;
    --accent:               248 100% 74%;
    --accent-foreground:    30 6% 93%;
    --destructive:          8 50% 62%;
    --destructive-foreground: 30 6% 93%;
    --border:               36 6% 14%;
    --input:                36 7% 12%;
    --ring:                 248 100% 74%;
    --radius: 0.5rem;
  }

  /* ---- LIGHT THEME (opt-in via .light on <html>) ---- */
  .light {
    --app-bg:       #F9FAFB;
    --app-surface:  #FFFFFF;
    --app-elevated: #FFFFFF;
    --app-overlay:  #F2F4F7;
    --border-ghost:    #F2F4F7;
    --border-subtle:   #EAECF0;
    --border-default:  #D0D5DD;
    --border-strong:   #98A2B3;
    --border-emphasis: #667085;
    --text-primary:   #1D2939;
    --text-secondary: #667085;
    --text-muted:     #98A2B3;
    --text-disabled:  #D0D5DD;
    --accent-primary:   #8B7AFF;
    --strategy-wholesale-bg:   #FEF3C7;
    --strategy-wholesale-text: #92400E;
    --strategy-creative-bg:    #EDE9FE;
    --strategy-creative-text:  #5B21B6;
    --strategy-brrrr-bg:       #DBEAFE;
    --strategy-brrrr-text:     #1E40AF;
    --strategy-buyhold-bg:     #D1FAE5;
    --strategy-buyhold-text:   #065F46;
    --strategy-flip-bg:        #FFE4E6;
    --strategy-flip-text:      #9F1239;
    --background:           210 20% 98%;
    --foreground:           220 26% 14%;
    --card:                 0 0% 100%;
    --card-foreground:      222 47% 11%;
    --popover:              0 0% 100%;
    --popover-foreground:   222 47% 11%;
    --primary:              248 100% 74%;
    --primary-foreground:   0 0% 100%;
    --secondary:            220 14% 96%;
    --secondary-foreground: 220 9% 46%;
    --muted:                220 14% 96%;
    --muted-foreground:     218 15% 65%;
    --accent:               248 100% 93%;
    --accent-foreground:    248 100% 74%;
    --destructive:          0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border:               220 13% 91%;
    --input:                218 11% 82%;
    --ring:                 248 100% 74%;
    --radius: 0.5rem;
  }
}

/* ---- BASE STYLES ---- */
@layer base {
  html { scroll-behavior: smooth; }
  * { @apply border-border; }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  [data-financial], .financial {
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: 'tnum' 1, 'lnum' 1, 'zero' 1;
  }
}

/* ---- UTILITY CLASSES ---- */
@layer utilities {
  .label-caps {
    font-size: 11px; line-height: 16px; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase;
  }

  .text-kpi-display {
    font-family: 'Satoshi', 'Satoshi Fallback', system-ui, sans-serif;
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 300;
    letter-spacing: -0.03em;
  }

  .edge-highlight { @apply relative overflow-hidden; }
  .edge-highlight::after {
    content: '';
    @apply absolute top-0 left-[10%] right-[10%] h-px pointer-events-none;
    background: linear-gradient(90deg,
      transparent, rgba(255,255,255,0.08) 30%,
      rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.08) 70%, transparent);
  }

  .glass {
    background: rgba(12, 11, 10, 0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .focus-ring {
    @apply focus-visible:outline-none;
    @apply focus-visible:ring-2 focus-visible:ring-[#0C0B0A];
    @apply focus-visible:ring-offset-2 focus-visible:ring-offset-[#8B7AFF];
  }

  .scrollbar-luxury::-webkit-scrollbar { width: 4px; }
  .scrollbar-luxury::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-luxury::-webkit-scrollbar-thumb {
    background: rgba(240, 237, 232, 0.10); border-radius: 9999px;
  }
  .scrollbar-luxury::-webkit-scrollbar-thumb:hover {
    background: rgba(240, 237, 232, 0.18);
  }
  .scrollbar-luxury { scrollbar-width: thin; scrollbar-color: rgba(240, 237, 232, 0.10) transparent; }
}

/* ---- REDUCED MOTION (BLOCK-06 resolution) ---- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ---- PRINT STYLESHEET (NB-08 resolution) ---- */
@media print {
  body { visibility: hidden; }
  body::after {
    visibility: visible; display: block; position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%); text-align: center;
    font-size: 16px; color: #333;
    content: 'Use Export PDF for printable reports.';
  }
}
```

---

## 4. Component Library

All shared components with exact Tailwind classes. Tokens reference Section 1. Easing uses `ease-luxury` per BLOCK-04 resolution. Surfaces use canonical gray scale per BLOCK-01 resolution.

### 4.1 Button

Four variants. Shared: `rounded-lg text-sm font-medium h-10 px-5 transition-all duration-200 ease-ease-luxury`.

**Primary (violet gradient):**
```
bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
text-[#0C0B0A] border border-white/[0.08]
shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_12px_-3px_rgba(139,122,255,0.25)]
hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_20px_-3px_rgba(139,122,255,0.4)] hover:brightness-110
active:scale-[0.98] active:brightness-95
disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none
```

**Secondary (ghost):**
```
bg-transparent text-[#A09D98] border border-white/[0.06]
hover:bg-white/[0.04] hover:text-[#F0EDE8] hover:border-white/[0.08]
active:scale-[0.98] active:bg-white/[0.06]
disabled:opacity-40 disabled:pointer-events-none
```

**Danger:**
```
bg-[#D4766A]/10 text-[#D4766A] border border-[#D4766A]/20
hover:bg-[#D4766A]/15 hover:border-[#D4766A]/30
active:scale-[0.98] active:bg-[#D4766A]/20
```

**Focus (all variants):**
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C0B0A]
focus-visible:ring-offset-2 focus-visible:ring-offset-[#8B7AFF]
```

**Sizes:** sm `h-8 px-3 text-xs rounded-md`, md `h-10 px-5 text-sm rounded-lg` (default), lg `h-12 px-6 text-base rounded-lg`, icon `h-10 w-10 rounded-lg p-0`.

### 4.2 Input

Recessed dark field. Input bg: `#131210` (gray-1, per BLOCK-01).

```
bg-[#131210] text-[#F0EDE8] text-sm placeholder:text-[#5C5A56]
border border-white/[0.06] rounded-lg h-10 px-3
shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
transition-all duration-200 ease-ease-luxury
hover:border-white/[0.12]
focus:border-[#8B7AFF]/50 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_3px_rgba(139,122,255,0.12)]
focus:outline-none
```

Error: `border-[#D4766A]/50 shadow-[...,0_0_0_3px_rgba(212,118,106,0.12)]`.
Label: `text-xs font-medium text-[#A09D98] tracking-wide`.

### 4.3 Card

Surface: `#1A1916` (gray-2, per BLOCK-01). Top-edge highlight via `edge-highlight` utility.

```
bg-[#1A1916] border border-white/[0.04] rounded-xl p-6
shadow-[0_1px_2px_rgba(0,0,0,0.2)] edge-highlight
transition-all duration-200 ease-ease-luxury
```

Interactive card hover: `hover:border-white/[0.06] hover:shadow-card-hover`.
Elevated card: `bg-[#22211D] border border-white/[0.06] rounded-xl shadow-lg edge-highlight`.

### 4.4 Badge (Strategy)

All share: `inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border`.
Colors per Section 1.8 strategy table.

### 4.5 Modal

**Backdrop:** `fixed inset-0 z-50 bg-[#0C0B0A]/75 backdrop-blur-[20px] backdrop-saturate-[180%]` (canonical per NB-03).
Fallback: `@supports not (backdrop-filter: blur(1px)) { background: rgba(12,11,10,0.95); }`

**Content:** `bg-[#22211D] border border-white/[0.06] rounded-2xl p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] edge-highlight`.

Framer Motion entrance:
```ts
{ initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
  transition: { type: 'spring', damping: 28, stiffness: 380 } }
```

### 4.6 Table

Container: `bg-[#1A1916] border border-white/[0.04] rounded-xl edge-highlight overflow-auto`.
Head: `bg-white/[0.02] border-b border-white/[0.06]`. `<th>`: `text-xs font-medium text-[#A09D98] uppercase tracking-wider px-4 py-3`.
Rows: `border-b border-white/[0.03]`. Even: `bg-white/[0.015]`. Hover: `hover:bg-white/[0.04]`.
Financial cells: `text-right tabular-nums font-mono text-sm`. Profit: `text-[#7CCBA5]`. Loss: `text-[#D4766A]`.

### 4.7 Tabs (Underline + Pill)

See Agent 02 spec. Active underline: `border-b-2 border-[#8B7AFF] text-[#F0EDE8]`. Active pill: `bg-[#22211D] text-[#F0EDE8] shadow-sm border border-white/[0.06]`.

### 4.8 Toast (Sonner)

Base: `bg-[#22211D] border border-white/[0.06] rounded-lg p-4 shadow-lg`.
Semantic left-border: `border-l-[3px]` with success `#7CCBA5`, error `#D4766A`, warning `#E5A84B`, info `#8B7AFF`.

### 4.9 Skeleton

```
bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03]
bg-[length:200%_100%] animate-shimmer rounded-md
```

Stagger: 80ms delay per line. Card skeleton on `bg-[#1A1916]`.

### 4.10 Tooltip

```
bg-[#2A2924] border border-white/[0.08] rounded-lg px-3 py-2
text-sm text-[#F0EDE8] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]
```

### 4.11 Progress Bar

Track: `h-2 rounded-full bg-white/[0.06]`.
Fill (0-70%): `bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]`.
Warning (70-90%): `from-[#E5A84B] to-[#D49A3F]`.
Danger (90-100%): `from-[#D4766A] to-[#C45E52]`.

### 4.12 Select

Trigger: same styling as Input (gray-1 bg, inset shadow). Dropdown content: `bg-[#22211D] border border-white/[0.08] rounded-xl p-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)]`.
Selected item: `text-[#F0EDE8]` with violet checkmark `text-[#8B7AFF]`.

---

## 5. Page Designs

### 5.1 Dashboard (Agent 04)

**Layout:** Mercury-inspired sparse composition. Single hero metric above fold, 4 KPI cards below, area chart, recent activity table.

**Container:** `min-h-screen bg-[#0C0B0A]` > `max-w-[1200px] mx-auto px-6 py-8 space-y-10`.

**Hero metric:** Uses `.text-kpi-display` at 32px, Satoshi weight 300, `text-[#F0EDE8]`, superscript cents at 50% opacity.

**KPI Cards:** `bg-[#1A1916]` with micro violet radial gradient `radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,122,255,0.02),transparent)`. Label: `text-[11px] font-medium uppercase tracking-[0.08em] text-[#A09D98]`. Number: `.text-kpi-display` class. Sparklines: violet `#8B7AFF`, gradient top stop 0.20, three-stop.

**Trend indicators:** Plain text, no pills. Profit: `text-[#7CCBA5]` with up-arrow. Loss: `text-[#D4766A]` with down-arrow. Neutral: `text-[#A09D98]`.

**Area chart:** Card container with `bg-[#1A1916]`. Chart uses violet stroke `#8B7AFF`, gradient top stop 0.30 (per NB-05). Active dot with glow. Axis text `#A09D98` at 11px.

### 5.2 Deal Analysis -- Strategy Select (Agent 05)

**Card grid:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Cards: `bg-[#1A1916] border-white/[0.06] rounded-xl p-5`. Hover: `hover:border-[#8B7AFF]/40 hover:bg-[#22211D]`.

**Strategy badges:** Use canonical colors from Section 1.8. Glass-morphic pills: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border`.

### 5.3 Deal Analysis -- Form (Agent 05)

**Form container:** `bg-[#1A1916] border border-white/[0.06] rounded-xl p-6`. Input bg: `#131210` (gray-1). Label: `text-xs font-medium text-[#A09D98] uppercase tracking-[0.08em]`. Inputs: 16px on mobile to prevent iOS zoom. Error: `text-[#D4766A] text-xs`.

**Breadcrumb:** `text-xs` chain with `text-[#A09D98]` links, `hover:text-[#8B7AFF]`, active page `text-[#F0EDE8] font-medium`.

### 5.4 Deal Analysis -- Results (Agent 05)

**KPI grid:** Cards on `bg-[#1A1916]`. Numbers use `.text-kpi-display` (Satoshi 300, per BLOCK-03). Results use same surface hierarchy as dashboard.

**Risk Gauge:** SVG with `feGaussianBlur` glow. Limited to 3 instances per page max.

### 5.5 Pipeline (Agent 06)

**Board:** Three-tier elevation: Base `#0C0B0A`, Column `#1A1916` (gray-2), Card `#22211D` (gray-3, corrected from rogue `#1A1918`). Horizontal scroll with gradient edge masks.

**Column:** `min-w-[280px] max-w-[280px]`. Header with stage dot at 80% opacity, stage name `text-[13px] font-semibold text-[#F0EDE8]`, count badge `bg-white/[0.06]`.

**Deal cards:** `bg-[#22211D] border border-white/[0.06] rounded-xl py-3.5 px-4`. Hover: `hover:border-white/[0.12] hover:-translate-y-px` (border uses emphasis level per NB-09). Focus: `ring-2 ring-[#8B7AFF]/40`.

### 5.6 AI Chat (Agent 07)

**Layout:** Full-width alternating rows, no bubbles. User rows: `bg-[#0C0B0A]`. AI rows: `bg-[#131210]` (gray-1, corrected from `#0F0E0D`). Content: `max-w-3xl mx-auto`.

**AI avatar:** `w-8 h-8 rounded-lg bg-[#8B7AFF]/10 border border-[#8B7AFF]/15`. Sparkles icon in `text-[#8B7AFF]`.

**Markdown rendering:** Body text `text-[#F0EDE8]/90`, inline code `bg-[#8B7AFF]/10 text-[#8B7AFF]`, code blocks `bg-[#0C0B0A]`, links `text-[#8B7AFF]`, list bullets violet triangles.

**Input bar:** Sticky bottom, `bg-[#0C0B0A]/95 backdrop-blur-md border-t border-white/[0.06]`. Textarea `bg-[#131210]`.

### 5.7 Documents (Agent 08)

**Left panel:** `bg-[#1A1916] border-r border-white/[0.04]`. Document rows: selected `bg-[#8B7AFF]/[0.08] border border-[#8B7AFF]/25`. File metadata: `text-[10px] text-[#A09D98]` (promoted from `#57534E` per BLOCK-05).

**Upload zone:** `border-2 border-dashed border-white/[0.08] rounded-xl p-8 bg-[#131210]`. Hover: `border-[#8B7AFF]/40 bg-[#8B7AFF]/[0.04]`.

**Processing steps:** Vertical stepper with completed `text-[#6DBEA3]`, active `text-[#8B7AFF]`, pending `text-[#A09D98]`.

### 5.8 Portfolio (Agent 08)

Same card surfaces and KPI patterns as Dashboard. Table uses Section 4.6 table spec. Chart theme from Section 9.

### 5.9 Settings (Agent 09)

**Tab navigation:** Pill variant unified across breakpoints. Active: `bg-white/[0.08] text-[#F0EDE8] shadow-sm`. Inactive: `text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]`.

**Section cards:** `bg-[#1A1916] border border-white/[0.08] rounded-xl p-6`.

**Profile avatar:** `w-16 h-16 rounded-full bg-[#22211D] border border-white/[0.08]`. Hover overlay for upload.

### 5.10 Pricing (Agent 10)

**Card differentiation:** Free = `bg-white/[0.03] border border-white/[0.06]`. Pro = `bg-white/[0.05] border border-[#8B7AFF]/20` + crown gradient + ambient glow. Team = `bg-white/[0.02]` at reduced opacity.

**Pro crown gradient:** `h-px bg-gradient-to-r from-transparent via-[#8B7AFF] to-transparent`.

**Toggle:** Pill with violet active segment `bg-[#8B7AFF]/15 border border-[#8B7AFF]/20`. "Save 17%" badge: `bg-[#8B7AFF]/15 text-[#8B7AFF]`.

**Cards may use `rounded-2xl` (20px)** -- special pricing context exception per NB-04.

### 5.11 Auth Pages (Agent 09)

**Login/Register:** Centered card `max-w-[400px] bg-[#1A1916] border border-white/[0.08] rounded-xl p-8`. Violet ambient glow behind card. Logo at top: same P mark as sidebar. Social login buttons: ghost variant. Divider: `border-white/[0.06]` with "or" label.

**Forgot/Reset Password:** Same card layout as Login. Success state uses green checkmark with `text-[#6DBEA3]`. Input fields follow Section 4.2 spec.

### 5.12 Shared Deal Page (minimal guidance)

No agent spec provided. Use: `bg-[#0C0B0A]` background, centered card at `max-w-3xl`, Parcel logo header, KPI display using `.text-kpi-display`, strategy badge from Section 1.8, chart theme from Section 9. "Powered by Parcel" footer link. Public-facing, must look polished.

### 5.13 404 Page (minimal guidance)

No agent spec provided. Use: `bg-[#0C0B0A]` full viewport, centered content. Large "404" in `.text-kpi-display` at 64px+ Satoshi 300. Subtitle in `text-[#A09D98]`. Primary button "Back to Dashboard". Violet accent glow behind the 404 number.

---

## 6. Billing Components (Agent 11)

### 6.1 PaywallOverlay

Three layers: (1) saturated blur `bg-[#0C0B0A]/80 backdrop-blur-xl backdrop-saturate-150`, (2) radial vignette, (3) modal card `bg-[#1A1916] border border-white/[0.06] rounded-xl p-8 shadow-2xl`.

Lock icon: `bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20`. CTA: `bg-[#8B7AFF] hover:bg-[#7B6AEF] text-white`.

### 6.2 TrialBanner

Three urgency tiers in sidebar:
- Calm (>3 days): `bg-[#8B7AFF]/[0.06] border border-[#8B7AFF]/10`, violet text.
- Warm (1-3 days): `bg-amber-500/[0.06] border border-amber-500/10`, amber text.
- Expired (0 days): `bg-red-500/[0.05] border border-red-500/10`, red text.

### 6.3 PlanBadge

Pro: `bg-[#8B7AFF]/15 text-[#A89FFF] ring-1 ring-[#8B7AFF]/20`.
Trial: `bg-[#8B7AFF]/[0.06] text-[#8B7AFF]/70 ring-1 ring-[#8B7AFF]/10`.
Free: `bg-white/[0.04] text-[#F0EDE8]/40 ring-1 ring-white/[0.06]`.

### 6.4 UsageMeter

Track: `h-2 rounded-full bg-[#22211D]`.
Fill: Normal `bg-[#8B7AFF]`, Warning `bg-amber-300` + glow, Exceeded `bg-red-400` + glow.

### 6.5 LimitReachedModal

Uses standard modal component (Section 4.5). Growth-oriented icon, empathetic copy, violet CTA button.

---

## 7. Landing Page (Agent 12)

Section-by-section spec. All sections on `bg-[#0C0B0A]`.

### 7.1 Navbar

Fixed `top-0 z-50`. Transparent at top, solid after 60px scroll: `bg-[#0C0B0A]/80 backdrop-blur-xl border-b border-white/[0.06]`. Primary CTA: inverted light button `bg-[#F0EDE8] text-[#0C0B0A]`.

### 7.2 Hero

Two radial gradient ambient glows (violet, no blur blobs). Badge: `bg-[#8B7AFF]/10 border border-[#8B7AFF]/30 text-[#8B7AFF]`. Headline: Satoshi 300, `clamp(48px, 7vw, 72px)`, tracking -0.02em. Second line: violet gradient text. Subheadline: `text-[#A09D98]`.

Primary CTA: `bg-[#F0EDE8] hover:bg-white text-[#0C0B0A] h-11 px-6`. Secondary: ghost with `border-white/[0.12]`.

### 7.3 Stats Strip

Count-up numbers on dark cards. Duration: 800ms (reduced from 1500ms per Agent 19 recommendation). `text-3xl font-semibold text-[#F0EDE8] tabular-nums`.

### 7.4 Features Bento

Grid of feature cards: `bg-white/[0.03] border border-white/[0.06] rounded-xl`. Featured card spans 2 columns with violet accent border.

### 7.5 How It Works

Three-step numbered flow. Step numbers: `text-[#8B7AFF] text-4xl font-light`. Connecting line: `bg-gradient-to-b from-[#8B7AFF] to-transparent`.

### 7.6 Testimonials

Carousel with glass cards: `bg-white/[0.03] border border-white/[0.06]`. Stars: `text-[#E5A84B]`. Names: `text-[#F0EDE8]`. Roles: `text-[#A09D98]`.

### 7.7 Comparison Table

Feature comparison with checkmarks: Parcel checks in `text-[#8B7AFF]`, competitor checks in `text-[#A09D98]`.

### 7.8 Pricing Section

References Section 5.10 Pricing page spec. Embedded as a section within the landing page.

### 7.9 Footer

`border-t border-white/[0.06]`. Links: `text-[#A09D98] hover:text-[#F0EDE8]`. Copyright: `text-[#7A7872]` (14px+ per BLOCK-05).

---

## 8. Animation System (Agent 13)

### 8.1 Timing Tokens

```ts
// lib/motion.ts
export const duration = {
  instant:  0.08,   // 80ms  -- hover, focus, press
  fast:     0.15,   // 150ms -- tooltips, dropdowns
  normal:   0.20,   // 200ms -- page enter, card entrance
  slow:     0.30,   // 300ms -- backdrop fade, complex states
  dramatic: 0.50,   // 500ms -- chart entrance, landing only
} as const
```

### 8.2 Easing Curves (Canonical -- BLOCK-04)

```ts
export const ease = {
  luxury: [0.25, 0.1, 0.25, 1.0] as const,   // CSS default for all transitions
  vercel: [0.22, 1, 0.36, 1] as const,         // Framer Motion page entrances only
} as const

export const spring = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.8 },
  gentle: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.5 },
} as const
```

### 8.3 Transition Presets

```ts
export const transition = {
  fast:    { duration: duration.fast, ease: ease.luxury },
  default: { duration: duration.normal, ease: ease.luxury },
  spring:  spring.snappy,
} as const
```

### 8.4 Page Transitions

```ts
export const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
} as const

export const pageTransition = {
  enter: { duration: duration.normal, ease: ease.luxury },
  exit:  { duration: 0.12, ease: [0.4, 0, 1, 1] as const },
} as const
```

Implementation: `<AnimatePresence mode="wait">` wrapping `<motion.div key={pathname}>` with `pageVariants`.

### 8.5 Card Entrance Stagger

```ts
export const cardContainerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
} as const

export const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: spring.snappy },
} as const
```

Cap total stagger at 300ms (6 cards max). Over 20 items: single container fade.

### 8.6 Hover Effects

CSS only, zero Framer Motion involvement:
```css
.card-hover {
  border: 1px solid rgba(240, 237, 232, 0.06);
  transition: border-color 150ms var(--ease-luxury), background-color 150ms var(--ease-luxury);
}
.card-hover:hover {
  border-color: rgba(240, 237, 232, 0.12);
  background-color: rgba(240, 237, 232, 0.02);
}
```

No scale on hover. No translateY on hover. No whileHover from Framer Motion on cards.

### 8.7 Press Feedback

```css
.press-feedback { transition: transform 80ms var(--ease-luxury); }
.press-feedback:active { transform: scale(0.98); }
```

### 8.8 Reduced Motion Policy (BLOCK-06)

```ts
// lib/motion.ts
export const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// Conditional variants: return static values when reduced motion is preferred
export const safePageVariants = prefersReducedMotion
  ? { initial: {}, animate: {}, exit: {} }
  : pageVariants

export const safeCardVariants = prefersReducedMotion
  ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
  : cardVariants

export const safeTransition = prefersReducedMotion
  ? { duration: 0 }
  : transition.default
```

CSS reduced motion handled globally in Section 3 `@media (prefers-reduced-motion: reduce)` block.

### 8.9 Performance Rules

- Nothing in authenticated app exceeds 500ms.
- Max 3 simultaneous backdrop-blur elements per page.
- Mobile bottom tab bar: solid `bg-[#0C0B0A]` (no blur, per NB-06).
- SVG filters (`feGaussianBlur`): max 3 instances per page.
- Landing page total animation runway capped at 800ms per section.

---

## 9. Chart Theme (Agent 14)

### 9.1 Color Palette

```ts
export const CHART_COLORS = [
  '#8B7AFF', // violet (brand)
  '#7CCBA5', // sage (profit)
  '#E8B44A', // warm amber
  '#E8DFD1', // parchment
  '#D4766A', // terracotta (loss)
  '#5CB8B2', // sea glass
] as const

export const SEMANTIC_COLORS = {
  profit: '#7CCBA5',
  loss: '#D4766A',
  accent: '#8B7AFF',
  warning: '#E8B44A',
  muted: '#6B6560',
} as const
```

### 9.2 Area Chart Gradient

Three-stop. Top stop **0.30** (canonical per NB-05):
```tsx
<linearGradient id="violetGlow" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.30} />
  <stop offset="50%"  stopColor="#8B7AFF" stopOpacity={0.05} />
  <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
</linearGradient>
```

Stroke: 2px. `dot={false}`. `activeDot`: `r={4} stroke="#8B7AFF" strokeWidth={2} fill="#1A1916"` + glow filter.

### 9.3 Bar Chart

Gradient bottom-to-top: 0.25 base to 0.85 cap. `radius={[4,4,0,0]}`. `maxBarSize={48}`.

### 9.4 Sparklines

Stroke: 1.5px. Top stop: **0.20**. Three-stop with mid at 60%. End dot: 3px radius, card-surface ring.

### 9.5 Tooltip (Glass)

```ts
background: 'rgba(30, 29, 27, 0.88)',   // gray-3 at 88%
border: '1px solid rgba(255, 255, 255, 0.06)',
boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
```

Label: `text-[11px] text-[#A09D98] uppercase tracking-wide`. Value: `text-[14px] text-[#F0EDE8] font-medium tabular-nums`.

### 9.6 Axes

`<XAxis>` / `<YAxis>`: `tick={{ fill: '#A09D98', fontSize: 11 }}`. `axisLine={{ stroke: '#2A2924' }}`. `tickLine={false}`. `<CartesianGrid>`: `stroke="#2A2924" strokeDasharray="3 3"`.

### 9.7 Radar Chart

Fill: `fill="#8B7AFF" fillOpacity={0.15}`. Stroke: `stroke="#8B7AFF" strokeWidth={2}`. Grid: `stroke="#2A2924"`. Dots: `r={4} fill="#8B7AFF"`.

---

## 10. PDF Theme (Agent 16)

PDFs remain **light** (white background, dark text) for professional printing.

### 10.1 Color Constants

```ts
const VIOLET_700: [number, number, number] = [109, 96, 204]   // #6D60CC
const VIOLET_50:  [number, number, number] = [245, 243, 255]  // #F5F3FF
const CREAM:      [number, number, number] = [250, 250, 249]  // #FAFAF9
const CHARCOAL:   [number, number, number] = [12, 11, 10]     // #0C0B0A
const WARM_800:   [number, number, number] = [41, 37, 36]     // #292524
const WARM_600:   [number, number, number] = [87, 83, 78]     // #57534E
const WARM_500:   [number, number, number] = [120, 113, 108]  // #78716C
const WARM_300:   [number, number, number] = [214, 211, 209]  // #D6D3D1
const WARM_200:   [number, number, number] = [231, 229, 228]  // #E7E5E4
const SUCCESS_700: [number, number, number] = [4, 120, 87]    // #047857
const ERROR_700:   [number, number, number] = [185, 28, 28]   // #B91C1C
```

### 10.2 Structure

- **Header:** Violet accent bar (2mm), "PARCEL" wordmark with tracked spacing, right-aligned date.
- **KPI cards:** 2x2 grid, `VIOLET_50` fill, label at 7pt uppercase, value at 18pt bold.
- **Cash flow table:** Alternating `WARM_200`/`WHITE` rows, `VIOLET_700` section headers, financial coloring.
- **Risk gauge:** Horizontal bar (not circular), print-safe, 4-tier color coding.
- **Footer:** Hairline rule, branding + page numbers, 5.5pt legal disclaimer.

### 10.3 Font Strategy

PDF uses Inter (or Helvetica fallback). No Satoshi in PDFs -- jsPDF font embedding is limited. Tracked uppercase labels preserve the luxury feel.

---

## 11. Responsive Rules (Agent 15)

### 11.1 Breakpoints

| Token | Range | Sidebar | Nav |
|-------|-------|---------|-----|
| `lg` | 1024px+ | Persistent, collapsible to 64px rail | Sidebar |
| `md` | 768-1023px | Persistent 240px | Sidebar |
| `sm` | 640-767px | Drawer (280px) | Bottom tabs |
| `<640` | 0-639px | Drawer (280px) | Bottom tabs |

### 11.2 Mobile Bottom Tab Bar

Solid background (per NB-06):
```
md:hidden fixed bottom-0 inset-x-0 z-50
bg-[#0C0B0A] border-t border-white/[0.06]
```

5 tabs: Dashboard, Analyze, Pipeline, Chat, More. Touch targets: `min-w-[64px] min-h-[44px]`. Active: `text-[#8B7AFF]`. Inactive: `text-[#F0EDE8]/40`.

Safe area: `paddingBottom: env(safe-area-inset-bottom)`. Content clearance: `pb-[84px]` on `<main>`.

### 11.3 Content Padding Scale

```
px-4 py-4           /* mobile */
sm:px-4 sm:py-5     /* sm */
md:px-8 md:py-6     /* md */
lg:px-10 lg:py-6    /* lg */
```

### 11.4 Per-Page Responsive

- **Dashboard:** `grid-cols-2` KPIs on mobile, `grid-cols-3` on md, `grid-cols-4` on lg.
- **Deal Analysis:** Single-column form on mobile, `grid-cols-2` on sm-md, `grid-cols-3` on lg. Inputs at `text-base` (16px) on mobile to prevent iOS zoom.
- **Pipeline:** Tabbed stages on mobile with swipe, horizontal Kanban on md+.
- **Chat:** Full-screen flex on mobile, input bar fixed above bottom tab bar. Desktop: `max-w-3xl` messages.
- **Documents:** Stacked panels on mobile, side-by-side on md+.
- **Settings:** Horizontally scrollable pill tabs on mobile.

---

## 12. Premium Extras (Agent 18)

Priority-ranked features with solo-founder verdict.

### Priority 1: Build Now

**Command Palette Enhancement** (1 day)
- Recency-weighted results from localStorage ring buffer (6 items).
- Contextual actions by route (pipeline: filter by stage, results: export PDF).
- Dark glass styling: `bg-[#1A1916]/95 backdrop-blur-xl border border-[#3A3835] shadow-2xl`.
- Enhanced keyboard hint footer.

### Priority 2: Build After Core

**Keyboard Shortcuts** (1 day)
- Two-key "g d" grammar with 500ms timeout via `useShortcuts` hook.
- `?` key opens shortcut reference modal.
- Inline key hints on non-touch devices (`@media (hover: hover)`).
- Ignores focus in inputs/textareas.

### Priority 3: Defer to Post-Launch

- Data Density Toggle (comfortable/compact modes)
- Contextual Right-Click Menus (requires `@radix-ui/react-context-menu`)
- Ambient Sync Indicator (green/amber heartbeat dot)

### Priority 4: Cut Entirely

- Changelog/What's New system (over-engineered for pre-PMF)
- Haptic feedback utility (`navigator.vibrate()` unsupported on iOS)

---

## 13. Migration Plan

### Phase 1: Foundation (~2 days)

1. Replace `tailwind.config.ts` with Section 2 config.
2. Replace `index.css` with Section 3 CSS variables.
3. Add Satoshi font files to `/public/fonts/`.
4. Add font preload to `index.html`: `<link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin>`.
5. Add Fontsource imports to `main.tsx` for Inter + JetBrains Mono.
6. Create `lib/motion.ts` with Section 8 timing tokens.
7. Add `.light` class to `<html>` temporarily to preserve light mode during migration.

**Gate:** Tokens locked. All 6 blocking issues resolved in config. No page work begins until this phase passes visual check.

### Phase 2: App Shell (~2 days)

1. Sidebar component (Agent 03 spec, using gray-1 `#131210` bg).
2. Mobile bottom tab bar (solid bg, Section 11.2).
3. Page transition wrapper (`AnimatePresence` + `pageVariants`).
4. Topbar / page header component.

### Phase 3: Core Components (~2 days)

1. Button (4 variants, Section 4.1).
2. Input, Textarea, Select (Section 4.2, 4.12).
3. Card (standard + elevated, Section 4.3).
4. Badge (strategy + status + plan, Section 4.4).
5. Modal, Toast, Tabs, Table, Skeleton, Tooltip, Progress Bar.

### Phase 4: Core Pages (~3 days)

1. Dashboard (Section 5.1).
2. Deal Analysis flow: Strategy Select, Form, Results (Sections 5.2-5.4).
3. Pipeline Kanban (Section 5.5).

### Phase 5: Supporting Pages (~3 days)

1. AI Chat (Section 5.6).
2. Documents + Portfolio (Sections 5.7-5.8).
3. Settings + Auth pages (Sections 5.9, 5.11).
4. Billing components (Section 6).
5. Charts polish -- apply chart theme consistently (Section 9).
6. Responsive audit (Section 11).

### Phase 6: Marketing (~2 days)

1. Landing page (Section 7).
2. Pricing page (Section 5.10).

### Phase 7: Billing Components (~1 day)

1. PaywallOverlay, FeatureGate, TrialBanner, PlanBadge, UsageMeter, LimitReachedModal.

### Phase 8: Charts & Data Viz (~1 day)

1. Recharts theme application across all chart components.
2. Sparkline updates.
3. Radar chart updates.

### Phase 9: Polish (~2 days)

1. Animation refinements (stagger tuning, landing page motion).
2. Command palette enhancement.
3. Remove `.light` class from `<html>`.
4. Delete `.light` override block from CSS (or keep for future toggle).
5. Visual regression audit.
6. Accessibility audit (axe-core on every page).

**Total: ~18 working days.**
**Minimum viable luxury dark (Phases 1-4): ~9 working days.**

### Migration Strategy

The approach is "all-at-once config swap with incremental page conversion":

1. Apply new `tailwind.config.ts` and `index.css` (breaks existing classes).
2. Add `class="light"` to `<html>` to restore light mode via CSS variables.
3. Convert pages one-by-one, removing hardcoded light classes.
4. Remove `.light` class once all pages are converted.

What breaks first:
- Hardcoded Tailwind colors (`bg-gray-50`, `text-gray-900`) -- these no longer exist in the custom color config.
- Chart inline colors (`stroke="#94a3b8"`) -- invisible on dark.
- shadcn/ui components -- covered by HSL variable mapping.
- PDF generation -- intentionally kept light, uses separate color constants.

---

## 14. Deferred

| Feature | Source | Reason |
|---------|--------|--------|
| Data Density Toggle | Agent 18 | No users with 30+ deals yet. Build post-launch. |
| Contextual Right-Click Menus | Agent 18 | Invisible to 90% of users. Three-dot menus suffice. |
| Changelog/What's New | Agent 18 | Over-engineered for pre-PMF. Simple toast suffices. |
| Ambient Sync Indicator | Agent 18 | Unneeded -- app refreshes on navigation. |
| Landing page animated demo cards | Agent 12 | High maintenance cost. Use static screenshot or Lottie. |
| Haptic feedback | Agent 15 | `navigator.vibrate()` unsupported on iOS. |
| Grain texture utility | Agent 17 | Very subtle effect, low priority. Apply during polish if desired. |
| Compare page full spec | Agent 19 gap | Existing page works. Apply chart theme (Section 9) + card styles (Section 4.3) during Phase 5. |
| Error boundary dark spec | Agent 19 gap | Apply card + error color. Low priority. |
| Close/Edit/Offer modals | Agent 19 gap | Use standard modal component (Section 4.5) with appropriate content. |

---

## 15. Open Questions

Decisions needing Ivan's input before or during implementation:

1. **Satoshi font:** Agent 19 recommends testing Inter 300 at 32px+ as a potential replacement to eliminate one font load. Should we test this before committing to Satoshi, or proceed with Satoshi as specified?

2. **Compare page layout:** No spec was written. Should we design a side-by-side KPI comparison with radar charts, or defer the compare page redesign entirely?

3. **Light mode toggle:** The CSS variables support a `.light` class for rollback. Should we build an actual light/dark toggle in Settings for users who prefer light mode, or commit to dark-only?

4. **Landing page demo section:** Agent 12 specifies animated mini-kanban and mini-doc-list inside bento cards. Agent 19 recommends static screenshots instead. Which approach?

5. **Satoshi font licensing:** Satoshi requires a license for commercial use. Confirm licensing is in place before self-hosting.

6. **PDF font embedding:** Currently using Helvetica fallback in PDFs. Should we embed Inter into jsPDF for consistency, or is Helvetica acceptable?

7. **Third-party dark overrides:** Sonner, cmdk, and Radix primitives need dark tokens. Should these be handled incrementally per component or in a single batch during Phase 3?
