/**
 * AINarrativeDemo — typing reveal peak moment.
 *
 * Glass card with character-by-character typing animation triggered
 * once when the section scrolls into view. Reduced motion fallback
 * shows the full text instantly.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ease, prefersReducedMotion } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

const NARRATIVE_TEXT =
  'The data shows an 8% equity cushion \u2014 tight for a 1965 build. At 7.25% financing, monthly cash flow is $127 \u2014 positive but thin. Consider negotiating below asking or budgeting 7-8% for CapEx given the age.'

function useTypingAnimation(text: string, shouldStart: boolean) {
  const [displayed, setDisplayed] = useState('')
  const [isDone, setIsDone] = useState(false)
  const hasRun = useRef(false)

  const run = useCallback(() => {
    if (hasRun.current) return
    hasRun.current = true

    if (prefersReducedMotion) {
      setDisplayed(text)
      setIsDone(true)
      return
    }

    let i = 0
    function tick() {
      if (i >= text.length) {
        setIsDone(true)
        return
      }
      const char = text[i]
      i++
      setDisplayed(text.slice(0, i))

      // Pause on punctuation
      let delay = 30
      if (char === '.') delay = 200
      else if (char === ',') delay = 100
      else if (char === '\u2014') delay = 120

      setTimeout(tick, delay)
    }
    tick()
  }, [text])

  useEffect(() => {
    if (!shouldStart) return
    const timer = setTimeout(run, 300) // 300ms after visible
    return () => clearTimeout(timer)
  }, [shouldStart, run])

  return { displayed, isDone }
}

export function AINarrativeDemo() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.2 })
  const { displayed, isDone } = useTypingAnimation(NARRATIVE_TEXT, isVisible)

  return (
    <section ref={ref} className="py-24 md:py-40 relative">
      {/* Ambient green glow behind glass card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle 400px at 50% 60%, rgba(109,190,163,0.06), transparent 70%)',
        }}
      />
      <div className="max-w-[640px] mx-auto px-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: ease.luxury }}
          className="text-center mb-14 md:mb-16"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted">
            AI-POWERED INSIGHTS
          </p>
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary mt-4"
            style={{ fontSize: 'clamp(1.5rem, 3vw + 0.5rem, 2.5rem)' }}
          >
            Not just numbers — <span className="font-medium">narrative.</span>
          </h2>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, delay: 0.1, ease: ease.luxury }}
          className="glass edge-highlight rounded-xl p-6 md:p-8"
        >
          <p className="text-base text-text-primary leading-relaxed min-h-[5rem]">
            {displayed}
            {!isDone && (
              <span className="inline-block w-[2px] h-[1em] bg-text-primary ml-0.5 align-middle animate-blink" />
            )}
          </p>

          {/* Confidence badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isDone ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-5"
          >
            <Badge
              className="bg-[#6DBEA3]/10 text-[#6DBEA3] border-[#6DBEA3]/20 shadow-[0_0_12px_rgba(109,190,163,0.2)]"
            >
              Confidence: HIGH
            </Badge>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={isDone ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, delay: 0.25, ease: ease.luxury }}
            className="text-[11px] text-text-muted mt-2 leading-relaxed"
          >
            Supported by comparable sales, cap rate analysis, and market trend data
          </motion.p>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : undefined}
          transition={{ duration: 0.5, delay: 0.2, ease: ease.luxury }}
          className="text-sm text-text-muted text-center mt-6"
        >
          Every analysis includes an AI-generated narrative that speaks like an analyst, not a chatbot.
        </motion.p>

        {/* Mid-page CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : undefined}
          transition={{ duration: 0.5, delay: 0.3, ease: ease.luxury }}
          className="text-center mt-8"
        >
          <Link
            to="/register"
            className="inline-block rounded-full px-6 py-2.5 text-sm font-medium text-accent-text-on-accent hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] transition-all duration-200 focus-ring"
            style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
          >
            Get Started Free
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
