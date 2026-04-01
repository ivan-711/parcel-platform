/**
 * HowItWorks — 3-step process section with glass cards and staggered entrance.
 */

import { motion } from 'framer-motion'
import { Building2, Calculator, CheckCircle2 } from 'lucide-react'
import { ease, duration } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

const STEPS = [
  {
    number: '01',
    icon: Building2,
    title: 'Input Your Deal',
    description:
      'Enter the property address and your acquisition numbers. Choose your investment strategy.',
  },
  {
    number: '02',
    icon: Calculator,
    title: 'Get Instant Analysis',
    description:
      'Our calculators crunch every metric — cash flow, cap rate, DSCR, ROI, and risk score — in real time.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Make Confident Decisions',
    description:
      'Compare strategies side by side, chat with AI for deeper insights, and move deals into your pipeline.',
  },
]

export function HowItWorks() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  return (
    <section id="how-it-works" className="py-24 md:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#A09D98]">
            HOW IT WORKS
          </p>
          <h2 className="font-brand text-3xl md:text-4xl font-light tracking-[-0.02em] text-[#F0EDE8] mt-4">
            From Address to Analysis in Seconds
          </h2>
        </div>

        {/* Steps grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting dashed line on desktop */}
          <div className="hidden md:block absolute top-[88px] left-0 right-0 border-t border-dashed border-white/[0.06] mx-8" />

          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : undefined}
                transition={{
                  duration: 0.6,
                  delay: i * 0.15,
                  ease: ease.vercel,
                }}
                className="relative bg-[#1A1916] border border-white/[0.06] rounded-xl p-8"
              >
                <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A7872]">
                  {step.number}
                </p>
                <Icon className="w-10 h-10 text-[#A09D98] mt-4" strokeWidth={1.5} />
                <h3 className="font-brand text-xl font-light text-[#F0EDE8] mt-4">
                  {step.title}
                </h3>
                <p className="text-sm text-[#A09D98] mt-2 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
