import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, AlertTriangle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout } from '@/hooks/useBilling'

interface TrialBannerProps {
  trialEndsAt: string | null
  planTier: string
  trialActive: boolean
}

const SNOOZE_KEY = 'parcel_trial_banner_snoozed'

function isSnoozed(): boolean {
  const ts = sessionStorage.getItem(SNOOZE_KEY)
  if (!ts) return false
  return Date.now() - Number(ts) < 24 * 60 * 60 * 1000
}

export function TrialBanner({ trialEndsAt, planTier, trialActive }: TrialBannerProps) {
  const [snoozed, setSnoozed] = useState(isSnoozed)
  const checkout = useCheckout()

  const daysLeft = useMemo(() => {
    if (!trialEndsAt) return null
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [trialEndsAt])

  // Hide for paid users or users with no trial
  if (planTier !== 'free' || !trialEndsAt) return null

  // Expired state
  if (daysLeft === 0 || (!trialActive && trialEndsAt)) {
    return (
      <div className="mx-3 mb-3 rounded-lg border border-error/10 bg-error/[0.05] p-3">
        <div className="flex items-start gap-2">
          <XCircle size={16} className="text-error mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-error">Trial expired</p>
            <button
              onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
              disabled={checkout.isPending}
              className="mt-2 w-full h-8 rounded-md bg-error hover:brightness-110 text-text-primary text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              Upgrade to continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Snoozed (non-expired only)
  if (snoozed) return null

  const isUrgent = daysLeft !== null && daysLeft <= 3
  const Icon = isUrgent ? AlertTriangle : Clock

  return (
    <div
      className={cn(
        'mx-3 mb-3 rounded-lg border p-3',
        isUrgent
          ? 'border-warning/10 bg-warning/[0.06]'
          : 'border-[#8B7AFF]/10 bg-[#8B7AFF]/[0.06]'
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={16}
          className={cn(
            'mt-0.5 shrink-0',
            isUrgent ? 'text-warning' : 'text-[#8B7AFF]'
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-medium',
              isUrgent ? 'text-warning' : 'text-[#A89FFF]'
            )}
          >
            {isUrgent
              ? `Trial ending soon: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
              : `Carbon Trial: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          </p>

          {isUrgent ? (
            <button
              onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
              disabled={checkout.isPending}
              className="mt-2 w-full h-8 rounded-md bg-warning hover:brightness-110 text-gray-0 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              Upgrade now
            </button>
          ) : (
            <Link
              to="/settings"
              className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] mt-1 inline-block transition-colors"
            >
              Upgrade
            </Link>
          )}
        </div>

        {/* Snooze button (non-urgent only) */}
        <button
          onClick={() => {
            sessionStorage.setItem(SNOOZE_KEY, String(Date.now()))
            setSnoozed(true)
          }}
          aria-label="Dismiss for 24 hours"
          className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
