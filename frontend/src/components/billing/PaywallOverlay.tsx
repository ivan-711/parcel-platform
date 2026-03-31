import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { FEATURE_LABELS, type GatedFeature } from '@/types'
import { useCheckout } from '@/hooks/useBilling'

interface PaywallOverlayProps {
  feature: GatedFeature
  onDismiss?: () => void
}

const dismissed = new Set<string>()

export function PaywallOverlay({ feature, onDismiss }: PaywallOverlayProps) {
  const [visible, setVisible] = useState(!dismissed.has(feature))
  const { label, description } = FEATURE_LABELS[feature]
  const checkout = useCheckout()

  const handleDismiss = useCallback(() => {
    dismissed.add(feature)
    setVisible(false)
    onDismiss?.()
  }, [feature, onDismiss])

  if (!visible) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* Gradient mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white/95 backdrop-blur-[6px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md bg-white rounded-lg border border-gray-200 shadow-xl p-8 mx-4"
      >
        {/* Lock icon */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-lime-50 flex items-center justify-center mb-5">
          <Lock size={24} className="text-lime-700" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 text-center">
          {label}
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">
          {description}
        </p>

        <button
          onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
          disabled={checkout.isPending}
          className="w-full h-11 rounded-lg bg-lime-700 hover:bg-lime-800 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          {checkout.isPending ? 'Redirecting...' : 'Upgrade to Pro'}
        </button>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Link
            to="/settings"
            className="text-sm text-lime-700 hover:text-lime-800 transition-colors"
          >
            Compare plans &rarr;
          </Link>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
