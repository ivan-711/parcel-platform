import { useNavigate } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useBillingStore } from '@/stores/billingStore'
import { useAuthStore } from '@/stores/authStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const METRIC_LABELS: Record<string, string> = {
  analyses_per_month: 'analyses',
  ai_messages_per_month: 'AI messages',
}

const TIER_LABELS: Record<string, string> = {
  free: 'Steel',
  pro: 'Carbon',
  business: 'Titanium',
}

export function QuotaExceededModal() {
  const paywallError = useBillingStore((s) => s.paywallError)
  const clearPaywallError = useBillingStore((s) => s.clearPaywallError)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const isQuotaError = paywallError?.code === 'QUOTA_EXCEEDED'
  if (!isQuotaError) return null

  const { metric, current, limit, current_tier, upgrade_url } = paywallError
  const metricLabel = (metric && METRIC_LABELS[metric]) ?? metric?.replace(/_/g, ' ') ?? 'usage'
  const tierLabel = (current_tier && TIER_LABELS[current_tier]) ?? current_tier ?? 'free'

  const handleUpgrade = () => {
    clearPaywallError()
    navigate(upgrade_url ?? '/pricing')
  }

  return (
    <Dialog open onOpenChange={() => clearPaywallError()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-violet-400/10 ring-1 ring-violet-400/20 flex items-center justify-center mb-4">
            <TrendingUp size={24} className="text-violet-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-text-primary">
            You've reached your free {metricLabel} limit
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary mt-2">
            {current != null && limit != null
              ? `You've used ${current} of ${limit} ${metricLabel} this month on the ${tierLabel} plan. `
              : ''}
            Upgrade to Carbon for unlimited analyses, AI insights, Pipeline, Portfolio, and more.
          </DialogDescription>
          <p className="text-xs text-text-muted mt-2">
            {user?.trial_active && user.trial_ends_at
              ? `Your Carbon trial ends on ${new Date(user.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`
              : 'Limits reset on the 1st of each month.'}
          </p>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-violet-400 to-violet-600 hover:brightness-110 hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] text-accent-text-on-accent text-sm font-medium transition-all cursor-pointer"
          >
            Upgrade to Carbon
          </button>
          <button
            onClick={clearPaywallError}
            className="w-full h-9 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
