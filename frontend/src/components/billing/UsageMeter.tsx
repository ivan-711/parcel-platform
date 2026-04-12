import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { UsageMetric } from '@/types'

interface UsageMeterProps {
  metric: UsageMetric
}

export function UsageMeter({ metric }: UsageMeterProps) {
  const { display_name, current, limit } = metric

  if (limit === null) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{display_name}</span>
        <span className="text-sm text-text-secondary">Unlimited</span>
      </div>
    )
  }

  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const exceeded = pct >= 100
  const warning = pct >= 80

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-text-secondary">{display_name}</span>
        <span className="text-sm text-text-primary tabular-nums">
          {current} of {limit} used
        </span>
      </div>
      <div className="h-2 rounded-full bg-layer-3 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            exceeded ? 'bg-loss' : warning ? 'bg-warning' : 'bg-violet-400'
          )}
          initial={prefersReducedMotion ? { width: `${pct}%` } : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  )
}
