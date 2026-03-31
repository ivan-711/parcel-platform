/** Pricing — three-tier pricing section with highlighted Pro card, ambient glow, and annual/monthly toggle. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PRICING } from './constants'

const ANNUAL_PRICES: Record<string, { price: string; period: string }> = {
  'Free': { price: '$0', period: 'forever' },
  'Pro': { price: '$55', period: 'per month, billed annually' },
  'Team': { price: '$79', period: 'per month, billed annually' },
}

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-24 px-6 border-t border-gray-200">
      <div className="max-w-5xl mx-auto space-y-14">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.08em] text-lime-700 font-semibold">
            Pricing
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900">Five free analyses. Upgrade when you close.</h2>
          <p className="text-sm text-gray-500">
            No annual contracts. No per-deal fees. Cancel any time.
          </p>
        </motion.div>

        {/* Annual / Monthly toggle */}
        <div className="flex justify-center">
          <div className="rounded-lg bg-gray-100 border border-gray-200 p-1 inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500',
                !isAnnual
                  ? 'bg-lime-700 text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-900',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500',
                isAnnual
                  ? 'bg-lime-700 text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-900',
              )}
            >
              Annual
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING.map((tier, i) => {
            const annual = ANNUAL_PRICES[tier.name]
            const displayPrice = isAnnual && annual ? annual.price : tier.price
            const displayPeriod = isAnnual && annual ? annual.period : tier.period

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'rounded-2xl border p-6 space-y-6 relative overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-lime-700/5 transition-shadow',
                  tier.highlighted
                    ? 'border-lime-400 bg-lime-50/50'
                    : 'border-gray-200 bg-white',
                )}
              >
                {/* Pro card top glow line */}
                {tier.highlighted && (
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-lime-500 to-transparent" />
                )}

                {/* Pro ambient glow */}
                {tier.highlighted && (
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full pointer-events-none"
                    style={{ background: 'rgba(132,204,22,0.12)', filter: 'blur(24px)' }}
                  />
                )}

                {/* Header */}
                <div className="space-y-1">
                  {tier.highlighted && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-lime-700 mb-2">
                      Most popular
                    </p>
                  )}
                  <p className="font-semibold text-gray-900">{tier.name}</p>
                  <p className="text-xs text-gray-400">{tier.description}</p>
                </div>

                {/* Price with animated transition */}
                <div className="flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isAnnual ? 'annual' : 'monthly'}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-bold text-gray-900 tabular-nums"
                    >
                      {displayPrice}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-xs text-gray-400">/ {displayPeriod}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={12} className="text-sky-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.name === 'Team' ? (
                  <a
                    href="mailto:ivan.flores1207@gmail.com"
                    className="block rounded-lg focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
                  >
                    <Button
                      className="w-full text-sm font-semibold cursor-pointer transition-colors duration-150 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 hover:border-gray-300"
                    >
                      {tier.cta}
                    </Button>
                  </a>
                ) : (
                  /* Pro trial navigates to /register — would connect to Stripe checkout in production */
                  <Link
                    to="/register"
                    className="block rounded-lg focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
                  >
                    <Button
                      className={cn(
                        'w-full text-sm font-semibold cursor-pointer transition-colors duration-150',
                        tier.highlighted
                          ? 'bg-lime-700 hover:bg-lime-800 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 hover:border-gray-300',
                      )}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
