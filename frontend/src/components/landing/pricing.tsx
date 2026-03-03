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
  'Pro': { price: '$23', period: 'per month, billed annually' },
  'Team': { price: '$79', period: 'per month, billed annually' },
}

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto space-y-14">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Pricing
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">Simple, transparent pricing</h2>
          <p className="text-sm text-text-secondary">
            No annual contracts. No per-deal fees. Cancel any time.
          </p>
        </motion.div>

        {/* Annual / Monthly toggle */}
        <div className="flex justify-center">
          <div className="rounded-lg bg-app-elevated border border-border-subtle p-1 inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
                !isAnnual
                  ? 'bg-accent-primary text-white'
                  : 'bg-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
                isAnnual
                  ? 'bg-accent-primary text-white'
                  : 'bg-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              Annual
              <span className="text-[10px] font-bold uppercase tracking-wide bg-accent-success/20 text-accent-success px-1.5 py-0.5 rounded">
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
                  'rounded-2xl border p-6 space-y-6 relative overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-accent-primary/10 transition-shadow',
                  tier.highlighted
                    ? 'border-accent-primary/50 bg-accent-primary/5'
                    : 'border-border-subtle bg-app-surface',
                )}
              >
                {/* Pro card top glow line */}
                {tier.highlighted && (
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />
                )}

                {/* Pro ambient glow */}
                {tier.highlighted && (
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full pointer-events-none"
                    style={{ background: 'rgba(99,102,241,0.18)', filter: 'blur(24px)' }}
                  />
                )}

                {/* Header */}
                <div className="space-y-1">
                  {tier.highlighted && (
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-accent-primary mb-2">
                      Most popular
                    </p>
                  )}
                  <p className="font-semibold text-text-primary">{tier.name}</p>
                  <p className="text-xs text-text-muted">{tier.description}</p>
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
                      className="text-4xl font-bold font-mono text-text-primary"
                    >
                      {displayPrice}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-xs text-text-muted">/ {displayPeriod}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                      <Check size={12} className="text-accent-success mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/register" className="block rounded-lg focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg focus-visible:outline-none">
                  <Button
                    className={cn(
                      'w-full text-sm font-semibold cursor-pointer transition-colors duration-150',
                      tier.highlighted
                        ? 'bg-accent-primary hover:bg-accent-hover text-white'
                        : 'bg-app-elevated hover:bg-border-subtle text-text-primary border border-border-default hover:border-border-strong',
                    )}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
