import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App backgrounds
        'app-bg': '#08080F',
        'app-surface': '#0F0F1A',
        'app-elevated': '#16162A',
        'app-overlay': '#1C1C30',

        // Borders
        'border-subtle': '#1A1A2E',
        'border-default': '#252540',
        'border-strong': '#303055',

        // Accent
        'accent-primary': '#6366F1',
        'accent-hover': '#4F46E5',
        'accent-secondary': '#8B5CF6',
        'accent-success': '#10B981',
        'accent-warning': '#F59E0B',
        'accent-danger': '#EF4444',
        'accent-info': '#3B82F6',

        // Text
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted': '#475569',
        'text-disabled': '#334155',

        // Strategy badge colors
        'strategy-wholesale': {
          bg: '#451A03',
          text: '#FCD34D',
        },
        'strategy-creative': {
          bg: '#2E1065',
          text: '#C4B5FD',
        },
        'strategy-brrrr': {
          bg: '#0C1A4A',
          text: '#93C5FD',
        },
        'strategy-buyhold': {
          bg: '#064E3B',
          text: '#6EE7B7',
        },
        'strategy-flip': {
          bg: '#431407',
          text: '#FCA5A1',
        },

        // shadcn/ui tokens (keep for compatibility)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
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
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drift1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(80px, -60px) scale(1.1)' },
          '66%': { transform: 'translate(-40px, 40px) scale(0.95)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-60px, 80px) scale(1.05)' },
          '66%': { transform: 'translate(60px, -30px) scale(1.1)' },
        },
        drift3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, 60px) scale(0.9)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        drift1: 'drift1 15s ease-in-out infinite',
        drift2: 'drift2 12s ease-in-out infinite',
        drift3: 'drift3 18s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [animate],
}
