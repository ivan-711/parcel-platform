import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { CHART_ANIMATION } from '@/lib/chart-theme'

interface Props {
  data: { month: string; total_equity: number; total_value: number }[]
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

export default function EquityGrowthChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const mapped = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }))

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
        Equity Growth
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={mapped}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={formatDollar} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--chart-tooltip-text)' }}
            formatter={(value: number, name: string) => [
              formatDollar(value),
              name === 'total_equity' ? 'Equity' : 'Value',
            ]}
          />
          <Area
            type="monotone"
            dataKey="total_equity"
            stroke="var(--chart-accent)"
            fill="url(#equityGrad)"
            strokeWidth={2}
            {...CHART_ANIMATION}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
