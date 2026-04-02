/**
 * 12-month cash flow projection chart.
 *
 * Renders a Recharts AreaChart with monthly cash flow (olive/lime) and cumulative
 * cash flow (sky blue) lines. Data generation is strategy-aware:
 * - buy_and_hold / creative_finance: steady monthly cash flow with seeded variance
 * - brrrr: rehab period (negative) then rental income
 * - wholesale / flip: holding costs then profit at sale
 *
 * Falls back to a tasteful empty state when deal outputs lack the fields
 * needed to generate a projection.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { slideUp } from '@/lib/motion'
import { CHART_COLORS, CHART_AXIS, CHART_GRID, CHART_ANIMATION } from '@/lib/chart-theme'
import type { Strategy } from '@/types'

interface CashFlowProjectionProps {
  /** Deal calculator outputs (strategy-specific JSONB object). */
  outputs: Record<string, number | string>
  /** The deal strategy — determines projection shape. */
  strategy: Strategy
  /** Deal ID used as seed for deterministic monthly variance. */
  dealId: string
}

interface MonthDataPoint {
  month: string
  monthlyCashFlow: number
  cumulativeCashFlow: number
}

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces deterministic values in [0, 1).
 */
function seededRandom(seed: number): () => number {
  let t = seed
  return () => {
    t = (t + 0x6D2B79F5) | 0
    let v = t
    v = Math.imul(v ^ (v >>> 15), v | 1)
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61)
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296
  }
}

/** Convert a UUID-style deal ID string into a numeric seed. */
function hashDealId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Safely extract a numeric value from outputs. */
function getNum(outputs: Record<string, number | string>, key: string): number | null {
  const val = outputs[key]
  if (val === undefined || val === null) return null
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? null : n
}

/**
 * Generate 12-month projection data based on strategy and deal outputs.
 * Returns null if the outputs don't contain enough data for a projection.
 */
function generateProjection(
  outputs: Record<string, number | string>,
  strategy: Strategy,
  dealId: string
): MonthDataPoint[] | null {
  const rng = seededRandom(hashDealId(dealId))

  /** Apply deterministic +/-5% variance to a base value. */
  const withVariance = (base: number): number => {
    const factor = 0.95 + rng() * 0.1 // range: 0.95 to 1.05
    return Math.round(base * factor)
  }

  const months: MonthDataPoint[] = []
  let cumulative = 0

  if (strategy === 'buy_and_hold' || strategy === 'creative_finance') {
    // Steady monthly income strategies
    const monthlyCF =
      getNum(outputs, 'monthly_cash_flow') ??
      getNum(outputs, 'monthly_noi') ??
      getNum(outputs, 'net_monthly_income')

    if (monthlyCF === null) return null

    for (let i = 1; i <= 12; i++) {
      const flow = withVariance(monthlyCF)
      cumulative += flow
      months.push({
        month: `Month ${i}`,
        monthlyCashFlow: flow,
        cumulativeCashFlow: cumulative,
      })
    }
  } else if (strategy === 'brrrr') {
    // Rehab period (months 1-3) then rental income (months 4-12)
    const rehabBudget =
      getNum(outputs, 'rehab_budget') ??
      getNum(outputs, 'rehab_cost') ??
      getNum(outputs, 'total_rehab_cost')
    const monthlyCF =
      getNum(outputs, 'monthly_cash_flow') ??
      getNum(outputs, 'monthly_noi')

    if (rehabBudget === null && monthlyCF === null) return null

    const rehabMonthly = rehabBudget !== null ? Math.round(-rehabBudget / 3) : -2000
    const rentalIncome = monthlyCF ?? 500

    for (let i = 1; i <= 12; i++) {
      const flow = i <= 3 ? withVariance(rehabMonthly) : withVariance(rentalIncome)
      cumulative += flow
      months.push({
        month: `Month ${i}`,
        monthlyCashFlow: flow,
        cumulativeCashFlow: cumulative,
      })
    }
  } else if (strategy === 'wholesale') {
    // Quick turnaround: small holding costs then profit
    const profit =
      getNum(outputs, 'profit_at_ask') ??
      getNum(outputs, 'gross_profit') ??
      getNum(outputs, 'assignment_fee')
    const holdingCost =
      getNum(outputs, 'holding_cost_monthly') ??
      getNum(outputs, 'monthly_holding_cost')

    if (profit === null) return null

    // Wholesale deals close fast: 1-2 months holding, profit on month 2
    const monthly = holdingCost !== null ? -Math.abs(holdingCost) : Math.round(-Math.abs(profit) * 0.02)

    for (let i = 1; i <= 12; i++) {
      let flow: number
      if (i === 1) {
        flow = withVariance(monthly)
      } else if (i === 2) {
        flow = Math.round(Math.abs(profit) + monthly)
      } else {
        flow = 0
      }
      cumulative += flow
      months.push({
        month: `Month ${i}`,
        monthlyCashFlow: flow,
        cumulativeCashFlow: cumulative,
      })
    }
  } else if (strategy === 'flip') {
    // Holding costs during rehab, profit on sale at the end
    const grossProfit =
      getNum(outputs, 'gross_profit') ??
      getNum(outputs, 'net_profit') ??
      getNum(outputs, 'profit')
    const holdingCost =
      getNum(outputs, 'holding_cost_monthly') ??
      getNum(outputs, 'monthly_holding_cost')
    const rehabBudget =
      getNum(outputs, 'rehab_budget') ??
      getNum(outputs, 'rehab_cost')

    if (grossProfit === null) return null

    // Assume 6-month holding period for flips
    const holdMonths = 6
    const monthlyHold = holdingCost !== null
      ? -Math.abs(holdingCost)
      : Math.round(-Math.abs(grossProfit) * 0.03)
    const rehabMonthly = rehabBudget !== null ? Math.round(-Math.abs(rehabBudget) / holdMonths) : 0

    for (let i = 1; i <= 12; i++) {
      let flow: number
      if (i < holdMonths) {
        flow = withVariance(monthlyHold + rehabMonthly)
      } else if (i === holdMonths) {
        // Sale month: profit minus last month's costs
        flow = Math.round(Math.abs(grossProfit) + monthlyHold + rehabMonthly)
      } else {
        flow = 0
      }
      cumulative += flow
      months.push({
        month: `Month ${i}`,
        monthlyCashFlow: flow,
        cumulativeCashFlow: cumulative,
      })
    }
  } else {
    return null
  }

  return months
}

/** Format dollar amounts for axis labels and tooltips. */
function formatDollar(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value.toLocaleString('en-US')}`
}

/** Format full currency for tooltip display. */
function formatTooltipCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Custom tooltip for the chart. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border-default bg-[#22211D]/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.55)]">
      <p className="text-xs font-medium text-text-secondary mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-text-secondary">
            {entry.dataKey === 'monthlyCashFlow' ? 'Monthly' : 'Cumulative'}:
          </span>
          <span
            className={`text-sm font-medium tabular-nums ${
              entry.value >= 0 ? 'text-text-primary' : 'text-[#D4766A]'
            }`}
          >
            {formatTooltipCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CashFlowProjection({ outputs, strategy, dealId }: CashFlowProjectionProps) {
  const data = useMemo(
    () => generateProjection(outputs, strategy, dealId),
    [outputs, strategy, dealId]
  )

  // Empty state when data can't be generated
  if (!data) {
    return (
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-border-subtle bg-app-surface p-6 shadow-xs"
      >
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          12-Month Cash Flow Projection
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-layer-3 mb-3">
            <TrendingUp size={20} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-secondary mb-1">
            Projection unavailable
          </p>
          <p className="text-xs text-text-secondary max-w-xs">
            Cash flow projection requires monthly income or profit data in the analysis outputs.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-border-subtle bg-app-surface p-6 shadow-xs"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-primary">
          12-Month Cash Flow Projection
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#8B7AFF]" />
            <span className="text-xs text-text-secondary">Monthly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#6DBEA3]" />
            <span className="text-xs text-text-secondary">Cumulative</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full" aria-label="12-month cash flow projection chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 12, left: 12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B7AFF" stopOpacity={0.30} />
                <stop offset="50%" stopColor="#8B7AFF" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={CHART_GRID.stroke}
              strokeDasharray={CHART_GRID.strokeDasharray}
              strokeOpacity={CHART_GRID.strokeOpacity}
              vertical={CHART_GRID.vertical}
            />
            <XAxis
              dataKey="month"
              tick={CHART_AXIS.tick}
              tickLine={CHART_AXIS.tickLine}
              axisLine={CHART_AXIS.axisLine}
              tickFormatter={(value: string) => value.replace('Month ', 'M')}
            />
            <YAxis
              tick={CHART_AXIS.tick}
              tickLine={CHART_AXIS.tickLine}
              axisLine={CHART_AXIS.axisLine}
              tickFormatter={formatDollar}
              width={60}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: '#8B7AFF', strokeOpacity: 0.3 }}
            />
            <Area
              type="monotone"
              dataKey="monthlyCashFlow"
              stroke={CHART_COLORS.violet}
              strokeWidth={2}
              fill="url(#cashFlowGradient)"
              {...CHART_ANIMATION}
            />
            <Area
              type="monotone"
              dataKey="cumulativeCashFlow"
              stroke={CHART_COLORS.green}
              strokeWidth={2}
              fill="none"
              {...CHART_ANIMATION}
              animationBegin={150}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
