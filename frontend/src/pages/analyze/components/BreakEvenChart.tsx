import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer } from 'recharts'
import type { ScenarioDetail } from '@/types'

interface Props {
  scenario: ScenarioDetail
}

export function BreakEvenChart({ scenario }: Props) {
  const outputs = scenario.outputs || {}
  const totalInvestment = Number(outputs.total_investment || 0)
  const monthlyCashFlow = Number(outputs.monthly_cash_flow || 0)
  const breakEvenMonths = outputs.break_even_months as number | null

  const data = useMemo(() => {
    if (!totalInvestment || !monthlyCashFlow) return []
    const points = []
    for (let m = 0; m <= 60; m++) {
      const cumulative = -totalInvestment + monthlyCashFlow * m
      points.push({ month: m, cumulative: Math.round(cumulative) })
    }
    return points
  }, [totalInvestment, monthlyCashFlow])

  if (!totalInvestment || monthlyCashFlow <= 0 || data.length === 0) return null

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium">
          Break-Even Timeline
        </h3>
        {breakEvenMonths != null && (
          <span className="text-xs text-[#4ADE80]">
            Break-even: Month {breakEvenMonths}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="breakEvenGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fill: '#8A8580', fontSize: 10 }}
            axisLine={{ stroke: '#1E1D1B' }}
            tickLine={false}
            tickFormatter={(v) => `${v}mo`}
          />
          <YAxis
            tick={{ fill: '#8A8580', fontSize: 10 }}
            axisLine={{ stroke: '#1E1D1B' }}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#141311', border: '1px solid #1E1D1B', borderRadius: '8px', fontSize: '12px' }}
            labelFormatter={(v) => `Month ${v}`}
            formatter={(v: number) => [`$${v.toLocaleString()}`, 'Cumulative']}
          />
          <ReferenceLine y={0} stroke="#1E1D1B" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#8B7AFF"
            strokeWidth={2}
            fill="url(#breakEvenGreen)"
          />
          {breakEvenMonths != null && breakEvenMonths <= 60 && (
            <ReferenceDot
              x={breakEvenMonths}
              y={0}
              r={5}
              fill="#4ADE80"
              stroke="#0C0B0A"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
