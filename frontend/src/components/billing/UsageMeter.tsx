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
        <span className="text-sm font-medium text-[#A09D98]">{display_name}</span>
        <span className="text-sm text-[#7A7872]">Unlimited</span>
      </div>
    )
  }

  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const exceeded = pct >= 100
  const warning = pct >= 80

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[#A09D98]">{display_name}</span>
        <span className="text-sm text-[#F0EDE8] tabular-nums">
          {current} of {limit} used
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            exceeded ? 'bg-[#D4766A]' : warning ? 'bg-[#D4A867]' : 'bg-[#8B7AFF]'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  )
}
