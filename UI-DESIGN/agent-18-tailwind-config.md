# Tailwind Config & Font Setup: Drop-In Implementation

**Date:** 2026-03-30
**Scope:** Complete `tailwind.config.ts`, font loading, CSS variables, plugins, migration notes
**Files touched:** `tailwind.config.ts` (new), `index.css`, `index.html`, `postcss.config.js`, `vite.config.ts`, `public/fonts/`

---

## 1. Install Commands

Run from `frontend/`:

```bash
# Fonts — self-hosted via Fontsource (bundled into Vite build, no external requests)
npm install @fontsource-variable/inter
npm install @fontsource-variable/jetbrains-mono

# Tailwind plugins (tailwindcss-animate already installed)
# No new plugins needed — current setup is sufficient

# TypeScript config support (Tailwind 3.x reads .ts natively via ts-node)
# Already works with Vite — no additional deps needed
```

**Why Fontsource over self-hosted woff2 files:**
- npm-managed versioning (update font = bump package)
- Automatic unicode-range subsetting per language
- Bundled into Vite output (hashed filenames, CDN-cacheable)
- Zero `public/fonts/` management
- Tree-shakes unused unicode ranges in production

**Why NOT Google Fonts:**
- Eliminates 2 DNS lookups (`fonts.googleapis.com` + `fonts.gstatic.com`)
- Eliminates render-blocking CSS fetch
- Removes third-party dependency from critical rendering path
- Saves 100-200ms on first paint

---

## 2. Complete `tailwind.config.ts` (Drop-In Replacement)

Delete `tailwind.config.js`. Create `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    // ----------------------------------------------------------------
    // FONT SIZE: Data-dense scale (13px base, matches Mercury/Linear)
    // These REPLACE Tailwind defaults — intentionally. The default
    // 16px base is too large for data-heavy financial interfaces.
    // ----------------------------------------------------------------
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
      '5xl':   ['48px', { lineHeight: '52px', letterSpacing: '-0.025em' }],
      'kpi':   ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
    },

    extend: {
      // ----------------------------------------------------------------
      // COLORS: CSS-variable-driven semantic tokens
      // Light-first (:root), dark override (.dark class)
      // Token NAMES match existing codebase — only VALUES change
      // ----------------------------------------------------------------
      colors: {
        // --- App backgrounds (727 usages — propagate instantly) ---
        'app-bg':       'var(--app-bg)',
        'app-surface':  'var(--app-surface)',
        'app-elevated': 'var(--app-elevated)',
        'app-overlay':  'var(--app-overlay)',

        // --- Borders ---
        'border-subtle':  'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong':  'var(--border-strong)',

        // --- Accent ---
        'accent-primary':   'var(--accent-primary)',
        'accent-hover':     'var(--accent-hover)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success':   'var(--accent-success)',
        'accent-warning':   'var(--accent-warning)',
        'accent-danger':    'var(--accent-danger)',
        'accent-info':      'var(--accent-info)',

        // --- Text ---
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'text-disabled':  'var(--text-disabled)',

        // --- Strategy badge colors ---
        'strategy-wholesale': {
          bg:   'var(--strategy-wholesale-bg)',
          text: 'var(--strategy-wholesale-text)',
        },
        'strategy-creative': {
          bg:   'var(--strategy-creative-bg)',
          text: 'var(--strategy-creative-text)',
        },
        'strategy-brrrr': {
          bg:   'var(--strategy-brrrr-bg)',
          text: 'var(--strategy-brrrr-text)',
        },
        'strategy-buyhold': {
          bg:   'var(--strategy-buyhold-bg)',
          text: 'var(--strategy-buyhold-text)',
        },
        'strategy-flip': {
          bg:   'var(--strategy-flip-bg)',
          text: 'var(--strategy-flip-text)',
        },

        // --- Neutral gray scale (direct hex, not themed) ---
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

        // --- shadcn/ui tokens (HSL-based, unchanged names) ---
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      // ----------------------------------------------------------------
      // FONT FAMILY
      // sans: Inter (body, UI, data)
      // brand: Satoshi (landing page headings, marketing)
      // mono: JetBrains Mono (code, AI output)
      // ----------------------------------------------------------------
      fontFamily: {
        sans:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        brand: ['"Satoshi"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      // ----------------------------------------------------------------
      // BORDER RADIUS
      // sm=4px inputs, DEFAULT=6px small buttons, md=8px buttons,
      // lg=12px cards (modern, bigger than Stripe's 8px)
      // ----------------------------------------------------------------
      borderRadius: {
        sm:      '4px',
        DEFAULT: '6px',
        md:      '8px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        // shadcn fallback — keep var(--radius) for components that use it
        'shadcn':    'var(--radius)',
        'shadcn-md': 'calc(var(--radius) - 2px)',
        'shadcn-sm': 'calc(var(--radius) - 4px)',
      },

      // ----------------------------------------------------------------
      // SHADOWS: Cool-undertone, Stripe-style (border + shadow)
      // ----------------------------------------------------------------
      boxShadow: {
        'xs':    '0 1px 2px rgba(16,24,40,0.05)',
        'sm':    '0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)',
        'md':    '0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06)',
        'lg':    '0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)',
        'xl':    '0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)',
        'focus': '0 0 0 2px #FFFFFF, 0 0 0 4px #6366F1',
        // Dark-mode shadows (used when .dark is active)
        'dark-xs': '0 1px 2px rgba(0,0,0,0.3)',
        'dark-sm': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'dark-md': '0 4px 8px -2px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
      },

      // ----------------------------------------------------------------
      // KEYFRAMES + ANIMATIONS (preserved from current config)
      // ----------------------------------------------------------------
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
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
}

export default config
```

---

## 3. Font Imports in `main.tsx`

Add these two lines at the top of `src/main.tsx`, **before** any CSS imports:

```tsx
// Fonts — self-hosted via Fontsource (bundled into Vite build)
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';

// Then existing imports...
import './index.css'
// ...
```

**What this does:** Fontsource injects `@font-face` rules for Inter Variable (100-900 weight, ~95KB woff2) and JetBrains Mono Variable (100-800 weight, ~115KB woff2) directly into the build. No external network requests.

---

## 4. CSS Variables: Complete `index.css` Replacement

```css
/* ================================================================
   PARCEL DESIGN SYSTEM — CSS Variables + Tailwind Base
   ================================================================
   Token architecture:
   - :root         = light theme (new default)
   - .dark         = dark theme (current look, preserved)
   - shadcn tokens = HSL components (no hsl() wrapper)
   - app tokens    = hex values via var()
   ================================================================ */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ----------------------------------------------------------------
   FONT FACES
   Inter + JetBrains Mono loaded via Fontsource (see main.tsx)
   Satoshi kept self-hosted for landing page brand headings
   ---------------------------------------------------------------- */
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
}

/* ----------------------------------------------------------------
   LIGHT THEME (default)
   ---------------------------------------------------------------- */
@layer base {
  :root {
    /* ---- App Backgrounds ---- */
    --app-bg:       #F9FAFB;    /* gray-50: page background */
    --app-surface:  #FFFFFF;    /* white: cards, panels */
    --app-elevated: #FFFFFF;    /* white: modals, popovers (shadow distinguishes) */
    --app-overlay:  #F2F4F7;    /* gray-100: secondary surfaces, sidebar */

    /* ---- Borders ---- */
    --border-subtle:  #EAECF0;  /* gray-200: card borders, dividers */
    --border-default: #D0D5DD;  /* gray-300: input borders */
    --border-strong:  #98A2B3;  /* gray-400: emphasized dividers */

    /* ---- Accent ---- */
    --accent-primary:   #6366F1;  /* indigo-500 (brand, unchanged) */
    --accent-hover:     #4F46E5;  /* indigo-600 */
    --accent-secondary: #8B5CF6;  /* violet-500 */
    --accent-success:   #10B981;  /* emerald-500 */
    --accent-warning:   #F59E0B;  /* amber-500 */
    --accent-danger:    #EF4444;  /* red-500 */
    --accent-info:      #3B82F6;  /* blue-500 */

    /* ---- Text ---- */
    --text-primary:   #1D2939;  /* gray-800: headings, primary text */
    --text-secondary: #475467;  /* gray-600: body secondary */
    --text-muted:     #98A2B3;  /* gray-400: placeholder, muted */
    --text-disabled:  #D0D5DD;  /* gray-300: disabled state */

    /* ---- Strategy Badges (pastel bg, dark text for light theme) ---- */
    --strategy-wholesale-bg:   #FEF3C7;  /* amber-100 */
    --strategy-wholesale-text: #92400E;  /* amber-800 */
    --strategy-creative-bg:    #EDE9FE;  /* violet-100 */
    --strategy-creative-text:  #5B21B6;  /* violet-800 */
    --strategy-brrrr-bg:       #DBEAFE;  /* blue-100 */
    --strategy-brrrr-text:     #1E40AF;  /* blue-800 */
    --strategy-buyhold-bg:     #D1FAE5;  /* emerald-100 */
    --strategy-buyhold-text:   #065F46;  /* emerald-800 */
    --strategy-flip-bg:        #FEE2E2;  /* red-100 */
    --strategy-flip-text:      #991B1B;  /* red-800 */

    /* ---- shadcn/ui tokens (HSL components, light) ---- */
    --background:           210 20% 98%;        /* #F9FAFB */
    --foreground:           220 26% 14%;        /* #1D2939 */

    --card:                 0 0% 100%;          /* #FFFFFF */
    --card-foreground:      220 26% 14%;        /* #1D2939 */

    --popover:              0 0% 100%;          /* #FFFFFF */
    --popover-foreground:   220 26% 14%;        /* #1D2939 */

    --primary:              239 84% 67%;        /* #6366F1 */
    --primary-foreground:   0 0% 100%;          /* #FFFFFF */

    --secondary:            220 14% 96%;        /* #F2F4F7 */
    --secondary-foreground: 220 26% 14%;        /* #1D2939 */

    --muted:                220 14% 96%;        /* #F2F4F7 */
    --muted-foreground:     220 9% 46%;         /* #667085 → gray-500 */

    --accent:               220 14% 96%;        /* #F2F4F7 */
    --accent-foreground:    220 26% 14%;        /* #1D2939 */

    --destructive:          0 84% 60%;          /* #EF4444 */
    --destructive-foreground: 0 0% 100%;        /* #FFFFFF */

    --border:               220 13% 91%;        /* #EAECF0 */
    --input:                218 11% 82%;        /* #D0D5DD */
    --ring:                 239 84% 67%;        /* #6366F1 */

    --radius: 0.5rem;

    /* ---- Shadows (full values, not HSL) ---- */
    --shadow-xs: 0 1px 2px rgba(16,24,40,0.05);
    --shadow-sm: 0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06);
    --shadow-md: 0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06);
  }

  /* ----------------------------------------------------------------
     DARK THEME (preserves current look — activated via .dark on <html>)
     ---------------------------------------------------------------- */
  .dark {
    /* ---- App Backgrounds ---- */
    --app-bg:       #08080F;
    --app-surface:  #0F0F1A;
    --app-elevated: #16162A;
    --app-overlay:  #1C1C30;

    /* ---- Borders ---- */
    --border-subtle:  #1A1A2E;
    --border-default: #252540;
    --border-strong:  #303055;

    /* ---- Accent (unchanged — indigo works in both themes) ---- */
    --accent-primary:   #6366F1;
    --accent-hover:     #4F46E5;
    --accent-secondary: #8B5CF6;
    --accent-success:   #10B981;
    --accent-warning:   #F59E0B;
    --accent-danger:    #EF4444;
    --accent-info:      #3B82F6;

    /* ---- Text ---- */
    --text-primary:   #F1F5F9;
    --text-secondary: #94A3B8;
    --text-muted:     #475569;
    --text-disabled:  #334155;

    /* ---- Strategy Badges (dark bg, bright text — current look) ---- */
    --strategy-wholesale-bg:   #451A03;
    --strategy-wholesale-text: #FCD34D;
    --strategy-creative-bg:    #2E1065;
    --strategy-creative-text:  #C4B5FD;
    --strategy-brrrr-bg:       #0C1A4A;
    --strategy-brrrr-text:     #93C5FD;
    --strategy-buyhold-bg:     #064E3B;
    --strategy-buyhold-text:   #6EE7B7;
    --strategy-flip-bg:        #431407;
    --strategy-flip-text:      #FCA5A1;

    /* ---- shadcn/ui tokens (dark) ---- */
    --background:           240 50% 4%;
    --foreground:           0 0% 98%;

    --card:                 240 43% 8%;
    --card-foreground:      0 0% 98%;

    --popover:              240 43% 8%;
    --popover-foreground:   0 0% 98%;

    --primary:              239 84% 67%;
    --primary-foreground:   240 50% 4%;

    --secondary:            240 30% 12%;
    --secondary-foreground: 0 0% 98%;

    --muted:                240 30% 12%;
    --muted-foreground:     240 5% 60%;

    --accent:               240 30% 16%;
    --accent-foreground:    0 0% 98%;

    --destructive:          0 63% 31%;
    --destructive-foreground: 0 0% 98%;

    --border:               240 30% 14%;
    --input:                240 30% 12%;
    --ring:                 239 84% 67%;

    --radius: 0.5rem;

    /* ---- Shadows (dark — lighter/more transparent) ---- */
    --shadow-xs: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 8px -2px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
  }
}

/* ----------------------------------------------------------------
   BASE STYLES
   ---------------------------------------------------------------- */
@layer base {
  html {
    scroll-behavior: smooth;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    /* cv02: alt a, cv03: alt g, cv04: alt i, cv11: single-story a —
       these Inter OpenType features improve readability at small sizes */
  }

  /* Financial numbers: tabular-nums on body font (Inter), NOT mono
     Keeps font-mono for JetBrains Mono on code/AI output only */
  [data-financial],
  .financial {
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 500;
  }

  /* App shell density: 13px base, 500 weight for UI elements */
  .app-shell {
    font-size: 13px;
    line-height: 20px;
    font-weight: 500;
  }

  /* Long-form content: chat messages, descriptions, notes */
  .prose-content {
    font-size: 14px;
    line-height: 22px;
    font-weight: 400;
  }
}

/* ----------------------------------------------------------------
   UTILITY CLASSES
   ---------------------------------------------------------------- */
@layer utilities {
  /* Uppercase labels with proper tracking */
  .label-caps {
    font-size: 11px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* KPI hero numbers (large financial display) */
  .text-kpi-display {
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
}

/* ----------------------------------------------------------------
   GRADIENT BLOB DRIFT ANIMATIONS (landing page)
   ---------------------------------------------------------------- */
@keyframes drift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(80px, -60px) scale(1.1); }
  66%       { transform: translate(-40px, 40px) scale(0.95); }
}

@keyframes drift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(-60px, 80px) scale(1.05); }
  66%       { transform: translate(60px, -30px) scale(1.1); }
}

@keyframes drift3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(40px, 60px) scale(0.9); }
}

.blob-1 { animation: drift1 15s ease-in-out infinite; }
.blob-2 { animation: drift2 12s ease-in-out infinite; }
.blob-3 { animation: drift3 18s ease-in-out infinite; }

/* ----------------------------------------------------------------
   LIVE DEAL TICKER
   ---------------------------------------------------------------- */
@keyframes ticker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.ticker-animate {
  animation: ticker 40s linear infinite;
  will-change: transform;
}

.ticker-animate:hover {
  animation-play-state: paused;
}

/* ----------------------------------------------------------------
   SKELETON SHIMMER (neutral gray for light, indigo-tinted for dark)
   ---------------------------------------------------------------- */
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted) / 0.6) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

/* ----------------------------------------------------------------
   TYPING INDICATOR
   ---------------------------------------------------------------- */
@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}

/* ----------------------------------------------------------------
   REDUCED MOTION
   ---------------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .blob-1, .blob-2, .blob-3 { animation: none; }
  .ticker-animate { animation: none; }
  .skeleton-shimmer { animation: none; }
}
```

---

## 5. Updated `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Parcel — Real Estate Intelligence Platform</title>
    <meta
      name="description"
      content="Deal analysis, document processing, pipeline management, and AI-powered insights for real estate professionals."
    />
    <meta property="og:title" content="Parcel — AI-Powered Real Estate Deal Analysis Platform" />
    <meta property="og:description" content="Full-stack SaaS platform with 5 investment strategy calculators, Claude AI integration, and Kanban deal pipeline. Built with React, TypeScript, FastAPI, and PostgreSQL." />
    <meta property="og:image" content="https://www.parceldesk.io/og-preview.png" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.parceldesk.io" />
    <meta name="twitter:card" content="summary_large_image" />
    <!-- Satoshi: self-hosted for landing page brand headings -->
    <link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Changes from current:**
- Removed `class="dark"` from `<html>` (light is now default; dark toggleable via JS)
- Removed Google Fonts `<link>` for JetBrains Mono (now via Fontsource)
- Removed preload for `Satoshi-VariableItalic.woff2` (italic rarely used, let it load on demand)
- Kept Satoshi preload (still used for landing page `font-brand` headings)

---

## 6. PostCSS Config (No Changes Needed)

Current `postcss.config.js` is correct as-is:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

No changes required. Tailwind 3.x + autoprefixer is the correct minimal setup.

---

## 7. Vite Config (No Changes Needed)

Current `vite.config.ts` is correct as-is. Fontsource fonts import via `main.tsx` and Vite bundles them automatically. No Vite plugin changes needed.

---

## 8. Tailwind Plugins

**Already installed:** `tailwindcss-animate` (provides `animate-*` utilities used by shadcn/ui).

**NOT adding:**
- `@tailwindcss/typography` -- Parcel uses custom prose styling, not `@tailwindcss/typography` prose classes. Adding it would conflict with existing styles.
- `@tailwindcss/forms` -- shadcn/ui handles all form styling via Radix primitives. Adding this plugin would fight with shadcn.
- `@tailwindcss/container-queries` -- not needed yet. Can add later if responsive container queries are needed.

---

## 9. Migration Notes: What Breaks

### BREAKING: Things that need immediate attention

**1. `class="dark"` removal from `<html>`**
The current `index.html` has `class="dark"` hardcoded. Removing it switches the entire app to light theme instantly. All 727 semantic token usages will pick up the new `:root` (light) values.

*Action:* To keep dark mode during migration, leave `class="dark"` on `<html>` temporarily. The `.dark` block in CSS preserves all current hex values exactly. Remove `class="dark"` only when ready to flip to light.

**2. `fontSize` override replaces Tailwind defaults**
The new config puts `fontSize` at the top level (not inside `extend`), which **replaces** the default Tailwind scale entirely. This means:
- `text-base` is now `13px` (was `16px`)
- `text-sm` is now `12px` (was `14px`)
- `text-xs` is now `11px` (was `12px`)
- `text-lg` is now `16px` (was `18px`)
- New sizes added: `text-md` (14px), `text-micro` (10px), `text-kpi` (32px)
- `text-5xl` through `text-9xl` are GONE (only `text-5xl` at 48px is kept)

*Action:* Audit all `text-*` usages. Most will look correct at smaller sizes (the app was already dense). Landing page may need `text-4xl`/`text-5xl` bumps.

**3. `borderRadius` override**
The `borderRadius` in `extend` adds new fixed values alongside shadcn's `var(--radius)` references. The old `lg`, `md`, `sm` keys that used `var(--radius)` calculations are renamed to `shadcn`, `shadcn-md`, `shadcn-sm`.

*Action:* shadcn components (button, input, dialog, etc.) use `rounded-lg`, `rounded-md`, `rounded-sm` classes. These now resolve to fixed px values (12px, 8px, 4px) instead of `var(--radius)` calculations. Visually, `var(--radius)` was `0.5rem` = 8px, so `rounded-lg` changes from 8px to 12px, `rounded-md` stays 8px (was `calc(0.5rem - 2px)` = 6px, now 8px), `rounded-sm` changes from 4px to 4px (no change). Net effect: cards get slightly rounder, buttons get slightly rounder. This is intentional.

**4. `font-sans` is now Inter (was Satoshi)**
Every element using the default `font-sans` or inheriting from `body` will render in Inter instead of Satoshi.

*Action:* Add `font-brand` class to Landing.tsx headings where Satoshi's personality is desired:
```tsx
<h1 className="font-brand text-4xl font-bold">...</h1>
```

**5. Google Fonts `<link>` removed**
JetBrains Mono is now loaded via Fontsource. If the Fontsource import is missing from `main.tsx`, JetBrains Mono will fall back to Fira Code or system monospace.

*Action:* Ensure `import '@fontsource-variable/jetbrains-mono'` is in `main.tsx` before deploying.

**6. `body` no longer has `background-color: #08080F`**
The inline hex override on `body` in the current CSS is removed. Background now comes from the `--background` CSS variable via `@apply bg-background`.

*Action:* None if `.dark` class is on `<html>` (dark `--background` resolves to the same value). If switching to light, verify no component relies on the hardcoded `#08080F`.

**7. `font-feature-settings` added to body**
Inter's `cv02`, `cv03`, `cv04`, `cv11` stylistic sets are enabled globally. These change the appearance of lowercase `a`, `g`, `i`, and `l` to more distinctive forms. This improves readability but changes the visual appearance of all body text.

*Action:* Review and adjust if the alternate letterforms feel wrong. Remove the `font-feature-settings` line if undesired.

### NON-BREAKING: Things that work automatically

- All `bg-app-bg`, `text-primary`, `accent-primary`, etc. classes continue to work (same names, now CSS-variable-backed)
- All `strategy-wholesale-bg`, `strategy-creative-text`, etc. continue to work
- All shadcn/ui components continue to work (same HSL variable names)
- All animations (`animate-shimmer`, `animate-drift1`, `.blob-1`, `.ticker-animate`) preserved
- `font-mono` continues to map to JetBrains Mono
- `tabular-nums` Tailwind utility continues to work
- `.financial` and `[data-financial]` selectors still work (now using Inter + tabular-nums instead of JetBrains Mono)

### NOT IN SCOPE (separate migration tasks)

- 209 hardcoded hex values across 28 files (Phase 3 cleanup)
- Recharts color props in `CashFlowProjection.tsx`, `ComparisonRadar.tsx`, `PortfolioPage.tsx`
- `pdf-report.ts` hex colors (577 lines)
- `ChatPage.tsx` markdown component styles (34 hex occurrences)
- `ShareDealPage.tsx` standalone styles (35 hex occurrences)

---

## 10. File Diff Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `tailwind.config.ts` | CREATE (replaces .js) | ~210 lines |
| `tailwind.config.js` | DELETE | -162 lines |
| `src/index.css` | REPLACE | ~230 lines (was 149) |
| `src/main.tsx` | ADD 2 lines | +2 lines (font imports) |
| `index.html` | EDIT | -6 lines (remove Google Fonts, dark class) |
| `package.json` | ADD 2 deps | +2 deps |

**Total footprint:** 2 new npm packages (~210KB combined woff2), ~230 lines of CSS, ~210 lines of config. Zero component file changes.

---

## CRITICAL DECISIONS

1. **`fontSize` is a full replacement, not `extend`.** This is intentional. The data-dense scale (13px base) is incompatible with Tailwind's default 16px scale. Mixing both would create confusion. Every `text-*` class now maps to the research-backed size from agent-03-typography. If a size is missing during migration, add it explicitly rather than falling back to Tailwind defaults.

2. **Colors are now CSS-variable-backed, not hardcoded hex.** The tailwind config references `var(--app-bg)` instead of `#08080F`. This means the value is resolved at runtime, not build time. Tailwind's JIT compiler treats `var()` as an opaque string -- it cannot generate opacity modifiers like `bg-app-bg/50`. If you need alpha variants, use `rgba(var(--app-bg-rgb), 0.5)` with an additional RGB variable, or use Tailwind's arbitrary value syntax: `bg-[rgba(var(--app-bg-rgb),0.5)]`. This is the tradeoff for runtime theme switching.

3. **`font-sans` is Inter, `font-brand` is Satoshi.** The entire app shell renders in Inter. Satoshi is demoted to landing page headings only (`font-brand`). This is a visible change. Every heading, button, label, and body text will look different. Inter is narrower, taller x-height, and has native tabular figures. The change improves data density and legibility at small sizes (11-13px), which is where most app text lives.

4. **`.financial` no longer switches to JetBrains Mono.** Financial numbers now use Inter with `tabular-nums lining-nums` and `font-weight: 500`. This is ~30% narrower than JetBrains Mono for the same numbers, improving data density in tables. JetBrains Mono is reserved for `font-mono` usages (code blocks, AI chat output). The 149 `font-mono` usages across 40 files need auditing: keep `font-mono` on code/AI elements, remove it from financial data elements.

5. **Light theme is the new default, dark is preserved.** The `:root` block defines a complete light theme. The `.dark` block preserves every current hex value exactly. During migration, keep `class="dark"` on `<html>` to maintain the current look. Remove it when ready to flip. Both themes share the same token names, so zero component changes are needed for the switch.

6. **`borderRadius` uses fixed px values.** The shadcn convention of `var(--radius)` with calc offsets is replaced by explicit `4px / 6px / 8px / 12px / 16px / 20px`. This is clearer, more predictable, and matches the radius scale from the design system research. The `--radius: 0.5rem` variable is kept for any shadcn components that reference it internally, but Tailwind's `rounded-*` classes now resolve to the fixed values.

7. **No Tailwind 4 migration yet.** The codebase is on Tailwind 3.4.17. Tailwind 4 uses a different config format (CSS-based, no JS config). This config is written for Tailwind 3.x. When migrating to Tailwind 4, the `tailwind.config.ts` will be converted to `@theme` blocks in CSS. That is a separate task.

8. **Skeleton shimmer is now theme-aware.** Instead of hardcoded `rgba(99, 102, 241, 0.05)` (indigo-tinted), the shimmer gradient uses `hsl(var(--muted))` which resolves to gray in light mode and the current muted color in dark mode. This prevents an indigo shimmer on a white background.
