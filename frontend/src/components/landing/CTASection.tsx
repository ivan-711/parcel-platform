/**
 * CTASection — peak-end conversion moment.
 *
 * Three layered interventions transform the closer into an earned climax:
 *   1. Atmospheric backdrop — building-complete.jpg, warm amber fragments
 *      emerging from darkness behind the headline. Opacity 0.18 with a
 *      linear darken overlay preserves AAA text contrast.
 *   2. Commanding headline — Satoshi 300 at clamp(2.25rem, 5vw+0.5rem, 4.5rem)
 *      with a font-medium emphasis word. Two-sentence action rhythm.
 *   3. Amplified violet glow — radial gradient at 10% alpha placed slightly
 *      below center, behind the CTA button, so the button sits on a pool of
 *      warm accent light.
 *
 * All decorative layers are pointer-events: none so the button remains
 * clickable. Framer-motion reveals respect prefers-reduced-motion via the
 * existing landing-utils hook.
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
      className="relative overflow-hidden py-32 md:py-48"
    >
      {/* ATMOSPHERIC IMAGE SLOT 3 — layered alongside the existing building backdrop,
          15-20% opacity, subtle 2s scroll-driven reveal. Sits between Layer 1b and Layer 3
          if added later so it darkens-and-emerges under the violet glow. */}
      {/* Layers 1a + 1b — Atmospheric backdrop (dark theme only).
          Hidden in light theme to avoid a dark strip punching through the
          bright page. The warm-amber dark-scene image + near-black darken
          overlay only belong on the dark canvas. */}
      <div
        aria-hidden="true"
        className="cta-atmospheric-layer absolute inset-0 pointer-events-none [.light_&]:hidden"
      >
        {/* Layer 1a — Atmospheric backdrop image (building fragments, warm amber) */}
        <img
          src="/images/building-complete.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
          style={{ opacity: 0.18, zIndex: -20 }}
        />

        {/* Layer 1b — Darken overlay: top/bottom heavy, slight center lift */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0C0B0A]/95 via-[#0C0B0A]/70 to-[#0C0B0A]/95"
          style={{ zIndex: -10 }}
        />
      </div>

      {/* Layer 3 — Amplified violet glow behind the CTA button */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 60%, rgba(139,122,255,0.10), transparent 75%)',
          zIndex: -10,
        }}
      />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: ease.vercel }}
          className="font-brand font-light tracking-[-0.02em] text-text-primary"
          style={{ fontSize: 'clamp(2.25rem, 5vw + 0.5rem, 4.5rem)' }}
        >
          Stop guessing. <span className="font-medium">Start closing.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, delay: 0.1, ease: ease.vercel }}
          className="text-lg text-text-secondary mt-7 max-w-xl mx-auto"
        >
          Built for investors who move fast.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, delay: 0.2, ease: ease.vercel }}
          className="mt-14"
        >
          <Link
            to="/register"
            className="inline-block rounded-full px-8 py-3 text-base font-medium text-accent-text-on-accent hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] transition-all duration-200 focus-ring"
            style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
          >
            Get Started Free
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : undefined}
          transition={{ duration: 0.5, delay: 0.3, ease: ease.vercel }}
          className="text-[11px] text-text-secondary mt-4"
        >
          No credit card required
        </motion.p>
      </div>
    </section>
  )
}
