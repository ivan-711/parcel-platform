import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface PlanBadgeProps {
  planTier: string
  trialActive: boolean
}

export function PlanBadge({ planTier, trialActive }: PlanBadgeProps) {
  if (trialActive && planTier === 'free') {
    return (
      <span className="bg-lime-100 text-lime-700 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase">
        Trial
      </span>
    )
  }

  if (planTier === 'pro' || planTier === 'team' || planTier === 'starter') {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase',
          'bg-lime-700 text-white'
        )}
      >
        {planTier === 'team' ? 'Team' : planTier === 'starter' ? 'Starter' : 'Pro'}
      </span>
    )
  }

  // Free tier
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase">
        Free
      </span>
      <Link
        to="/settings"
        className="text-[11px] text-lime-700 hover:text-lime-800 font-medium transition-colors"
      >
        Upgrade
      </Link>
    </span>
  )
}
