import { AlertTriangle } from 'lucide-react'
import { useCheckout } from '@/hooks/useBilling'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UsageMeter } from './UsageMeter'
import type { UsageMetric } from '@/types'

interface LimitReachedModalProps {
  open: boolean
  onClose: () => void
  metric: UsageMetric
}

export function LimitReachedModal({ open, onClose, metric }: LimitReachedModalProps) {
  const checkout = useCheckout()
  const limitLabel = metric.limit === null ? 'unlimited' : `${metric.limit}`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm bg-app-elevated p-6">
        <DialogHeader className="space-y-0 p-0">
          <DialogTitle className="sr-only">Limit reached</DialogTitle>
        </DialogHeader>

        {/* Icon */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-warning" />
        </div>

        <h3 className="text-lg font-semibold text-text-primary text-center">
          You've reached your limit
        </h3>
        <p className="text-sm text-text-secondary text-center mt-2 mb-5">
          You've used all {limitLabel} {metric.display_name.toLowerCase()} for this
          month. Upgrade to Carbon for higher limits.
        </p>

        {/* Usage meter */}
        <div className="mb-5">
          <UsageMeter metric={metric} />
        </div>

        <button
          onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
          disabled={checkout.isPending}
          className="w-full h-11 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] hover:brightness-110 hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] text-accent-text-on-accent text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
        >
          {checkout.isPending ? 'Redirecting...' : 'Upgrade to Carbon'}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer py-1"
        >
          Maybe later
        </button>
      </DialogContent>
    </Dialog>
  )
}
