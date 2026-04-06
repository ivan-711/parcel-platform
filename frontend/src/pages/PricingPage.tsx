import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { useBillingStatus, useCheckout, usePortal } from '@/hooks/useBilling'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { BillingCycle } from '@/types'

/* ─── Animation Variants ─── */

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
}

/* ─── Plan Data ─── */

const STEEL_FEATURES = [
  '3 analyses per month',
  '5 AI chat messages per month',
  '5 saved deals',
  'All 5 strategy calculators',
  'Basic risk scoring',
]

const CARBON_FEATURES = [
  'Unlimited analyses',
  '150 AI chat messages per month',
  'Unlimited saved deals',
  'Full deal pipeline',
  'Portfolio tracking',
  'PDF deal reports',
  'AI document analysis (25/month)',
  'Offer letter generator',
  'Deal comparison',
  'Comp analysis (50/month)',
  'Skip tracing (25/month)',
]

const TITANIUM_FEATURES = [
  'Everything in Carbon',
  '500 AI chat messages per month',
  'Unlimited document AI',
  'Up to 5 team members',
  'Shared deal pipeline',
  'Skip tracing (200/month)',
  'Direct mail (50 pieces/month)',
  'Role-based permissions',
  'Priority support',
]

const FAQ_ITEMS = [
  {
    q: 'What happens after my trial ends?',
    a: "You'll be downgraded to Steel (free). Your data stays, but Carbon features will be locked.",
  },
  {
    q: 'Can I cancel anytime?',
    a: "Yes. Cancel in Settings > Billing. You'll keep access until the end of your billing period.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards via Stripe. We never store your card information.',
  },
  {
    q: 'Is there a refund policy?',
    a: "We offer a full refund within 7 days of your first payment if you're not satisfied.",
  },
  {
    q: "What counts as an 'analysis'?",
    a: 'Each time you run a deal calculator (wholesale, BRRRR, flip, buy & hold, or creative finance) counts as one analysis.',
  },
  {
    q: 'Will my data be deleted if I downgrade?',
    a: "No. Your deals, documents, and chat history are preserved. You just can't access Carbon features until you upgrade again.",
  },
]

/* ─── FAQ Accordion Item ─── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border-default last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left cursor-pointer group"
      >
        <span className="text-sm font-medium text-text-primary pr-4">{q}</span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 transition-transform duration-200',
            open ? 'text-[#8B7AFF] rotate-180' : 'text-text-muted',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-text-secondary leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Billing Toggle ─── */

function BillingToggle({
  interval,
  onChange,
}: {
  interval: BillingCycle
  onChange: (v: BillingCycle) => void
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex bg-layer-3 rounded-lg p-1 relative">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={cn(
            'relative z-10 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150',
            interval === 'monthly'
              ? 'text-text-primary'
              : 'text-text-secondary',
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange('annual')}
          className={cn(
            'relative z-10 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 inline-flex items-center gap-2',
            interval === 'annual'
              ? 'text-text-primary'
              : 'text-text-secondary',
          )}
        >
          Annual
          <span className="bg-[#8B7AFF]/15 text-[#8B7AFF] text-xs font-semibold px-2 py-0.5 rounded-full">
            Save 20%
          </span>
        </button>

        {/* Animated active pill */}
        <motion.div
          layoutId="billing-toggle-pill"
          className="absolute top-1 bottom-1 rounded-md bg-[#8B7AFF]/15 border border-[#8B7AFF]/20"
          style={{
            left: interval === 'monthly' ? '4px' : undefined,
            right: interval === 'annual' ? '4px' : undefined,
            width: interval === 'monthly' ? 'calc(50% - 4px)' : 'calc(50% - 4px)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      </div>
    </div>
  )
}

/* ─── Pricing Page ─── */

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingCycle>('monthly')
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const { data: billing } = useBillingStatus()
  const user = useAuthStore((s) => s.user)
  const checkout = useCheckout()
  const portal = usePortal()

  const currentPlan = billing?.plan ?? user?.plan_tier ?? 'free'
  const isCarbonActive = (currentPlan === 'pro') && (billing?.status === 'active' || billing?.status === 'trialing')
  const isTitaniumActive = (currentPlan === 'business') && (billing?.status === 'active' || billing?.status === 'trialing')
  const isPaidActive = isCarbonActive || isTitaniumActive

  // Handle ?billing=success / ?billing=canceled query params
  useEffect(() => {
    const billingParam = searchParams.get('billing')
    if (billingParam === 'success') {
      toast.success('Welcome! Your subscription is active.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['session-check'] })
      setSearchParams({}, { replace: true })
    } else if (billingParam === 'canceled') {
      toast('Checkout canceled — no charges were made.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  const carbonPrice = interval === 'annual' ? '$63' : '$79'
  const titaniumPrice = interval === 'annual' ? '$119' : '$149'

  function handleCarbonCta() {
    if (isPaidActive) {
      portal.mutate()
    } else {
      checkout.mutate({ plan: 'pro', interval })
    }
  }

  function handleTitaniumCta() {
    if (isPaidActive) {
      portal.mutate()
    } else {
      checkout.mutate({ plan: 'business', interval })
    }
  }

  const isCheckoutLoading = checkout.isPending || portal.isPending

  return (
    <AppShell title="Pricing">
      <div className="max-w-5xl mx-auto space-y-12 pb-12">

        {/* ── Header ── */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-text-primary">
            Choose Your Plan
          </h1>
          <p className="text-base text-text-secondary">
            Start with a 7-day Carbon trial. No credit card required.
          </p>
          <BillingToggle interval={interval} onChange={setInterval} />
        </div>

        {/* ── Pricing Cards ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Steel Card (Free) */}
          <motion.div
            variants={staggerItem}
            className="bg-white/[0.03] rounded-lg border border-border-default p-6 flex flex-col order-2 md:order-1"
          >
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Steel</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-primary tabular-nums">$0</span>
                  <span className="text-text-secondary text-sm">/month</span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">Explore deal analysis basics</p>
              </div>

              <ul className="space-y-3">
                {STEEL_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <Check size={16} className="text-text-disabled mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              {currentPlan === 'free' && !isCarbonActive ? (
                <button
                  disabled
                  className="w-full h-11 rounded-lg text-sm font-medium bg-layer-2 text-text-muted cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  disabled
                  className="w-full h-11 rounded-lg text-sm font-medium bg-transparent border border-border-emphasis text-text-secondary cursor-not-allowed opacity-60"
                >
                  Downgrade
                </button>
              )}
            </div>
          </motion.div>

          {/* Carbon Card (emphasized) */}
          <motion.div
            variants={staggerItem}
            className="bg-white/[0.05] rounded-lg border border-[#8B7AFF]/20 shadow-[0_0_24px_rgba(139,122,255,0.08)] p-6 flex flex-col relative order-1 md:order-2 lg:py-8"
          >
            {/* Crown gradient line at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8B7AFF] to-transparent" />

            {/* Most Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#8B7AFF] text-accent-text-on-accent text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-[0_0_12px_rgba(139,122,255,0.3)]">
                <Sparkles size={12} />
                Most Popular
              </span>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Carbon</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`carbon-${interval}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-bold text-text-primary tabular-nums"
                    >
                      {carbonPrice}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-text-secondary text-sm">/month</span>
                </div>
                {interval === 'annual' && (
                  <p className="mt-0.5 text-xs text-text-secondary">$756/yr &middot; billed annually</p>
                )}
                <p className="mt-1 text-sm text-text-secondary">
                  Everything you need to analyze deals with confidence
                </p>
              </div>

              <ul className="space-y-3">
                {CARBON_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <Check size={16} className="text-[#8B7AFF] mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              {isCarbonActive ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleCarbonCta}
                  disabled={isCheckoutLoading}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] hover:from-[#7B6AEF] hover:to-[#6B5AD6] text-accent-text-on-accent transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {portal.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Opening portal...
                    </>
                  ) : (
                    'Manage Subscription'
                  )}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleCarbonCta}
                  disabled={isCheckoutLoading}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] hover:from-[#7B6AEF] hover:to-[#6B5AD6] text-accent-text-on-accent transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {checkout.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Redirecting to checkout...
                    </>
                  ) : (
                    'Start 7-Day Free Trial'
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Titanium Card */}
          <motion.div
            variants={staggerItem}
            className="bg-white/[0.03] rounded-lg border border-border-default p-6 flex flex-col order-3"
          >
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Titanium</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`titanium-${interval}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-bold text-text-primary tabular-nums"
                    >
                      {titaniumPrice}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-text-secondary text-sm">/month</span>
                </div>
                {interval === 'annual' && (
                  <p className="mt-0.5 text-xs text-text-secondary">$1,428/yr &middot; billed annually</p>
                )}
                <p className="mt-1 text-sm text-text-secondary">For teams and high-volume investors</p>
              </div>

              <ul className="space-y-3">
                {TITANIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <Check size={16} className="text-text-secondary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              {isTitaniumActive ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleTitaniumCta}
                  disabled={isCheckoutLoading}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-transparent border border-border-emphasis text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  Manage Subscription
                </motion.button>
              ) : (
                <button
                  disabled
                  className="w-full h-11 rounded-lg text-sm font-medium bg-transparent border border-border-default text-text-muted cursor-not-allowed"
                >
                  Coming Soon
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* ── FAQ Section ── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <div className="bg-white/[0.03] rounded-lg border border-border-default divide-y-0 px-6">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA Banner ── */}
        <div className="bg-[#8B7AFF]/[0.04] border border-[#8B7AFF]/10 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Ready to analyze deals faster?
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Join investors who save hours on every deal.
            </p>
          </div>
          {!isPaidActive && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleCarbonCta}
              disabled={isCheckoutLoading}
              className="shrink-0 h-11 px-6 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] hover:from-[#7B6AEF] hover:to-[#6B5AD6] text-accent-text-on-accent transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {checkout.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Start 7-Day Free Trial'
              )}
            </motion.button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
