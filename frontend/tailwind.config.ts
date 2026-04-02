import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    // ================================================================
    // TOP-LEVEL OVERRIDES — these REPLACE Tailwind defaults entirely.
    // All colors flow through the luxury warm system.
    // ================================================================

    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      // ---- Warm Gray Scale (12-step, red channel leads blue by 2-6pts) ----
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

      // ---- Violet Accent Scale ----
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

      // ---- Semantic Colors (muted for dark, not neon) ----
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

      // ---- Financial Colors ----
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

      // ---- CSS-variable-driven semantic tokens ----
      'app-bg':       'var(--app-bg)',
      'app-surface':  'var(--app-surface)',
      'app-elevated': 'var(--app-elevated)',
      'app-overlay':  'var(--app-overlay)',
      'app-recessed': 'var(--app-recessed)',
      'accent-text-on-accent': 'var(--accent-text-on-accent)',
      'border-subtle':  'var(--border-subtle)',
      'border-default': 'var(--border-default)',
      'border-strong':  'var(--border-strong)',
      'accent-primary':   'var(--accent-primary)',
      'accent-hover':     'var(--accent-hover)',
      'accent-secondary': 'var(--accent-secondary)',
      'text-primary':   'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted':     'var(--text-muted)',
      'text-disabled':  'var(--text-disabled)',

      // ---- Strategy badge colors (CSS-variable-driven) ----
      'strategy-wholesale': { bg: 'var(--strategy-wholesale-bg)', text: 'var(--strategy-wholesale-text)' },
      'strategy-creative':  { bg: 'var(--strategy-creative-bg)',  text: 'var(--strategy-creative-text)' },
      'strategy-brrrr':     { bg: 'var(--strategy-brrrr-bg)',     text: 'var(--strategy-brrrr-text)' },
      'strategy-buyhold':   { bg: 'var(--strategy-buyhold-bg)',   text: 'var(--strategy-buyhold-text)' },
      'strategy-flip':      { bg: 'var(--strategy-flip-bg)',      text: 'var(--strategy-flip-text)' },

      // ---- shadcn/ui tokens (HSL-based, keep for component compat) ----
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

    // ---- Luxury Type Scale ----
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
      // Preserve Tailwind defaults needed by landing page and existing code
      'base':    ['14px', { lineHeight: '1.6' }],
      'lg':      ['16px', { lineHeight: '1.6' }],
      'xl':      ['18px', { lineHeight: '1.4' }],
      '2xl':     ['22px', { lineHeight: '1.3' }],
      '3xl':     ['28px', { lineHeight: '1.2' }],
      '4xl':     ['36px', { lineHeight: '1.1' }],
      '5xl':     ['48px', { lineHeight: '1.05' }],
    },

    // ---- Font Families ----
    fontFamily: {
      brand: ['"Satoshi"', '"Satoshi Fallback"', 'system-ui', 'sans-serif'],
      sans:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      body:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
    },

    // ---- Border Radius ----
    borderRadius: {
      none:    '0',
      sm:      '4px',
      DEFAULT: '6px',
      md:      '8px',
      lg:      '12px',
      xl:      '16px',
      '2xl':   '20px',
      full:    '9999px',
    },

    // ---- Dark Shadows (warm undertone, deeper opacity) ----
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

    // ================================================================
    // EXTEND — adds tokens without overriding Tailwind defaults
    // ================================================================
    extend: {
      letterSpacing: {
        'display': '-0.035em',
        'heading': '-0.025em',
        'tight':   '-0.015em',
        'body':    '-0.006em',
        'normal':  '0em',
        'caps':    '0.04em',
      },

      backdropSaturate: { '180': '1.8' },

      backgroundColor: {
        'layer-1': 'rgba(255, 255, 255, 0.02)',
        'layer-2': 'rgba(255, 255, 255, 0.04)',
        'layer-3': 'rgba(255, 255, 255, 0.06)',
        'layer-4': 'rgba(255, 255, 255, 0.08)',
        'layer-5': 'rgba(255, 255, 255, 0.12)',
        'layer-6': 'rgba(255, 255, 255, 0.16)',
      },

      borderColor: {
        'ghost':         'rgba(255, 255, 255, 0.03)',
        'subtle':        'rgba(255, 255, 255, 0.04)',
        'default':       'rgba(255, 255, 255, 0.06)',
        'strong':        'rgba(255, 255, 255, 0.08)',
        'emphasis':      'rgba(255, 255, 255, 0.12)',
        'accent':        'rgba(139, 122, 255, 0.20)',
        'accent-strong': 'rgba(139, 122, 255, 0.35)',
      },

      transitionTimingFunction: {
        'ease-luxury':        'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ease-vercel':        'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      transitionDuration: {
        '75': '75ms', '100': '100ms', '150': '150ms', '200': '200ms',
        '250': '250ms', '300': '300ms', '500': '500ms',
      },

      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        shimmer:          { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px -3px rgba(139, 122, 255, 0.0)' },
          '50%':      { boxShadow: '0 0 12px -3px rgba(139, 122, 255, 0.25)' },
        },
        'fade-in':  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blink:      { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        // Preserved from current config (landing page)
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
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        shimmer:          'shimmer 2s linear infinite',
        'pulse-glow':     'pulse-glow 3s ease-in-out infinite',
        'fade-in':        'fade-in 0.3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-up':       'slide-up 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        blink:            'blink 1s step-end infinite',
        drift1:           'drift1 15s ease-in-out infinite',
        drift2:           'drift2 12s ease-in-out infinite',
        drift3:           'drift3 18s ease-in-out infinite',
        'glow-breathe':   'glow-breathe 6s ease-in-out infinite',
        'pipeline-slide': 'pipeline-slide 5s ease-in-out infinite',
      },
    },
  },

  plugins: [animate],
} satisfies Config

export default config
