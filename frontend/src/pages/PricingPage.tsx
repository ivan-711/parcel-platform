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

const FREE_FEATURES = [
  '5 analyses per month',
  '5 AI chat messages per month',
  '5 saved deals',
  'Basic risk scoring',
]

const PRO_FEATURES = [
  'Unlimited analyses',
  '150 AI chat messages per month',
  'Unlimited saved deals',
  'Full deal pipeline',
  'Portfolio tracking',
  'PDF deal reports',
  'AI document analysis (25/month)',
  'Offer letter generator',
  'Deal comparison',
]

const TEAM_FEATURES = [
  'Everything in Pro',
  'Unlimited team members',
  'Shared deal pipeline',
  'Team analytics dashboard',
  'Role-based permissions',
  'Priority support',
]

const FAQ_ITEMS = [
  {
    q: 'What happens after my trial ends?',
    a: "You'll be downgraded to the Free plan. Your data stays, but Pro features will be locked.",
  },
  {
    q: 'Can I cancel anytime?',
    a: "Yes. Cancel in Settings > Billing. You'll keep Pro access until the end of your billing period.",
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
    a: "No. Your deals, documents, and chat history are preserved. You just can't access Pro features until you upgrade again.",
  },
]

/* ─── FAQ Accordion Item ─── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left cursor-pointer group"
      >
        <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-gray-400 transition-transform duration-200',
            open && 'rotate-180',
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
            <p className="pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
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
      <div className="inline-flex bg-gray-100 rounded-lg p-1 relative">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={cn(
            'relative z-10 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150',
            interval === 'monthly'
              ? 'text-gray-900'
              : 'text-gray-500',
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
              ? 'text-gray-900'
              : 'text-gray-500',
          )}
        >
          Annual
          <span className="bg-lime-100 text-lime-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            Save 20%
          </span>
        </button>

        {/* Animated active pill */}
        <motion.div
          layoutId="billing-toggle-pill"
          className="absolute top-1 bottom-1 rounded-md bg-white shadow-xs"
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
  const isProActive = currentPlan === 'pro' && (billing?.status === 'active' || billing?.status === 'trialing')

  // Handle ?billing=success / ?billing=canceled query params
  useEffect(() => {
    const billingParam = searchParams.get('billing')
    if (billingParam === 'success') {
      toast.success('Welcome to Pro! Your subscription is active.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['session-check'] })
      setSearchParams({}, { replace: true })
    } else if (billingParam === 'canceled') {
      toast('Checkout canceled — no charges were made.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  const proPrice = interval === 'annual' ? '$55' : '$69'

  function handleProCta() {
    if (isProActive) {
      portal.mutate()
    } else {
      checkout.mutate({ plan: 'pro', interval })
    }
  }

  const isCheckoutLoading = checkout.isPending || portal.isPending

  return (
    <AppShell title="Pricing">
      <div className="max-w-5xl mx-auto space-y-12 pb-12">

        {/* ── Header ── */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Choose Your Plan
          </h1>
          <p className="text-base text-gray-500">
            Start with a 7-day Pro trial. No credit card required.
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
          {/* Free Card */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-lg border border-gray-200 shadow-xs p-6 flex flex-col order-2 md:order-1"
          >
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900 tabular-nums">$0</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">Explore deal analysis basics</p>
              </div>

              <ul className="space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              {currentPlan === 'free' ? (
                <button
                  disabled
                  className="w-full h-11 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  disabled
                  className="w-full h-11 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 cursor-not-allowed opacity-60"
                >
                  Downgrade
                </button>
              )}
            </div>
          </motion.div>

          {/* Pro Card (emphasized) */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-lg border-2 border-lime-500 shadow-[0_0_24px_rgba(77,124,15,0.08)] p-6 flex flex-col relative order-1 md:order-2 lg:py-8"
          >
            {/* Most Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-lime-700 text-white text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1">
                <Sparkles size={12} />
                Most Popular
              </span>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={interval}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-bold text-gray-900 tabular-nums"
                    >
                      {proPrice}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
                {interval === 'annual' && (
                  <p className="mt-0.5 text-xs text-gray-400">billed annually</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Everything you need to analyze deals with confidence
                </p>
              </div>

              <ul className="space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check size={16} className="text-lime-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              {isProActive ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleProCta}
                  disabled={isCheckoutLoading}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-lime-700 hover:bg-lime-800 text-white transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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
                  onClick={handleProCta}
                  disabled={isCheckoutLoading}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-lime-700 hover:bg-lime-800 text-white transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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

          {/* Team Card (Coming Soon) */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-lg border border-gray-200 shadow-xs p-6 flex flex-col opacity-75 order-3"
          >
            {/* Coming Soon badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 relative mb-0">
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>

            <div className="space-y-4 flex-1 mt-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-500">Team</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-400 tabular-nums">$149</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">Collaborate with your entire team</p>
              </div>

              <ul className="space-y-3">
                {TEAM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <Check size={16} className="text-gray-300 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <button
                disabled
                className="w-full h-11 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-400 cursor-not-allowed"
              >
                Notify Me
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* ── FAQ Section ── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-xs divide-y-0 px-6">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA Banner ── */}
        <div className="bg-lime-50 border border-lime-200 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Ready to analyze deals faster?
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Join investors who save hours on every deal.
            </p>
          </div>
          {!isProActive && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleProCta}
              disabled={isCheckoutLoading}
              className="shrink-0 h-11 px-6 rounded-lg text-sm font-medium bg-lime-700 hover:bg-lime-800 text-white transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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
