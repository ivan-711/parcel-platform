/**
 * PricingSection — dark-themed pricing cards with monthly/annual toggle.
 * Two tiers: Free and Pro. Pro highlighted with subtle violet border.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

type Interval = 'monthly' | 'annual'

const FREE_FEATURES = [
  '5 AI messages / month',
  '3 saved deals',
  'Basic calculators',
  'Community support',
]

const PRO_FEATURES = [
  'Unlimited AI chat',
  'Unlimited deals',
  'All 5 strategy calculators',
  'Deal pipeline',
  'Portfolio tracking',
  'Document storage',
  'PDF reports',
  'Priority support',
]

export function PricingSection() {
  const [interval, setInterval] = useState<Interval>('monthly')
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  const proPrice = interval === 'annual' ? '$55' : '$69'
  const proPeriod = interval === 'annual' ? '/mo, billed annually' : '/month'

  return (
    <section id="pricing" className="py-16 md:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary">
            PRICING
          </p>
          <h2 className="font-brand text-3xl md:text-4xl font-light tracking-[-0.02em] text-text-primary mt-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-text-secondary mt-3">
            Start with a 7-day free trial. No credit card required.
          </p>
        </div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: ease.luxury }}
          className="flex justify-center mb-12"
        >
          <div className="bg-app-recessed rounded-full p-1 border border-border-default flex">
            {(['monthly', 'annual'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setInterval(opt)}
                className={`
                  relative rounded-full px-5 py-2 min-h-[44px] md:min-h-0 text-sm transition-colors duration-200 cursor-pointer
                  ${interval === opt
                    ? 'bg-border-strong text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {opt === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
            {interval === 'annual' && (
              <span className="ml-2 self-center text-[11px] text-[#8B7AFF] font-medium pr-2">
                Save 20%
              </span>
            )}
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, ease: ease.vercel }}
            className="bg-app-surface border border-border-default rounded-xl p-8"
          >
            <h3 className="font-brand text-2xl font-light text-text-primary">Free</h3>
            <div className="mt-4">
              <span className="font-brand text-4xl font-light text-text-primary">$0</span>
              <span className="text-sm text-text-secondary ml-1">/month</span>
            </div>
            <ul className="mt-8 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                  <span className="text-sm text-text-primary/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-8 block text-center border border-border-strong text-text-primary rounded-full py-3 text-sm font-medium hover:bg-border-subtle transition-colors duration-200"
            >
              Get Started
            </Link>
          </motion.div>

          {/* Pro tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: 0.1, ease: ease.vercel }}
            className="bg-app-surface border border-[#8B7AFF]/25 rounded-xl p-8 relative shadow-[0_0_24px_rgba(139,122,255,0.06)]"
          >
            <span className="absolute top-4 right-4 bg-[#8B7AFF]/[0.08] text-[#8B7AFF] text-[11px] uppercase tracking-[0.08em] font-medium rounded-full px-3 py-1">
              Popular
            </span>
            <h3 className="font-brand text-2xl font-light text-text-primary">Pro</h3>
            <div className="mt-4 flex items-baseline">
              <AnimatePresence mode="wait">
                <motion.span
                  key={proPrice}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="font-brand text-4xl font-light text-text-primary"
                >
                  {proPrice}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-text-secondary ml-1">{proPeriod}</span>
            </div>
            <ul className="mt-8 space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                  <span className="text-sm text-text-primary/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-8 block text-center rounded-full py-3 text-sm font-medium text-accent-text-on-accent hover:opacity-90 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
            >
              Start 7-Day Free Trial
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
