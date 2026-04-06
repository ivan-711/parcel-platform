import { useState, useCallback, useEffect, useRef } from 'react'
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
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  const handleDismiss = useCallback(() => {
    dismissed.add(feature)
    setVisible(false)
    onDismiss?.()
  }, [feature, onDismiss])

  // Focus trap: save previous focus, move into overlay on mount, trap Tab, restore on unmount
  useEffect(() => {
    if (!visible) return

    // Save the previously focused element for restoration
    previousFocus.current = document.activeElement as HTMLElement

    const overlay = overlayRef.current
    if (!overlay) return

    // Focus the first focusable element
    const focusables = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusables.length > 0) focusables[0].focus()

    // Trap tab within overlay
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !overlay) return
      const focusableEls = overlay.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableEls.length === 0) return
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the previously focused element
      previousFocus.current?.focus()
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Upgrade required: ${label}`}
      className="absolute inset-0 z-20 flex items-center justify-center"
    >
      {/* Gradient mask */}
      <div className="absolute inset-0 bg-[#0C0B0A]/80 backdrop-blur-xl backdrop-saturate-150" aria-hidden="true" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md bg-app-surface rounded-xl border border-border-default shadow-2xl p-8 mx-4"
      >
        {/* Lock icon */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20 flex items-center justify-center mb-5">
          <Lock size={24} className="text-[#8B7AFF]" />
        </div>

        <h3 className="text-lg font-semibold text-text-primary text-center">
          {label}
        </h3>
        <p className="text-sm text-text-secondary text-center mt-2 mb-6">
          {description}
        </p>

        <button
          onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
          disabled={checkout.isPending}
          className="w-full h-11 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] hover:brightness-110 text-accent-text-on-accent text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
        >
          {checkout.isPending ? 'Redirecting...' : 'Upgrade to Carbon'}
        </button>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Link
            to="/pricing"
            className="text-sm text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
          >
            Compare plans &rarr;
          </Link>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
