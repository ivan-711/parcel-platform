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
 * KPI metric card with count-up animation, delta badge, and JetBrains Mono value.
 * Use for all financial metrics on dashboards and deal results.
 */
export function KPICard({ label, value, format, delta, loading, className }: KPICardProps) {
  const animated = useCountUp(value)

  if (loading) {
    return <SkeletonCard className={className} lines={2} />
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1',
        className
      )}
    >
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-semibold font-mono text-text-primary">
        {formatValue(animated, format)}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            'text-xs font-mono font-medium',
            delta >= 0 ? 'text-accent-success' : 'text-accent-danger'
          )}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
          {format === 'percent' ? 'pp' : ''}
        </p>
      )}
    </div>
  )
}
