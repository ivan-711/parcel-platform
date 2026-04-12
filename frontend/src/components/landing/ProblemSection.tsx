/**
 * ProblemSection — confrontational two-line statement.
 * No decoration — just text doing the work.
 */

import { motion } from 'framer-motion'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

export function ProblemSection() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.2 })

  return (
    <section ref={ref} className="py-32 md:py-48">
      <div className="max-w-[680px] mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: ease.luxury }}
          className="font-brand font-light tracking-[-0.02em] text-text-primary leading-[1.25]"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw + 0.5rem, 2.625rem)' }}
        >
          You're running numbers across 4 tabs, 3 spreadsheets,<br />and a prayer.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, delay: 0.25, ease: ease.luxury }}
          className="text-base md:text-lg text-text-secondary mt-8"
        >
          Your competitor just did it in <span className="text-text-primary font-medium">60 seconds</span>.
        </motion.p>
      </div>
    </section>
  )
}
