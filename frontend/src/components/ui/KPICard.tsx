import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useCountUp } from '@/hooks/useCountUp'
import { SkeletonCard } from './SkeletonCard'
import { cn } from '@/lib/utils'

type Format = 'percent' | 'currency' | 'number'

interface KPICardProps {
  label: string
  value: number
  format: Format
  delta?: number
  loading?: boolean
  className?: string
  /** Optional array of numbers to render a sparkline mini-chart at the bottom of the card. */
  sparklineData?: number[]
}

function formatValue(value: number, format: Format): string {
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'currency':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    case 'number':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }
}

/**
 * KPI metric card with count-up animation, delta badge, optional sparkline, and Inter tabular-nums value.
 * Use for all financial metrics on dashboards and deal results.
 * Pass `sparklineData` (array of numbers) to render a mini area chart at the bottom.
 */
export function KPICard({ label, value, format, delta, loading, className, sparklineData }: KPICardProps) {
  const animated = useCountUp(value)
  const isPositive = delta === undefined || delta >= 0

  const chartData = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return null
    return sparklineData.map((v, i) => ({ idx: i, value: v }))
  }, [sparklineData])

  const gradientId = useMemo(() => {
    return `sparkGrad-${label.replace(/\s+/g, '-').toLowerCase()}`
  }, [label])

  if (loading) {
    return <SkeletonCard className={className} lines={2} />
  }

  const strokeColor = isPositive ? '#65A30D' : '#DC2626'
  const fillOpacity = 0.08

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 space-y-1 overflow-hidden',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]',
        className
      )}
    >
      <p className="text-xs font-medium text-gray-500 tracking-wide">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 tabular-nums">
        {formatValue(animated, format)}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            'text-xs font-medium tabular-nums',
            delta >= 0 ? 'text-sky-600' : 'text-red-600'
          )}
        >
          {delta >= 0 ? '\u2191' : '\u2193'} {Math.abs(delta).toFixed(1)}
          {format === 'percent' ? 'pp' : ''}
        </p>
      )}
      {chartData && chartData.length > 1 && (
        <div className="mt-2 -mx-5 -mb-5">
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={fillOpacity} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
