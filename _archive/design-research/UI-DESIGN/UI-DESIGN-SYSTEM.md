# Parcel UI Design System -- Definitive Implementation Spec

**Version:** 1.1 | **Date:** 2026-03-30 | **Theme:** Light (dark preserved for future)

This is the ONLY document used for implementation. All 18 agent specs and the critic review (Agent 19) have been reconciled into a single source of truth. Every conflict is resolved. Every hex is final.

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Tailwind Config](#2-tailwind-config)
3. [CSS Variables](#3-css-variables)
4. [Component Library](#4-component-library)
5. [Page Designs](#5-page-designs)
6. [Billing Components](#6-billing-components)
7. [Animation System](#7-animation-system)
8. [Responsive Rules](#8-responsive-rules)
9. [Chart Theme](#9-chart-theme)
10. [PDF Theme](#10-pdf-theme)
11. [Migration Plan](#11-migration-plan)
12. [Deferred](#12-deferred)
13. [Open Questions](#13-open-questions)

---

## Agent 19 Resolutions

Every issue from the adversarial review is resolved here. Reference this table during implementation.

| Issue | Resolution | Details |
|-------|-----------|---------|
| **1a. Two gray scales (Gray vs Slate)** | **Use custom Gray only.** Kill all `slate-*` references. | Gray-50 = `#F9FAFB`, Gray-200 = `#EAECF0`, Gray-500 = `#667085`. No Tailwind default Slate anywhere. |
| **1b. Page bg `#F9FAFB` vs `#F8FAFC`** | **`#F9FAFB`** (custom Gray-50). | Agents 04, 08, 09 were wrong. `#F8FAFC` is Tailwind Slate-50. |
| **1c. Card border-radius conflicts** | **`rounded-lg` (12px) for all app cards.** `rounded-xl` (16px) for landing/promotional only. | Pipeline deal cards: `rounded-[10px]` is approved exception (tighter density). |
| **1d. Sidebar 216px vs 240px** | **240px (`w-60`)** per Agent 03. | All content area calculations use `1024 - 240 = 784px`. |
| **1e. Button fill lime-600 vs lime-700** | **`bg-lime-700` (`#4D7C0F`) for ALL buttons with white text.** | `#65A30D` fails WCAG AA. `#4D7C0F` passes (4.63:1). Logo mark stays `bg-lime-700`. |
| **1f. `font-display` vs `font-brand`** | **`font-brand`** is the Tailwind class for Satoshi. | `font-display` does not exist. All landing page code uses `font-brand`. |
| **1g. Shadow inconsistencies** | **Use token shadows only.** Cards at rest: `shadow-xs`. Hover: `shadow-sm`. No inline custom shadows. | Delete all `shadow-[0_1px_2px_rgba(...)]` from page specs. |
| **1h. Shimmer: two approaches** | **`background-position` animation** (Agent 01 pattern). One implementation. | No `translateX` overlay approach. |
| **6a. `fontSize` replaces defaults** | **Use `extend.fontSize`** to add tokens WITHOUT removing Tailwind defaults. | Preserves `text-5xl`, `text-6xl`, etc. for landing page. Adds `text-micro`, `text-kpi`. |
| **9b. `font-mono` on financial numbers** | **Inter `tabular-nums` everywhere for financial numbers.** NOT `font-mono`. | `font-mono` is ONLY for code blocks and AI chat code output. |

---

## 1. Design Tokens

### 1.1 Color Palette -- ONE Gray Scale

The Untitled UI gray scale. No Tailwind default Slate. No `slate-*` classes anywhere.

| Token | Hex | Usage |
|-------|-----|-------|
| gray-25 | `#FCFCFD` | Subtle hover on white |
| gray-50 | `#F9FAFB` | **Page background** |
| gray-100 | `#F2F4F7` | Sidebar bg, secondary panels, skeleton base |
| gray-200 | `#EAECF0` | **Default borders**, dividers, skeleton highlight |
| gray-300 | `#D0D5DD` | Input borders, strong dividers |
| gray-400 | `#98A2B3` | Placeholder text, disabled icons, muted text |
| gray-500 | `#667085` | Secondary/caption text |
| gray-600 | `#475467` | Body text (secondary emphasis) |
| gray-700 | `#344054` | Strong secondary text |
| gray-800 | `#1D2939` | **Primary body text** |
| gray-900 | `#101828` | **Headings, KPI values, maximum contrast** |
| gray-950 | `#0C111D` | Tooltip bg, dark accents (rare) |

### 1.2 Primary Olive/Lime Scale

| Token | Hex | Usage |
|-------|-----|-------|
| lime-50 | `#F7FEE7` | Active nav bg, selected row bg |
| lime-100 | `#ECFCCB` | Hover on tinted surfaces |
| lime-200 | `#D9F99D` | Focus ring (lighter), progress bars |
| lime-300 | `#BEF264` | Focus ring outline |
| lime-400 | `#A3E635` | Decorative, secondary interactive |
| lime-500 | `#84CC16` | Brand primary (fills, chart strokes, sparklines). **NOT for text on white.** |
| lime-600 | `#65A30D` | Text links, hover states (WCAG AA) |
| lime-700 | `#4D7C0F` | **ALL buttons with white text**, active/pressed states (WCAG AA: 4.63:1) |
| lime-800 | `#3F6212` | Emphasis text, headings on colored bg |
| lime-900 | `#365314` | Ultra-deep, darkest brand usage |

### 1.3 Semantic Colors

| Semantic | 50 (bg) | 100 (badge) | 500 (icon) | 600 (emphasis) | 700 (text on white) |
|----------|---------|-------------|------------|----------------|---------------------|
| Success | `#F0F9FF` | `#E0F2FE` | `#0EA5E9` | `#0284C7` | `#0369A1` |
| Warning | `#FFFBEB` | `#FEF3C7` | `#F59E0B` | `#D97706` | `#B45309` |
| Error | `#FEF2F2` | `#FEE2E2` | `#EF4444` | `#DC2626` | `#B91C1C` |
| Info | `#EEF0FF` | `#E0E2FF` | `#6366F1` | `#4F46E5` | `#4338CA` |

**Semantic color summary (canonical):**
- **Primary:** Olive `#4D7C0F` (lime-700)
- **Success:** Sky Blue `#0284C7` (sky-600)
- **Warning:** Amber `#D97706` (unchanged)
- **Error:** Red `#DC2626` (unchanged)
- **Info:** Indigo `#4F46E5` (old primary repurposed)

**Rule:** Text on white uses 700 weight (all pass WCAG AA 4.5:1). 500 is for icons only (3:1 non-text contrast).

### 1.4 Strategy Badge Colors (Light Theme)

| Strategy | Background | Text | Contrast |
|----------|-----------|------|----------|
| Wholesale | `#FEF3C7` | `#92400E` | 6.8:1 |
| Creative Finance | `#EDE9FE` | `#5B21B6` | 7.2:1 |
| BRRRR | `#DBEAFE` | `#1E40AF` | 6.1:1 |
| Buy & Hold | `#D1FAE5` | `#065F46` | 6.5:1 |
| Flip | `#FFE4E6` | `#9F1239` | 6.3:1 |

### 1.5 Surface & Border Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| bg-page | `#F9FAFB` | Main page background |
| bg-surface | `#FFFFFF` | Cards, panels, modals |
| bg-surface-secondary | `#F2F4F7` | Sidebar, secondary panels |
| border-default | `#EAECF0` | Card borders, dividers |
| border-strong | `#D0D5DD` | Input borders |
| border-focus | `#84CC16` | Focus ring accent |

### 1.6 Typography

**Font Families:**

| Role | Family | Tailwind Class | Usage |
|------|--------|---------------|-------|
| Body / UI | Inter | `font-sans` | All body text, labels, nav, tables, forms, **financial numbers** |
| Display | Satoshi | `font-brand` | Landing page headings, marketing copy ONLY |
| Code | JetBrains Mono | `font-mono` | AI chat code blocks, code output ONLY |

**Financial numbers rule:** `font-sans tabular-nums` (Inter with tabular figures). NEVER `font-mono`.

**Type Scale (extends Tailwind defaults, does NOT replace):**

| Token | Size | Line Height | Letter Spacing | Typical Weight | Usage |
|-------|------|-------------|----------------|---------------|-------|
| `micro` | 10px | 14px | 0.04em | 500 | Badges, overlines |
| `xs` | 11px | 16px | 0.01em | 500/600 | Table headers, breadcrumbs |
| `sm` | 12px | 16px | 0 | 500 | Table cells, sidebar nav, form labels |
| `base` | 13px | 20px | 0 | 400 | **Default app body text** |
| `md` | 14px | 20px | -0.006em | 500 | Card titles, emphasized body |
| `lg` | 16px | 24px | -0.011em | 600 | Section headings |
| `xl` | 18px | 26px | -0.014em | 600 | Page titles (app shell) |
| `2xl` | 22px | 28px | -0.019em | 600 | Section titles |
| `3xl` | 28px | 34px | -0.021em | 700 | Page hero titles |
| `4xl` | 36px | 42px | -0.022em | 700 | Landing hero titles |
| `kpi` | 32px | 38px | -0.025em | 700 | KPI hero numbers |

**Note:** Tailwind defaults (`text-5xl` = 48px, `text-6xl` = 60px, etc.) are preserved for landing page use.

**Weight defaults:** Inside the app shell, 500 (medium) is the default UI weight. 400 for body paragraphs and chat messages.

### 1.7 Shadows

All shadows use `rgba(16, 24, 40, ...)` (cool-tinted from gray-950).

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(16,24,40,0.05)` | Cards at rest, inputs |
| `shadow-sm` | `0 1px 3px rgba(16,24,40,0.10), 0 1px 2px rgba(16,24,40,0.06)` | Cards on hover, elevated |
| `shadow-md` | `0 4px 8px -2px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)` | Dropdowns |
| `shadow-lg` | `0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)` | Modals, popovers |
| `shadow-xl` | `0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)` | Command palette |
| `shadow-2xl` | `0 24px 48px -12px rgba(16,24,40,0.18)` | Full-page overlays |
| `shadow-focus` | `0 0 0 2px #FFFFFF, 0 0 0 4px #84CC16` | Focus ring |

**Card elevation:** `border border-gray-200 shadow-xs` at rest. `shadow-sm` on hover. Never shadow-only.

### 1.8 Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|---------|-------|
| sm | 4px | `rounded-sm` | Small badges, chips |
| DEFAULT | 6px | `rounded` | Inputs, small buttons |
| md | 8px | `rounded-md` | Default buttons, dropdowns |
| lg | 12px | `rounded-lg` | **Cards** (app shell standard) |
| xl | 16px | `rounded-xl` | Landing/promotional cards only |
| 2xl | 20px | `rounded-2xl` | Landing page hero only |
| full | 9999px | `rounded-full` | Avatars, pills |

**Exception:** Pipeline deal cards use `rounded-[10px]` (approved density exception).

### 1.9 Transition Timing

| Interaction | Duration | Easing | Tailwind |
|-------------|----------|--------|----------|
| Hover color | 75ms | ease-in-out-smooth | `duration-75` |
| Button press | 100ms | ease-in-out-smooth | `duration-100` |
| Tooltip appear | 150ms | ease-out-expo | `duration-150` |
| Dropdown open | 200ms | ease-out-expo | `duration-200` |
| Modal enter | 250ms | spring (400/30) | `duration-250` |
| Page transition | 200ms | ease-smooth | `duration-200` |

---

## 2. Tailwind Config

Drop-in `tailwind.config.ts`. Uses `extend.fontSize` per Agent 19 fix.

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    extend: {
      // -- FONT SIZE: extends defaults, does NOT replace --
      fontSize: {
        'micro': ['10px', { lineHeight: '14px', letterSpacing: '0.04em' }],
        'xs':    ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'sm':    ['12px', { lineHeight: '16px', letterSpacing: '0' }],
        'base':  ['13px', { lineHeight: '20px', letterSpacing: '0' }],
        'md':    ['14px', { lineHeight: '20px', letterSpacing: '-0.006em' }],
        'lg':    ['16px', { lineHeight: '24px', letterSpacing: '-0.011em' }],
        'xl':    ['18px', { lineHeight: '26px', letterSpacing: '-0.014em' }],
        '2xl':   ['22px', { lineHeight: '28px', letterSpacing: '-0.019em' }],
        '3xl':   ['28px', { lineHeight: '34px', letterSpacing: '-0.021em' }],
        '4xl':   ['36px', { lineHeight: '42px', letterSpacing: '-0.022em' }],
        'kpi':   ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
      },

      // -- COLORS --
      colors: {
        // App backgrounds (CSS-variable-driven for theme switching)
        'app-bg':       'var(--app-bg)',
        'app-surface':  'var(--app-surface)',
        'app-elevated': 'var(--app-elevated)',
        'app-overlay':  'var(--app-overlay)',

        // Borders
        'border-subtle':  'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong':  'var(--border-strong)',

        // Accent
        'accent-primary':   'var(--accent-primary)',
        'accent-hover':     'var(--accent-hover)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success':   'var(--accent-success)',
        'accent-warning':   'var(--accent-warning)',
        'accent-danger':    'var(--accent-danger)',
        'accent-info':      'var(--accent-info)',

        // Text
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'text-disabled':  'var(--text-disabled)',

        // Strategy badge colors
        'strategy-wholesale': { bg: 'var(--strategy-wholesale-bg)', text: 'var(--strategy-wholesale-text)' },
        'strategy-creative':  { bg: 'var(--strategy-creative-bg)',  text: 'var(--strategy-creative-text)' },
        'strategy-brrrr':     { bg: 'var(--strategy-brrrr-bg)',     text: 'var(--strategy-brrrr-text)' },
        'strategy-buyhold':   { bg: 'var(--strategy-buyhold-bg)',   text: 'var(--strategy-buyhold-text)' },
        'strategy-flip':      { bg: 'var(--strategy-flip-bg)',      text: 'var(--strategy-flip-text)' },

        // Neutral gray scale (direct hex, ONE scale)
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

        // Olive/Lime scale (PRIMARY)
        lime: {
          50:  '#F7FEE7',
          100: '#ECFCCB',
          200: '#D9F99D',
          300: '#BEF264',
          400: '#A3E635',
          500: '#84CC16',
          600: '#65A30D',
          700: '#4D7C0F',
          800: '#3F6212',
          900: '#365314',
        },

        // Indigo scale (INFO color)
        indigo: {
          50:  '#EEF0FF',
          100: '#E0E2FF',
          200: '#C7C9FF',
          300: '#A5A7FC',
          400: '#8385F6',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },

        // Semantic
        success: { 50: '#F0F9FF', 100: '#E0F2FE', 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
        error:   { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
        info:    { 50: '#EEF0FF', 100: '#E0E2FF', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },

        // shadcn/ui tokens (HSL-based, keep for compatibility)
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

      // -- FONT FAMILY --
      fontFamily: {
        sans:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        brand: ['"Satoshi"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      // -- BORDER RADIUS --
      borderRadius: {
        sm:      '4px',
        DEFAULT: '6px',
        md:      '8px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        full:    '9999px',
      },

      // -- SHADOWS --
      boxShadow: {
        'xs':    '0 1px 2px rgba(16, 24, 40, 0.05)',
        'sm':    '0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)',
        'md':    '0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
        'lg':    '0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)',
        'xl':    '0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)',
        '2xl':   '0 24px 48px -12px rgba(16, 24, 40, 0.18)',
        'focus': '0 0 0 2px #FFFFFF, 0 0 0 4px #84CC16',
      },

      // -- TIMING --
      transitionTimingFunction: {
        'ease-spring':        'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-out-expo':      'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        '75':  '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '500': '500ms',
      },

      // -- KEYFRAMES (preserve existing + add light shimmer) --
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drift1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(80px, -60px) scale(1.1)' },
          '66%':      { transform: 'translate(-40px, 40px) scale(0.95)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(-60px, 80px) scale(1.05)' },
          '66%':      { transform: 'translate(60px, -30px) scale(1.1)' },
        },
        drift3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(40px, 60px) scale(0.9)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.12' },
          '50%':      { opacity: '0.2' },
        },
        'pipeline-slide': {
          '0%':   { transform: 'translateX(0)' },
          '40%':  { transform: 'translateX(0)' },
          '50%':  { transform: 'translateX(calc(100% + 12px))' },
          '90%':  { transform: 'translateX(calc(100% + 12px))' },
          '100%': { transform: 'translateX(0)' },
        },
      },

      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        shimmer:           'shimmer 2s linear infinite',
        drift1:            'drift1 15s ease-in-out infinite',
        drift2:            'drift2 12s ease-in-out infinite',
        drift3:            'drift3 18s ease-in-out infinite',
        blink:             'blink 1s step-end infinite',
        'glow-breathe':    'glow-breathe 6s ease-in-out infinite',
        'pipeline-slide':  'pipeline-slide 5s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config

export default config
```

---

## 3. CSS Variables

### 3.1 Light Theme (`:root`)

```css
@layer base {
  :root {
    /* -- App backgrounds -- */
    --app-bg:       #F9FAFB;
    --app-surface:  #FFFFFF;
    --app-elevated: #F2F4F7;
    --app-overlay:  rgba(12, 17, 29, 0.60);

    /* -- Borders -- */
    --border-subtle:  #EAECF0;
    --border-default: #D0D5DD;
    --border-strong:  #98A2B3;

    /* -- Accent -- */
    --accent-primary:   #84CC16;
    --accent-hover:     #4D7C0F;
    --accent-secondary: #65A30D;
    --accent-success:   #0EA5E9;
    --accent-warning:   #F59E0B;
    --accent-danger:    #EF4444;
    --accent-info:      #6366F1;

    /* -- Text -- */
    --text-primary:   #1D2939;
    --text-secondary: #667085;
    --text-muted:     #98A2B3;
    --text-disabled:  #D0D5DD;

    /* -- Strategy badges -- */
    --strategy-wholesale-bg:  #FEF3C7;
    --strategy-wholesale-text: #92400E;
    --strategy-creative-bg:   #EDE9FE;
    --strategy-creative-text:  #5B21B6;
    --strategy-brrrr-bg:      #DBEAFE;
    --strategy-brrrr-text:     #1E40AF;
    --strategy-buyhold-bg:    #D1FAE5;
    --strategy-buyhold-text:   #065F46;
    --strategy-flip-bg:       #FFE4E6;
    --strategy-flip-text:      #9F1239;

    /* -- shadcn/ui tokens (light) -- */
    --background:          210 20% 98%;
    --foreground:          220 26% 14%;
    --card:                0 0% 100%;
    --card-foreground:     222 47% 11%;
    --popover:             0 0% 100%;
    --popover-foreground:  222 47% 11%;
    --primary:             80 82% 24%;       /* lime-700 for buttons */
    --primary-foreground:  0 0% 100%;
    --secondary:           220 14% 96%;
    --secondary-foreground: 220 9% 46%;
    --muted:               220 14% 96%;
    --muted-foreground:    218 15% 65%;
    --accent:              87 100% 93%;
    --accent-foreground:   80 82% 24%;
    --destructive:         0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border:              220 13% 91%;
    --input:               218 11% 82%;
    --ring:                84 81% 44%;
    --radius:              0.5rem;
  }
}
```

### 3.2 Dark Theme (`.dark`, future)

```css
@layer base {
  .dark {
    --app-bg:       #08080F;
    --app-surface:  #0F0F1A;
    --app-elevated: #16162A;
    --app-overlay:  rgba(0, 0, 0, 0.70);
    --border-subtle:  #1A1A2E;
    --border-default: #252540;
    --border-strong:  #303055;
    --accent-primary:   #84CC16;
    --accent-hover:     #4D7C0F;
    --accent-secondary: #65A30D;
    --accent-success:   #0EA5E9;
    --accent-warning:   #F59E0B;
    --accent-danger:    #EF4444;
    --accent-info:      #6366F1;
    --text-primary:   #F1F5F9;
    --text-secondary: #94A3B8;
    --text-muted:     #475569;
    --text-disabled:  #334155;
    --strategy-wholesale-bg:  #451A03;
    --strategy-wholesale-text: #FCD34D;
    --strategy-creative-bg:   #2E1065;
    --strategy-creative-text:  #C4B5FD;
    --strategy-brrrr-bg:      #0C1A4A;
    --strategy-brrrr-text:     #93C5FD;
    --strategy-buyhold-bg:    #064E3B;
    --strategy-buyhold-text:   #6EE7B7;
    --strategy-flip-bg:       #431407;
    --strategy-flip-text:      #FCA5A1;
    --background:          240 50% 4%;
    --foreground:          0 0% 98%;
    --card:                240 43% 8%;
    --card-foreground:     0 0% 98%;
    --popover:             240 43% 8%;
    --popover-foreground:  0 0% 98%;
    --primary:             84 81% 44%;
    --primary-foreground:  240 50% 4%;
    --secondary:           240 30% 12%;
    --secondary-foreground: 0 0% 98%;
    --muted:               240 30% 12%;
    --muted-foreground:    240 5% 60%;
    --accent:              240 30% 16%;
    --accent-foreground:   0 0% 98%;
    --destructive:         0 63% 31%;
    --destructive-foreground: 0 0% 98%;
    --border:              240 30% 14%;
    --input:               240 30% 12%;
    --ring:                84 81% 44%;
  }
}
```

### 3.3 Base CSS (index.css additions)

```css
@layer base {
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Financial numbers -- Inter tabular, NOT JetBrains Mono */
  [data-financial],
  .financial {
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 500;
  }

  /* Skeleton shimmer (light theme) */
  .skeleton-shimmer {
    background: linear-gradient(90deg, #F2F4F7 0%, #EAECF0 50%, #F2F4F7 100%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }
}

@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer { animation: none; background: #F2F4F7; }
}
```

---

## 4. Component Library

All components use CVA, forward refs, compose via `cn()`. shadcn primitives extended, not replaced.

### 4.1 Button

**Variants:**

| Variant | Classes |
|---------|---------|
| primary | `bg-lime-700 text-white hover:bg-lime-800 active:bg-lime-900` |
| secondary | `bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200/70 hover:text-gray-900` |
| ghost | `text-gray-600 hover:bg-gray-100 hover:text-gray-900` |
| danger | `bg-error-600 text-white hover:bg-error-700 active:bg-error-800` |
| outline | `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400` |
| link | `text-lime-700 underline-offset-4 hover:underline hover:text-lime-800 p-0 h-auto` |

**Sizes:**

| Size | Classes |
|------|---------|
| sm | `h-8 px-3 text-xs [&_svg]:size-3.5` |
| md | `h-9 px-4 text-sm [&_svg]:size-4` |
| lg | `h-11 px-6 text-md [&_svg]:size-5` |
| icon | `h-9 w-9 p-0 [&_svg]:size-4` |

**Base classes (all variants):**
```
inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium
rounded-md transition-colors duration-100 ease-in-out-smooth
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600/40
focus-visible:ring-offset-2 focus-visible:ring-offset-white
disabled:pointer-events-none disabled:opacity-50
[&_svg]:pointer-events-none [&_svg]:shrink-0
```

### 4.2 Input

**Base classes:**
```
h-11 w-full rounded border border-gray-300 bg-white px-3 py-2.5
text-md text-gray-900 font-medium placeholder:text-gray-400
transition-colors duration-150
focus-visible:outline-none focus-visible:border-lime-600
focus-visible:ring-2 focus-visible:ring-lime-600/20 focus-visible:ring-offset-0
disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
```

**Financial inputs:** Add `font-sans tabular-nums`. Use `type="text" inputMode="decimal"`.

**Error state:** `border-error-500 ring-2 ring-error-500/15`

**Label:** `text-sm font-medium text-gray-700 mb-1.5`

### 4.3 Card

**Variants:**

| Variant | Classes |
|---------|---------|
| default | `rounded-lg border border-gray-200 shadow-xs bg-white text-gray-900` |
| elevated | `rounded-lg border border-gray-200 shadow-sm bg-white text-gray-900` |
| bordered | `rounded-lg border border-gray-200 bg-white text-gray-900` |
| interactive | `rounded-lg border border-gray-200 shadow-xs bg-white text-gray-900 cursor-pointer transition-all duration-150 hover:shadow-md hover:border-gray-300` |
| stat | `rounded-lg border border-gray-200 shadow-xs bg-white text-gray-900 p-6 space-y-1 overflow-hidden` |

**Padding:** Standard `p-6` (24px). Compact `p-4` (16px). Dense `p-3.5` (14px, pipeline).

**Selected:** `border-lime-600 ring-2 ring-lime-600/15`

### 4.4 Badge

**Status:** `active` = `bg-success-50 text-success-700` | `pending` = `bg-warning-50 text-warning-700` | `closed` = `bg-gray-100 text-gray-600` | `rejected` = `bg-error-50 text-error-700` | `new` = `bg-lime-50 text-lime-800`

**Plan:** `free` = `bg-gray-100 text-gray-600` | `pro` = `bg-lime-50 text-lime-800 ring-1 ring-lime-200`

**Strategy badges:** Use dedicated `StrategyBadge` component with strategy-specific color tokens.

**Base:** `inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold`

### 4.5 Modal (Dialog)

**Overlay:** `bg-gray-950/60 backdrop-blur-[2px]`

**Content:** `border border-gray-200 bg-white p-6 shadow-xl rounded-lg`

**Sizes:** sm = `max-w-sm` | md = `max-w-lg` | lg = `max-w-2xl` | xl = `max-w-4xl`

### 4.6 Table

**Container:** `rounded-lg border border-gray-200 shadow-xs bg-white overflow-hidden`

**Header row:** `bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider`

**Body row:** `border-b border-gray-100 hover:bg-gray-50`

**Financial cells:** `font-sans tabular-nums text-right`

**Selected row:** `bg-lime-50`

### 4.7 Tabs

**Underline (default):**
- List: `flex border-b border-gray-200`
- Trigger: `px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700`
- Active: `text-lime-700` + 2px `bg-lime-700` underline via `::after`

**Pill:**
- List: `inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1`
- Active: `bg-white text-gray-900 shadow-xs`

### 4.8 Toast (Sonner)

White body with 4px colored left border. Position: `bottom-right`.

```
success: border-l-4 border-l-success-500
error:   border-l-4 border-l-error-500
warning: border-l-4 border-l-warning-500
info:    border-l-4 border-l-info-500
```

Title: `text-sm font-medium text-gray-900`. Description: `text-xs text-gray-500`.

### 4.9 Skeleton

**Base:** `rounded bg-gray-100 skeleton-shimmer`

Shimmer: `background-position` animation with `#F2F4F7 -> #EAECF0 -> #F2F4F7`. Falls back to static `#F2F4F7` on `prefers-reduced-motion`.

Minimum display time: 300ms.

### 4.10 Tooltip

**Content:** `bg-gray-900 px-3 py-1.5 text-xs text-white font-medium shadow-md rounded-md`

### 4.11 Progress

**Linear:** Track `bg-gray-100 h-2 rounded-full`. Fill `bg-lime-600 transition-all duration-500`.

**Circular:** SVG ring. Track `stroke-gray-100`. Fill `stroke-lime-600`.

### 4.12 ErrorState (NEW -- Agent 19 fix 5a)

Standard page-level error component:

```
Container: flex flex-col items-center justify-center py-16 gap-4
Icon:      w-12 h-12 rounded-lg bg-error-50 flex items-center justify-center
           AlertTriangle (24px) text-error-500
Title:     text-sm font-medium text-gray-900 "Something went wrong"
Message:   text-xs text-gray-500 max-w-xs text-center
Retry:     Button variant="outline" size="sm" "Try again"
```

### 4.13 Complete State Matrix

| State | Background | Border | Text | Ring |
|-------|-----------|--------|------|------|
| Default | per variant | per variant | per variant | none |
| Hover | lighten/darken 1 step | darken 1 step | darken 1 step | none |
| Focus | unchanged | `border-lime-600` | unchanged | `ring-2 ring-lime-600/40 ring-offset-2` |
| Active | darken 2 steps | unchanged | unchanged | none |
| Disabled | `bg-gray-50` / `opacity-50` | `border-gray-200` | `text-gray-400` | none |
| Selected | `bg-lime-50` | `border-lime-600` | `text-lime-800` | `ring-2 ring-lime-600/15` |
| Error | unchanged | `border-error-500` | `text-error-700` | `ring-2 ring-error-500/15` |

---

## 5. Page Designs

### 5.1 App Shell

```
Sidebar:   240px (w-60), bg-white, border-r border-gray-200, hidden below md:
Topbar:    56px (h-14), bg-white, border-b border-gray-200
Content:   bg-gray-50 (#F9FAFB), overflow-y-auto
           max-w-7xl mx-auto px-4 py-5 md:px-8 md:py-6 lg:px-10
```

**Nav items:** `text-sm text-gray-500` idle. Active: `bg-lime-50 text-gray-900 font-medium`, icon `text-lime-700`. Icons: 18px.

**Logo:** Lime-700 square (28px) with white "P" + "Parcel" wordmark in `text-gray-900 font-semibold`.

**Mobile:** Hamburger in topbar (min 44x44px touch target), opens Sheet drawer from left.

### 5.2 Dashboard

**Layout:** 5 zones stacked vertically, `space-y-6`.

1. **KPI Row:** 4-col grid (lg), 2-col (sm), 1-col (base). Cards: `rounded-lg border border-gray-200 shadow-xs bg-white p-5`. Values: `text-3xl font-semibold text-gray-900 tabular-nums`. Labels: `text-xs font-medium text-gray-500`.
2. **Quick Actions:** Primary `bg-lime-700`, secondary `bg-white border border-gray-200`.
3. **Cash Flow Chart:** White card, 220px desktop / 160px mobile. Olive stroke, 12% opacity gradient fill.
4. **Bottom 2-col:** Recent Deals table (3/5 grid) + Activity Feed (2/5 grid). Stacked on mobile, activity first.
5. **Empty state:** Onboarding checklist with progress bar when `total_deals === 0`.

**All financial numbers:** `font-sans tabular-nums` (NOT `font-mono`).

### 5.3 Deal Analysis (Form)

**Strategy tabs:** Segmented control with `bg-gray-100 p-1 rounded-xl`. Active: `bg-white shadow-sm ring-1 ring-gray-900/5`. Sticky below topbar. Mobile: native Select dropdown.

**Form card:** `rounded-lg border border-gray-200 bg-white p-6 md:p-8 shadow-sm`. 60/40 split with live preview on desktop.

**Section headings:** `text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4`.

**Submit button:** `bg-lime-700 text-white h-12 w-full rounded-lg`. Mobile: sticky bottom bar.

### 5.4 Results Page

**Sections top-to-bottom:**
1. Header: StrategyBadge + address + Share/PDF/Offer Letter buttons
2. Deal Score Banner: Circular SVG score + label pill + summary text
3. KPI Grid: 4 cards, `grid-cols-2 md:grid-cols-4 gap-4`
4. AI Insights: `bg-lime-50 border border-lime-100 rounded-lg p-5`
5. Two-column: Outputs table (60%) + Risk panel (40%)
6. Cash Flow Projection: Chart/table toggle
7. Action Bar: Back, Pipeline, Chat, Save, Delete

### 5.5 Pipeline

**Board:** Horizontal scroll, `gap-5`, columns `min-w-[280px] max-w-[280px]`. Cards sit directly on `bg-gray-50` page -- no column backgrounds.

**Deal card:** `rounded-[10px] border border-gray-200 bg-white py-3.5 px-4`. No shadow at rest. Hover: `border-gray-300 shadow-sm` (CSS only, no Framer Motion -- dnd-kit conflict).

**Column headers:** Sentence case, `text-[13px] font-semibold text-gray-900`. Stage dot + count badge + total value.

**Mobile:** Tabbed stage view (keep existing pattern). Active tab: `bg-lime-700 text-white`.

### 5.6 Portfolio

**KPI row:** 4 cards matching Dashboard pattern. Values: `tabular-nums` (NOT `font-mono`).

**Charts:** Equity trend (AreaChart), allocation (PieChart), strategy breakdown (BarChart). All use Recharts light theme config.

**Table:** Sortable columns. Financial cells right-aligned with `tabular-nums`.

### 5.7 Chat

**Layout:** 280px conversation sidebar (lg+) + chat area. Full-width on mobile.

**Messages:** Full-width rows (not bubbles). User: `bg-white`. Assistant: `bg-gray-50`. Content: `max-w-3xl mx-auto`.

**Input bar:** `border-t border-gray-200 bg-white px-6 py-4`.

**Each message row needs `aria-label`:** "Your message" or "Parcel AI response" (Agent 19 fix 2c).

### 5.8 Documents

**Grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Cards with file type icon, filename, date, AI status.

**Upload zone:** Dashed border `border-gray-300`, hover `border-lime-400 bg-lime-50/30`.

**Detail:** Slide-over panel from right.

### 5.9 Settings

**Tabs:** Underline tabs (desktop), pill tabs (mobile). Tabs: Profile, Billing, Notifications.

**Content:** `max-w-[640px] mx-auto`. White cards with `border border-gray-200 rounded-lg`.

**Inactive tab text:** `text-gray-500` (NOT `text-gray-400` -- Agent 19 fix 2d, WCAG AA compliance).

### 5.10 Pricing

**Must rewrite from dark tokens.** Replace all `text-accent-primary`, `bg-app-elevated`, etc. with light equivalents.

**Cards:** Free (bordered, no shadow) + Pro (elevated, olive gradient top line).

**Free tier:** 5 analyses + 5 AI messages per month.

**Annual pricing:** 20% discount, shown at launch.

**CTA buttons:** `bg-lime-700 text-white`. NOT `bg-lime-600`.

---

## 6. Billing Components

### 6.1 PaywallOverlay

Gradient mask `from-transparent via-white/60 to-white/95` with `backdrop-blur-[6px]` (standardized per Agent 19 fix 8a). Centered upgrade card: `max-w-md bg-white rounded-lg border border-gray-200 shadow-xl p-8`.

CTA: `bg-lime-700 hover:bg-lime-800 text-white rounded-lg`. Lock icon in `bg-lime-50` circle.

### 6.2 FeatureGate

Wrapper: renders children for Pro users, PaywallOverlay for free users. Props: `feature`, `children`, `fallback?`.

### 6.3 TrialBanner

Sidebar footer + dashboard inline. Default: `bg-lime-50 border-lime-100 text-lime-800`. Urgent (3d left): `bg-amber-50 border-amber-200 text-amber-800`. Expired: `bg-error-50 border-error-200 text-error-800` (not dismissible).

**Trial length:** 7-day free trial.

**Dismissal:** 24-hour snooze via sessionStorage. Re-shows when <= 3 days remain (Agent 19 fix 8b).

### 6.4 PlanBadge

Pro: `bg-lime-700 text-white px-2 py-0.5 rounded-md text-[11px] font-semibold`. Free: `bg-gray-100 text-gray-500` + "Upgrade" link.

### 6.5 UsageMeter

Linear progress bar. Normal: `bg-lime-600`. Warning (>=80%): `bg-warning-500`. Exceeded: `bg-error-500`.

### 6.6 LimitReachedModal

Standard modal (md size). Lock icon, heading, description, upgrade CTA button, "Maybe later" link.

### 6.7 BillingSettings

Card layout with current plan info, usage meters, upgrade/downgrade buttons, invoices list.

### 6.8 CancelModal

Danger-styled. Confirmation with `bg-error-600 text-white` destructive button. Retention copy.

---

## 7. Animation System

### 7.1 Timing Tokens (motion.ts)

```ts
export const DURATION = {
  micro:  0.1,   // 100ms -- hover/focus feedback
  fast:   0.15,  // 150ms -- exit animations, tooltips
  normal: 0.2,   // 200ms -- standard enter transitions
  medium: 0.3,   // 300ms -- modals, panels
  slow:   0.5,   // 500ms -- landing page hero only
} as const

export const EASING = {
  snappy: [0.25, 0.1, 0.25, 1] as const,   // enters, reveals
  smooth: [0.4, 0, 0.2, 1] as const,        // page transitions
} as const

export const SPRING = {
  default: { type: 'spring', damping: 25, stiffness: 300 },
  stiff:   { type: 'spring', damping: 30, stiffness: 400 },
  gentle:  { type: 'spring', damping: 20, stiffness: 200 },
} as const
```

### 7.2 Global Variants

```ts
export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
}

export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
}

export function staggerContainer(delayMs = 60): Variants {
  return {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: delayMs / 1000, delayChildren: 0.05 } },
  }
}

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
}
```

### 7.3 Page Transitions

```ts
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } },
}
```

### 7.4 Reduced Motion

```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// On containers:
<motion.div
  variants={prefersReduced ? {} : containerVariants}
  initial={prefersReduced ? false : 'hidden'}
  animate="visible"
>
```

Disable Recharts `isAnimationActive` when `prefersReduced` is true.

### 7.5 Performance Rules

- No Framer Motion `whileHover`/`whileTap` on dnd-kit sortable cards (transform conflict).
- Disable Recharts built-in animation on pages with Framer Motion stagger.
- Cap stagger to 8 items maximum per container.
- Page transition uses `mode="wait"` with 150ms exit + 200ms enter = 350ms total.

---

## 8. Responsive Rules

### 8.1 Breakpoints

| Token | Min-width | Role |
|-------|-----------|------|
| base | 0px | Single column, hamburger nav, card lists, sticky action bars |
| `sm:` | 640px | 2-col KPI grids, inline action buttons |
| `md:` | 768px | **Sidebar appears (240px)**. Tables activate. 2-col forms. |
| `lg:` | 1024px | 4-col KPI grids. Full Kanban. Content: 784px available. |
| `xl:` | 1280px | max-w-7xl centering. Polish only. |

### 8.2 Mobile Navigation

Hamburger + Sheet drawer (keep). Touch target: `min-w-[44px] min-h-[44px]`. No bottom tab bar.

### 8.3 Per-Page Behavior

| Page | base (0-639px) | sm (640-767px) | md (768+) | lg (1024+) |
|------|---------------|----------------|-----------|------------|
| **Dashboard KPIs** | 1-col stack | 2-col grid | 2-col grid | 4-col grid |
| **Dashboard table** | Card list | Card list | Table | Full table |
| **Pipeline** | MobilePipeline (tabs) | MobilePipeline | Kanban DnD | Kanban DnD |
| **Analyzer form** | 1-col, sticky submit | 1-col, sticky submit | 2-col grid, inline submit | 2-col grid |
| **Results KPIs** | 2-col grid | 2-col grid | 2-col grid | 4-col grid |
| **My Deals** | Card list | Card list | Table | Table |
| **Chat** | Full viewport | Full viewport | Full width | Sidebar + chat |
| **Documents** | 1-col cards | 2-col cards | 3-col cards | 3-col cards |
| **Settings** | Pill tabs, stacked cards | Same | Underline tabs, centered cards | Same |

### 8.4 Touch Targets

Minimum 44x44px for all interactive elements on mobile. Specific fixes:
- Hamburger button: `min-w-[44px] min-h-[44px] -ml-2`
- User avatar menu: `min-w-[44px] min-h-[44px]`
- Pipeline card actions: always visible on touch (no hover gate)

### 8.5 Sticky Action Bars (Mobile)

| Page | Content | z-index |
|------|---------|---------|
| Analyzer Form | "Analyze Deal" button, full-width | z-40 |
| Results | "Save Deal" + "Add to Pipeline" | z-40 |
| Settings | "Save Changes" (when dirty) | z-40 |

Bottom padding: `pb-[max(0.75rem,env(safe-area-inset-bottom))]`. Content: `pb-24 md:pb-0`.

---

## 9. Chart Theme

### 9.1 Recharts Config (`lib/chart-theme.ts`)

```ts
export const CHART_SERIES = [
  '#4D7C0F', // Olive/Lime-700 (always first)
  '#F59E0B', // Amber
  '#0EA5E9', // Sky
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#64748B', // Slate (neutral fallback) -- NOTE: only chart exception to no-slate rule
] as const

export const CHART_SEMANTIC = {
  positive: '#0284C7', // Success-600 (sky)
  negative: '#DC2626', // Error-600
  neutral:  '#98A2B3', // Gray-400
} as const

export const CHART_SURFACE = {
  gridLine:      '#EAECF0', // Gray-200 at 50% opacity -> effectively ~#F1F5F9
  axisLine:      '#D0D5DD', // Gray-300
  axisLabel:     '#667085', // Gray-500 (WCAG AA on white: 4.69:1)
  tooltipBg:     '#FFFFFF',
  tooltipBorder: '#EAECF0', // Gray-200
  tooltipText:   '#101828', // Gray-900
  cursorLine:    '#84CC16', // Lime-500 at 15% opacity
} as const
```

### 9.2 Axis Defaults

**X-axis:** Inter 12px, `#667085`, no tick marks, 1px `#D0D5DD` bottom line.

**Y-axis:** Inter 11px (NOT JetBrains Mono -- keeping consistent with Inter everywhere), `#667085`, no axis line, width 64px.

**Grid:** Horizontal only. `strokeDasharray: '3 3'`, `stroke: #EAECF0`, `strokeOpacity: 0.5`. No vertical lines.

### 9.3 Tooltip

```
rounded-lg border border-gray-200 bg-white px-3 py-2.5
shadow-[0_4px_12px_rgba(0,0,0,0.08)]
```

Label: `text-xs font-medium text-gray-500`. Value: `text-sm font-medium text-gray-900 tabular-nums`.

### 9.4 Sparklines (KPI Cards)

Stroke: `#84CC16` (positive/neutral) or `#DC2626` (negative). Width: 1.5px. Fill gradient: 8% opacity top, 0% bottom. No dots, no axes, no grid. `dot={false}`.

### 9.5 Active Dot

`r={4}`, white fill, olive stroke, `strokeWidth={2}`.

---

## 10. PDF Theme

### 10.1 Color Palette (RGB arrays for jsPDF)

```ts
const OLIVE_700:  RGB = [77, 124, 15]      // #4D7C0F -- headings, rules, badges
const GRAY_900:   RGB = [16, 24, 40]       // #101828 -- primary text
const GRAY_700:   RGB = [52, 64, 84]       // #344054 -- body text, table values
const GRAY_500:   RGB = [102, 112, 133]    // #667085 -- labels, metadata
const GRAY_300:   RGB = [208, 213, 221]    // #D0D5DD -- borders, dividers
const GRAY_200:   RGB = [234, 236, 240]    // #EAECF0 -- alternating row fill
const WHITE:      RGB = [255, 255, 255]    // #FFFFFF -- page bg
const SUCCESS_700: RGB = [3, 105, 161]     // #0369A1 -- positive cash flow (sky-700)
const ERROR_700:  RGB = [185, 28, 28]      // #B91C1C -- negative cash flow
```

### 10.2 Header

No dark bar. White page with olive accent:
1. Logo: 8x8mm olive-700 rounded rect with white "P"
2. "PARCEL" text: Helvetica bold 14pt, olive-700
3. Tagline right-aligned: "Real Estate Deal Intelligence" 8pt, gray-500
4. Accent underline: 0.8pt olive-700 line at margin edges

### 10.3 Footer

Top border: 0.3pt gray-300. Left: "Generated by Parcel | {date} | parcel-platform.com" 8pt gray-500. Right: "Page {n} of {total}". Disclaimer: 6pt gray-500.

### 10.4 Table Styling

Header row: gray-100 fill, Helvetica bold 9pt gray-900. Even rows: gray-200 fill. Odd rows: white. Values: Courier bold 9pt gray-700. Labels: Helvetica normal 9pt gray-500.

### 10.5 KPI Cards

Lime-50 background fill. Value: Courier bold 16pt gray-900. Label: Helvetica normal 8pt gray-500.

### 10.6 Strategy Badges

Same color mapping as web badges. Filled rounded rect with contrasting text.

---

## 11. Migration Plan

### Phase 0: Foundation (Day 1, ~4 hours) -- LOW RISK

1. `npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono`
2. Add font imports to `main.tsx`
3. Deploy new `tailwind.config.ts` (uses `extend.fontSize` -- safe, additive)
4. Deploy new CSS variables to `index.css` (KEEP `class="dark"` on `<html>`)
5. Add `font-brand` class for Satoshi
6. Add light-theme skeleton shimmer CSS
7. Remove Google Fonts `<link>` from `index.html`

**Result:** 85% of the token infrastructure is in place. No visual changes yet (dark class still active).

### Phase 1: App Shell (Day 2-3, ~8 hours) -- LOW RISK

1. AppShell.tsx: Sidebar 240px, bg-white, border-r border-gray-200
2. Topbar: bg-white, border-b border-gray-200
3. Nav items: lime-50 active state, gray-500 idle
4. Fix hamburger touch target to 44px
5. Fix user menu avatar touch target
6. Command palette: light theme colors
7. Mobile sidebar Sheet: light theme

### Phase 2: Core Pages (Day 4-8, ~20 hours) -- MEDIUM RISK

**Order matters. Start with highest-traffic pages.**

1. **Dashboard** -- Fix: all `slate-*` -> `gray-*`, card radius -> `rounded-lg`, shadows -> token values, `font-mono` -> `tabular-nums`
2. **Deal Analysis Form** -- Fix: `font-mono` -> `font-sans tabular-nums` on inputs, button -> `bg-lime-700`
3. **Results Page** -- Fix: `font-mono` -> `tabular-nums` on all KPIs/values, card radius consistency
4. **Pipeline** -- Already most detailed spec. Fix: stage colors for light bg, card hover CSS-only
5. **Portfolio** -- Fix: all `slate-*` -> `gray-*`, `font-mono` -> `tabular-nums`
6. **Settings** -- Fix: tab inactive text -> `text-gray-500` (WCAG)

### Phase 3: Secondary Pages (Day 9-11, ~12 hours) -- MEDIUM RISK

1. **Chat** -- Fix: all `slate-*` -> `gray-*`, add `aria-label` per message role
2. **Documents** -- Fix: `slate-*` -> `gray-*`, page bg -> `#F9FAFB`, button -> `bg-lime-700`
3. **My Deals** -- Table + card list light theme
4. **Compare** -- Light table styling
5. **Auth pages** (Login, Register, ForgotPassword, ResetPassword) -- No spec exists; follow component library patterns
6. **Command palette** -- Light theme overlay

### Phase 4: Marketing + Billing (Day 12-14, ~10 hours) -- HIGH RISK

1. **Landing page** -- NO SPEC EXISTS. Convert dark gradients, ticker, DemoCard, pricing section manually
2. **Pricing page** -- Rewrite from dark tokens (`text-accent-primary` etc.) to light equivalents
3. **Billing components** -- PaywallOverlay, FeatureGate, TrialBanner per Section 6
4. **ShareDealPage** -- 35 hardcoded hex values need updating
5. **WelcomeModal** -- Light theme (defer full onboarding checklist)

### Phase 5: Flip the Switch (Day 15, ~2 hours) -- HIGH RISK

1. Remove `class="dark"` from `<html>` in `index.html`
2. Remove `background-color: #08080f` from body in `index.css`
3. Audit all remaining hardcoded hex values (search for `#0`, `#1`, `#2` patterns)
4. Full visual regression across all routes
5. Test on mobile devices (iOS Safari, Android Chrome)

**Total estimated effort: ~56 hours (compresses to ~40h with deferrals)**

---

## 12. Deferred

| Item | Source | Reason | Effort Saved |
|------|--------|--------|-------------|
| Dark mode toggle UI | Agent 01, 18 | No customer demand. Infrastructure ready. | 2h |
| Onboarding checklist | Agent 13 | Ship WelcomeModal only. Add checklist when activation data shows drop-off. | 6h |
| Sidebar collapse animation | Agent 03 | Explicitly deferred in original spec. | 3h |
| Step progress component | Agent 02 | No current page uses it. | 1h |
| Pricing comparison table | Agent 10 | Only 2 plans (Free, Pro). Add when Team ships. | 4h |
| Team badge variant | Agent 02 | No Team plan exists. | 30min |
| `slideRight` variant | Agent 14 | No current usage. | 30min |
| Per-stage risk thresholds | Agent 06 | Flat 14d/30d thresholds sufficient for v1. | 2h |
| Filter state in URL params | Agent 06 | Low priority for initial launch. | 2h |
| Print-friendly CSS | Agent 05 | PDF export covers the print use case. | 1h |
| Bottom tab bar (mobile) | Agent 15 | Hamburger + command palette sufficient. Revisit at 30%+ mobile usage. | 4h |
| Landscape phone layout | Agent 19 | No spec. Edge case. | 1h |

---

## 13. Open Questions

These require Ivan's input before implementation.

| # | Question | Context | Default if no answer |
|---|----------|---------|---------------------|
| 1 | **Landing page light theme:** Write a spec or convert manually? | No design spec exists for Landing.tsx (700+ lines, dark gradients). Manual conversion is ~8h. | Convert manually, matching app shell tokens. |
| 2 | **Auth pages (Login, Register):** Centered card on gray-50 bg, or full marketing-style page? | No spec exists. These are first-touch pages. | Centered white card on gray-50, lime-700 submit button. |
| 3 | **Time range filtering on Dashboard:** This needs a backend `range` param on `GET /api/dashboard/stats`. Ready to add? | Agent 04 specifies 1M/3M/6M/1Y toggle that filters KPIs + chart. | Ship with 6M hardcoded. Add param when ready. |
| 4 | **JetBrains Mono budget:** Keep 110KB for code-only usage, or drop to system monospace? | Agent 19 suggests subsetting to ~15KB. Dropping saves 95KB. | Keep full JetBrains Mono via fontsource (developer-facing polish). |
| 5 | **Pipeline ARIA pattern:** Agent 19 says `role="grid"` is incorrect. Switch to `role="list"` + `role="listitem"`? | Current code uses `role="grid"`. dnd-kit has its own ARIA. | Switch to `role="list"` pattern. |
| 6 | **AnimatePresence `mode="wait"` performance:** 400ms per navigation is noticeable. Switch to `mode="popLayout"` or remove exit animations? | Agent 19 identifies this as a performance concern. | Keep `mode="wait"` with reduced exit (150ms). Monitor feedback. |
| 7 | **Chart Y-axis font:** Agent 16 uses JetBrains Mono for Y-axis financial values. This document standardizes on Inter everywhere. Which to use? | Y-axis shows values like `$12K`. Inter tabular-nums handles this fine. | Inter `tabular-nums` for consistency. |

---

## Appendix: Font Loading

### Install

```bash
cd frontend
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

### Import (main.tsx)

```ts
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
```

### Font-face (index.css, keep existing)

```css
@font-face {
  font-family: 'Satoshi';
  font-style: normal;
  font-weight: 300 900;
  font-display: swap;
  src: url('/fonts/Satoshi-Variable.woff2') format('woff2-variations');
}
```

### Remove from index.html

Delete the Google Fonts `<link>` tag for JetBrains Mono.

### Budget

| Font | Source | Size |
|------|--------|------|
| Inter Variable | @fontsource | ~95KB |
| Satoshi Variable | self-hosted | ~45KB |
| JetBrains Mono Variable | @fontsource | ~110KB |
| **Total** | | **~250KB** |
