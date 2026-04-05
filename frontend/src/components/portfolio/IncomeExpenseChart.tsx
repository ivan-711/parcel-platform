import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { month: string; income: number; expenses: number; net: number }[]
}

function formatMonth(ym: string) {
  const [, m] = ym.split('-')
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return names[parseInt(m, 10) - 1] ?? ym
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

export default function IncomeExpenseChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const mapped = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }))

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
        Monthly Income vs Expenses
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={mapped}>
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={formatDollar} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#F0EDE8' }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                income: 'Income',
                expenses: 'Expenses',
                net: 'Net',
              }
              return [formatDollar(value), labels[name] ?? name]
            }}
          />
          <Bar dataKey="income" fill="#4ADE80" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="#F87171" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#F0EDE8"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
