import { motion } from 'framer-motion'
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
        <span className="text-sm font-medium text-gray-700">{display_name}</span>
        <span className="text-sm text-gray-500">Unlimited</span>
      </div>
    )
  }

  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const exceeded = pct >= 100
  const warning = pct >= 80

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{display_name}</span>
        <span className="text-sm text-gray-500 tabular-nums">
          {current} of {limit} used
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            exceeded ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-lime-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  )
}
