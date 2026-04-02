import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface PlanBadgeProps {
  planTier: string
  trialActive: boolean
}

export function PlanBadge({ planTier, trialActive }: PlanBadgeProps) {
  if (trialActive && planTier === 'free') {
    return (
      <span className="bg-[#8B7AFF]/[0.06] text-[#8B7AFF]/70 ring-1 ring-[#8B7AFF]/10 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
        Trial
      </span>
    )
  }

  if (planTier === 'pro' || planTier === 'team' || planTier === 'starter') {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
          'bg-[#8B7AFF]/15 text-[#A89FFF] ring-1 ring-[#8B7AFF]/20'
        )}
      >
        {planTier === 'team' ? 'Team' : planTier === 'starter' ? 'Starter' : 'Pro'}
      </span>
    )
  }

  // Free tier
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="bg-layer-2 text-[#F0EDE8]/40 ring-1 ring-white/[0.06] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
        Free
      </span>
      <Link
        to="/settings"
        className="text-[10px] text-[#8B7AFF] hover:text-[#A89FFF] font-medium transition-colors"
      >
        Upgrade
      </Link>
    </span>
  )
}
