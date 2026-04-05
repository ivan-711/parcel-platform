import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  byStrategy: Record<string, number>
  byValue: Record<string, number>
}

const STRATEGY_COLORS: Record<string, string> = {
  buy_and_hold: '#8B7AFF',
  brrrr: '#60A5FA',
  creative_finance: '#2DD4BF',
  flip: '#FBBF24',
  wholesale: '#F87171',
}

const DEFAULT_COLOR = '#8A8580'

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
  backgroundColor: '#141311',
  border: '1px solid #1E1D1B',
  borderRadius: '8px',
  fontSize: '12px',
}

export default function StrategyAllocationChart({ byStrategy, byValue }: Props) {
  const entries = Object.entries(byStrategy)
  if (entries.length === 0) return null

  const totalCount = entries.reduce((sum, [, v]) => sum + v, 0)

  const pieData = entries.map(([key, count]) => ({
    name: humanize(key),
    value: count,
    color: STRATEGY_COLORS[key] ?? DEFAULT_COLOR,
  }))

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
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
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-semibold text-[#F0EDE8]">{totalCount}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: STRATEGY_COLORS[key] ?? DEFAULT_COLOR }}
              />
              <span className="text-[#C5C0B8]">{humanize(key)}</span>
              <span className="text-[#8A8580]">
                {count} &middot; {formatDollar(byValue[key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
