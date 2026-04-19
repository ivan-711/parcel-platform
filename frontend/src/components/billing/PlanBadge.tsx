import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const DISPLAY_NAMES: Record<string, string> = {
  free: 'Steel',
  pro: 'Carbon',
  business: 'Titanium',
  plus: 'Carbon', // legacy
}

interface PlanBadgeProps {
  planTier: string
  trialActive: boolean
}

export function PlanBadge({ planTier, trialActive }: PlanBadgeProps) {
  if (trialActive && planTier === 'free') {
    return (
      <span className="bg-violet-400/[0.06] text-violet-400/70 ring-1 ring-violet-400/10 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
        Trial
      </span>
    )
  }

  if (planTier === 'pro' || planTier === 'plus') {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
          'bg-violet-400/15 text-violet-300 ring-1 ring-violet-400/20'
        )}
      >
        {DISPLAY_NAMES[planTier] ?? planTier}
      </span>
    )
  }

  if (planTier === 'business') {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
          'bg-layer-2 text-text-secondary ring-1 ring-border-default'
        )}
      >
        {DISPLAY_NAMES[planTier] ?? planTier}
      </span>
    )
  }

  // Free tier
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="bg-layer-2 text-text-primary/40 ring-1 ring-white/[0.06] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
        Steel
      </span>
      <Link
        to="/pricing?from=plan_badge"
        onClick={() => {
          try {
            const user = useAuthStore.getState().user
            ;(window as any).posthog?.capture?.('upgrade_clicked', {
              source: 'plan_badge',
              target_tier: 'pro',
              current_tier: planTier,
              user_id: user?.id ?? null,
            })
          } catch { /* ignore */ }
        }}
        className="text-[10px] text-violet-400 hover:text-violet-300 font-medium transition-colors"
      >
        Upgrade
      </Link>
    </span>
  )
}
