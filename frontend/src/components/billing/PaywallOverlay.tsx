import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { Lock } from 'lucide-react'
import { FEATURE_LABELS, type GatedFeature, type OnboardingPersona } from '@/types'
import { useCheckout } from '@/hooks/useBilling'
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import { useOnboardingStore } from '@/stores/onboardingStore'

interface PaywallOverlayProps {
  feature: GatedFeature
  onDismiss?: () => void
}

/**
 * Persona-specific paywall body copy. Falls back to FEATURE_LABELS[feature].description
 * when no entry exists for a (feature, persona) pair. Source:
 * docs/PERSONA-DIFFERENTIATION-AUDIT.md → Top opportunity #1.
 */
const PAYWALL_COPY: Partial<
  Record<GatedFeature, Partial<Record<OnboardingPersona, string>>>
> = {
  pipeline: {
    wholesale: 'Move deals from lead to assignment. Track contracts, buyers, and close dates for every wholesale deal in one pipeline.',
    flip: 'Track every flip from offer to resale. Pipeline keeps your rehab timeline, budget, and exit strategy aligned.',
    buy_and_hold: 'Manage rentals from acquisition to tenant placement. Pipeline tracks your full hold lifecycle.',
    brrrr: 'Track each BRRRR property through buy → rehab → rent → refinance. See refinance-readiness at a glance.',
    creative_finance: 'Track sub-to, wrap, and seller-finance deals with stage-specific milestones other tools don\u2019t handle.',
    hybrid: 'Manage multiple strategies side-by-side. Pipeline adapts to whichever strategy each deal needs.',
    beginner: 'See where every deal you\u2019re considering stands. Pipeline helps you stay organized as you learn.',
  },
  skip_tracing: {
    wholesale: 'Find off-market property owners. Skip tracing unlocks direct contact info \u2014 the lifeblood of every wholesale business.',
    buy_and_hold: 'Find motivated sellers of tired rentals. Skip tracing turns driving-for-dollars lists into phone calls.',
    creative_finance: 'Reach distressed owners who need creative solutions. Skip tracing connects you directly to sellers other investors can\u2019t find.',
  },
  mail_campaigns: {
    wholesale: 'Run direct mail at scale. Mail campaigns turn your skip trace list into a predictable lead pipeline.',
    buy_and_hold: 'Reach landlords thinking about selling. Mail campaigns put your offer in front of tired owners.',
    creative_finance: 'Reach sellers with non-traditional problems. Direct mail finds the \u201CI\u2019ll sell to you subject-to\u201D conversations.',
  },
}

const dismissed = new Set<string>()

export function PaywallOverlay({ feature, onDismiss }: PaywallOverlayProps) {
  const [visible, setVisible] = useState(!dismissed.has(feature))
  const { label, description } = FEATURE_LABELS[feature]
  const checkout = useCheckout()
  const user = useAuthStore((s) => s.user)
  const persona = useOnboardingStore((s) => s.persona)
  const paywallError = useBillingStore((s) => s.paywallError)
  const personaCopy = persona ? PAYWALL_COPY[feature]?.[persona] : undefined
  const bodyCopy = personaCopy ?? description
  const copyVariant: 'persona' | 'generic' = personaCopy ? 'persona' : 'generic'
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const matchTracked = useRef(false)

  useEffect(() => {
    if (!visible || matchTracked.current) return
    matchTracked.current = true
    try {
      const posthog = (window as any).posthog
      const base = {
        feature,
        persona: persona ?? null,
        copy_variant: copyVariant,
        user_id: user?.id ?? null,
      }
      posthog?.capture?.('paywall_copy_persona_matched', base)
      // Paired event — measures how often free-tier users land on the
      // paywall from an error (402) vs. the gate rendering synchronously.
      posthog?.capture?.('paywall_overlay_rendered', {
        ...base,
        error_status: paywallError?.code === 'FEATURE_GATED' ? 402 : null,
      })
    } catch { /* ignore */ }
  }, [visible, feature, persona, copyVariant, user?.id, paywallError?.code])

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
      <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-xl backdrop-saturate-150" aria-hidden="true" />

      {/* Card */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md bg-app-surface rounded-xl border border-border-default shadow-2xl p-8 mx-4"
      >
        {/* Lock icon */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-violet-400/10 ring-1 ring-violet-400/20 flex items-center justify-center mb-5">
          <Lock size={24} className="text-violet-400" />
        </div>

        <h3 className="text-lg font-semibold text-text-primary text-center">
          {label}
        </h3>
        <p className="text-sm text-text-secondary text-center mt-2 mb-6">
          {bodyCopy}
        </p>

        <button
          onClick={() => {
            try {
              (window as any).posthog?.capture?.('upgrade_clicked', {
                source: 'paywall_overlay',
                target_tier: 'pro',
                current_tier: user?.plan_tier ?? 'free',
                user_id: user?.id ?? null,
              })
            } catch { /* ignore */ }
            checkout.mutate({ plan: 'pro', interval: 'annual' })
          }}
          disabled={checkout.isPending}
          className="w-full h-11 rounded-lg bg-gradient-to-r from-violet-400 to-violet-600 hover:brightness-110 hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] text-accent-text-on-accent text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
        >
          {checkout.isPending ? 'Redirecting...' : 'Upgrade to Carbon'}
        </button>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Link
            to="/pricing?from=paywall_overlay"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
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
