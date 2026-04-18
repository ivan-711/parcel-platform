/**
 * PricingSection — dark-themed pricing cards with monthly/annual toggle.
 * Three tiers: Steel (free), Carbon ($79), Titanium ($149).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

type Interval = 'monthly' | 'annual'

const STEEL_FEATURES = [
  '3 deal analyses / month',
  '5 AI messages / month',
  '5 saved deals',
  'All 5 strategy calculators',
]

const CARBON_FEATURES = [
  'Unlimited analyses',
  '150 AI messages / month',
  'Full deal pipeline',
  'Portfolio tracking',
  'Document AI & PDF reports',
  'Skip tracing (25 / mo)',
]

const TITANIUM_FEATURES = [
  'Everything in Carbon',
  '500 AI messages / month',
  'Up to 5 team members',
  'Unlimited document AI',
  'Direct mail (50 / mo)',
]

export function PricingSection() {
  const [interval, setInterval] = useState<Interval>('monthly')
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  const carbonPrice = interval === 'annual' ? '$63' : '$79'
  const carbonPeriod = interval === 'annual' ? '/mo, billed annually' : '/month'
  const titaniumPrice = interval === 'annual' ? '$119' : '$149'
  const titaniumPeriod = interval === 'annual' ? '/mo, billed annually' : '/month'

  return (
    <section id="pricing" className="py-32 md:py-48" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted">
            PRICING
          </p>
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary mt-4"
            style={{ fontSize: 'clamp(1.5rem, 3vw + 0.5rem, 2.5rem)' }}
          >
            Plans that scale with your portfolio
          </h2>
          <p className="text-text-secondary mt-3">
            Start free. Upgrade when you're ready.
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
                aria-pressed={interval === opt}
                className={`
                  relative rounded-full px-5 py-2 min-h-[44px] md:min-h-0 text-sm transition-colors duration-200 cursor-pointer focus-ring
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Steel tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, ease: ease.vercel }}
            whileHover={{ y: -4 }}
            className="bg-app-surface border border-border-default rounded-xl p-8 transition-all duration-200 hover:shadow-xl hover:border-[rgba(255,255,255,0.12)]"
          >
            <h3 className="font-brand text-2xl font-light text-text-primary">Steel</h3>
            <div className="mt-4">
              <span className="font-brand text-4xl font-light text-text-primary">$0</span>
              <span className="text-sm text-text-secondary ml-1">/month</span>
            </div>
            <ul className="mt-8 space-y-3">
              {STEEL_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                  <span className="text-sm text-text-primary/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-8 block text-center border border-border-strong text-text-secondary rounded-full py-3 text-sm font-medium hover:bg-border-subtle transition-colors duration-200 focus-ring"
            >
              Get Started
            </Link>
          </motion.div>

          {/* Carbon tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: 0.1, ease: ease.vercel }}
            whileHover={{ y: -4 }}
            className="bg-app-surface border border-[#8B7AFF]/25 rounded-xl p-8 relative shadow-[0_0_24px_rgba(139,122,255,0.06)] transition-all duration-200 hover:shadow-[0_0_40px_rgba(139,122,255,0.15)]"
          >
            <span className="absolute top-4 right-4 bg-[#8B7AFF]/[0.08] text-[#8B7AFF] text-[11px] uppercase tracking-[0.08em] font-medium rounded-full px-3 py-1">
              Popular
            </span>
            <h3 className="font-brand text-2xl font-light text-text-primary">Carbon</h3>
            <div className="mt-4 flex items-baseline">
              <AnimatePresence mode="wait">
                <motion.span
                  key={carbonPrice}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="font-brand text-4xl font-light text-text-primary"
                >
                  {carbonPrice}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-text-secondary ml-1">{carbonPeriod}</span>
            </div>
            <ul className="mt-8 space-y-3">
              {CARBON_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[#A09D98] mt-0.5 shrink-0" />
                  <span className="text-sm text-text-primary/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-8 block text-center rounded-full py-3 text-sm font-medium text-accent-text-on-accent hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] transition-all duration-200 focus-ring"
              style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
            >
              Start 7-Day Free Trial
            </Link>
          </motion.div>

          {/* Titanium tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: 0.2, ease: ease.vercel }}
            whileHover={{ y: -4 }}
            className="bg-app-surface border border-border-default rounded-xl p-8 transition-all duration-200 hover:shadow-xl hover:border-[rgba(255,255,255,0.12)]"
          >
            <h3 className="font-brand text-2xl font-light text-text-primary">Titanium</h3>
            <div className="mt-4 flex items-baseline">
              <AnimatePresence mode="wait">
                <motion.span
                  key={titaniumPrice}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="font-brand text-4xl font-light text-text-primary"
                >
                  {titaniumPrice}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-text-secondary ml-1">{titaniumPeriod}</span>
            </div>
            <ul className="mt-8 space-y-3">
              {TITANIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
                  <span className="text-sm text-text-primary/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-8 block text-center border border-border-strong text-text-primary rounded-full py-3 text-sm font-medium hover:bg-border-subtle transition-colors duration-200 focus-ring"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
