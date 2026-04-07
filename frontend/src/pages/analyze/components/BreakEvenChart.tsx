import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer } from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'
import type { ScenarioDetail } from '@/types'

interface Props {
  scenario: ScenarioDetail
}

export function BreakEvenChart({ scenario }: Props) {
  const outputs = scenario.outputs || {}
  const totalInvestment = Number(outputs.total_investment || 0)
  const monthlyCashFlow = Number(outputs.monthly_cash_flow || 0)
  const breakEvenMonths = outputs.break_even_months as number | null

  // Compute break-even month and chart horizon dynamically
  const computedBreakEven = (totalInvestment > 0 && monthlyCashFlow > 0)
    ? Math.ceil(totalInvestment / monthlyCashFlow)
    : null
  const effectiveBreakEven = breakEvenMonths ?? computedBreakEven

  // Extend horizon to show break-even point + buffer, min 60
  const horizon = effectiveBreakEven && effectiveBreakEven > 60
    ? effectiveBreakEven + 12
    : 60

  const data = useMemo(() => {
    if (!totalInvestment || !monthlyCashFlow) return []
    const points = []
    for (let m = 0; m <= horizon; m++) {
      const cumulative = Math.round(-totalInvestment + monthlyCashFlow * m)
      points.push({
        month: m,
        cumulative,
        positive: cumulative >= 0 ? cumulative : 0,
        negative: cumulative < 0 ? cumulative : 0,
      })
    }
    return points
  }, [totalInvestment, monthlyCashFlow, horizon])

  if (!totalInvestment || data.length === 0) return null

  if (monthlyCashFlow <= 0) {
    return (
      <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
        <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
          Break-Even Timeline
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-[var(--chart-negative)]">
            This deal never breaks even at current terms
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium">
          Break-Even Timeline
        </h3>
        {breakEvenMonths != null && (
          <span className="text-xs text-[var(--chart-positive)]">
            Break-even: Month {breakEvenMonths}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="breakEvenPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-positive)" stopOpacity={0.20} />
              <stop offset="95%" stopColor="var(--chart-positive)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="breakEvenNegative" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="var(--chart-negative)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--chart-negative)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => {
              const step = horizon > 120 ? 24 : 12
              return value % step === 0 ? `${value}mo` : ''
            }}
            interval={0}
          />
          <YAxis
            tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '8px',
              boxShadow: 'var(--chart-tooltip-shadow)',
              backdropFilter: 'blur(var(--chart-tooltip-blur))',
            }}
            labelFormatter={(v) => `Month ${v}`}
            formatter={(v: number) => [`$${v.toLocaleString()}`, 'Cumulative']}
          />
          <ReferenceLine y={0} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="positive"
            stroke="none"
            fill="url(#breakEvenPositive)"
            tooltipType="none"
            {...CHART_ANIMATION}
          />
          <Area
            type="monotone"
            dataKey="negative"
            stroke="none"
            fill="url(#breakEvenNegative)"
            tooltipType="none"
            {...CHART_ANIMATION}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="var(--chart-accent)"
            strokeWidth={2}
            fill="none"
            {...CHART_ANIMATION}
          />
          {breakEvenMonths != null && breakEvenMonths <= horizon && (
            <ReferenceDot
              x={breakEvenMonths}
              y={0}
              r={5}
              fill="var(--chart-positive)"
              stroke="var(--chart-bg)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
