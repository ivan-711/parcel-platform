import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { STRATEGY_CHART_COLORS } from '@/lib/chart-theme'

interface Props {
  byStrategy: Record<string, number>
  byValue: Record<string, number>
}

const DEFAULT_COLOR = '#A09D98'

function humanize(key: string) {
  const map: Record<string, string> = {
    buy_and_hold: 'Buy & Hold',
    brrrr: 'BRRRR',
    creative_finance: 'Creative Finance',
    flip: 'Flip',
    wholesale: 'Wholesale',
  }
  return map[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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

export default function StrategyAllocationChart({ byStrategy, byValue }: Props) {
  const entries = Object.entries(byStrategy)
  if (entries.length === 0) return null

  const totalCount = entries.reduce((sum, [, v]) => sum + v, 0)

  const pieData = entries.map(([key, count]) => ({
    name: humanize(key),
    value: count,
    color: STRATEGY_CHART_COLORS[key] ?? DEFAULT_COLOR,
  }))

  return (
    <div className="bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl p-5">
      <h3 className="text-[11px] text-[var(--chart-axis-text)] uppercase tracking-wider font-medium mb-4">
        Strategy Allocation
      </h3>
      <div className="flex items-center gap-6">
        <div className="relative w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                strokeWidth={0}
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-semibold text-[var(--chart-tooltip-text)]">{totalCount}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: STRATEGY_CHART_COLORS[key] ?? DEFAULT_COLOR }}
              />
              <span className="text-[var(--chart-label-text)]">{humanize(key)}</span>
              <span className="text-[var(--chart-axis-text)]">
                {count} &middot; {formatDollar(byValue[key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
