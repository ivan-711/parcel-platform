/**
 * Testimonials — auto-advancing carousel of investor testimonials with strategy badges,
 * key financial metrics, and crossfade transitions via AnimatePresence.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Strategy = 'wholesale' | 'creative_finance' | 'brrrr' | 'buy_and_hold' | 'flip'

interface Testimonial {
  name: string
  initials: string
  role: string
  strategy: Strategy
  quote: string
  metric: string
  metricLabel: string
}

/* ------------------------------------------------------------------ */
/*  Strategy badge config (light theme pastels)                        */
/* ------------------------------------------------------------------ */

const STRATEGY_STYLE: Record<Strategy, { bg: string; text: string; label: string }> = {
  wholesale: { bg: '#FEF3C7', text: '#92400E', label: 'Wholesale' },
  creative_finance: { bg: '#EDE9FE', text: '#5B21B6', label: 'Creative Finance' },
  brrrr: { bg: '#DBEAFE', text: '#1E40AF', label: 'BRRRR' },
  buy_and_hold: { bg: '#D1FAE5', text: '#065F46', label: 'Buy & Hold' },
  flip: { bg: '#FFE4E6', text: '#9F1239', label: 'Flip' },
}

/* ------------------------------------------------------------------ */
/*  Testimonial data                                                   */
/* ------------------------------------------------------------------ */

const testimonials: readonly Testimonial[] = [
  {
    name: 'Marcus Rivera',
    initials: 'MR',
    role: 'Full-time Investor',
    strategy: 'wholesale',
    quote:
      'Parcel cut my deal analysis time from two hours to under five minutes. I closed three extra wholesale deals last quarter just from the speed alone.',
    metric: '$840K',
    metricLabel: 'total assignments tracked',
  },
  {
    name: 'Dana Whitfield',
    initials: 'DW',
    role: 'Creative Finance Specialist',
    strategy: 'creative_finance',
    quote:
      'The sub-to and seller-finance calculators finally give me numbers I can trust. I stopped second-guessing my offers and started closing with confidence.',
    metric: '23',
    metricLabel: 'creative deals closed this year',
  },
  {
    name: 'Jason Nguyen',
    initials: 'JN',
    role: 'BRRRR Specialist',
    strategy: 'brrrr',
    quote:
      'Being able to model rehab costs against the refi appraisal in one place is a game-changer. Parcel shows me exactly how much equity I can pull out before I even make the offer.',
    metric: '14.2%',
    metricLabel: 'avg cash-on-cash return',
  },
  {
    name: 'Keisha Odom',
    initials: 'KO',
    role: 'Portfolio Investor',
    strategy: 'buy_and_hold',
    quote:
      'I manage 34 doors and Parcel is the only tool that gives me a real-time portfolio view with per-unit cash flow. The AI chat even flags underperformers before I notice them.',
    metric: '$12.4K',
    metricLabel: 'monthly net cash flow',
  },
  {
    name: 'Tyler Brandt',
    initials: 'TB',
    role: 'Real Estate Agent & Flipper',
    strategy: 'flip',
    quote:
      'My rehab budgets used to be napkin math. Now I punch in the scope and Parcel spits out a projected ROI that my hard-money lender actually respects.',
    metric: '31%',
    metricLabel: 'avg flip ROI',
  },
] as const

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const cardVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/** Auto-advancing testimonial carousel with crossfade transitions and strategy badges. */
export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = testimonials.length
  const current = testimonials[activeIndex]
  const style = STRATEGY_STYLE[current.strategy]

  /* --- Navigation helpers --- */

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1)
      setActiveIndex(index)
    },
    [activeIndex],
  )

  const goNext = useCallback(() => {
    setDirection(1)
    setActiveIndex((prev) => (prev + 1) % total)
  }, [total])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setActiveIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  /* --- Auto-advance timer --- */

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setDirection(1)
      setActiveIndex((prev) => (prev + 1) % total)
    }, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, total])

  /* --- Pause handlers --- */

  const pause = useCallback(() => setIsPaused(true), [])
  const resume = useCallback(() => setIsPaused(false), [])

  return (
    <section
      id="testimonials"
      className="py-24 px-6 border-t border-gray-200 bg-gray-50"
    >
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.08em] text-lime-700 font-semibold">
            Testimonials
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900">
            What investors are closing with Parcel
          </h2>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Card + arrows row */}
          <div className="flex items-center gap-3">
            {/* Left arrow — hidden on mobile, shown sm+ */}
            <button
              onClick={goPrev}
              aria-label="Previous testimonial"
              className="hidden sm:flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 focus-visible:outline-none"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Card */}
            <div
              className="flex-1 min-w-0"
              onMouseEnter={pause}
              onMouseLeave={resume}
              onFocusCapture={pause}
              onBlurCapture={resume}
            >
              <div
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden shadow-xs"
                aria-live="polite"
                aria-atomic="true"
              >
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activeIndex}
                    custom={direction}
                    variants={cardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-6"
                  >
                    {/* Avatar + identity */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{
                          backgroundColor: '#F7FEE7',
                          color: '#4D7C0F',
                        }}
                        aria-hidden="true"
                      >
                        {current.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {current.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {current.role}
                          </span>
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
                            style={{
                              backgroundColor: style.bg,
                              color: style.text,
                            }}
                          >
                            {style.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quote */}
                    <blockquote className="text-sm text-gray-600 leading-relaxed">
                      &ldquo;{current.quote}&rdquo;
                    </blockquote>

                    {/* Key metric */}
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-2xl text-lime-700 font-semibold tabular-nums">
                        {current.metric}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {current.metricLabel}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right arrow — hidden on mobile, shown sm+ */}
            <button
              onClick={goNext}
              aria-label="Next testimonial"
              className="hidden sm:flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 focus-visible:outline-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Mobile arrows — shown below card on xs, hidden sm+ */}
          <div className="flex sm:hidden items-center justify-center gap-3 mt-4">
            <button
              onClick={goPrev}
              aria-label="Previous testimonial"
              className="flex w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 focus-visible:outline-none"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goNext}
              aria-label="Next testimonial"
              className="flex w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 focus-visible:outline-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Navigation dots */}
          <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Testimonial navigation">
            {testimonials.map((t, i) => (
              <button
                key={t.name}
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Testimonial from ${t.name}`}
                onClick={() => goTo(i)}
                className="group p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 rounded-full"
              >
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: i === activeIndex ? 24 : 8,
                    height: 8,
                    backgroundColor: i === activeIndex ? '#4D7C0F' : '#D0D5DD',
                  }}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
