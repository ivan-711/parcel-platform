# Parcel Luxury Dark -- Master Design Tokens

> Synthesized from Mercury audit, color science research, and typography research.
> Every value is final and implementation-ready. No placeholders.
> Date: 2026-03-31

---

## 1. Warm Gray Scale (12 Steps)

All grays carry a warm undertone: red channel leads blue by 2-6 points.

| Step | Token                  | Hex       | RGB            | Usage                                   |
|------|------------------------|-----------|----------------|-----------------------------------------|
| 0    | `--luxury-gray-0`     | `#0C0B0A` | `12, 11, 10`   | Page background, root canvas            |
| 1    | `--luxury-gray-1`     | `#131210` | `19, 18, 16`   | Recessed areas, sidebar bg              |
| 2    | `--luxury-gray-2`     | `#1A1916` | `26, 25, 22`   | Card surfaces, panels                   |
| 3    | `--luxury-gray-3`     | `#22211D` | `34, 33, 29`   | Elevated surfaces, dropdowns            |
| 4    | `--luxury-gray-4`     | `#2A2924` | `42, 41, 36`   | Hover on surfaces, active panels        |
| 5    | `--luxury-gray-5`     | `#33322C` | `51, 50, 44`   | Subtle dividers, table separators       |
| 6    | `--luxury-gray-6`     | `#3A3835` | `58, 56, 53`   | Default borders, input outlines         |
| 7    | `--luxury-gray-7`     | `#4A4844` | `74, 72, 68`   | Strong borders, non-accent focus rings  |
| 8    | `--luxury-gray-8`     | `#5C5A56` | `92, 90, 86`   | Disabled text, placeholder text         |
| 9    | `--luxury-gray-9`     | `#7A7872` | `122, 120, 114` | Muted labels, timestamps, captions     |
| 10   | `--luxury-gray-10`    | `#A09D98` | `160, 157, 152` | Secondary text, descriptions           |
| 11   | `--luxury-gray-11`    | `#F0EDE8` | `240, 237, 232` | Primary text, headings, body copy      |

---

## 2. Violet Accent Scale (8 Steps)

Warm violet accent from barely-visible wash to full-strength dark.

| Step | Token                    | Hex       | Usage                                     |
|------|--------------------------|-----------|-------------------------------------------|
| 1    | `--luxury-violet-1`     | `#1A1726` | Barely-visible tint on dark surfaces      |
| 2    | `--luxury-violet-2`     | `#2A2545` | Tinted card backgrounds, subtle highlight |
| 3    | `--luxury-violet-3`     | `#4A3AA3` | Dark accent borders                       |
| 4    | `--luxury-violet-4`     | `#6B5AD6` | Active/pressed button state               |
| 5    | `--luxury-violet-5`     | `#7B6AEF` | Hover state for primary buttons           |
| 6    | `--luxury-violet-6`     | `#8B7AFF` | Primary accent: buttons, links, rings     |
| 7    | `--luxury-violet-7`     | `#A89FFF` | Secondary buttons, active nav indicators  |
| 8    | `--luxury-violet-8`     | `#C4BEFF` | Light accent: tags, pills on dark         |

Gradient for primary CTA buttons: `linear-gradient(135deg, #8B7AFF, #6C5CE7)`.

---

## 3. Semantic Colors (Muted for Dark)

Desaturated 25-30% from standard values. Never neon.

| Role    | Text Hex  | Tinted BG                          | WCAG vs #0C0B0A |
|---------|-----------|------------------------------------|-----------------|
| Success | `#6DBEA3` | `rgba(109, 190, 163, 0.10)`       | 8.5:1 AAA       |
| Warning | `#D4A867` | `rgba(212, 168, 103, 0.10)`       | 8.0:1 AAA       |
| Error   | `#D4766A` | `rgba(212, 118, 106, 0.10)`       | 5.6:1 AA        |
| Info    | `#7B9FCC` | `rgba(123, 159, 204, 0.10)`       | 6.8:1 AA        |

---

## 4. Financial Colors (Colorblind-Safe)

Always pair with directional arrows and +/- prefixes, never rely on hue alone.

| Role           | Hex       | Tinted BG                           | WCAG vs #0C0B0A | WCAG vs #1A1916 |
|----------------|-----------|-------------------------------------|-----------------|-----------------|
| Profit text    | `#7CCBA5` | `rgba(124, 203, 165, 0.10)`        | 9.6:1 AAA       | 8.2:1 AAA       |
| Profit strong  | `#5AB88E` | --                                  | 7.4:1 AAA       | 6.3:1 AA        |
| Loss text      | `#D4766A` | `rgba(212, 118, 106, 0.10)`        | 5.6:1 AA        | 4.8:1 AA        |
| Loss strong    | `#C45E52` | --                                  | 4.2:1 AA        | 3.6:1 AA-large  |
| Neutral        | `#A09D98` | --                                  | 7.5:1 AAA       | 6.3:1 AA        |

---

## 5. Surface Hierarchy (4 Levels)

Each level uses both a hard-coded warm hex AND a white-opacity layer approach.

| Level    | Token                     | Hex       | Opacity Layer Alternative          | Usage                          |
|----------|---------------------------|-----------|------------------------------------|--------------------------------|
| Base     | `--luxury-bg-base`       | `#0C0B0A` | (root -- no overlay)               | Page background                |
| Surface  | `--luxury-bg-surface`    | `#1A1916` | `rgba(255, 255, 255, 0.04)`       | Cards, panels, sidebar         |
| Elevated | `--luxury-bg-elevated`   | `#22211D` | `rgba(255, 255, 255, 0.06)`       | Modals, popovers, dropdowns    |
| Overlay  | `--luxury-bg-overlay`    | `#2A2924` | `rgba(255, 255, 255, 0.08)`       | Command palette, full overlays |

Top-edge card highlight for Surface and Elevated: `box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.05)`.

---

## 6. Border Opacity Scale (5 Levels)

All borders use `rgba(255, 255, 255, N)` to inherit warmth from the surface beneath.

| Level    | Token                       | Opacity | Computed on #0C0B0A | Usage                                |
|----------|-----------------------------|---------|---------------------|--------------------------------------|
| Ghost    | `--luxury-border-ghost`    | `0.03`  | ~`#0F0E0D`         | Card edges in grids (barely seen)    |
| Subtle   | `--luxury-border-subtle`   | `0.04`  | ~`#131210`         | Default card borders, sidebar edges  |
| Default  | `--luxury-border-default`  | `0.06`  | ~`#181715`         | Input fields, table dividers         |
| Strong   | `--luxury-border-strong`   | `0.08`  | ~`#1D1C19`         | Active states, section dividers      |
| Emphasis | `--luxury-border-emphasis` | `0.12`  | ~`#252420`         | Focus rings, selected items          |

---

## 7. Text Color Hierarchy

| Role      | Token                       | Hex       | WCAG vs #0C0B0A | WCAG vs #1A1916 | Usage                                    |
|-----------|-----------------------------|-----------|-----------------|-----------------|------------------------------------------|
| Primary   | `--luxury-text-primary`    | `#F0EDE8` | 17.6:1 AAA      | 14.5:1 AAA      | Headings, body copy, KPI values          |
| Secondary | `--luxury-text-secondary`  | `#A09D98` | 7.5:1 AAA       | 6.3:1 AA        | Descriptions, subtitles, form labels     |
| Muted     | `--luxury-text-muted`      | `#7A7872` | 3.9:1 AA-large  | 3.3:1 AA-large  | Timestamps, tertiary labels (14px+ only) |
| Disabled  | `--luxury-text-disabled`   | `#5C5A56` | 3.0:1 decorative | 2.6:1 fail     | Disabled controls (multi-cue required)   |

Never use `#FFFFFF`. Cap brightness at `#F0EDE8`. Disabled text must always be paired with another visual cue (reduced opacity container, strikethrough, icon).

---

## 8. Typography Tokens

### Font Families

| Token                    | Stack                                                                   | Role                               |
|--------------------------|-------------------------------------------------------------------------|-------------------------------------|
| `--luxury-font-heading`  | `'Satoshi', system-ui, sans-serif`                                     | Display headings, KPI numbers, hero |
| `--luxury-font-body`     | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`  | Body, UI chrome, data tables        |
| `--luxury-font-mono`     | `'JetBrains Mono', 'Fira Code', monospace`                            | Code blocks, AI chat output         |

### Type Scale

Every entry specifies size, line-height, weight, letter-spacing, and intended font family.

| Token                  | Size  | Line-Height | Weight | Tracking    | Font    | Usage                     |
|------------------------|-------|-------------|--------|-------------|---------|---------------------------|
| `--luxury-text-hero`   | 56px  | 1.05        | 300    | -0.04em     | Satoshi | Landing hero, onboarding  |
| `--luxury-text-display`| 40px  | 1.10        | 300    | -0.035em    | Satoshi | Page titles               |
| `--luxury-text-kpi`    | 32px  | 1.15        | 300    | -0.03em     | Satoshi | KPI headline numbers      |
| `--luxury-text-h1`     | 28px  | 1.20        | 400    | -0.025em    | Satoshi | Major section headings    |
| `--luxury-text-h2`     | 22px  | 1.30        | 500    | -0.02em     | Satoshi | Section headings          |
| `--luxury-text-h3`     | 18px  | 1.40        | 500    | -0.015em    | Inter   | Card headings, subheads   |
| `--luxury-text-body`   | 14px  | 1.60        | 400    | -0.006em    | Inter   | Body paragraphs           |
| `--luxury-text-sm`     | 13px  | 1.50        | 400    | 0           | Inter   | UI chrome, sidebar labels |
| `--luxury-text-xs`     | 11px  | 1.45        | 500    | 0.01em      | Inter   | Badges, metadata          |
| `--luxury-text-micro`  | 10px  | 1.40        | 500    | 0.04em      | Inter   | Pill labels, timestamps   |

### Weight Rules

- Display/KPI (28px+): Satoshi weight 300. This is the single most important luxury signal.
- Section headings (18-22px): Satoshi or Inter weight 500.
- Body and UI (13-14px): Inter weight 400.
- Labels and caps: Inter weight 500-600.
- Monospace (AI chat): JetBrains Mono weight 350 (variable font axis).

### OpenType Features

```css
/* Inter body -- activate in body rule */
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11', 'zero';
/* cv02=open 4, cv03=open 6/9, cv04=open i, cv11=single-story a, zero=slashed 0 */

/* Financial numbers -- activate on .financial or [data-financial] */
font-variant-numeric: tabular-nums lining-nums;
```

### Font Rendering

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Mandatory for dark backgrounds. Subpixel antialiasing causes color fringing on light-on-dark text.

---

## 9. Shadow Tokens

On dark backgrounds, traditional drop shadows are invisible. Use subtle glows (colored box-shadows) and inset highlights for elevation.

| Token                      | Value                                                                                 | Usage                              |
|----------------------------|---------------------------------------------------------------------------------------|------------------------------------|
| `--luxury-shadow-inset`   | `inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`                                         | Top-edge card highlight            |
| `--luxury-shadow-sm`      | `0 1px 2px rgba(0, 0, 0, 0.4)`                                                       | Subtle depth for small elements    |
| `--luxury-shadow-md`      | `0 4px 12px rgba(0, 0, 0, 0.5)`                                                      | Dropdowns, tooltips                |
| `--luxury-shadow-lg`      | `0 8px 24px rgba(0, 0, 0, 0.6)`                                                      | Modals, command palette            |
| `--luxury-shadow-xl`      | `0 16px 48px rgba(0, 0, 0, 0.7)`                                                     | Full-screen overlays               |
| `--luxury-shadow-glow`    | `0 0 20px rgba(139, 122, 255, 0.15)`                                                 | Accent glow on focused inputs      |
| `--luxury-shadow-focus`   | `0 0 0 2px #0C0B0A, 0 0 0 4px rgba(139, 122, 255, 0.5)`                             | Focus ring (violet accent)         |

---

## 10. Border Radius Scale

| Token                     | Value    | Usage                                 |
|---------------------------|----------|---------------------------------------|
| `--luxury-radius-sm`     | `4px`    | Small inputs, inline badges           |
| `--luxury-radius-default`| `6px`    | Buttons, small cards                  |
| `--luxury-radius-md`     | `8px`    | Input fields, nav items               |
| `--luxury-radius-lg`     | `12px`   | Cards, panels (primary card radius)   |
| `--luxury-radius-xl`     | `16px`   | Large cards, modal containers         |
| `--luxury-radius-2xl`    | `20px`   | Hero sections, feature cards          |
| `--luxury-radius-full`   | `9999px` | Pill buttons, avatar circles          |

Card default: `12px`. Buttons: `9999px` (pill). Inputs: `8px`. Never exceed `16px` on standard cards.

---

## 11. Transition Timing Tokens

| Token                        | Value                             | Usage                                |
|------------------------------|-----------------------------------|--------------------------------------|
| `--luxury-ease-default`     | `cubic-bezier(0.22, 1, 0.36, 1)` | General interactions (spring feel)   |
| `--luxury-ease-out`         | `cubic-bezier(0.16, 1, 0.3, 1)`  | Exits, collapses                     |
| `--luxury-ease-in-out`      | `cubic-bezier(0.4, 0, 0.2, 1)`   | Symmetric transitions                |
| `--luxury-duration-instant` | `75ms`                            | Hover color changes                  |
| `--luxury-duration-fast`    | `150ms`                           | Button state changes, toggles        |
| `--luxury-duration-normal`  | `200ms`                           | Nav transitions, card hover borders  |
| `--luxury-duration-slow`    | `300ms`                           | Layout shifts, accordion open/close  |
| `--luxury-duration-enter`   | `400ms`                           | Page element entrance animations     |

Entrance animation pattern: `opacity 0 -> 1, translateY 8px -> 0, 400ms ease-default, stagger 50ms per item`.

No hover scale transforms on cards. No parallax. Border brightness change only on card hover.

---

## 12. CSS Custom Properties (Complete)

```css
:root {
  /* ── Warm Gray Scale ── */
  --luxury-gray-0:  #0C0B0A;
  --luxury-gray-1:  #131210;
  --luxury-gray-2:  #1A1916;
  --luxury-gray-3:  #22211D;
  --luxury-gray-4:  #2A2924;
  --luxury-gray-5:  #33322C;
  --luxury-gray-6:  #3A3835;
  --luxury-gray-7:  #4A4844;
  --luxury-gray-8:  #5C5A56;
  --luxury-gray-9:  #7A7872;
  --luxury-gray-10: #A09D98;
  --luxury-gray-11: #F0EDE8;

  /* ── Violet Accent Scale ── */
  --luxury-violet-1: #1A1726;
  --luxury-violet-2: #2A2545;
  --luxury-violet-3: #4A3AA3;
  --luxury-violet-4: #6B5AD6;
  --luxury-violet-5: #7B6AEF;
  --luxury-violet-6: #8B7AFF;
  --luxury-violet-7: #A89FFF;
  --luxury-violet-8: #C4BEFF;

  /* ── Semantic Surfaces ── */
  --luxury-bg-base:     #0C0B0A;
  --luxury-bg-surface:  #1A1916;
  --luxury-bg-elevated: #22211D;
  --luxury-bg-overlay:  #2A2924;

  /* ── Opacity Layers (white on base) ── */
  --luxury-layer-1: rgba(255, 255, 255, 0.02);
  --luxury-layer-2: rgba(255, 255, 255, 0.04);
  --luxury-layer-3: rgba(255, 255, 255, 0.06);
  --luxury-layer-4: rgba(255, 255, 255, 0.08);
  --luxury-layer-5: rgba(255, 255, 255, 0.12);
  --luxury-layer-6: rgba(255, 255, 255, 0.16);

  /* ── Borders ── */
  --luxury-border-ghost:    rgba(255, 255, 255, 0.03);
  --luxury-border-subtle:   rgba(255, 255, 255, 0.04);
  --luxury-border-default:  rgba(255, 255, 255, 0.06);
  --luxury-border-strong:   rgba(255, 255, 255, 0.08);
  --luxury-border-emphasis: rgba(255, 255, 255, 0.12);

  /* ── Text ── */
  --luxury-text-primary:   #F0EDE8;
  --luxury-text-secondary: #A09D98;
  --luxury-text-muted:     #7A7872;
  --luxury-text-disabled:  #5C5A56;

  /* ── Accent ── */
  --luxury-accent:         #8B7AFF;
  --luxury-accent-hover:   #7B6AEF;
  --luxury-accent-active:  #6B5AD6;
  --luxury-accent-surface: rgba(139, 122, 255, 0.08);
  --luxury-accent-border:  rgba(139, 122, 255, 0.20);
  --luxury-accent-glow:    rgba(139, 122, 255, 0.15);

  /* ── Semantic Colors ── */
  --luxury-success:     #6DBEA3;
  --luxury-success-bg:  rgba(109, 190, 163, 0.10);
  --luxury-warning:     #D4A867;
  --luxury-warning-bg:  rgba(212, 168, 103, 0.10);
  --luxury-error:       #D4766A;
  --luxury-error-bg:    rgba(212, 118, 106, 0.10);
  --luxury-info:        #7B9FCC;
  --luxury-info-bg:     rgba(123, 159, 204, 0.10);

  /* ── Financial ── */
  --luxury-profit:      #7CCBA5;
  --luxury-profit-bg:   rgba(124, 203, 165, 0.10);
  --luxury-profit-strong: #5AB88E;
  --luxury-loss:        #D4766A;
  --luxury-loss-bg:     rgba(212, 118, 106, 0.10);
  --luxury-loss-strong: #C45E52;

  /* ── Shadows ── */
  --luxury-shadow-inset: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  --luxury-shadow-sm:    0 1px 2px rgba(0, 0, 0, 0.4);
  --luxury-shadow-md:    0 4px 12px rgba(0, 0, 0, 0.5);
  --luxury-shadow-lg:    0 8px 24px rgba(0, 0, 0, 0.6);
  --luxury-shadow-xl:    0 16px 48px rgba(0, 0, 0, 0.7);
  --luxury-shadow-glow:  0 0 20px rgba(139, 122, 255, 0.15);
  --luxury-shadow-focus: 0 0 0 2px #0C0B0A, 0 0 0 4px rgba(139, 122, 255, 0.5);

  /* ── Radius ── */
  --luxury-radius-sm:      4px;
  --luxury-radius-default: 6px;
  --luxury-radius-md:      8px;
  --luxury-radius-lg:      12px;
  --luxury-radius-xl:      16px;
  --luxury-radius-2xl:     20px;
  --luxury-radius-full:    9999px;

  /* ── Timing ── */
  --luxury-ease-default:     cubic-bezier(0.22, 1, 0.36, 1);
  --luxury-ease-out:         cubic-bezier(0.16, 1, 0.3, 1);
  --luxury-ease-in-out:      cubic-bezier(0.4, 0, 0.2, 1);
  --luxury-duration-instant: 75ms;
  --luxury-duration-fast:    150ms;
  --luxury-duration-normal:  200ms;
  --luxury-duration-slow:    300ms;
  --luxury-duration-enter:   400ms;

  /* ── Typography ── */
  --luxury-font-heading: 'Satoshi', system-ui, sans-serif;
  --luxury-font-body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --luxury-font-mono:    'JetBrains Mono', 'Fira Code', monospace;
}
```

---

## 13. Tailwind Theme Extension

```ts
// tailwind.config.ts -- luxury dark theme extension
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm gray scale
        warm: {
          0:  '#0C0B0A', 1:  '#131210', 2:  '#1A1916', 3:  '#22211D',
          4:  '#2A2924', 5:  '#33322C', 6:  '#3A3835', 7:  '#4A4844',
          8:  '#5C5A56', 9:  '#7A7872', 10: '#A09D98', 11: '#F0EDE8',
        },
        // Violet accent scale
        violet: {
          1: '#1A1726', 2: '#2A2545', 3: '#4A3AA3', 4: '#6B5AD6',
          5: '#7B6AEF', 6: '#8B7AFF', 7: '#A89FFF', 8: '#C4BEFF',
        },
        // Semantic surface backgrounds
        'app-bg':       'var(--luxury-bg-base)',
        'app-surface':  'var(--luxury-bg-surface)',
        'app-elevated': 'var(--luxury-bg-elevated)',
        'app-overlay':  'var(--luxury-bg-overlay)',
        // Semantic text
        'text-primary':   'var(--luxury-text-primary)',
        'text-secondary': 'var(--luxury-text-secondary)',
        'text-muted':     'var(--luxury-text-muted)',
        'text-disabled':  'var(--luxury-text-disabled)',
        // Accent
        accent: {
          DEFAULT: 'var(--luxury-accent)',
          hover:   'var(--luxury-accent-hover)',
          active:  'var(--luxury-accent-active)',
          surface: 'var(--luxury-accent-surface)',
          border:  'var(--luxury-accent-border)',
        },
        // Borders
        'border-ghost':    'var(--luxury-border-ghost)',
        'border-subtle':   'var(--luxury-border-subtle)',
        'border-default':  'var(--luxury-border-default)',
        'border-strong':   'var(--luxury-border-strong)',
        'border-emphasis': 'var(--luxury-border-emphasis)',
        // Semantic colors
        success: { DEFAULT: 'var(--luxury-success)', bg: 'var(--luxury-success-bg)' },
        warning: { DEFAULT: 'var(--luxury-warning)', bg: 'var(--luxury-warning-bg)' },
        error:   { DEFAULT: 'var(--luxury-error)',   bg: 'var(--luxury-error-bg)' },
        info:    { DEFAULT: 'var(--luxury-info)',     bg: 'var(--luxury-info-bg)' },
        // Financial
        profit: { DEFAULT: 'var(--luxury-profit)', bg: 'var(--luxury-profit-bg)', strong: 'var(--luxury-profit-strong)' },
        loss:   { DEFAULT: 'var(--luxury-loss)',   bg: 'var(--luxury-loss-bg)',   strong: 'var(--luxury-loss-strong)' },
      },

      fontFamily: {
        heading: ['Satoshi', 'system-ui', 'sans-serif'],
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'hero':    ['56px', { lineHeight: '1.05', letterSpacing: '-0.04em',  fontWeight: '300' }],
        'display': ['40px', { lineHeight: '1.1',  letterSpacing: '-0.035em', fontWeight: '300' }],
        'kpi':     ['32px', { lineHeight: '1.15', letterSpacing: '-0.03em',  fontWeight: '300' }],
        'h1':      ['28px', { lineHeight: '1.2',  letterSpacing: '-0.025em', fontWeight: '400' }],
        'h2':      ['22px', { lineHeight: '1.3',  letterSpacing: '-0.02em',  fontWeight: '500' }],
        'h3':      ['18px', { lineHeight: '1.4',  letterSpacing: '-0.015em', fontWeight: '500' }],
        'body':    ['14px', { lineHeight: '1.6',  letterSpacing: '-0.006em', fontWeight: '400' }],
        'sm':      ['13px', { lineHeight: '1.5',  letterSpacing: '0',        fontWeight: '400' }],
        'xs':      ['11px', { lineHeight: '1.45', letterSpacing: '0.01em',   fontWeight: '500' }],
        'micro':   ['10px', { lineHeight: '1.4',  letterSpacing: '0.04em',   fontWeight: '500' }],
      },

      letterSpacing: {
        'display': '-0.035em',
        'heading': '-0.025em',
        'tight':   '-0.015em',
        'body':    '-0.006em',
        'normal':  '0em',
        'caps':    '0.04em',
      },

      borderRadius: {
        sm:      '4px',
        DEFAULT: '6px',
        md:      '8px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        full:    '9999px',
      },

      boxShadow: {
        'inset':  'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'sm':     '0 1px 2px rgba(0, 0, 0, 0.4)',
        'md':     '0 4px 12px rgba(0, 0, 0, 0.5)',
        'lg':     '0 8px 24px rgba(0, 0, 0, 0.6)',
        'xl':     '0 16px 48px rgba(0, 0, 0, 0.7)',
        'glow':   '0 0 20px rgba(139, 122, 255, 0.15)',
        'focus':  '0 0 0 2px #0C0B0A, 0 0 0 4px rgba(139, 122, 255, 0.5)',
      },

      transitionTimingFunction: {
        'luxury':     'cubic-bezier(0.22, 1, 0.36, 1)',
        'luxury-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'luxury-sym': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        '75':  '75ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
    },
  },
  plugins: [animate],
} satisfies Config

export default config
```

---

## 14. WCAG Contrast Ratios -- Complete Matrix

Every text/background combination used in the system.

### Text on Base (#0C0B0A)

| Foreground         | Hex       | Ratio   | WCAG Level   | Min Size    |
|--------------------|-----------|---------|--------------|-------------|
| Primary text       | `#F0EDE8` | 17.6:1  | AAA          | Any         |
| Secondary text     | `#A09D98` | 7.5:1   | AAA          | Any         |
| Muted text         | `#7A7872` | 3.9:1   | AA Large     | 18px / 14px bold |
| Disabled text      | `#5C5A56` | 3.0:1   | AA Large*    | 18px+ only, with icon |
| Violet accent      | `#8B7AFF` | 6.3:1   | AA           | Any         |
| Success            | `#6DBEA3` | 8.5:1   | AAA          | Any         |
| Warning            | `#D4A867` | 8.0:1   | AAA          | Any         |
| Error              | `#D4766A` | 5.6:1   | AA           | Any         |
| Info               | `#7B9FCC` | 6.8:1   | AA           | Any         |
| Profit             | `#7CCBA5` | 9.6:1   | AAA          | Any         |
| Loss               | `#D4766A` | 5.6:1   | AA           | Any         |

### Text on Surface (#1A1916)

| Foreground         | Hex       | Ratio   | WCAG Level   | Min Size    |
|--------------------|-----------|---------|--------------|-------------|
| Primary text       | `#F0EDE8` | 14.5:1  | AAA          | Any         |
| Secondary text     | `#A09D98` | 6.3:1   | AA           | Any         |
| Muted text         | `#7A7872` | 3.3:1   | AA Large     | 18px / 14px bold |
| Disabled text      | `#5C5A56` | 2.6:1   | Fail         | Do not use on surface |
| Violet accent      | `#8B7AFF` | 5.5:1   | AA           | Any         |
| Profit             | `#7CCBA5` | 8.2:1   | AAA          | Any         |
| Loss               | `#D4766A` | 4.8:1   | AA           | Any         |

### Text on Elevated (#22211D)

| Foreground         | Hex       | Ratio   | WCAG Level   | Min Size    |
|--------------------|-----------|---------|--------------|-------------|
| Primary text       | `#F0EDE8` | 12.4:1  | AAA          | Any         |
| Secondary text     | `#A09D98` | 5.4:1   | AA           | Any         |
| Muted text         | `#7A7872` | 2.8:1   | Fail         | Do not use on elevated |
| Violet accent      | `#8B7AFF` | 4.7:1   | AA           | 14px+ only  |

### Button Label Contrast

| Foreground         | Background   | Ratio   | WCAG Level   |
|--------------------|-------------|---------|--------------|
| `#0C0B0A` (dark)   | `#8B7AFF`  | 6.3:1   | AA -- use for primary CTA text |
| `#F0EDE8` (cream)  | `#8B7AFF`  | 2.8:1   | Fail -- do NOT use cream on violet |
| `#F0EDE8` (cream)  | `#6B5AD6`  | 4.1:1   | AA Large only |
| `#F0EDE8` (cream)  | `#4A3AA3`  | 6.6:1   | AA -- safe for text on deep violet |

---

## CRITICAL DECISIONS

These choices are locked. All other agents building on this token system must respect them.

1. **Background is `#0C0B0A`, never `#000000` or blue-black.** The warm undertone (R:12, G:11, B:10) is foundational. Every surface, border, and text color is tuned to this specific warm-dark base.

2. **Primary text is `#F0EDE8` warm cream, never `#FFFFFF`.** The 8-point R-B gap (240 vs 232) prevents halation and maintains warmth. Pure white clashes with warm surfaces.

3. **Accent is `#8B7AFF` warm violet, used as the sole chromatic accent.** No olive/lime. No teal. No blue. One accent color at full saturation per viewport. The gradient `#8B7AFF -> #6C5CE7` is permitted only on primary CTA buttons and hero elements.

4. **Button labels on violet backgrounds must be dark (`#0C0B0A`), not cream.** Cream on violet fails WCAG at 2.8:1. Dark on violet passes at 6.3:1.

5. **Headings use Satoshi at weight 300 (display/KPI) and 400-500 (section).** This is the single most important luxury signal. Do not use weight 600-700 on headings larger than 18px.

6. **Body text uses Inter at weight 400, 14px, with `-0.006em` tracking.** Enable `font-feature-settings: 'cv02','cv03','cv04','cv11','zero'` globally.

7. **Cards use 12px radius, pill buttons use 9999px, inputs use 8px.** Cards never exceed 16px radius. The round=action, rectangular=content principle is enforced.

8. **No hover scale transforms on cards.** Card hover is border brightness change only: `border-subtle -> border-strong` (0.04 -> 0.08 opacity). No translateY, no scale, no shadow growth.

9. **Depth is created by background color stepping, not by box-shadow.** Shadows are reserved for floating elements (dropdowns, command palette, modals) only. Cards on the page do not cast shadows.

10. **Disabled text (`#5C5A56`) must never be the sole indicator of disabled state.** Always pair with at least one other cue: reduced container opacity, strikethrough, grayed icon. On elevated surfaces, do not use disabled text at all.

11. **Muted text (`#7A7872`) is restricted to 14px+ or 14px bold on base background, and 18px+ on surface.** On elevated backgrounds, muted text fails WCAG entirely -- use secondary text (`#A09D98`) as the minimum.

12. **Financial numbers use `font-variant-numeric: tabular-nums lining-nums` always.** Profit is `#7CCBA5` (sage), loss is `#D4766A` (terracotta). Always accompany with directional arrows and +/- prefixes for colorblind safety.

13. **Entrance animations: 400ms, ease-default, stagger 50ms per item, translateY 8px -> 0.** No spring physics, no parallax, no shimmer loaders on content cards.

14. **Strategy badge colors must be re-derived for the warm-dark palette.** The current cold blue-tinted badge backgrounds (`#0C1A4A`, `#2E1065`, etc.) clash with the warm gray scale. The component agent must create new badge tokens using the violet scale and warm grays as the base.

15. **The `--luxury-*` namespace is canonical.** During implementation, these map to the existing `--app-*` and shadcn `--*` tokens. Both naming systems must produce identical visual output. The migration path is: add `--luxury-*` properties, update `.dark` class values to point to them, then gradually deprecate the old names.
