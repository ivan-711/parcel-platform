/**
 * Shared Recharts theme constants — Dual Theme Edition.
 *
 * All chart components import from here instead of hardcoding colors.
 * Aligned with LUXURY-DESIGN-SYSTEM.md Chart Theme section.
 *
 * Theme-aware values read CSS custom properties at call time via
 * getChartTheme(). Static data colors (strategy, semantic) are
 * theme-independent and exported as plain constants.
 */

// ── Data Colors ─────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  // Strategy colors (ordered for multi-series)
  violet: '#8B7AFF',
  gold: '#E5A84B',
  green: '#6DBEA3',
  coral: '#D4766A',
  lightViolet: '#C4BEFF',
  amber: '#D4A867',

  // Semantic
  profit: '#6DBEA3',
  loss: '#C45E52',
  warning: '#D4A867',
  neutral: '#A09D98',

  // Strategy-specific (matches pipeline/badge colors)
  wholesale: '#E5A84B',
  brrrr: '#D4A867',
  buyAndHold: '#6DBEA3',
  flip: '#D4766A',
  creativeFinance: '#C4BEFF',
} as const

/** Ordered array for multi-series charts. */
export const CHART_SERIES = [
  CHART_COLORS.violet,
  CHART_COLORS.gold,
  CHART_COLORS.green,
  CHART_COLORS.coral,
  CHART_COLORS.lightViolet,
  CHART_COLORS.amber,
] as const

// ── Theme Detection ─────────────────────────────────────────────────────────

function isLightTheme(): boolean {
  return document.documentElement.classList.contains('light')
}

// ── Theme-Aware Getters ─────────────────────────────────────────────────────

/** Returns chart axis config for the current theme. */
export function getChartAxis() {
  const light = isLightTheme()
  return {
    tick: { fill: light ? '#5C5A56' : '#A09D98', fontSize: 11 },
    label: { fill: light ? '#98A2B3' : '#7A7872', fontSize: 11 },
    axisLine: false as const,
    tickLine: false as const,
  }
}

/** Returns chart grid config for the current theme. */
export function getChartGrid() {
  const light = isLightTheme()
  return {
    stroke: light ? 'rgba(0,0,0,0.08)' : '#3A3835',
    strokeDasharray: '3 3',
    strokeOpacity: light ? 1 : 0.5,
    vertical: false,
  }
}

/** Returns chart tooltip styles for the current theme. */
export function getChartTooltip() {
  const light = isLightTheme()
  return {
    contentStyle: {
      backgroundColor: light ? '#FFFFFF' : '#22211D',
      border: light ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      boxShadow: light
        ? '0 4px 12px rgba(0,0,0,0.08)'
        : '0 8px 32px rgba(0,0,0,0.3)',
      padding: '12px 16px',
    },
    labelStyle: {
      color: light ? '#667085' : '#A09D98',
      fontSize: 11,
      fontWeight: 500,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    itemStyle: {
      color: light ? '#1D2939' : '#F0EDE8',
      fontSize: 13,
      padding: '2px 0',
    },
    cursor: {
      stroke: '#8B7AFF',
      strokeOpacity: 0.3,
      strokeDasharray: '4 4',
    },
  }
}

/** Returns chart legend styles for the current theme. */
export function getChartLegend() {
  const light = isLightTheme()
  return {
    wrapperStyle: {
      paddingTop: 16,
      fontSize: 12,
      color: light ? '#667085' : '#A09D98',
    },
    iconSize: 8,
    iconType: 'circle' as const,
  }
}

/** Returns chart polar (radar) config for the current theme. */
export function getChartPolar() {
  const light = isLightTheme()
  return {
    grid: { stroke: light ? 'rgba(0,0,0,0.08)' : '#3A3835', strokeOpacity: light ? 1 : 0.3 },
    angleAxis: { tick: { fill: light ? '#5C5A56' : '#A09D98', fontSize: 11 } },
    radiusAxis: { tick: { fill: light ? '#98A2B3' : '#7A7872', fontSize: 10 }, axisLine: false as const },
  }
}

// ── Static Defaults (backwards compat — dark theme) ─────────────────────────
// These are kept for existing imports. New code should prefer the getter fns.

export const CHART_AXIS = {
  tick: { fill: '#A09D98', fontSize: 11 },
  label: { fill: '#7A7872', fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
} as const

export const CHART_GRID = {
  stroke: '#3A3835',
  strokeDasharray: '3 3',
  strokeOpacity: 0.5,
  vertical: false,
} as const

export const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#22211D',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: '#A09D98',
    fontSize: 11,
    fontWeight: 500,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  itemStyle: {
    color: '#F0EDE8',
    fontSize: 13,
    padding: '2px 0',
  },
  cursor: {
    stroke: '#8B7AFF',
    strokeOpacity: 0.3,
    strokeDasharray: '4 4',
  },
} as const

/** Spread onto <Tooltip> for consistent styling across all charts. */
export const tooltipProps = {
  contentStyle: CHART_TOOLTIP.contentStyle,
  labelStyle: CHART_TOOLTIP.labelStyle,
  itemStyle: CHART_TOOLTIP.itemStyle,
  cursor: CHART_TOOLTIP.cursor,
} as const

export const CHART_LEGEND = {
  wrapperStyle: {
    paddingTop: 16,
    fontSize: 12,
    color: '#A09D98',
  },
  iconSize: 8,
  iconType: 'circle' as const,
} as const

export const CHART_POLAR = {
  grid: { stroke: '#3A3835', strokeOpacity: 0.3 },
  angleAxis: { tick: { fill: '#A09D98', fontSize: 11 } },
  radiusAxis: { tick: { fill: '#7A7872', fontSize: 10 }, axisLine: false as const },
} as const

// ── Animation Defaults ──────────────────────────────────────────────────────

export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 500,
  animationEasing: 'ease-out' as const,
} as const

// ── Strategy Color Map (keyed by Strategy type) ─────────────────────────────

export const STRATEGY_CHART_COLORS: Record<string, string> = {
  wholesale: CHART_COLORS.wholesale,
  creative_finance: CHART_COLORS.creativeFinance,
  brrrr: CHART_COLORS.brrrr,
  buy_and_hold: CHART_COLORS.buyAndHold,
  flip: CHART_COLORS.flip,
} as const
