import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CreditCard, ExternalLink } from 'lucide-react'
import { useBillingStatus, usePortal, useCancelSubscription } from '@/hooks/useBilling'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { UsageMeter } from '@/components/billing/UsageMeter'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { PlanTier } from '@/types'

const CANCEL_REASONS = [
  'Too expensive',
  'Not using it enough',
  'Missing features',
  'Switching to alternative',
  'Other',
]

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' as const },
  },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null

  const styles: Record<string, string> = {
    active: 'bg-sky-50 text-sky-700',
    trialing: 'bg-lime-50 text-lime-700',
    past_due: 'bg-amber-50 text-amber-700',
    canceled: 'bg-red-50 text-red-700',
    incomplete: 'bg-gray-100 text-gray-500',
    unpaid: 'bg-red-50 text-red-700',
  }

  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    unpaid: 'Unpaid',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BillingSettings() {
  const { data: billing, isLoading, isError } = useBillingStatus()
  const portal = usePortal()
  const cancelSub = useCancelSubscription()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
      </div>
    )
  }

  if (isError || !billing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <p className="text-sm text-gray-500">Unable to load billing information. Please try again later.</p>
      </div>
    )
  }

  const plan = billing.plan as PlanTier
  const isPaid = plan !== 'free' && billing.status === 'active'
  const isCanceled = billing.cancel_at_period_end

  return (
    <>
      {/* Current Plan Card */}
      <motion.div variants={itemVariants}>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-lime-50 flex items-center justify-center">
                <CreditCard size={20} className="text-lime-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Current Plan</h2>
                  <PlanBadge planTier={plan} trialActive={billing.trial_active} />
                  <StatusBadge status={billing.status} />
                </div>
                {billing.trial_active && billing.trial_ends_at && (
                  <p className="text-sm text-gray-500 mt-1">
                    Your 7-day Pro trial ends on {formatDate(billing.trial_ends_at)}
                  </p>
                )}
                {isPaid && !isCanceled && billing.current_period_end && (
                  <p className="text-sm text-gray-500 mt-1">
                    Renews on {formatDate(billing.current_period_end)}
                    {billing.interval && ` (${billing.interval})`}
                  </p>
                )}
                {isCanceled && billing.current_period_end && (
                  <p className="text-sm text-amber-600 mt-1">
                    Plan downgrades to Free on {formatDate(billing.current_period_end)}
                  </p>
                )}
                {billing.status === 'past_due' && (
                  <p className="text-sm text-amber-600 mt-1">
                    Payment failed. Please update your payment method to avoid service interruption.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {plan === 'free' && !billing.trial_active ? (
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-700 hover:bg-lime-800 text-white text-sm font-medium transition-colors"
              >
                Upgrade to Pro
              </Link>
            ) : isPaid ? (
              <>
                <button
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  {portal.isPending ? 'Opening...' : 'Manage Subscription'}
                </button>
                {!isCanceled && (
                  <button
                    onClick={() => setCancelOpen(true)}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Usage Section */}
      {billing.usage.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Usage This Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {billing.usage.map((metric) => (
                <UsageMeter key={metric.metric} metric={metric} />
              ))}
            </div>
            {billing.usage[0]?.resets_at && (
              <p className="text-xs text-gray-400">
                Resets on {formatDate(billing.usage[0].resets_at)}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Cancel Modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Cancel Subscription</DialogTitle>
            <DialogDescription className="text-gray-500">
              Your plan will remain active until the end of your current billing period.
              After that, you'll be downgraded to the Free plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label htmlFor="cancel-reason" className="text-sm font-medium text-gray-700">
                Help us improve — why are you canceling?
              </label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-400"
              >
                <option value="">Select a reason</option>
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => {
                  cancelSub.mutate(
                    { reason: cancelReason || undefined },
                    { onSuccess: () => setCancelOpen(false) }
                  )
                }}
                disabled={cancelSub.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelSub.isPending ? 'Canceling...' : 'Cancel at End of Period'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
