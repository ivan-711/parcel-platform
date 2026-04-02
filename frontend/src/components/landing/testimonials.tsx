/**
 * Testimonials — glass card testimonial grid with fade-in entrance.
 */

import { motion } from 'framer-motion'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

const TESTIMONIALS = [
  {
    quote:
      'Parcel replaced three spreadsheets and a napkin calculation for every deal. The BRRRR calculator alone saved me from a bad refinance.',
    name: 'Alex M.',
    role: 'Residential Investor',
  },
  {
    quote:
      "I was skeptical about another real estate tool, but the AI chat actually understands deal structure. It caught a cap rate assumption I missed.",
    name: 'Sarah K.',
    role: 'Portfolio Manager',
  },
  {
    quote:
      'The pipeline view changed how I track deals. I went from sticky notes to a system that actually scales.',
    name: 'Marcus T.',
    role: 'Wholesale Investor',
  },
]

export function Testimonials() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  return (
    <section className="py-16 md:py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary">
            TESTIMONIALS
          </p>
          <h2 className="font-brand text-3xl md:text-4xl font-light tracking-[-0.02em] text-text-primary mt-4">
            Trusted by Investors
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : undefined}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                ease: ease.vercel,
              }}
              className="bg-app-surface border border-border-default rounded-xl p-8 backdrop-blur-sm"
            >
              <p className="text-base text-text-primary/80 leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-10 h-10 rounded-full bg-app-elevated" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.name}</p>
                  <p className="text-[11px] text-text-secondary">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
