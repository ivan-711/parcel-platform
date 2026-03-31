import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useCheckout } from '@/hooks/useBilling'
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative z-10 w-full max-w-sm bg-white rounded-lg border border-gray-200 shadow-xl p-6 mx-4"
          >
            {/* Icon */}
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 text-center">
              You've reached your limit
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2 mb-5">
              You've used all {limitLabel} {metric.display_name.toLowerCase()} for this
              month. Upgrade to Pro for unlimited access.
            </p>

            {/* Usage meter */}
            <div className="mb-5">
              <UsageMeter metric={metric} />
            </div>

            <button
              onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
              disabled={checkout.isPending}
              className="w-full h-11 rounded-lg bg-lime-700 hover:bg-lime-800 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {checkout.isPending ? 'Redirecting...' : 'Upgrade to Pro'}
            </button>

            <button
              onClick={onClose}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer py-1"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
