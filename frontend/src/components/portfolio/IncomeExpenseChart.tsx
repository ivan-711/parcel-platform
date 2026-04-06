import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'

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
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '8px',
  fontSize: '12px',
  backdropFilter: 'blur(var(--chart-tooltip-blur))',
  boxShadow: 'var(--chart-tooltip-shadow)',
}

const axisTick = { fill: 'var(--chart-axis-text)', fontSize: 11 }

export default function IncomeExpenseChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const mapped = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }))

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
        Monthly Income vs Expenses
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={mapped}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={formatDollar} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--chart-tooltip-text)' }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                income: 'Income',
                expenses: 'Expenses',
                net: 'Net',
              }
              return [formatDollar(value), labels[name] ?? name]
            }}
          />
          <Bar dataKey="income" fill="var(--chart-positive)" radius={[4, 4, 0, 0]} {...CHART_ANIMATION} />
          <Bar dataKey="expenses" fill="var(--chart-negative)" radius={[4, 4, 0, 0]} {...CHART_ANIMATION} />
          <Line
            type="monotone"
            dataKey="net"
            stroke="var(--chart-tooltip-text)"
            strokeWidth={2}
            dot={false}
            {...CHART_ANIMATION}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
