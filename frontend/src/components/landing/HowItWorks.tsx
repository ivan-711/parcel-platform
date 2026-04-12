/**
 * HowItWorks — three steps as floating giant numerals on the void.
 * No cards, no borders, no backgrounds — just oversized Satoshi 300
 * digits and the text that earns them. The numbers carry the section.
 */

import { motion } from 'framer-motion'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

const STEPS = [
  {
    number: '01',
    title: 'Input Your Deal',
    description:
      'Enter the property address and your acquisition numbers. Choose your investment strategy.',
  },
  {
    number: '02',
    title: 'Get Instant Analysis',
    description:
      'Our calculators crunch every metric — cash flow, cap rate, DSCR, ROI, and risk score — in real time.',
  },
  {
    number: '03',
    title: 'Make Confident Decisions',
    description:
      'Compare strategies side by side, chat with AI for deeper insights, and move deals into your pipeline.',
  },
]

export function HowItWorks() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  return (
    <section id="how-it-works" className="py-32 md:py-48" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: ease.luxury }}
          className="text-center mb-20 md:mb-28"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted">
            HOW IT WORKS
          </p>
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary mt-4"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)' }}
          >
            From address to <span className="font-medium">analysis</span> in seconds.
          </h2>
        </motion.div>

        {/* Three steps — floating on the void, no containers */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-10 lg:gap-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              animate={isVisible ? { opacity: 1, y: 0 } : undefined}
              transition={{
                duration: 0.9,
                delay: 0.2 + i * 0.18,
                ease: ease.luxury,
              }}
            >
              <p
                className="font-brand font-light tracking-[-0.04em] text-text-primary/15 leading-none"
                style={{
                  fontSize: 'clamp(5rem, 8vw, 6rem)',
                  fontVariantNumeric: 'tabular-nums',
                }}
                aria-hidden="true"
              >
                {step.number}
              </p>
              <h3 className="font-brand text-xl md:text-2xl font-light text-text-primary mt-6">
                {step.title}
              </h3>
              <p className="text-sm md:text-base text-text-secondary mt-3 leading-relaxed max-w-sm">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
