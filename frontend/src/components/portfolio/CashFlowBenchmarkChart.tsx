import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'

interface Props {
  properties: { address: string; monthly_cash_flow: number }[]
}

function truncate(s: string, max = 25) {
  return s.length > max ? s.slice(0, max) + '...' : s
}

function formatDollar(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const tooltipStyle = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '8px',
  fontSize: '12px',
  backdropFilter: 'blur(var(--chart-tooltip-blur))',
  boxShadow: 'var(--chart-tooltip-shadow)',
}

const axisTick = { fill: 'var(--chart-axis-text)', fontSize: 11 }

export default function CashFlowBenchmarkChart({ properties }: Props) {
  if (!properties || properties.length === 0) return null

  const sorted = [...properties]
    .sort((a, b) => b.monthly_cash_flow - a.monthly_cash_flow)
    .map((p) => ({
      address: truncate(p.address),
      cash_flow: p.monthly_cash_flow,
    }))

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
        Cash Flow by Property
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={sorted} layout="vertical">
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={formatDollar} />
          <YAxis
            type="category"
            dataKey="address"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--chart-tooltip-text)' }}
            formatter={(value: number) => [formatDollar(value), 'Cash Flow']}
          />
          <Bar dataKey="cash_flow" radius={[0, 4, 4, 0]} {...CHART_ANIMATION}>
            {sorted.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.cash_flow >= 0 ? 'var(--chart-positive)' : 'var(--chart-negative)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
