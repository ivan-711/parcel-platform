# Chart Visual Design Research: Premium Financial Terminal Aesthetic

## Research Date: 2026-04-05
## Purpose: Visual specifications for Parcel's chart system (dark + light themes)

---

## 1. Fey.com Visual Design System

Fey was a premium finance app (acquired by Wealthsimple, wound down Sept 2025) widely regarded as "the most well-designed financial software." Built on Next.js.

### Color Palette (extracted from fey.com source)
| Token | Value | Usage |
|-------|-------|-------|
| Primary Background | `#000000` | Page background |
| Text Primary | `#FFFFFF` | Headlines, prices |
| Text Secondary | `#868F97` | Labels, secondary info |
| Text Tertiary | `#E6E6E6` | Subtle text elements |
| Accent Blue | `#479FFA` | Interactive/hover states |
| Accent Green | `#4EBE96` | Positive values, gains |
| Accent Orange | `#FFA16C` | Warnings, highlights |
| Accent Red | `#FF5C5C` | Negative values, losses |
| Alt Red | `#d9323f` / `#db3b47` | Error states |
| Subtle BG (high) | `rgba(255,255,255,0.08)` | Card backgrounds |
| Subtle BG (low) | `rgba(255,255,255,0.04)` | Hover states, dividers |

### Typography
- **Font Family**: `'Calibre'` by Klim Type Foundry (with fallback)
- **Weight range**: 400 (body), 600-700 (headings)
- **Size scale**: 54px (hero) > 48px > 36px > 24px > 18px > 16px > 14px (standard)
- **Line heights**: 110% (tight/hero), 125%, 132%, 140% (body)

### Gradients
| Name | Value | Usage |
|------|-------|-------|
| Text Orange | `linear-gradient(97.13deg, #FFA16C 8.47%, #551B10 108.41%)` | Accent text |
| Text Blue | `linear-gradient(96.44deg, #B6D6FF 6.12%, #393F56 110.28%)` | Feature text |
| Glass Effect | `linear-gradient(182.51deg, rgba(255,255,255,0.02)...)` | Card overlays |

### Border & Shadow
- **Border Radius**: 16px (cards), 12px (charts), 7px (buttons), 5px (inputs), 99px (pills)
- **Box Shadows**:
  - Standard: `0px 30.044px 16.244px rgba(0,0,0,0.1207)`
  - Deep: `9.226px 43.567px 43.317px rgba(0,0,0,0.753)`
  - Inset glass: `inset 1.25px 1.25px 1.25px rgba(255,255,255,0.32)`

### Backdrop / Glass Effects
- **Blur values**: 10px (standard), 21px (medium), 75px (heavy), 217.5px (ambient)
- **Opacity range**: 0.04, 0.08, 0.15, 0.2, 0.6, 0.7

### Animations
- **Keyframes**: `fadein`, `fadeout`, `wipeAnimation` (mask position -100% to 120%)
- **Durations**: 0.1s, 0.15s (micro), 0.25s (standard), 0.6-0.9s (staggered entry)
- **Easing**: `cubic-bezier(0.55, 0.085, 0.68, 0.53)` (ease-in), `ease-in-out`
- **Chart slide-in**: 1s ease-out animation for initial chart render

### Chart-Specific Details
- **SVG stroke color**: `#D88036` (orange accent line)
- **SVG stroke width**: 1.16667px
- **3D perspective**: `perspective(2200px) rotateX(-59deg)` (marketing hero)
- **Responsive scaling**: 1.214x to 3x depending on viewport

---

## 2. Recharts Dark Financial Dashboard Patterns

### 2A. DariusLukasukas/stocks Repository (Visx-based, applicable patterns)

This Next.js stock dashboard uses Visx (not Recharts) but demonstrates the canonical pattern for premium stock charts:

**Gradient Configuration (from AreaClosedChart.tsx):**
```tsx
<LinearGradient
  id={id}
  from={color}       // e.g., "green", "red", "dodgerblue"
  fromOpacity={0.6}  // <-- KEY: 60% opacity at top
  to={color}
  toOpacity={0}      // Fades to fully transparent
/>
```

**Line Styling:**
```tsx
<g strokeLinecap="round" className="stroke-1">
  {/* stroke-1 = 1px line weight */}
  <MemoLinePath data={data} x={x} y={y} stroke={color} />
</g>
```

**Crosshair / Hover Marker:**
```tsx
{/* Vertical crosshair line */}
<line
  x1={state.x} x2={state.x}
  y1={0} y2={680}
  stroke={isIncreasing ? "green" : "red"}
  strokeWidth={2}
/>
{/* Data point circle */}
<circle
  cx={state.x} cy={yScale(state.close)}
  r={8}
  fill={isIncreasing ? "green" : "red"}
  stroke="#FFF"
  strokeWidth={3}
/>
{/* Price label near cursor */}
<text
  x={dynamicX} y={0} dy={"0.75em"}
  fill={isIncreasing ? "green" : "red"}
  className="text-base font-medium"
>
  {formatCurrency(state.close)}
</text>
```

**Color Logic:**
- Green when `data[last].close > data[0].close` (positive period)
- Red when negative
- Dodgerblue (`#1E90FF`) when hovered (overrides green/red)

**Chart Animation:**
```css
#boundary {
  transition: transform 0.5s;
  animation: 1s ease-out 0s 1 slideInFromLeft;
}
.graph:hover #boundary {
  transition: none; /* Instant response on hover */
}
.marker line {
  pointer-events: none; /* Crosshair doesn't interfere with hover */
}
```

**Dark Theme CSS Variables (shadcn/ui pattern):**
```css
.dark {
  --background: 0 0% 3.9%;        /* Near-black: hsl(0,0%,3.9%) = #0a0a0a */
  --foreground: 0 0% 98%;         /* Near-white */
  --card: 0 0% 3.9%;              /* Same as background */
  --muted: 0 0% 14.9%;            /* Dark gray: #262626 */
  --muted-foreground: 0 0% 63.9%; /* Medium gray */
  --border: 0 0% 14.9%;           /* Subtle borders */
  --accent: 0 0% 14.9%;           /* Hover state bg */
}
```

### 2B. Recharts Gradient Best Practices (from LeanlyLabs)

**Standard gradient (bold):**
```tsx
<linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#129a74" stopOpacity={0.8} />
  <stop offset="95%" stopColor="#129a74" stopOpacity={0} />
</linearGradient>
```

**Subtle gradient (overlays/secondary):**
```tsx
<linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#129a74" stopOpacity={0.1} />
  <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.1} />
</linearGradient>
```

**SVG glow/shadow filter for lines:**
```tsx
<filter id="shadow" height="200%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="blur" />
  <feOffset in="blur" dx="0" dy="7" result="offsetBlur" />
  <feFlood floodColor="#109065" floodOpacity="0.5" result="offsetColor" />
  <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
  <feMerge>
    <feMergeNode />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

**Area component pattern:**
```tsx
<Area
  type="monotone"
  dataKey="close"
  stroke={false}       // No visible stroke line (gradient only)
  strokeWidth={2}
  fillOpacity={1}      // Let gradient handle opacity
  fill="url(#colorUv)"
/>
```

---

## 3. shadcn/ui Chart System

### Chart Container Architecture

shadcn/ui does NOT wrap Recharts -- it provides a `ChartContainer` component that:
1. Injects CSS variables per-chart via `data-chart` attribute
2. Supports dual themes via `THEMES = { light: "", dark: ".dark" }`
3. Applies consistent Recharts overrides via Tailwind selectors

**Key CSS overrides applied by ChartContainer:**
```css
[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground
[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50
[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border
[&_.recharts-dot[stroke='#fff']]:stroke-transparent
[&_.recharts-radial-bar-background-sector]:fill-muted
[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted
[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border
```

### Chart Config Pattern (dual theme support)
```tsx
const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",       // CSS variable approach
    // OR explicit per-theme:
    // theme: { light: "#2563eb", dark: "#60a5fa" }
  },
} satisfies ChartConfig
```

### Gradient Area Chart (from shadcn dashboard)
```tsx
<AreaChart data={filteredData}>
  <defs>
    <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={1.0} />
      <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
      <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
    </linearGradient>
  </defs>
  <CartesianGrid vertical={false} />
  <XAxis
    dataKey="date"
    tickLine={false}
    axisLine={false}
    tickMargin={8}
    minTickGap={32}
  />
  <ChartTooltip
    cursor={false}
    content={<ChartTooltipContent indicator="dot" />}
  />
  <Area
    dataKey="mobile"
    type="natural"           // <-- shadcn uses "natural" curve type
    fill="url(#fillMobile)"
    stroke="var(--color-mobile)"
    stackId="a"
  />
</AreaChart>
```

### Tooltip Styling (from shadcn source)
```tsx
<div className={cn(
  "grid min-w-[8rem] items-start gap-1.5",
  "rounded-lg",
  "border border-border/50",
  "bg-background",
  "px-2.5 py-1.5",
  "text-xs",
  "shadow-xl",
  className
)} />
```

**Key observations:**
- `border-border/50` -- semi-transparent border (50% opacity)
- `bg-background` -- uses theme background (adapts to dark/light)
- `shadow-xl` -- prominent shadow for tooltip elevation
- `text-xs` -- small text (12px)
- `rounded-lg` -- 8px border radius

---

## 4. Specific Visual Techniques

### 4A. Recharts Curve Types Comparison

Available types: `basis`, `basisClosed`, `basisOpen`, `bump`, `bumpX`, `bumpY`, `linear`, `linearClosed`, `monotone`, `monotoneX`, `monotoneY`, `natural`, `step`, `stepAfter`, `stepBefore`

**Recommended for financial charts:**
| Type | Character | Best For |
|------|-----------|----------|
| `monotone` | Smooth, never overshoots data | Portfolio value, balances |
| `natural` | Smoother cubic spline, may overshoot | Trends, projections |
| `linear` | Sharp angles at data points | Raw price data |
| `basis` | Very smooth, B-spline | Decorative sparklines |
| `bump` / `bumpX` | Smooth S-curves | Step-like progressions |

**Recommendation**: Use `monotone` for financial accuracy (never creates false peaks/valleys). Use `natural` for aesthetic marketing charts where precision matters less.

### 4B. Animated Number Component (Framer Motion)
```tsx
"use client";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

function AnimatedNumber({ value }: { value: number }) {
  let spring = useSpring(value, {
    mass: 0.8,
    stiffness: 75,
    damping: 15
  });
  let display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );
  useEffect(() => { spring.set(value); }, [spring, value]);
  return <motion.span>{display}</motion.span>;
}
```

**Spring config for financial feel:**
- `mass: 0.8` -- slightly lighter than default (snappy)
- `stiffness: 75` -- moderate bounce
- `damping: 15` -- settles quickly

For currency formatting, replace `.toLocaleString()` with:
```tsx
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
}).format(current)
```

### 4C. Recharts Sparkline (minimal, no axes)
```tsx
<ResponsiveContainer width="100%" height={40}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.3} />
        <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity={0} />
      </linearGradient>
    </defs>
    <Area
      type="monotone"
      dataKey="value"
      stroke="var(--chart-accent)"
      strokeWidth={1.5}
      fill="url(#sparkGradient)"
      dot={false}
      isAnimationActive={false}
    />
  </AreaChart>
</ResponsiveContainer>
```
Key: Omit `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip` entirely.

### 4D. Chart Skeleton Loading
```tsx
// Tailwind shimmer animation
<div className="animate-pulse space-y-3">
  <div className="h-4 w-24 rounded bg-muted" />      {/* Title */}
  <div className="h-8 w-32 rounded bg-muted" />      {/* Value */}
  <div className="h-[200px] w-full rounded-lg bg-muted" /> {/* Chart area */}
</div>
```

For advanced shimmer (gradient sweep):
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted) / 0.5) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### 4E. Recharts Tooltip Cursor / Crosshair
```tsx
<Tooltip
  cursor={{
    stroke: "var(--muted-foreground)",
    strokeWidth: 1,
    strokeDasharray: "4 4",      // Dashed line
    strokeOpacity: 0.5,
  }}
  content={<CustomTooltip />}
/>

// OR solid thin crosshair:
<Tooltip
  cursor={{
    stroke: "hsl(var(--border))",
    strokeWidth: 1,
  }}
/>

// OR disable cursor entirely:
<Tooltip cursor={false} />
```

---

## 5. Glassmorphism Tooltip Specifications

### Dark Theme Tooltip
```css
.chart-tooltip-dark {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}
```

### Light Theme Tooltip
```css
.chart-tooltip-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

### Glass Card (for chart containers)
```css
.glass-card-dark {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-card-light {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
```

### Opacity Reference Table (dark backgrounds)
| Opacity | Use Case |
|---------|----------|
| `rgba(255,255,255, 0.04)` | Barely visible dividers |
| `rgba(255,255,255, 0.05)` | Glass card background |
| `rgba(255,255,255, 0.08)` | Elevated card, hover state |
| `rgba(255,255,255, 0.10)` | Tooltip bg, active borders |
| `rgba(255,255,255, 0.15)` | Tooltip border, emphasized bg |
| `rgba(255,255,255, 0.20)` | Strong border, bright divider |
| `rgba(17,25,40, 0.75)` | Dark glass overlay |

---

## 6. Dual Theme (Light + Dark) Chart Recommendations for Parcel

### CSS Variable Architecture
```css
:root {
  /* Chart colors -- light theme */
  --chart-positive: #16a34a;        /* green-600 */
  --chart-negative: #dc2626;        /* red-600 */
  --chart-accent: #8B7AFF;          /* Parcel violet */
  --chart-accent-secondary: #6366f1; /* indigo-500 */
  --chart-muted: #94a3b8;           /* slate-400 */

  /* Gradient opacities -- light */
  --chart-gradient-from: 0.15;       /* Subtle on white */
  --chart-gradient-to: 0;
  --chart-line-width: 2;

  /* Tooltip */
  --chart-tooltip-bg: rgba(255, 255, 255, 0.8);
  --chart-tooltip-border: rgba(0, 0, 0, 0.08);
  --chart-tooltip-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  --chart-tooltip-blur: 12px;

  /* Grid */
  --chart-grid-color: rgba(0, 0, 0, 0.06);

  /* Axis */
  --chart-axis-color: #64748b;       /* slate-500 */
  --chart-axis-font-size: 12px;
}

.dark {
  /* Chart colors -- dark theme */
  --chart-positive: #4ade80;         /* green-400 */
  --chart-negative: #f87171;         /* red-400 */
  --chart-accent: #8B7AFF;           /* Parcel violet (same) */
  --chart-accent-secondary: #818cf8; /* indigo-400 */
  --chart-muted: #475569;            /* slate-600 */

  /* Gradient opacities -- dark */
  --chart-gradient-from: 0.4;        /* Richer on dark bg */
  --chart-gradient-to: 0;
  --chart-line-width: 1.5;           /* Thinner on dark */

  /* Tooltip */
  --chart-tooltip-bg: rgba(255, 255, 255, 0.06);
  --chart-tooltip-border: rgba(255, 255, 255, 0.1);
  --chart-tooltip-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --chart-tooltip-blur: 10px;

  /* Grid */
  --chart-grid-color: rgba(255, 255, 255, 0.06);

  /* Axis */
  --chart-axis-color: #94a3b8;       /* slate-400 */
  --chart-axis-font-size: 11px;
}
```

### Gradient Opacity Best Values by Theme
| Context | Light Theme | Dark Theme |
|---------|-------------|------------|
| Primary area gradient (top) | `0.12 - 0.20` | `0.35 - 0.60` |
| Primary area gradient (bottom) | `0` | `0` |
| Secondary/overlay area (top) | `0.08 - 0.12` | `0.15 - 0.25` |
| Sparkline gradient (top) | `0.15 - 0.25` | `0.25 - 0.40` |
| Line stroke width | `2px` | `1.5px` |
| Dot radius (active) | `4px` | `4px` |
| Dot radius (hover) | `6px` | `6px` |

### Recommended Component Pattern
```tsx
// Use CSS variables in linearGradient stops
<defs>
  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
    <stop
      offset="5%"
      stopColor="var(--chart-accent)"
      stopOpacity={/* read from CSS var or use 0.4 dark / 0.15 light */}
    />
    <stop
      offset="95%"
      stopColor="var(--chart-accent)"
      stopOpacity={0}
    />
  </linearGradient>
</defs>
```

Note: SVG `stopOpacity` cannot read CSS variables directly. The recommended approach is to either:
1. Use the shadcn `ChartConfig` theme system to set different colors per theme
2. Use a React hook to detect theme and conditionally set opacity
3. Define two gradient sets and show/hide based on theme class

---

## 7. Key Sources

- [Fey.com](https://fey.com) -- Source CSS/HTML inspection
- [Fey on NicelyDone (103 screens)](https://nicelydone.club/apps/fey)
- [Fey design breakdown](https://www.designsystemscollective.com/crafting-a-detailed-ui-kit-from-inspiration-breaking-down-feys-design-2d2761649e40)
- [Fey on NarrowLabs](https://www.narrowlabs.design/website-inspiration/fey-app)
- [DariusLukasukas/stocks (Next.js stock dashboard)](https://github.com/DariusLukasukas/stocks)
- [LeanlyLabs Recharts gradient tips](https://leanylabs.com/blog/awesome-react-charts-tips/)
- [shadcn/ui chart docs](https://ui.shadcn.com/docs/components/chart)
- [shadcn/ui chart examples](https://ui.shadcn.com/charts/area)
- [Reshaped Recharts CSS variables guide](https://www.reshaped.so/docs/getting-started/guidelines/recharts)
- [Glassmorphism dark backgrounds guide](https://csstopsites.com/glassmorphism-dark-backgrounds)
- [Motion AnimateNumber](https://motion.dev/docs/react-animate-number)
- [BuildUI animated number recipe](https://buildui.com/recipes/animated-number)
- [shadcn gradient area chart](https://www.shadcn.io/charts/area-chart/area-chart-09)
- [Recharts API - Tooltip](https://recharts.github.io/en-US/api/Tooltip/)
- [Recharts API - Line curve types](https://recharts.github.io/en-US/api/Line/)
