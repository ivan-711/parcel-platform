/**
 * HowItWorks — editorial numbered steps section with large decorative mono numbers,
 * SVG connector lines between steps, and staggered entrance animations.
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Calculator, GitBranch, TrendingUp } from 'lucide-react'
import { EASING } from '@/lib/motion'

const steps = [
  {
    number: '01',
    title: 'Analyze',
    description:
      'Enter any address and deal terms. Parcel runs all five investment strategies simultaneously and gives you a risk score in seconds — not hours.',
    icon: Calculator,
  },
  {
    number: '02',
    title: 'Track',
    description:
      'Add the deal to your pipeline with one click. Move it through stages with drag-and-drop as you negotiate, inspect, and do your diligence.',
    icon: GitBranch,
  },
  {
    number: '03',
    title: 'Close',
    description:
      'Generate offer letters, share deal summaries with your partners, and log every closed deal to your portfolio tracker.',
    icon: TrendingUp,
  },
] as const

/** Container variant that staggers children 100ms apart. */
const stepsContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

/** Step row entrance — slides from left with snappy easing. */
const stepItemVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: EASING.snappy },
  },
}

/** Decorative number — fades in 150ms after step content with smooth easing. */
const decorativeNumberVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: EASING.smooth, delay: 0.15 },
  },
}

/** SVG connector line drawn top-to-bottom via pathLength animation. */
const connectorLineVariants: Variants = {
  hidden: { pathLength: 0 },
  visible: {
    pathLength: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

/** Connector line between steps — a simple vertical SVG stroke. */
function ConnectorLine({ reduced }: { reduced: boolean }) {
  if (reduced) return null

  return (
    <div className="flex justify-start" style={{ paddingLeft: 'clamp(22px, 2.8vw, 32px)' }}>
      <svg
        width="2"
        height="24"
        viewBox="0 0 2 24"
        fill="none"
        aria-hidden="true"
        className="overflow-visible"
      >
        <motion.line
          x1="1"
          y1="0"
          x2="1"
          y2="24"
          stroke="rgba(99,102,241,0.2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          variants={connectorLineVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        />
      </svg>
    </div>
  )
}

export function HowItWorks() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Section header */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Process
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">
            From lead to close in three steps
          </h2>
        </motion.div>

        {/* Steps with stagger container */}
        <motion.div
          variants={prefersReduced ? undefined : stepsContainerVariants}
          initial={prefersReduced ? undefined : 'hidden'}
          whileInView={prefersReduced ? undefined : 'visible'}
          viewport={{ once: true, margin: '-60px' }}
          className="space-y-0"
        >
          {steps.map(({ number, title, description, icon: Icon }, i) => (
            <div key={number}>
              {/* SVG connector line between steps (not before first) */}
              {i > 0 && <ConnectorLine reduced={!!prefersReduced} />}

              <motion.div
                variants={prefersReduced ? undefined : stepItemVariants}
                className="flex items-start gap-8 py-9"
              >
                {/* Large decorative number — separate delayed fade */}
                <motion.span
                  variants={prefersReduced ? undefined : decorativeNumberVariants}
                  className="font-mono font-bold shrink-0 leading-none select-none tabular-nums"
                  style={{
                    fontSize: 'clamp(52px, 6vw, 72px)',
                    color: 'rgba(99,102,241,0.13)',
                  }}
                  aria-hidden="true"
                >
                  {number}
                </motion.span>

                {/* Content */}
                <div className="pt-1.5 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-app-elevated border border-border-subtle flex items-center justify-center">
                      <Icon size={14} className="text-accent-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-lg">
                    {description}
                  </p>
                </div>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
