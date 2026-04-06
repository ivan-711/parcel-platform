# Chart Library Research: Achieving Fey.com-Style Financial Visualizations

**Date:** 2026-04-05
**Objective:** Evaluate charting libraries for dark, dense, financial-terminal-style visualizations inspired by [Fey.com](https://fey.com)
**Current Stack:** Recharts 2.14.1, React 18, TypeScript, Tailwind CSS

---

## 1. Fey.com Stack Analysis

### Confirmed Technologies (via HTML source inspection + Render customer story)

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js (React) — confirmed via `buildId`, `nextExport`, `/_next/static/` paths |
| **UI Library** | React with styled-components (`data-styled.g` classes throughout) |
| **Market Data** | Polygon.io API (referenced in meta/endpoints) |
| **AI** | OpenAI GPT-4 Assistants API (SEC filing summaries) |
| **Hosting** | Render (migrated from GKE/GCP in 2024) |
| **Background Jobs** | Inngest (replaced Cloud Composer/Airflow) |
| **Payments** | Stripe |
| **Charting** | **Custom implementation** — no detectable third-party charting library (no D3, Recharts, TradingView, ECharts, or Chart.js references in HTML source) |

### Key Insight
Fey almost certainly uses **custom SVG or Canvas rendering** for their charts. No major charting library fingerprint appears in their markup. This means they either:
1. Built charts from scratch with raw SVG/Canvas
2. Use a heavily customized D3-based solution that doesn't leave identifiable traces
3. Use server-rendered chart images (unlikely given interactivity)

This is consistent with their premium aesthetic — the highest-quality financial UIs (Bloomberg Terminal, TradingView Pro, Fey) typically use custom chart rendering rather than off-the-shelf libraries.

**Sources:**
- [Render Customer Story — Fey](https://render.com/customers/fey)
- Direct HTML source inspection of fey.com

---

## 2. Library Comparison Table

| Library | Bundle (min+gz) | Dark Theme | Financial Charts | Tooltip Custom | React Quality | Maintained | Gradient Fills |
|---------|----------------|------------|-----------------|---------------|--------------|------------|---------------|
| **Recharts** | ~48 KB | CSS vars | Basic (line, area, bar) | Full custom JSX | Native React | Active (v3.8) | SVG linearGradient |
| **TradingView Lightweight** | ~45 KB | Built-in | Excellent (OHLC, candlestick, area, line, baseline, histogram) | Limited (HTML overlay) | Wrapper needed | Active (v5.1) | Built-in topColor/bottomColor |
| **uPlot** | ~15 KB | Manual CSS | Time series only | Manual DOM | Wrapper needed | Active (v1.6) | Canvas gradients |
| **Visx** (Airbnb) | ~15-30 KB* | Manual (unopinionated) | Build-your-own | Full custom SVG | Native React | Active (v3.12) | SVG linearGradient |
| **Apache ECharts** | ~167 KB (full) / ~80 KB (tree-shaken) | Built-in 'dark' theme | Excellent (candlestick, OHLC, k-line, heatmap) | Full custom HTML | Via echarts-for-react | Active (v6.0) | Built-in gradient support |
| **Nivo** | ~60-80 KB* | Theme object | Good (line, area, bar, heatmap) | Custom layers | Native React | Active (v0.99) | SVG gradients |
| **Tremor** | ~50 KB + Recharts | Tailwind dark: | Basic (uses Recharts internally) | Limited | Native React | Active (v3.18) | Via Recharts |
| **Victory** | ~55 KB | Theme objects | Good (line, area, bar, scatter) | Custom components | Native React | Active (v37.3) | SVG gradients |

*\* Visx is modular — you import only what you need. Full suite is larger.*

---

## 3. Detailed Library Reviews

### Recharts (Current — v3.8.1)
**Verdict: Keep and enhance. Best ROI for Parcel.**

**Pros:**
- Already integrated in 11 components across the codebase
- Native React components — declarative, composable
- Full SVG gradient support via `<defs>` / `<linearGradient>` — proven technique
- Complete tooltip customization via `content` prop (render any JSX)
- CSS variable theming works perfectly with Tailwind dark mode
- shadcn/ui charts are built on Recharts — large ecosystem of examples
- Active development with v3.x release

**Cons:**
- No built-in candlestick/OHLC (not needed for real estate)
- Bundle size (~48 KB gz) is mid-range
- SVG rendering can slow with 10K+ data points (not a concern for RE data)

**Dark Theme Implementation:**
```jsx
// Gradient fill with dark theme
<defs>
  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#8B7AFF" stopOpacity={0.4}/>
    <stop offset="95%" stopColor="#8B7AFF" stopOpacity={0}/>
  </linearGradient>
</defs>
<Area fill="url(#colorRevenue)" fillOpacity={1} stroke="#8B7AFF" />
```

**Sources:**
- [Recharts Gradient Fill CodePen](https://codepen.io/LeanyLabs/pen/jOWYpJx)
- [LeanlyLabs — Awesome React Charts Tips](https://leanylabs.com/blog/awesome-react-charts-tips/)
- [shadcn/ui Gradient Area Chart](https://www.shadcn.io/charts/area-chart/area-chart-09)

---

### TradingView Lightweight Charts (v5.1)
**Verdict: Best for pure financial charts, but overkill for Parcel.**

**Pros:**
- Purpose-built for financial data (stock/crypto)
- Built-in dark theme with near-black backgrounds
- Native gradient fills via `topColor` / `bottomColor` on Area series
- Canvas rendering — performant with large datasets
- 45 KB gzipped — compact
- 14.3K GitHub stars, backed by TradingView

**Cons:**
- Canvas-based — harder to style with CSS/Tailwind
- Tooltip customization is limited (HTML overlay, not React components)
- No bar charts, pie charts, radar charts — financial series only
- React integration requires a wrapper component (no official React package)
- API is imperative, not declarative React style
- Would need to maintain two charting libraries (this + Recharts for non-financial charts)

**When to use:** Only if building a dedicated stock/crypto price tracker. Not ideal for real estate analytics dashboards.

**Sources:**
- [Lightweight Charts — React Tutorial](https://tradingview.github.io/lightweight-charts/tutorials/react/simple)
- [Lightweight Charts — Area Style Options](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaStyleOptions)
- [GitHub — tradingview/lightweight-charts](https://github.com/tradingview/lightweight-charts)

---

### uPlot (v1.6.32)
**Verdict: Smallest and fastest, but poor developer experience.**

**Pros:**
- Tiny: ~15 KB gzipped — smallest option by far
- Blazing fast: 166K data points in 25ms, 10% CPU at 60fps updates
- Canvas rendering — great performance
- Zero dependencies

**Cons:**
- Imperative API — not React-idiomatic
- Minimal styling system — everything is manual
- No built-in tooltips, legends, or interactions
- Sparse documentation
- Small community
- Would require significant wrapper code for React integration

**When to use:** High-frequency real-time data (IoT, trading ticks). Overkill for Parcel's use case.

**Sources:**
- [GitHub — leeoniya/uPlot](https://github.com/leeoniya/uPlot)
- [uplot-react npm](https://www.npmjs.com/package/uplot-react)

---

### Visx (Airbnb — v3.12)
**Verdict: Maximum flexibility, but steep learning curve.**

**Pros:**
- Low-level D3 primitives wrapped in React components
- Modular — import only what you need (~15-30 KB for typical use)
- Full SVG control — can achieve any visual effect
- Built-in `lightTheme` / `darkTheme` for XYChart
- Backed by Airbnb — strong engineering

**Cons:**
- Steep learning curve — you build everything from primitives
- More code required for basic charts vs Recharts
- Smaller community and fewer ready-made examples
- Documentation is reference-style, not tutorial-style

**When to use:** When you need pixel-perfect custom visualizations and have the time to invest. Better suited for a dedicated data-viz team.

**Sources:**
- [GitHub — airbnb/visx](https://github.com/airbnb/visx)
- [Airbnb Engineering Blog — Introducing Visx](https://medium.com/airbnb-engineering/introducing-visx-from-airbnb-fd6155ac4658)

---

### Apache ECharts (v6.0)
**Verdict: Most powerful, but heaviest bundle.**

**Pros:**
- Built-in `'dark'` theme — one-line activation
- ECharts 6.0 has deep financial chart optimizations (candlestick, k-line, MACD, volume)
- Rich gradient support built into series options
- Canvas + SVG dual renderer
- Massive feature set: 3D, maps, animations, real-time streaming
- Tree-shakeable to reduce bundle

**Cons:**
- Full bundle is ~167 KB gzipped (tree-shaken still ~80 KB)
- `echarts-for-react` wrapper is a thin bridge, not native React
- Imperative configuration style (JSON options object, not JSX)
- Overkill for a SaaS dashboard
- Chinese-origin docs — English docs sometimes lag

**When to use:** Complex analytical dashboards with many chart types, real-time data, or 3D visualization.

**Sources:**
- [ECharts 6 Release Notes](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/)
- [echarts-for-react npm](https://www.npmjs.com/package/echarts-for-react)

---

### Nivo (v0.99)
**Verdict: Beautiful defaults, but heavy and less flexible for custom styling.**

**Pros:**
- Beautiful out-of-the-box aesthetics
- SVG, Canvas, and HTML rendering options
- Theme object for dark mode
- Good documentation with interactive examples
- Supports motion/animations natively

**Cons:**
- Larger bundle size (~60-80 KB for typical usage)
- Theme customization is object-based, not CSS — harder to integrate with Tailwind
- Less granular control than Recharts for custom tooltips
- Opinionated styling can fight against custom design systems

---

### Tremor (v3.18)
**Verdict: Uses Recharts internally — no advantage over direct Recharts.**

**Pros:**
- Tailwind-native dark mode (just works with `dark:` classes)
- Pre-built dashboard components (KPI cards, tables, charts)
- Good DX for rapid prototyping

**Cons:**
- Adds a wrapper layer over Recharts — same engine, more abstraction
- Less control over chart internals
- Limited chart type variety
- Bundle includes both Tremor components AND Recharts

**When to use:** Rapid prototyping of admin dashboards. Not for custom premium aesthetics.

---

### Victory (v37.3)
**Verdict: Solid but no compelling advantage over Recharts.**

**Pros:**
- Consistent API across web and React Native
- Theme system with dark mode support
- Good TypeScript support
- Maintained by NearForm (formerly Formidable)

**Cons:**
- Similar capabilities to Recharts but less popular (smaller community)
- CSS-in-JS styling approach — doesn't align with Tailwind
- No gradient fill primitives — requires manual SVG defs
- Migration from Recharts would be lateral, not an upgrade

---

## 4. Open Source References & Inspiration

### Closest to Fey Aesthetic

| Project | Stack | Relevance |
|---------|-------|-----------|
| [DariusLukasukas/stocks](https://github.com/DariusLukasukas/stocks) | Next.js 14, shadcn, Tailwind, Yahoo Finance | Modern stock tracker with dark theme, shadcn charts |
| [ojassingh/finance-dashboard](https://github.com/ojassingh/finance-dashboard) | Next.js, Alpha Vantage, OpenAI | Financial analytics with AI integration |
| [marcinsuski/finance-dashboard](https://github.com/marcinsuski/finance-dashboard) | React (Vite), TypeScript, MERN | Fullstack finance dashboard with dark mode |
| [shadcn/ui Charts](https://ui.shadcn.com/charts/area) | React, Recharts, Tailwind | Official gradient area charts with dark mode — **closest achievable reference** |
| [shadcn.io Charts Gallery](https://www.shadcn.io/charts) | React, Recharts | 53 chart components with CSS variable theming |
| [Reshaped + Recharts](https://www.reshaped.so/docs/getting-started/guidelines/recharts) | React, Recharts, CSS vars | Design system integration with dark mode via CSS variables |

### Bloomberg-Style / Terminal Projects

| Project | Stack | Notes |
|---------|-------|-------|
| [bloomberg-terminal topic](https://github.com/topics/bloomberg-terminal) | Various | Collection of Bloomberg-inspired dashboards |
| [ettec/open-trading-platform](https://github.com/ettec/open-trading-platform) | Go + React | Cross-asset trading platform with React client |
| [marketcalls/trading-dashboard](https://github.com/marketcalls/trading-dashboard) | React | Simple trading dashboard |
| [Stock Market Dashboard](https://github.com/marketcalls/stock-market-dashboard) | React, Plotly.js, Flask | Dark theme, candlestick charts |

---

## 5. Technique Guide: Achieving Fey Visual Effects

### 5.1 Gradient Area Fills (Recharts)

The core Fey effect: area charts with color fading from semi-opaque at the line to fully transparent at the baseline.

```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function FeyStyleChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          {/* Violet accent gradient — matches Parcel design system */}
          <linearGradient id="gradientViolet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B7AFF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
          </linearGradient>
          {/* Green for positive values */}
          <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
          {/* Red for negative values */}
          <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6B6966', fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6B6966', fontSize: 11 }}
          width={45}
        />
        <Tooltip content={<FrostedTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8B7AFF"
          strokeWidth={1.5}
          fill="url(#gradientViolet)"
          fillOpacity={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### 5.2 Frosted Glass Tooltips

Custom Recharts tooltip with glassmorphism. Browser support for `backdrop-filter` is 97%+.

```tsx
function FrostedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="
      rounded-lg px-3 py-2
      bg-[#1E1D1B]/80
      backdrop-blur-md
      border border-[#2A2926]/60
      shadow-xl shadow-black/20
    ">
      <p className="text-[11px] text-[#8C8985] mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}
```

### 5.3 Chart Container Styling (Fey-Inspired Dark)

```tsx
// Chart wrapper matching Parcel design tokens
function ChartContainer({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="
      bg-[#141311] rounded-xl border border-[#1E1D1B]
      p-4
    ">
      <h3 className="text-[13px] font-medium text-[#A8A49E] mb-3 tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
```

### 5.4 Financial Color Coding

```ts
// Semantic chart colors for the Parcel design system
export const chartColors = {
  // Primary
  violet: '#8B7AFF',
  // Financial
  positive: '#22C55E',   // Green — gains, income, appreciation
  negative: '#EF4444',   // Red — losses, expenses, depreciation
  neutral: '#6B6966',    // Muted — unchanged, baseline
  // Secondary data series
  series: [
    '#8B7AFF', // Violet
    '#38BDF8', // Sky blue
    '#F59E0B', // Amber
    '#A78BFA', // Light violet
    '#34D399', // Emerald
  ],
} as const;
```

### 5.5 Thin Clean Lines + Minimal Axes

Key Fey visual principles applied to Recharts:
- `strokeWidth={1.5}` — thin lines, not chunky
- `axisLine={false}` — remove axis lines entirely
- `tickLine={false}` — remove tick marks
- Muted tick label color (`#6B6966`)
- Small font size on labels (11px)
- `cartesianGrid={{ strokeDasharray: '3 3', stroke: '#1E1D1B', strokeOpacity: 0.5 }}` — subtle dotted grid or no grid at all

### 5.6 Sparkline Charts (for KPI Cards)

Tiny inline charts with no axes, tooltips, or labels — just the shape:

```tsx
function Sparkline({ data, color = '#8B7AFF' }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color})`}
          fillOpacity={1}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

## 6. Recommendation

### TL;DR: Stay with Recharts. Invest in styling, not migration.

The gap between Parcel's current charts and Fey's aesthetic is **a styling problem, not a library problem**. Recharts has all the technical capabilities needed:

| Fey Effect | Recharts Capability | Effort |
|------------|---------------------|--------|
| Gradient area fills | `<linearGradient>` in `<defs>` | 1 hour |
| Frosted glass tooltips | Custom `content` prop with `backdrop-filter` | 2 hours |
| Near-black backgrounds | CSS on container | 15 min |
| Thin clean lines | `strokeWidth`, axis props | 30 min |
| Red/green color coding | Conditional `stroke`/`fill` colors | 1 hour |
| Minimal axis labels | `axisLine={false}`, `tickLine={false}`, muted colors | 30 min |

**Total estimated effort: 1-2 days** to create a shared chart theme/wrapper that applies Fey-style aesthetics across all 11 existing chart components.

### Why NOT Migrate

| Option | Bundle Cost | Migration Effort | Gain |
|--------|------------|-----------------|------|
| Keep Recharts | 0 KB (already included) | 0 days | Apply styling techniques above |
| Add TradingView Lightweight | +45 KB, keep Recharts too | 3-5 days | Better financial charts, but Parcel isn't a stock tracker |
| Switch to ECharts | +80 KB, remove Recharts | 5-8 days (rewrite 11 components) | More chart types, but larger bundle |
| Switch to Visx | -20 KB | 8-12 days (steep learning curve) | More flexibility, but more code to maintain |
| Switch to uPlot | -33 KB | 10-15 days | Fastest rendering, worst DX |

### Recommended Action Plan

1. **Create `chartTheme.ts`** — centralized chart color tokens, gradient definitions, and default props matching the Parcel design system
2. **Build `<ChartContainer>`** — shared wrapper with dark card styling, title, and consistent spacing
3. **Build `<FrostedTooltip>`** — reusable glassmorphism tooltip component
4. **Create gradient defs helper** — function that generates `<linearGradient>` elements for any color
5. **Refactor existing 11 chart components** to use the shared theme and components
6. **Reference shadcn/ui charts** at [ui.shadcn.com/charts/area](https://ui.shadcn.com/charts/area) for production-quality Recharts patterns with dark mode

### If Requirements Change Later

- **Need candlestick/OHLC charts** → Add TradingView Lightweight Charts as a second library (only for those specific charts)
- **Need 10K+ data point performance** → Consider uPlot for that specific use case
- **Need 3D or geographic visualizations** → Consider ECharts for those specific features

The modular approach (Recharts as primary + specialized library for edge cases) is better than a full migration for a SaaS platform.

---

## Sources

- [Render Customer Story — Fey](https://render.com/customers/fey)
- [shadcn/ui Area Charts](https://ui.shadcn.com/charts/area)
- [shadcn.io Charts Gallery](https://www.shadcn.io/charts)
- [LeanlyLabs — Awesome React Charts Tips (Gradient Fills)](https://leanylabs.com/blog/awesome-react-charts-tips/)
- [Recharts Gradient Fill CodePen](https://codepen.io/LeanyLabs/pen/jOWYpJx)
- [Reshaped — Recharts CSS Variable Theming](https://www.reshaped.so/docs/getting-started/guidelines/recharts)
- [TradingView Lightweight Charts — GitHub](https://github.com/tradingview/lightweight-charts)
- [TradingView Lightweight Charts — Area Style Options](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AreaStyleOptions)
- [uPlot — GitHub](https://github.com/leeoniya/uPlot)
- [Visx — GitHub](https://github.com/airbnb/visx)
- [Airbnb Engineering — Introducing Visx](https://medium.com/airbnb-engineering/introducing-visx-from-airbnb-fd6155ac4658)
- [ECharts 6 Features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/)
- [Nivo Theming Guide](https://nivo.rocks/guides/theming/)
- [Tremor.so](https://www.tremor.so/)
- [LogRocket — Best React Chart Libraries 2025](https://blog.logrocket.com/top-8-react-chart-libraries/)
- [Capital One — Comparison of Data Viz Libraries](https://www.capitalone.com/tech/software-engineering/comparison-data-visualization-libraries-for-react/)
- [Glassmorphism CSS Generator](https://hype4.academy/tools/glassmorphism-generator)
- [LogRocket — Glassmorphism in React](https://blog.logrocket.com/how-to-create-glassmorphism-effect-react/)
- [DariusLukasukas/stocks — Next.js Stock Tracker](https://github.com/DariusLukasukas/stocks)
