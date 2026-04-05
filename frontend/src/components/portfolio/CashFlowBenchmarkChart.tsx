import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'

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
  backgroundColor: '#141311',
  border: '1px solid #1E1D1B',
  borderRadius: '8px',
  fontSize: '12px',
}

const axisTick = { fill: '#8A8580', fontSize: 10 }

export default function CashFlowBenchmarkChart({ properties }: Props) {
  if (!properties || properties.length === 0) return null

  const sorted = [...properties]
    .sort((a, b) => b.monthly_cash_flow - a.monthly_cash_flow)
    .map((p) => ({
      address: truncate(p.address),
      cash_flow: p.monthly_cash_flow,
    }))

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
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
            labelStyle={{ color: '#F0EDE8' }}
            formatter={(value: number) => [formatDollar(value), 'Cash Flow']}
          />
          <Bar dataKey="cash_flow" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.cash_flow >= 0 ? '#4ADE80' : '#F87171'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
