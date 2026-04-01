/**
 * CTASection — final conversion call-to-action with ambient violet glow.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

export function CTASection() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.2 })

  return (
    <section
      ref={ref}
      className="py-24 md:py-32 relative"
      style={{
        background:
          'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(139,122,255,0.04), transparent 70%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, ease: ease.vercel }}
        className="max-w-7xl mx-auto px-6 text-center"
      >
        <h2 className="font-brand text-3xl md:text-4xl font-light tracking-[-0.02em] text-[#F0EDE8]">
          Ready to Analyze Your Next Deal?
        </h2>
        <p className="text-lg text-[#A09D98] mt-4 max-w-xl mx-auto">
          Join investors who are making data-driven decisions. Start your free 7-day
          trial today.
        </p>
        <Link
          to="/register"
          className="inline-block mt-8 rounded-full px-8 py-3 text-base font-medium text-[#0C0B0A] hover:opacity-90 transition-opacity duration-200"
          style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
        >
          Start Free Trial
        </Link>
        <p className="text-[11px] text-[#7A7872] mt-4">No credit card required</p>
      </motion.div>
    </section>
  )
}
