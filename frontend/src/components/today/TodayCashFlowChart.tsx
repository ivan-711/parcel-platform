import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'
import type { TodayPortfolioSummary } from '@/types'

interface Props {
  portfolio: TodayPortfolioSummary
}

function generateMonthlyData(monthlyCf: number, actuals?: { month: string; net: number }[]) {
  const now = new Date()
  const data: { month: string; projected: number; actual: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    const actualEntry = actuals?.find(a => a.month === monthKey)
    const actualValue = actualEntry ? Math.round(actualEntry.net) : 0

    data.push({
      month: label,
      projected: Math.round(monthlyCf),
      actual: actualValue,
    })
  }
  return data
}

export function TodayCashFlowChart({ portfolio }: Props) {
  const data = useMemo(
    () => generateMonthlyData(portfolio.total_cash_flow, portfolio.monthly_actuals),
    [portfolio.total_cash_flow, portfolio.monthly_actuals]
  )

  if (portfolio.total_cash_flow === 0) {
    return (
      <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
        <h3 className="text-[11px] uppercase tracking-wider text-[var(--chart-axis-text)] font-medium mb-4">
          Monthly Cash Flow
        </h3>
        <div className="flex items-center justify-center py-12 text-center">
          <p className="text-sm text-[var(--chart-axis-text)]">
            Cash flow tracking starts when you close your first deal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] uppercase tracking-wider text-[var(--chart-axis-text)] font-medium">
          Monthly Cash Flow
        </h3>
        <span className="text-[10px] text-[var(--chart-axis-text)]/60">
          Actual vs Projected
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="todayCfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toLocaleString()}`}
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
            formatter={(v: number, name: string) => [
              `$${v.toLocaleString()}`,
              name === 'projected' ? 'Projected' : 'Actual',
            ]}
          />
          <Area
            type="monotone"
            dataKey="projected"
            stroke="var(--chart-tooltip-text)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            dot={false}
            {...CHART_ANIMATION}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--chart-accent)"
            strokeWidth={2}
            fill="url(#todayCfGradient)"
            dot={false}
            {...CHART_ANIMATION}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
