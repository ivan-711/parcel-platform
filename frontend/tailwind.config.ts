import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    extend: {
      // ----------------------------------------------------------------
      // FONT SIZE: Data-dense scale (13px base, matches Mercury/Linear)
      // Uses extend to preserve Tailwind defaults (text-5xl, text-6xl, etc.)
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
        'kpi':   ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
      },

      // ----------------------------------------------------------------
      // COLORS: CSS-variable-driven semantic tokens
      // Light-first (:root), dark override (.dark class)
      // Token NAMES match existing codebase -- only VALUES change
      // ----------------------------------------------------------------
      colors: {
        // --- App backgrounds (CSS-variable-driven for theme switching) ---
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

        // --- Strategy badge colors (CSS-variable-driven) ---
        'strategy-wholesale': { bg: 'var(--strategy-wholesale-bg)', text: 'var(--strategy-wholesale-text)' },
        'strategy-creative':  { bg: 'var(--strategy-creative-bg)',  text: 'var(--strategy-creative-text)' },
        'strategy-brrrr':     { bg: 'var(--strategy-brrrr-bg)',     text: 'var(--strategy-brrrr-text)' },
        'strategy-buyhold':   { bg: 'var(--strategy-buyhold-bg)',   text: 'var(--strategy-buyhold-text)' },
        'strategy-flip':      { bg: 'var(--strategy-flip-bg)',      text: 'var(--strategy-flip-text)' },

        // --- Neutral gray scale (direct hex, ONE scale -- Untitled UI) ---
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

        // --- Olive/Lime scale (PRIMARY) ---
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

        // --- Indigo scale (INFO color, old primary repurposed) ---
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

        // --- Semantic color scales ---
        success: { 50: '#F0F9FF', 100: '#E0F2FE', 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
        error:   { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
        info:    { 50: '#EEF0FF', 100: '#E0E2FF', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },

        // --- shadcn/ui tokens (HSL-based, keep for component compat) ---
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

      // ----------------------------------------------------------------
      // FONT FAMILY
      // sans: Inter (body, UI, data, financial numbers)
      // brand: Satoshi (landing page headings, marketing)
      // mono: JetBrains Mono (code, AI output ONLY)
      // ----------------------------------------------------------------
      fontFamily: {
        sans:  ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        brand: ['"Satoshi"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      // ----------------------------------------------------------------
      // BORDER RADIUS
      // sm=4px inputs, DEFAULT=6px small buttons, md=8px buttons,
      // lg=12px cards (app shell standard)
      // ----------------------------------------------------------------
      borderRadius: {
        sm:      '4px',
        DEFAULT: '6px',
        md:      '8px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        full:    '9999px',
      },

      // ----------------------------------------------------------------
      // SHADOWS: Cool-undertone, Stripe-style (border + shadow)
      // ----------------------------------------------------------------
      boxShadow: {
        'xs':    '0 1px 2px rgba(16, 24, 40, 0.05)',
        'sm':    '0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)',
        'md':    '0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
        'lg':    '0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)',
        'xl':    '0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)',
        '2xl':   '0 24px 48px -12px rgba(16, 24, 40, 0.18)',
        'focus': '0 0 0 2px #FFFFFF, 0 0 0 4px #84CC16',
      },

      // ----------------------------------------------------------------
      // TRANSITION TIMING
      // ----------------------------------------------------------------
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
} satisfies Config

export default config
