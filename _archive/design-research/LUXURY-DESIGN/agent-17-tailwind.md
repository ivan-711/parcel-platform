# Agent 17 — Complete Tailwind Config & Font Setup (Luxury Dark Redesign)

> Drop-in replacement config for Parcel's transition from the current light/cold-dark theme
> to the warm-dark luxury system defined by Agents 02, 03, and 04.
> Stack: Tailwind CSS v3.4 + React 18 + Vite + TypeScript.

---

## 1. Complete `tailwind.config.ts`

Replace `/frontend/tailwind.config.ts` entirely with this file.

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    // ================================================================
    // COLORS — fully custom, NO Tailwind default Slate/Gray/Zinc
    // Warm gray 12-step, violet 8-step, semantic, financial
    // ================================================================
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      // ── Warm Gray Scale (12-step, warm undertone R > B by 2-6pts) ──
      gray: {
        0:   '#0C0B0A',  // bg-base — page background, root canvas
        1:   '#131210',  // bg-subtle — recessed areas, sidebar bg
        2:   '#1A1916',  // bg-surface — cards, panels, modal bg
        3:   '#22211D',  // bg-elevated — dropdowns, popovers, tooltips
        4:   '#2A2924',  // bg-overlay — hover states on surfaces
        5:   '#33322C',  // border-subtle — subtle dividers, row separators
        6:   '#3A3835',  // border-default — input outlines
        7:   '#4A4844',  // border-strong — focus rings (non-accent)
        8:   '#5C5A56',  // text-disabled — placeholder text
        9:   '#7A7872',  // text-muted — timestamps, captions
        10:  '#A09D98',  // text-secondary — descriptions, subtitles
        11:  '#F0EDE8',  // text-primary — headings, body copy
      },

      // ── Violet Accent Scale (8-step + light-mode extras) ──
      violet: {
        50:  '#F5F3FF',  // light-mode bg (if needed)
        100: '#EDEAFF',  // tinted pill bg in light contexts
        200: '#C4BEFF',  // tags, subtle highlights on dark
        300: '#A89FFF',  // secondary buttons, active nav
        400: '#8B7AFF',  // PRIMARY accent — buttons, links, focus rings
        500: '#7B6AEF',  // hover state for primary buttons
        600: '#6B5AD6',  // active/pressed state
        700: '#5A49BD',  // dark accent, high-contrast
        800: '#4A3AA3',  // dark-mode accent borders
        900: '#3A2A8A',  // very dark accent (rare)
      },

      // ── Semantic Colors (desaturated for dark bg, no neon) ──
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

      // ── Financial Colors (profit/loss, colorblind-safe) ──
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

      // ── CSS-variable-driven semantic tokens (theme switching) ──
      'app-bg':       'var(--app-bg)',
      'app-surface':  'var(--app-surface)',
      'app-elevated': 'var(--app-elevated)',
      'app-overlay':  'var(--app-overlay)',

      'border-subtle':  'var(--border-subtle)',
      'border-default': 'var(--border-default)',
      'border-strong':  'var(--border-strong)',

      'accent-primary':   'var(--accent-primary)',
      'accent-hover':     'var(--accent-hover)',
      'accent-secondary': 'var(--accent-secondary)',
      'accent-success':   'var(--accent-success)',
      'accent-warning':   'var(--accent-warning)',
      'accent-danger':    'var(--accent-danger)',
      'accent-info':      'var(--accent-info)',

      'text-primary':   'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted':     'var(--text-muted)',
      'text-disabled':  'var(--text-disabled)',

      // ── Strategy badge colors (CSS-variable-driven) ──
      'strategy-wholesale': { bg: 'var(--strategy-wholesale-bg)', text: 'var(--strategy-wholesale-text)' },
      'strategy-creative':  { bg: 'var(--strategy-creative-bg)',  text: 'var(--strategy-creative-text)' },
      'strategy-brrrr':     { bg: 'var(--strategy-brrrr-bg)',     text: 'var(--strategy-brrrr-text)' },
      'strategy-buyhold':   { bg: 'var(--strategy-buyhold-bg)',   text: 'var(--strategy-buyhold-text)' },
      'strategy-flip':      { bg: 'var(--strategy-flip-bg)',      text: 'var(--strategy-flip-text)' },

      // ── shadcn/ui tokens (HSL-based, keep for component compat) ──
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

    // ================================================================
    // FONT SIZE — luxury dark scale with default weight/tracking
    // Large sizes: thin weight + tight tracking (luxury signal)
    // Small sizes: medium weight + neutral/positive tracking (legibility)
    // ================================================================
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

    // ================================================================
    // FONT FAMILY
    // brand: Satoshi — headings, KPIs, display numbers
    // sans/body: Inter — body text, UI chrome, data, financial
    // mono: JetBrains Mono — code blocks, AI chat output
    // ================================================================
    fontFamily: {
      brand: ['"Satoshi"', '"Satoshi Fallback"', 'system-ui', 'sans-serif'],
      sans:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      body:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
    },

    // ================================================================
    // BORDER RADIUS — same scale as current, proven to work
    // ================================================================
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

    // ================================================================
    // BOX SHADOW — dark glow tokens (warm undertone, not cool-blue)
    // Uses black + slight warm offset for natural dark-on-dark depth
    // ================================================================
    boxShadow: {
      'none':    'none',
      'xs':      '0 1px 2px rgba(0, 0, 0, 0.3)',
      'sm':      '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
      'md':      '0 4px 8px -2px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
      'lg':      '0 12px 16px -4px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      'xl':      '0 20px 24px -4px rgba(0, 0, 0, 0.5), 0 8px 8px -4px rgba(0, 0, 0, 0.3)',
      '2xl':     '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
      // Card hover: soft lift shadow
      'card-hover': '0 4px 24px -4px rgba(0, 0, 0, 0.4)',
      // Glow: violet accent for featured elements
      'glow-violet':  '0 0 20px -5px rgba(139, 122, 255, 0.15)',
      'glow-success': '0 0 20px -5px rgba(109, 190, 163, 0.12)',
      'glow-error':   '0 0 20px -5px rgba(212, 118, 106, 0.12)',
      // Focus rings
      'focus-violet': '0 0 0 2px #0C0B0A, 0 0 0 4px rgba(139, 122, 255, 0.5)',
      // Inset for recessed inputs
      'inset-sm':  'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
      'inset-md':  'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
      // Edge highlight (simpler alternative to ::after)
      'edge-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },

    // ================================================================
    // BACKDROP BLUR — used for glass overlays (command palette, modals)
    // ================================================================
    backdropBlur: {
      none:  '0',
      sm:    '4px',
      DEFAULT: '8px',
      md:    '12px',
      lg:    '16px',
      xl:    '20px',
      '2xl': '24px',
      '3xl': '40px',
    },

    extend: {
      // ── Letter Spacing (dark-optimized negative tracking) ──
      letterSpacing: {
        'display':  '-0.035em',
        'heading':  '-0.025em',
        'tight':    '-0.015em',
        'body':     '-0.006em',
        'normal':   '0em',
        'caps':     '0.04em',
      },

      // ── Backdrop Saturate (for glass) ──
      backdropSaturate: {
        '180': '1.8',
      },

      // ── Opacity layers (depth system) ──
      backgroundColor: {
        'layer-1': 'rgba(255, 255, 255, 0.02)',
        'layer-2': 'rgba(255, 255, 255, 0.04)',
        'layer-3': 'rgba(255, 255, 255, 0.06)',
        'layer-4': 'rgba(255, 255, 255, 0.08)',
        'layer-5': 'rgba(255, 255, 255, 0.12)',
        'layer-6': 'rgba(255, 255, 255, 0.16)',
      },

      // ── Border colors (rgba white for dark surfaces) ──
      borderColor: {
        'ghost':    'rgba(255, 255, 255, 0.03)',
        'subtle':   'rgba(255, 255, 255, 0.04)',
        'default':  'rgba(255, 255, 255, 0.06)',
        'strong':   'rgba(255, 255, 255, 0.08)',
        'emphasis': 'rgba(255, 255, 255, 0.12)',
        // Accent borders
        'accent':        'rgba(139, 122, 255, 0.20)',
        'accent-strong': 'rgba(139, 122, 255, 0.35)',
      },

      // ── Transition Timing ──
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

      // ── Keyframes ──
      keyframes: {
        // Accordion (Radix)
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        // Shimmer (skeletons, loading)
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Pulse glow (featured elements, accent halo)
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px -3px rgba(139, 122, 255, 0.0)' },
          '50%':      { boxShadow: '0 0 12px -3px rgba(139, 122, 255, 0.25)' },
        },
        // Fade in (page transitions, card enter)
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        // Slide in from bottom (modals, toasts)
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        // Landing page blob drifts (preserved)
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
        // Blink (cursor)
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        // Glow breathe (soft accent pulse on sidebar, status indicators)
        'glow-breathe': {
          '0%, 100%': { opacity: '0.12' },
          '50%':      { opacity: '0.2' },
        },
        // Pipeline slide (demo animation)
        'pipeline-slide': {
          '0%':   { transform: 'translateX(0)' },
          '40%':  { transform: 'translateX(0)' },
          '50%':  { transform: 'translateX(calc(100% + 12px))' },
          '90%':  { transform: 'translateX(calc(100% + 12px))' },
          '100%': { transform: 'translateX(0)' },
        },
      },

      // ── Animations ──
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        shimmer:           'shimmer 2s linear infinite',
        'pulse-glow':      'pulse-glow 3s ease-in-out infinite',
        'fade-in':         'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up':        'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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

## 2. CSS Variables in `index.css`

Replace `/frontend/src/index.css` entirely with this file.

```css
/* ================================================================
   PARCEL DESIGN SYSTEM — Luxury Dark Redesign
   ================================================================
   Token architecture:
   - :root         = dark theme (luxury warm-dark, new default)
   - .light        = light theme (preserved for future/rollback)
   - shadcn tokens = HSL components (no hsl() wrapper)
   - app tokens    = hex values via var()
   ================================================================ */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ----------------------------------------------------------------
   FONT FACES
   Inter + JetBrains Mono loaded via Fontsource (see main.tsx)
   Satoshi self-hosted for brand headings, KPIs, display numbers
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

  /* Satoshi fallback — metrics-matched system font to prevent FOUT reflow */
  @font-face {
    font-family: 'Satoshi Fallback';
    src: local('BlinkMacSystemFont'), local('Segoe UI'), local('system-ui');
    ascent-override: 100%;
    descent-override: 22%;
    line-gap-override: 0%;
    size-adjust: 104%;
  }
}

/* ----------------------------------------------------------------
   DARK THEME (default — luxury warm-dark)
   Background: #0C0B0A (warm charcoal, R > B by 2pts)
   ---------------------------------------------------------------- */
@layer base {
  :root {
    /* ── App Backgrounds (warm gray scale) ── */
    --app-bg:       #0C0B0A;
    --app-surface:  #1A1916;
    --app-elevated: #22211D;
    --app-overlay:  #2A2924;

    /* ── Opacity Layers (white overlays for depth) ── */
    --layer-1: rgba(255, 255, 255, 0.02);
    --layer-2: rgba(255, 255, 255, 0.04);
    --layer-3: rgba(255, 255, 255, 0.06);
    --layer-4: rgba(255, 255, 255, 0.08);
    --layer-5: rgba(255, 255, 255, 0.12);
    --layer-6: rgba(255, 255, 255, 0.16);

    /* ── Borders (rgba white, context-adaptive) ── */
    --border-ghost:    rgba(255, 255, 255, 0.03);
    --border-subtle:   rgba(255, 255, 255, 0.06);
    --border-default:  rgba(255, 255, 255, 0.08);
    --border-strong:   rgba(255, 255, 255, 0.12);
    --border-emphasis: rgba(255, 255, 255, 0.16);

    /* ── Text (warm off-whites, never pure #FFF) ── */
    --text-primary:   #F0EDE8;
    --text-secondary: #A09D98;
    --text-muted:     #7A7872;
    --text-disabled:  #5C5A56;

    /* ── Accent (violet primary) ── */
    --accent-primary:   #8B7AFF;
    --accent-hover:     #7B6AEF;
    --accent-secondary: #A89FFF;
    --accent-active:    #6B5AD6;
    --accent-success:   #6DBEA3;
    --accent-warning:   #D4A867;
    --accent-danger:    #D4766A;
    --accent-info:      #7B9FCC;

    /* ── Accent Surfaces (tinted overlays) ── */
    --accent-surface:        rgba(139, 122, 255, 0.08);
    --accent-surface-hover:  rgba(139, 122, 255, 0.12);
    --accent-border:         rgba(139, 122, 255, 0.20);
    --accent-border-strong:  rgba(139, 122, 255, 0.35);

    /* ── Semantic (desaturated for dark, no neon) ── */
    --color-success:     #6DBEA3;
    --color-success-bg:  rgba(109, 190, 163, 0.10);
    --color-warning:     #D4A867;
    --color-warning-bg:  rgba(212, 168, 103, 0.10);
    --color-error:       #D4766A;
    --color-error-bg:    rgba(212, 118, 106, 0.10);
    --color-info:        #7B9FCC;
    --color-info-bg:     rgba(123, 159, 204, 0.10);

    /* ── Financial ── */
    --color-profit:     #7CCBA5;
    --color-profit-bg:  rgba(124, 203, 165, 0.10);
    --color-loss:       #D4766A;
    --color-loss-bg:    rgba(212, 118, 106, 0.10);

    /* ── Surface Hierarchy (from Agent 04) ── */
    --surface-canvas:   #0C0B0A;
    --surface-default:  #141311;
    --surface-elevated: #1A1917;
    --surface-overlay:  #211F1D;

    /* ── Strategy Badges (muted tones for dark bg) ── */
    --strategy-wholesale-bg:   rgba(212, 168, 103, 0.12);
    --strategy-wholesale-text: #D4A867;
    --strategy-creative-bg:    rgba(139, 122, 255, 0.12);
    --strategy-creative-text:  #A89FFF;
    --strategy-brrrr-bg:       rgba(123, 159, 204, 0.12);
    --strategy-brrrr-text:     #7B9FCC;
    --strategy-buyhold-bg:     rgba(109, 190, 163, 0.12);
    --strategy-buyhold-text:   #6DBEA3;
    --strategy-flip-bg:        rgba(212, 118, 106, 0.12);
    --strategy-flip-text:      #D4766A;

    /* ── shadcn/ui tokens (HSL components, dark warm) ── */
    --background:           30 9% 4%;           /* #0C0B0A */
    --foreground:           30 6% 93%;          /* #F0EDE8 */

    --card:                 36 8% 8%;           /* #1A1916 */
    --card-foreground:      30 6% 93%;          /* #F0EDE8 */

    --popover:              36 8% 8%;           /* #1A1916 */
    --popover-foreground:   30 6% 93%;          /* #F0EDE8 */

    --primary:              248 100% 74%;       /* #8B7AFF violet-400 */
    --primary-foreground:   30 9% 4%;           /* #0C0B0A dark text on violet */

    --secondary:            36 7% 12%;          /* ~#22211D */
    --secondary-foreground: 30 6% 93%;          /* #F0EDE8 */

    --muted:                36 7% 12%;          /* ~#22211D */
    --muted-foreground:     36 5% 47%;          /* ~#7A7872 */

    --accent:               248 100% 74%;       /* #8B7AFF */
    --accent-foreground:    30 6% 93%;          /* #F0EDE8 */

    --destructive:          8 50% 62%;          /* #D4766A */
    --destructive-foreground: 30 6% 93%;        /* #F0EDE8 */

    --border:               36 6% 14%;          /* ~#3A3835 warm gray-6 */
    --input:                36 7% 12%;          /* ~#22211D */
    --ring:                 248 100% 74%;       /* #8B7AFF violet-400 */

    --radius: 0.5rem;

    /* ── Shadows (full values) ── */
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 8px -2px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  }

  /* ----------------------------------------------------------------
     LIGHT THEME (opt-in via .light on <html>, preserved for rollback)
     ---------------------------------------------------------------- */
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
    --accent-hover:     #7B6AEF;
    --accent-secondary: #A89FFF;
    --accent-active:    #6B5AD6;
    --accent-success:   #22C55E;
    --accent-warning:   #F59E0B;
    --accent-danger:    #EF4444;
    --accent-info:      #6366F1;

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

    --shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
    --shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06);
    --shadow-md: 0 4px 8px -2px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
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
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Financial numbers: tabular-nums on body font (Inter), NOT mono */
  [data-financial],
  .financial {
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: 'tnum' 1, 'lnum' 1, 'zero' 1;
    font-weight: 400;
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
    line-height: 22.4px;
    font-weight: 400;
    max-width: 65ch;
  }
}

/* ----------------------------------------------------------------
   UTILITY CLASSES
   ---------------------------------------------------------------- */
@layer utilities {
  /* Uppercase labels with proper tracking for dark backgrounds */
  .label-caps {
    font-size: 11px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* KPI hero numbers — Satoshi 300 with tabular nums */
  .text-kpi-display {
    font-family: 'Satoshi', 'Satoshi Fallback', system-ui, sans-serif;
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 300;
    letter-spacing: -0.03em;
  }

  /* Card edge highlight — gradient 1px top line (luxury depth cue) */
  .edge-highlight {
    @apply relative overflow-hidden;
  }
  .edge-highlight::after {
    content: '';
    @apply absolute top-0 left-[10%] right-[10%] h-px pointer-events-none;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.12) 30%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.12) 70%,
      transparent
    );
  }

  /* Subtle grain texture — apply to page canvas only */
  .grain {
    @apply relative;
  }
  .grain::before {
    content: '';
    @apply absolute inset-0 pointer-events-none z-[1];
    border-radius: inherit;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.03;
    mix-blend-mode: overlay;
  }

  /* Glass overlay — command palette, modals only */
  .glass {
    background: rgba(12, 11, 10, 0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  /* Focus ring — double-ring with gap (violet accent) */
  .focus-ring {
    @apply focus-visible:outline-none;
  }
  .focus-ring:focus-visible {
    box-shadow:
      0 0 0 2px #0C0B0A,
      0 0 0 4px rgba(139, 122, 255, 0.5);
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
   SKELETON SHIMMER (theme-aware)
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
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3. Font Loading

### npm packages (no changes needed)

The current setup already includes the correct Fontsource packages:

```json
{
  "@fontsource-variable/inter": "^5.2.8",
  "@fontsource-variable/jetbrains-mono": "^5.2.8"
}
```

No new packages required. Satoshi remains self-hosted from `/public/fonts/Satoshi-Variable.woff2`.

### Import statements in `main.tsx` (no changes)

```ts
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
```

### Preload tags in `index.html` (already present)

The existing preload tag is correct:

```html
<link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin />
```

### Font loading summary

| Font | Method | Size | FOUT Risk |
|------|--------|------|-----------|
| Inter Variable | Fontsource (bundled via Vite) | ~100KB woff2 | None (inlined) |
| JetBrains Mono Variable | Fontsource (bundled via Vite) | ~95KB woff2 | None (inlined) |
| Satoshi Variable | Self-hosted + preload | ~45KB woff2 | Minimal (preloaded, fallback defined) |

Total: ~240KB WOFF2. Well within performance budget.

---

## 4. Tailwind Plugins

### Required (already installed)

```
tailwindcss-animate  (v1.0.7)  — accordion, shimmer, fade-in, slide-up
```

### Optional (not yet installed, recommended for future)

```
@tailwindcss/typography  — if/when Parcel adds markdown rendering in chat or docs
```

Do NOT install `@tailwindcss/typography` yet. It would only be useful when the chat page renders long-form AI responses with `<prose>` wrappers. Add it later if needed.

---

## 5. Migration Notes — What Changes from Current Config

### Colors

| What changed | Before | After |
|---|---|---|
| Gray scale | Untitled UI (cold gray, `#FCFCFD` to `#0C111D`) | Custom warm 12-step (`#0C0B0A` to `#F0EDE8`, R > B by 2-6pts) |
| Lime/Olive scale | Present as primary accent | Removed from config (replaced by violet) |
| Indigo scale | Present as info/old primary | Removed from config (replaced by violet) |
| Violet scale | Not present | New 10-step scale (`#F5F3FF` to `#3A2A8A`) |
| Success/Warning/Error/Info | Standard saturated (green/amber/red/indigo) | Desaturated for dark bg (`#6DBEA3` / `#D4A867` / `#D4766A` / `#7B9FCC`) |
| Profit/Loss | Not defined | New tokens (`#7CCBA5` / `#D4766A`) |
| Border colors | Hardcoded hex in `.dark` (`#1A1A2E`, `#252540`, `#303055`) | `rgba(255,255,255, 0.06/0.08/0.12)` — context-adaptive |

### Font sizes

| What changed | Before | After |
|---|---|---|
| Scale architecture | Data-dense 13px base, no hero/display | Luxury bimodal: hero (56px/300) to micro (10px/500) |
| KPI weight | `font-weight: 700` | `font-weight: 300` (thin on dark = luxury signal) |
| Default weights | Not set per level | Set per level (300 for display, 500 for section headings) |
| Tracking | Partial negative tracking | Full dark-optimized negative tracking at every level |

### Fonts

| What changed | Before | After |
|---|---|---|
| `font-brand` fallback | `system-ui, sans-serif` | `'Satoshi Fallback', system-ui, sans-serif` (metrics-matched) |
| `font-body` alias | Not present | Added as alias for `font-sans` |

### Shadows

| What changed | Before | After |
|---|---|---|
| Shadow base | Cool-undertone (`rgba(16,24,40,...)`) | Pure black (`rgba(0,0,0,...)`) at higher opacity for dark bg |
| Glow tokens | Not present | `glow-violet`, `glow-success`, `glow-error` |
| Inset shadows | Not present | `inset-sm`, `inset-md` for recessed inputs |
| Edge highlight | Not present | `edge-highlight` for luxury top-edge bevel |
| Focus shadow | `focus` (white + lime) | `focus-violet` (canvas + violet) |

### CSS variables

| What changed | Before | After |
|---|---|---|
| Default theme | `:root` = light, `.dark` = dark | `:root` = dark (luxury warm), `.light` = light (rollback) |
| Accent color | Olive `#84CC16` / `#4D7C0F` | Violet `#8B7AFF` |
| Dark bg | Cold `#08080F` (blue undertone) | Warm `#0C0B0A` (red undertone, R > B by 2pts) |
| Text primary | `#F1F5F9` (pure cool slate) | `#F0EDE8` (warm cream, R-B = 8pts) |
| Text secondary | `#94A3B8` (cool slate-400) | `#A09D98` (warm gray-10) |
| shadcn `--primary` | `84 81% 44%` (lime-500) | `248 100% 74%` (violet-400) |
| shadcn `--ring` | `84 81% 44%` (lime-500) | `248 100% 74%` (violet-400) |
| Strategy badge style | Solid dark bg + bright text | `rgba` tinted bg (12% opacity) + muted text |

### Animations

| What changed | Before | After |
|---|---|---|
| `pulse-glow` | Not present | New (violet halo pulse, 3s cycle) |
| `fade-in` | Not present | New (translateY 8px, 0.3s ease-out-expo) |
| `slide-up` | Not present | New (translateY 16px, 0.4s ease-out-expo) |
| All existing | Preserved | Preserved (accordion, shimmer, drift, blink, glow-breathe, pipeline-slide) |

### Utilities

| What changed | Before | After |
|---|---|---|
| `.text-kpi-display` | `font-weight: 700; letter-spacing: -0.025em` | `font-family: Satoshi; font-weight: 300; letter-spacing: -0.03em` |
| `.label-caps` tracking | `0.05em` | `0.04em` (reduced for dark bg, halation compensation) |
| `.edge-highlight` | Not present | New (gradient 1px top line via `::after`) |
| `.grain` | Not present | New (SVG noise texture at 0.03 opacity) |
| `.glass` | Not present | New (`backdrop-blur-[20px]` + saturate for command palette/modals) |
| `.focus-ring` | Not present | New (double-ring violet focus indicator) |
| `.financial` weight | `500` | `400` (thinner on dark for luxury) |
| `.financial` features | `tabular-nums lining-nums` | Added `'zero' 1` for slashed zeros |
| `.prose-content` | No `max-width` | Added `max-width: 65ch` |

---

## CRITICAL DECISIONS

1. **Dark-first default.** `:root` is now the dark theme. The old `.dark` class has been renamed to the default. Light theme is available via `.light` on `<html>` for rollback. This means removing the `.dark` class from `<html>` will show the luxury dark theme, not white.

2. **Violet replaces olive as the primary accent throughout the entire Tailwind config and shadcn token layer.** Every `--primary`, `--ring`, and `--accent` HSL variable now points to violet-400 (`#8B7AFF`). Components using `bg-primary`, `text-primary` (shadcn), `ring`, etc. will automatically pick up violet. Olive is no longer defined as a color scale.

3. **Gray scale is in `theme.colors` (top-level), not `theme.extend.colors`.** This means Tailwind's default `gray`, `slate`, `zinc`, `neutral`, `stone` scales are all replaced. Any class like `text-gray-500` or `bg-slate-800` will break. Use `text-gray-10` (warm gray secondary) or `bg-gray-2` (warm surface) instead. The numbered scale is 0-11 (not 50-900) to match the 12-step system from Agent 02.

4. **`fontSize` is in `theme` (top-level), not `theme.extend`.** This replaces Tailwind defaults (`text-base`, `text-lg`, etc.) with the luxury scale. The mapping: `text-body` = 14px, `text-sm` = 13px, `text-xs` = 11px. Tailwind's `text-base` no longer exists -- use `text-body` or `text-sm`.

5. **Strategy badges now use rgba-tinted backgrounds at 12% opacity** instead of solid dark hex backgrounds. This integrates with the warm-dark surface system and avoids the "colored boxes on dark" look.

6. **The `Satoshi Fallback` font-face provides metrics-matched system font substitution** to eliminate layout shift during the ~100ms before Satoshi loads. The `size-adjust: 104%` compensates for Satoshi being ~4% wider than system-ui.

7. **`boxShadow` and `backdropBlur` are in `theme` (top-level), not `theme.extend`.** Tailwind's default shadow and blur scales are replaced entirely with dark-optimized values. The cool-undertone `rgba(16,24,40,...)` shadows from the current config are gone -- all shadows now use pure `rgba(0,0,0,...)` at higher opacity because dark-on-dark shadows need stronger values to register.

8. **Financial numbers use `font-weight: 400` instead of `500`.** With `-webkit-font-smoothing: antialiased` on dark backgrounds, 400 reads like ~380 due to the halation-thinning interaction. This creates the luxury-thin number aesthetic seen in Mercury and Stripe.

9. **Border approach is fundamentally different.** The old config used hardcoded hex borders (`#1A1A2E`, `#252540`). The new system uses `rgba(255,255,255, opacity)` which adapts to whatever surface it sits on. A border at `rgba(255,255,255, 0.06)` on `#1A1916` computes differently than on `#22211D` -- this is correct behavior that maintains consistent perceived contrast across elevation levels.

10. **No `@tailwindcss/typography` plugin added.** It would conflict with the custom type scale and force overrides. If prose rendering is needed for the chat page, build a custom `.prose-dark` utility instead.
