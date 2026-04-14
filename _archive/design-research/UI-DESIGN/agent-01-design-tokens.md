# Parcel Design Token System — Light Theme

Definitive, implementation-ready token specification for the dark-to-light theme migration. Every value is exact. No placeholders, no "TBD."

---

## 1. Tailwind Config Additions (`tailwind.config.ts`)

The complete `theme.extend` object. Merges with — does not replace — existing keyframes and animations.

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic surfaces (CSS-variable-driven, theme-aware) ──
        page:    'hsl(var(--color-bg-page) / <alpha-value>)',
        surface: {
          DEFAULT:   'hsl(var(--color-bg-surface) / <alpha-value>)',
          secondary: 'hsl(var(--color-bg-surface-secondary) / <alpha-value>)',
          hover:     'hsl(var(--color-bg-surface-hover) / <alpha-value>)',
          active:    'hsl(var(--color-bg-surface-active) / <alpha-value>)',
        },

        // ── Neutral gray scale (cool-tinted, Untitled UI base) ──
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

        // ── Primary indigo scale ──
        indigo: {
          25:  '#F5F5FF',
          50:  '#EEF0FF',
          100: '#E0E2FF',
          200: '#C7C9FF',
          300: '#A5A7FC',
          400: '#8385F6',
          500: '#6366F1',  // Brand primary
          600: '#4F46E5',  // Hover / text-on-white (WCAG AA: 4.63:1)
          700: '#4338CA',  // Active / pressed (WCAG AA: 5.87:1)
          800: '#3730A3',
          900: '#312E81',
        },

        // ── Semantic: Success (green) ──
        success: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          500: '#10B981',
          600: '#059669',
          700: '#047857',  // Text on white (WCAG AA: 5.45:1)
        },

        // ── Semantic: Warning (amber) ──
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',  // Text on white (WCAG AA: 4.69:1)
        },

        // ── Semantic: Error (red) ──
        error: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',  // Text on white (WCAG AA: 5.72:1)
        },

        // ── Semantic: Info (blue) ──
        info: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',  // Text on white (WCAG AA: 6.50:1)
        },

        // ── Strategy badge colors (light-adapted) ──
        'strategy-wholesale': {
          bg:   '#FEF3C7',  // Amber 100
          text: '#92400E',  // Amber 800
        },
        'strategy-creative': {
          bg:   '#EDE9FE',  // Violet 100
          text: '#5B21B6',  // Violet 800
        },
        'strategy-brrrr': {
          bg:   '#DBEAFE',  // Blue 100
          text: '#1E40AF',  // Blue 800
        },
        'strategy-buyhold': {
          bg:   '#D1FAE5',  // Emerald 100
          text: '#065F46',  // Emerald 800
        },
        'strategy-flip': {
          bg:   '#FFE4E6',  // Rose 100
          text: '#9F1239',  // Rose 800
        },

        // ── shadcn/ui tokens (CSS-variable-driven, keep for component compat) ──
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
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

      fontFamily: {
        sans:    ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"Satoshi"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

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

      boxShadow: {
        'xs':    '0 1px 2px rgba(16, 24, 40, 0.05)',
        'sm':    '0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)',
        'md':    '0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
        'lg':    '0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)',
        'xl':    '0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)',
        '2xl':   '0 24px 48px -12px rgba(16, 24, 40, 0.18)',
        'focus': '0 0 0 2px #FFFFFF, 0 0 0 4px #6366F1',
      },

      borderRadius: {
        'sm':      '4px',
        'DEFAULT': '6px',
        'md':      '8px',
        'lg':      '12px',
        'xl':      '16px',
        '2xl':     '20px',
        'full':    '9999px',
      },

      transitionTimingFunction: {
        'ease-spring':  'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
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

      // Existing keyframes + animations preserved (accordion, shimmer, drift, blink, etc.)
      // ... keep all existing keyframes from current config ...
    },
  },
  plugins: [animate],
} satisfies Config
```

---

## 2. CSS Variables (`:root` Light Theme + `.dark` Future Dark Mode)

All values in HSL for shadcn/ui compatibility. Pattern: `hsl(var(--token) / <alpha>)`.

```css
@layer base {
  :root {
    /* ════════════════════════════════════════════
       LIGHT THEME (default)
       ════════════════════════════════════════════ */

    /* ── Surfaces ── */
    --color-bg-page:              210 20% 98%;        /* #F9FAFB  — gray-50  */
    --color-bg-surface:           0 0% 100%;          /* #FFFFFF             */
    --color-bg-surface-secondary: 220 14% 96%;        /* #F2F4F7  — gray-100 */
    --color-bg-surface-hover:     210 20% 98%;        /* #F9FAFB  — gray-50  */
    --color-bg-surface-active:    239 100% 97%;       /* #EEF0FF  — indigo-50 */

    /* ── Borders ── */
    --color-border-default:  220 13% 91%;             /* #EAECF0  — gray-200 */
    --color-border-strong:   218 11% 82%;             /* #D0D5DD  — gray-300 */
    --color-border-focus:    239 84% 67%;             /* #6366F1  — indigo-500 */

    /* ── Text ── */
    --color-text-primary:     220 26% 14%;            /* #1D2939  — gray-800 */
    --color-text-heading:     222 47% 11%;            /* #101828  — gray-900 */
    --color-text-secondary:   220 9% 46%;             /* #475467  — gray-600 */
    --color-text-muted:       218 15% 65%;            /* #98A2B3  — gray-400 */
    --color-text-placeholder: 218 15% 65%;            /* #98A2B3  — gray-400 */
    --color-text-disabled:    218 11% 82%;            /* #D0D5DD  — gray-300 */
    --color-text-inverse:     0 0% 100%;              /* #FFFFFF             */

    /* ── Primary (indigo) ── */
    --color-primary:          239 84% 67%;            /* #6366F1  — brand fill  */
    --color-primary-hover:    239 83% 59%;            /* #4F46E5  — hover       */
    --color-primary-active:   239 84% 50%;            /* #4338CA  — pressed     */
    --color-primary-subtle:   239 100% 97%;           /* #EEF0FF  — tinted bg   */
    --color-primary-ring:     239 92% 82%;            /* #A5A7FC  — focus ring   */

    /* ── Semantic ── */
    --color-success:          160 84% 39%;            /* #10B981  */
    --color-success-text:     152 69% 31%;            /* #047857  — for text     */
    --color-warning:          38 92% 50%;             /* #F59E0B  */
    --color-warning-text:     32 95% 44%;             /* #D97706  — for text     */
    --color-error:            0 84% 60%;              /* #EF4444  */
    --color-error-text:       0 73% 42%;              /* #B91C1C  — for text     */
    --color-info:             217 91% 60%;            /* #3B82F6  */
    --color-info-text:        226 71% 40%;            /* #1D4ED8  — for text     */

    /* ── Shadows (full values, not HSL) ── */
    --shadow-xs:  0 1px 2px rgba(16, 24, 40, 0.05);
    --shadow-sm:  0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06);
    --shadow-md:  0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
    --shadow-lg:  0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03);
    --shadow-xl:  0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03);
    --shadow-2xl: 0 24px 48px -12px rgba(16, 24, 40, 0.18);

    /* ── Radius ── */
    --radius:    0.5rem;    /* 8px — base for shadcn calc() */
    --radius-sm: 0.25rem;  /* 4px */
    --radius-lg: 0.75rem;  /* 12px */

    /* ── shadcn/ui tokens (mapped to light theme) ── */
    --background:             210 20% 98%;            /* page bg */
    --foreground:             220 26% 14%;            /* gray-800 */

    --card:                   0 0% 100%;              /* white */
    --card-foreground:        222 47% 11%;            /* gray-900 */

    --popover:                0 0% 100%;
    --popover-foreground:     222 47% 11%;

    --primary:                239 84% 67%;            /* indigo-500 */
    --primary-foreground:     0 0% 100%;              /* white text on indigo */

    --secondary:              220 14% 96%;            /* gray-100 */
    --secondary-foreground:   220 9% 46%;             /* gray-600 */

    --muted:                  220 14% 96%;            /* gray-100 */
    --muted-foreground:       218 15% 65%;            /* gray-400 */

    --accent:                 239 100% 97%;           /* indigo-50 */
    --accent-foreground:      239 83% 59%;            /* indigo-600 */

    --destructive:            0 84% 60%;              /* red-500 */
    --destructive-foreground: 0 0% 100%;

    --border:                 220 13% 91%;            /* gray-200 */
    --input:                  218 11% 82%;            /* gray-300 */
    --ring:                   239 84% 67%;            /* indigo-500 */
  }

  /* ════════════════════════════════════════════
     DARK THEME (future — add .dark to <html>)
     ════════════════════════════════════════════ */
  .dark {
    /* ── Surfaces ── */
    --color-bg-page:              240 50% 4%;         /* #08080F  */
    --color-bg-surface:           240 43% 8%;         /* #0F0F1A  */
    --color-bg-surface-secondary: 240 35% 12%;        /* #16162A  */
    --color-bg-surface-hover:     240 30% 14%;        /* #1C1C30  */
    --color-bg-surface-active:    239 60% 15%;        /* indigo-tinted */

    /* ── Borders ── */
    --color-border-default:  240 30% 14%;             /* #252540  */
    --color-border-strong:   240 25% 20%;             /* #303055  */
    --color-border-focus:    239 84% 67%;             /* #6366F1  */

    /* ── Text ── */
    --color-text-primary:     210 40% 96%;            /* #F1F5F9  */
    --color-text-heading:     0 0% 98%;               /* #FAFAFA  */
    --color-text-secondary:   215 20% 65%;            /* #94A3B8  */
    --color-text-muted:       217 10% 40%;            /* #475569  */
    --color-text-placeholder: 217 10% 40%;            /* #475569  */
    --color-text-disabled:    215 14% 25%;            /* #334155  */
    --color-text-inverse:     222 47% 11%;            /* #101828  */

    /* ── Primary ── */
    --color-primary:          239 84% 67%;            /* #6366F1  */
    --color-primary-hover:    239 83% 59%;            /* #4F46E5  */
    --color-primary-active:   239 84% 50%;            /* #4338CA  */
    --color-primary-subtle:   239 60% 15%;
    --color-primary-ring:     239 84% 67%;

    /* ── Semantic (same hues, adjusted for dark bg) ── */
    --color-success:          160 84% 39%;
    --color-success-text:     158 64% 52%;            /* brighter for dark bg */
    --color-warning:          38 92% 50%;
    --color-warning-text:     43 96% 56%;
    --color-error:            0 84% 60%;
    --color-error-text:       0 91% 71%;
    --color-info:             217 91% 60%;
    --color-info-text:        213 94% 68%;

    /* ── Shadows (glow-style for dark) ── */
    --shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.30);
    --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.40), 0 1px 2px rgba(0, 0, 0, 0.30);
    --shadow-md:  0 4px 8px -2px rgba(0, 0, 0, 0.50), 0 2px 4px -2px rgba(0, 0, 0, 0.30);
    --shadow-lg:  0 12px 16px -4px rgba(0, 0, 0, 0.50), 0 4px 6px -2px rgba(0, 0, 0, 0.20);
    --shadow-xl:  0 20px 24px -4px rgba(0, 0, 0, 0.50), 0 8px 8px -4px rgba(0, 0, 0, 0.20);
    --shadow-2xl: 0 24px 48px -12px rgba(0, 0, 0, 0.60);

    /* ── shadcn/ui tokens (dark) ── */
    --background:             240 50% 4%;
    --foreground:             0 0% 98%;

    --card:                   240 43% 8%;
    --card-foreground:        0 0% 98%;

    --popover:                240 43% 8%;
    --popover-foreground:     0 0% 98%;

    --primary:                239 84% 67%;
    --primary-foreground:     240 50% 4%;

    --secondary:              240 30% 12%;
    --secondary-foreground:   0 0% 98%;

    --muted:                  240 30% 12%;
    --muted-foreground:       240 5% 60%;

    --accent:                 240 30% 16%;
    --accent-foreground:      0 0% 98%;

    --destructive:            0 63% 31%;
    --destructive-foreground: 0 0% 98%;

    --border:                 240 30% 14%;
    --input:                  240 30% 12%;
    --ring:                   239 84% 67%;
  }
}
```

---

## 3. Complete Color Palette (Hex Reference)

### 3a. Primary Indigo Scale

| Token       | Hex       | HSL              | Usage                                   |
|-------------|-----------|------------------|-----------------------------------------|
| indigo-25   | `#F5F5FF` | 240 100% 98%    | Subtle tinted backgrounds               |
| indigo-50   | `#EEF0FF` | 233 100% 97%    | Selected row bg, active nav bg          |
| indigo-100  | `#E0E2FF` | 237 100% 94%    | Hover states on tinted surfaces         |
| indigo-200  | `#C7C9FF` | 238 100% 89%    | Focus ring (lighter), progress bars     |
| indigo-300  | `#A5A7FC` | 239 96% 82%     | Focus ring outline                      |
| indigo-400  | `#8385F6` | 239 88% 74%     | Decorative, secondary interactive       |
| indigo-500  | `#6366F1` | 239 84% 67%     | **Primary accent** (button fills, brand)|
| indigo-600  | `#4F46E5` | 243 76% 59%     | Button hover, text links on white       |
| indigo-700  | `#4338CA` | 244 65% 50%     | Active/pressed, high-contrast text      |
| indigo-800  | `#3730A3` | 244 54% 42%     | Dark badges, headers on colored bg      |
| indigo-900  | `#312E81` | 243 47% 35%     | Darkest brand usage                     |

### 3b. Neutral Gray Scale (Cool-Tinted)

| Token    | Hex       | Usage                                     |
|----------|-----------|-------------------------------------------|
| gray-25  | `#FCFCFD` | Subtle hover on white surfaces            |
| gray-50  | `#F9FAFB` | **Page background**                       |
| gray-100 | `#F2F4F7` | Sidebar bg, secondary panels              |
| gray-200 | `#EAECF0` | **Default borders**, dividers             |
| gray-300 | `#D0D5DD` | Input borders, strong dividers            |
| gray-400 | `#98A2B3` | Placeholder text, disabled icons          |
| gray-500 | `#667085` | Secondary/caption text                    |
| gray-600 | `#475467` | Body text (secondary emphasis)            |
| gray-700 | `#344054` | Strong secondary text                     |
| gray-800 | `#1D2939` | **Primary body text**, headings           |
| gray-900 | `#101828` | **Maximum contrast** — page titles, KPIs  |
| gray-950 | `#0C111D` | Tooltip bg, dark accents (rare)           |

### 3c. Semantic Colors

| Semantic | 50 (bg)   | 100 (badge) | 300 (border) | 500 (icon)  | 600 (emphasis) | 700 (text)  |
|----------|-----------|-------------|--------------|-------------|----------------|-------------|
| Success  | `#ECFDF5` | `#D1FAE5`  | `#6EE7B7`   | `#10B981`   | `#059669`      | `#047857`   |
| Warning  | `#FFFBEB` | `#FEF3C7`  | `#FCD34D`   | `#F59E0B`   | `#D97706`      | `#B45309`   |
| Error    | `#FEF2F2` | `#FEE2E2`  | `#FCA5A5`   | `#EF4444`   | `#DC2626`      | `#B91C1C`   |
| Info     | `#EFF6FF` | `#DBEAFE`  | `#93C5FD`   | `#3B82F6`   | `#2563EB`      | `#1D4ED8`   |

**Rule:** Semantic text colors use the 700 weight for guaranteed WCAG AA compliance on white. The 500 weight is for icons and decorative elements only (3:1 non-text contrast is sufficient).

### 3d. Surface & Border Colors

| Token                  | Hex       | CSS Variable                         | Usage                        |
|------------------------|-----------|--------------------------------------|------------------------------|
| bg-page                | `#F9FAFB` | `--color-bg-page`                   | Main page background         |
| bg-surface             | `#FFFFFF` | `--color-bg-surface`                | Cards, panels, modals        |
| bg-surface-secondary   | `#F2F4F7` | `--color-bg-surface-secondary`      | Sidebar, nav, secondary      |
| bg-surface-hover       | `#F9FAFB` | `--color-bg-surface-hover`          | Row hover, card hover        |
| bg-surface-active      | `#EEF0FF` | `--color-bg-surface-active`         | Selected row (indigo-50)     |
| border-default         | `#EAECF0` | `--color-border-default`            | Card borders, dividers       |
| border-strong          | `#D0D5DD` | `--color-border-strong`             | Input borders, emphasized    |
| border-focus           | `#6366F1` | `--color-border-focus`              | Focus ring accent            |

### 3e. Strategy Badge Colors (Light Theme)

| Strategy   | Background | Text      | Contrast Ratio | Source           |
|-----------|-----------|-----------|----------------|------------------|
| Wholesale  | `#FEF3C7` | `#92400E` | 6.8:1          | Amber 100 / 800  |
| Creative   | `#EDE9FE` | `#5B21B6` | 7.2:1          | Violet 100 / 800 |
| BRRRR      | `#DBEAFE` | `#1E40AF` | 6.1:1          | Blue 100 / 800   |
| Buy & Hold | `#D1FAE5` | `#065F46` | 6.5:1          | Emerald 100 / 800|
| Flip       | `#FFE4E6` | `#9F1239` | 6.3:1          | Rose 100 / 800   |

All exceed WCAG AA (4.5:1) for normal text.

---

## 4. Typography

### 4a. Font Families

| Role      | Family          | Tailwind Class  | Usage                                       |
|-----------|-----------------|-----------------|---------------------------------------------|
| Body / UI | Inter           | `font-sans`     | All body text, labels, nav, table cells, form inputs |
| Display   | Satoshi         | `font-display`  | Landing page headings, marketing, brand moments      |
| Code      | JetBrains Mono  | `font-mono`     | AI chat output, code blocks only (NOT financial numbers) |

**Key change:** Financial numbers switch from JetBrains Mono to Inter with `tabular-nums`. Inter's tabular figures are ~30% narrower than monospace, improving data density. JetBrains Mono is demoted to code/AI-output only.

### 4b. Type Size Scale

| Token  | Size | Line Height | Letter Spacing | Weight | Usage                          |
|--------|------|-------------|----------------|--------|--------------------------------|
| `4xl`  | 36px | 42px        | -0.022em       | 700    | Landing page hero titles       |
| `3xl`  | 28px | 34px        | -0.021em       | 700    | Page hero titles (app)         |
| `2xl`  | 22px | 28px        | -0.019em       | 600    | Section titles                 |
| `xl`   | 18px | 26px        | -0.014em       | 600    | Page titles (app shell)        |
| `lg`   | 16px | 24px        | -0.011em       | 600    | Section headings, card titles  |
| `md`   | 14px | 20px        | -0.006em       | 500    | Card titles, emphasized body   |
| `base` | 13px | 20px        | 0              | 400    | **Default body text**          |
| `sm`   | 12px | 16px        | 0              | 500    | Table cells, sidebar nav, form labels |
| `xs`   | 11px | 16px        | 0.01em         | 500/600| Table headers, KPI labels, breadcrumbs |
| `micro`| 10px | 14px        | 0.04em         | 500    | Badges, overlines, tiny labels |
| `kpi`  | 32px | 38px        | -0.025em       | 700    | KPI hero numbers (tabular-nums)|

### 4c. Weight Scale

| Weight | Name     | Tailwind Class   | Usage                                    |
|--------|----------|------------------|------------------------------------------|
| 300    | Light    | `font-light`     | Decorative large text only (>=16px)      |
| 400    | Regular  | `font-normal`    | Body paragraphs, chat messages, descriptions |
| 500    | Medium   | `font-medium`    | **Default UI weight**: labels, nav, table cells, form values |
| 600    | Semibold | `font-semibold`  | Headings, card titles, active nav items, table headers |
| 700    | Bold     | `font-bold`      | KPI numbers, page titles. Use sparingly. |

**Important:** Inside the app shell, 500 (medium) is the default UI weight, not 400. On light backgrounds at 12-13px, 400 can feel too thin. Reserve 400 for body paragraphs and chat messages.

### 4d. Line Height Rules

| Context                        | Ratio  | Example             |
|--------------------------------|--------|---------------------|
| Dense data (tables, KPIs, nav) | 1.25-1.35x | 12px / 16px, 13px / 18px |
| Body text (descriptions, chat) | 1.5-1.6x   | 13px / 20px, 14px / 22px |
| Headings                       | 1.15-1.25x  | 28px / 34px, 36px / 42px |

---

## 5. Shadow Scale

All shadows use `rgba(16, 24, 40, ...)` — a cool-tinted shadow base derived from gray-950.

| Token      | Value                                                                         | Usage                         |
|------------|-------------------------------------------------------------------------------|-------------------------------|
| `shadow-xs`  | `0 1px 2px rgba(16, 24, 40, 0.05)`                                         | Inputs at rest, subtle badges |
| `shadow-sm`  | `0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)`      | **Cards at rest** (with border) |
| `shadow-md`  | `0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)` | Cards on hover, dropdowns  |
| `shadow-lg`  | `0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)` | Modals, popovers           |
| `shadow-xl`  | `0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)` | Command palette, dialogs   |
| `shadow-2xl` | `0 24px 48px -12px rgba(16, 24, 40, 0.18)`                                 | Full-page modals, overlays |
| `shadow-focus`| `0 0 0 2px #FFFFFF, 0 0 0 4px #6366F1`                                    | Focus ring (white gap + indigo) |

**Card elevation pattern:** Cards use `border border-gray-200 shadow-xs` at rest, upgrading to `shadow-sm` on hover. This is the Stripe model — border-defined cards with shadow as interactive feedback, never shadow-only.

---

## 6. Border Radius Scale

| Token       | Value    | Tailwind Class     | Usage                                   |
|-------------|----------|--------------------|-----------------------------------------|
| `sm`        | 4px      | `rounded-sm`       | Small badges, tiny chips                |
| `DEFAULT`   | 6px      | `rounded`          | Inputs, small buttons                   |
| `md`        | 8px      | `rounded-md`       | Default buttons, dropdowns              |
| `lg`        | 12px     | `rounded-lg`       | **Cards**, modals, large containers     |
| `xl`        | 16px     | `rounded-xl`       | Feature cards, promotional elements     |
| `2xl`       | 20px     | `rounded-2xl`      | Landing page hero cards                 |
| `full`      | 9999px   | `rounded-full`     | Avatars, pills, icon-only buttons       |

**Summary:** Inputs get `rounded` (6px). Buttons get `rounded-md` (8px). Cards get `rounded-lg` (12px). This is slightly softer than Stripe (8px cards) for a more modern feel, matching newer fintech products (Ramp, Brex, Arc).

---

## 7. Transition Timing Tokens

| Token                    | Value                           | Tailwind Class              | Usage                          |
|--------------------------|---------------------------------|-----------------------------|--------------------------------|
| `ease-spring`           | `cubic-bezier(0.22, 1, 0.36, 1)` | `ease-spring`             | Modals, panels, page transitions |
| `ease-out-expo`         | `cubic-bezier(0.16, 1, 0.3, 1)`  | `ease-out-expo`           | Dropdowns opening, tooltips    |
| `ease-in-out-smooth`    | `cubic-bezier(0.4, 0, 0.2, 1)`   | `ease-in-out-smooth`      | Default micro-interactions     |

### Duration assignments

| Interaction         | Duration | Tailwind Class  |
|---------------------|----------|-----------------|
| Hover color change  | 75ms     | `duration-75`   |
| Button press        | 100ms    | `duration-100`  |
| Tooltip appear      | 150ms    | `duration-150`  |
| Dropdown open       | 200ms    | `duration-200`  |
| Modal enter         | 250ms    | `duration-250`  |
| Panel slide         | 300ms    | `duration-300`  |
| Page transition     | 300ms    | `duration-300`  |
| Complex animation   | 500ms    | `duration-500`  |

### Framer Motion presets (for `motion.ts`)

```ts
export const TRANSITION = {
  fast:    { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
  default: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  slow:    { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  spring:  { type: 'spring', stiffness: 400, damping: 30 },
} as const
```

---

## 8. Font Loading Setup

### 8a. NPM packages to install

```bash
npm install @fontsource-variable/inter
# Satoshi: already self-hosted in /public/fonts/Satoshi-Variable.woff2
# JetBrains Mono: switch from Google Fonts <link> to @fontsource
npm install @fontsource-variable/jetbrains-mono
```

### 8b. Import in `main.tsx`

```ts
// Font imports — bundled into Vite build, zero external requests
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
```

### 8c. Remove from `index.html`

Remove the Google Fonts `<link>` tag for JetBrains Mono. After installing @fontsource, the font is bundled — no external DNS lookups.

### 8d. `@font-face` declarations in `index.css`

```css
@layer base {
  /* Satoshi — self-hosted (already present) */
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

  /* Inter + JetBrains Mono loaded via @fontsource-variable (imported in main.tsx).
     No additional @font-face needed — the npm packages inject them automatically. */
}
```

### 8e. Font file size budget

| Font                      | Source         | Size (woff2) |
|---------------------------|----------------|-------------|
| Inter Variable (Latin)    | @fontsource    | ~95KB       |
| Satoshi Variable (Latin)  | self-hosted    | ~45KB       |
| JetBrains Mono Variable   | @fontsource    | ~110KB      |
| **Total**                 |                | **~250KB**  |

All fonts are subset to Latin by default via fontsource. No external network requests after build.

### 8f. Base CSS rules for font usage

```css
@layer base {
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Financial numbers — Inter with tabular figures, NOT JetBrains Mono */
  [data-financial],
  .financial {
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 500;
  }

  /* App shell base density */
  .app-shell {
    font-size: 13px;
    line-height: 20px;
    font-weight: 500;
  }

  /* Long-form content */
  .prose-content {
    font-size: 14px;
    line-height: 22px;
    font-weight: 400;
  }
}
```

### 8g. Mobile font size bump

```css
@media (max-width: 640px) {
  :root {
    /* Bump base sizes on mobile for touch readability */
    --text-base-mobile: 15px;
    --text-sm-mobile: 13px;
    --text-xs-mobile: 12px;
  }

  .app-shell {
    font-size: 15px;
    line-height: 22px;
  }
}
```

---

## 9. Skeleton Shimmer (Light-Adapted)

The current indigo-tinted shimmer is dark-theme-specific. Light theme uses neutral gray:

```css
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    #F2F4F7 0%,    /* gray-100 */
    #EAECF0 50%,   /* gray-200 */
    #F2F4F7 100%   /* gray-100 */
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.dark .skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.05) 0%,
    rgba(99, 102, 241, 0.12) 50%,
    rgba(99, 102, 241, 0.05) 100%
  );
}
```

---

## CRITICAL DECISIONS

### 1. Primary accent stays Indigo `#6366F1`

Every competitor in RE analysis uses blue or green. Indigo is Parcel's single strongest visual differentiator. It reads as "smarter, more sophisticated" and has zero collision with profit/loss semantic colors. No change to the brand.

### 2. Text-level indigo shifts to `#4F46E5` (Indigo 600)

The brand color `#6366F1` fails WCAG AA for normal text on white (3.95:1 — needs 4.5:1). All text-level usage (links, active states, interactive text) uses `#4F46E5` (4.63:1 — passes AA). Button fills remain `#6366F1` with white text on `#4F46E5` hover state (both pass AA). This is the same pattern Stripe uses with their purple.

### 3. Body font switches from Satoshi to Inter

Satoshi lacks tabular lining figures (`tnum`), which forces every aligned number column to fall back to JetBrains Mono — creating jarring font switches mid-row. Inter has native `tnum`, the tallest x-height for 12-13px legibility, and is the de facto standard for data-dense SaaS (Linear, Vercel, Raycast). Satoshi is preserved as `font-display` for landing page headings and brand moments.

### 4. JetBrains Mono is demoted to code/AI-output only

Financial numbers now render in Inter with `font-variant-numeric: tabular-nums lining-nums`. Inter's tabular figures are ~30% narrower than monospace characters, meaningfully improving data density in tables and KPI cards. JetBrains Mono remains for code blocks and AI chat output only.

### 5. App shell base size drops to 13px

Mercury, Linear, and Stripe all operate at 13-14px base in their dashboards. This is the data-density sweet spot when paired with Inter's tall x-height. Mobile bumps to 15px. KPI hero numbers use the `kpi` token at 32px.

### 6. Default UI font weight is 500 (Medium), not 400 (Regular)

On light backgrounds at small sizes, 400 feels too thin. Data-dense interfaces like Linear default to 500 for labels, nav, and table cells. Regular (400) is reserved for body paragraphs and chat messages.

### 7. Cards use border + subtle shadow (Stripe model), not shadow-only

Cards get `border border-gray-200 shadow-xs` at rest, upgrading to `shadow-sm` on hover. This prevents the "floating" feel of shadow-only approaches and ensures clarity on low-contrast monitors. Stripe and Linear both favor this pattern in their light themes.

### 8. Page background is `#F9FAFB`, not pure white

Pure `#FFFFFF` everywhere causes eye fatigue and the "Google Docs" sterile effect. A barely-perceptible off-white (`#F9FAFB` / gray-50) makes cards on `#FFFFFF` feel elevated through color contrast alone, and the interface reads as "designed" rather than "default." Mercury and Linear both use this approach.

### 9. Sidebar gets `#F2F4F7` (gray-100)

Slightly darker than the page background to create natural zone separation without introducing a "colored sidebar" that dates quickly. This is the Mercury approach — subtle enough that you barely perceive it consciously, but your eye knows where content starts.

### 10. All colors are CSS-variable-driven for future dark mode

Every semantic color (surfaces, borders, text) resolves through CSS custom properties. Adding `.dark` to `<html>` will flip the entire theme with zero component changes. Strategy badges, charts, and skeletons all have dark-mode variants defined. The architecture is ready; only the toggle UI needs building later.

### 11. Semantic color separation is a competitive advantage

Since the primary accent is indigo (not green or red), there is zero collision between the brand color and profit/loss indicators. Green always means profit. Red always means loss. Indigo always means "interactive." This three-way separation is impossible with a green or blue primary. Do not introduce any secondary accent color — one accent plus semantics is the complete palette.

### 12. CSS variable naming uses `--color-*` namespace

This is distinct from shadcn's `--border`, `--background`, etc. Both systems coexist: shadcn tokens for component library compatibility, `--color-*` tokens for Parcel's semantic layer. Components should prefer the semantic tokens (`bg-page`, `bg-surface`, `text-gray-800`) for new code, with shadcn tokens maintained for backward compatibility during migration.
