/**
 * Shared Recharts theme constants.
 *
 * All chart components import from here instead of hardcoding colors.
 * Aligned with LUXURY-DESIGN-SYSTEM.md Chart Theme section.
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

// ── Static Defaults ─────────────────────────────────────────────────────────

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

