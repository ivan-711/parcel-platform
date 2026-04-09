import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'
import type { ScenarioDetail } from '@/types'

interface Props {
  scenario: ScenarioDetail
}

type Horizon = 10 | 20 | 30

const HORIZONS: Horizon[] = [10, 20, 30]

/**
 * Generate a 30-year cash flow projection using real compound growth math.
 *
 * Year N rent = Year 1 rent * (1 + rentGrowth)^(N-1)
 * Year N variable expenses = Year 1 variable expenses * (1 + expenseGrowth)^(N-1)
 * Fixed payments (mortgage/debt service) stay constant — they are contractual
 * obligations, not variable costs subject to inflation.
 */
function generateProjection(scenario: ScenarioDetail): Array<{ year: number; annual: number; cumulative: number }> {
  const outputs = scenario.outputs || {}
  const baseCashFlow = typeof outputs.monthly_cash_flow === 'number' ? outputs.monthly_cash_flow : 0

  // If we have no cash flow data, return empty (don't fabricate)
  if (baseCashFlow === 0 && !outputs.annual_cash_flow) return []

  const rentGrowth = 0.02      // 2% annual rent growth
  const expenseGrowth = 0.03   // 3% annual expense growth (variable only)

  // Decompose: cash_flow = rent - fixed_payment - variable_expenses
  const baseRent = typeof outputs.effective_gross_income === 'number'
    ? outputs.effective_gross_income
    : (typeof scenario.monthly_rent === 'number' ? Number(scenario.monthly_rent) : baseCashFlow * 2)

  // Fixed payment: mortgage P&I (or monthly_payment for creative finance).
  // This does NOT grow — it's a contractual obligation.
  const fixedPayment = typeof outputs.monthly_pi === 'number'
    ? outputs.monthly_pi
    : (typeof outputs.monthly_payment === 'number' ? outputs.monthly_payment : 0)

  // Variable expenses: everything else (taxes, insurance, maintenance, etc.)
  // These grow at the expense growth rate.
  const baseVariableExpenses = baseRent - fixedPayment - baseCashFlow

  const data: Array<{ year: number; annual: number; cumulative: number }> = []
  let cumulative = 0

  for (let y = 1; y <= 30; y++) {
    const rent = baseRent * Math.pow(1 + rentGrowth, y - 1)
    const variableExpenses = baseVariableExpenses * Math.pow(1 + expenseGrowth, y - 1)
    // Fixed payment stays flat — no compounding
    const monthly = Math.round(rent - fixedPayment - variableExpenses)
    const annual = monthly * 12
    cumulative += annual
    data.push({ year: y, annual, cumulative })
  }
  return data
}

function tickInterval(horizon: Horizon): number {
  if (horizon === 10) return 1
  if (horizon === 20) return 2
  return 5
}

export function CashFlowChart({ scenario }: Props) {
  const [showCumulative, setShowCumulative] = useState(false)
  const [horizon, setHorizon] = useState<Horizon>(30)
  const allData = useMemo(() => generateProjection(scenario), [
    scenario.outputs?.monthly_cash_flow,
    scenario.outputs?.effective_gross_income,
    scenario.outputs?.monthly_pi,
    scenario.monthly_rent,
  ])

  // Don't render chart with no data — show honest empty state
  if (allData.length === 0) {
    return (
      <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
        <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
          Cash Flow Projection
        </h3>
        <div className="flex items-center justify-center py-12 text-center">
          <p className="text-sm text-[var(--chart-axis-text)]">
            Enter property value and rent estimate below to generate cash flow projections.
          </p>
        </div>
      </div>
    )
  }

  const data = allData.slice(0, horizon)
  const dataKey = showCumulative ? 'cumulative' : 'annual'
  const interval = tickInterval(horizon)

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium">
            Cash Flow Projection
          </h3>
          {/* Year horizon toggle */}
          <div className="flex items-center rounded-md border border-[var(--chart-border)] overflow-hidden">
            {HORIZONS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  horizon === h
                    ? 'bg-[var(--chart-accent)] text-white'
                    : 'text-[var(--chart-axis-text)] hover:text-[var(--chart-label-text)]'
                }`}
              >
                {h}yr
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-[11px] text-[var(--chart-axis-text)]">Cumulative</span>
          <button
            type="button"
            role="switch"
            aria-checked={showCumulative}
            onClick={() => setShowCumulative(!showCumulative)}
            className={`w-8 h-4 rounded-full transition-colors flex items-center ${showCumulative ? 'bg-[var(--chart-accent)]' : 'bg-[var(--chart-border)]'}`}
          >
            <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${showCumulative ? 'translate-x-4' : ''}`} />
          </button>
        </label>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v % interval === 0 ? `Yr ${v}` : ''}
            />
            <YAxis
              tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--chart-tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                borderRadius: '8px',
                boxShadow: 'var(--chart-tooltip-shadow)',
                backdropFilter: 'blur(var(--chart-tooltip-blur))',
              }}
              labelStyle={{ color: 'var(--chart-tooltip-label)' }}
              itemStyle={{ color: 'var(--chart-tooltip-text)' }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, showCumulative ? 'Cumulative' : 'Annual']}
              labelFormatter={(v: number) => `Year ${v}`}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="var(--chart-accent)"
              strokeWidth={2}
              fill="url(#cashFlowGradient)"
              {...CHART_ANIMATION}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
