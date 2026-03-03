/** StatsStrip — social proof stats row with count-up animations, icons, and staggered entrance. */

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { DollarSign, BarChart3, MapPin, Star } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { STATS } from './constants'
import type { StatItem } from './constants'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<StatItem['icon'], LucideIcon> = {
  DollarSign,
  BarChart3,
  MapPin,
  Star,
}

const COUNT_UP_DURATION = 1500

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
}

/** Formats a count-up number with optional commas and decimal places. */
function formatValue(raw: number, decimals: number, useCommas: boolean): string {
  const rounded = decimals > 0 ? raw.toFixed(decimals) : Math.round(raw).toString()
  if (!useCommas) return rounded
  const [intPart, decPart] = rounded.split('.')
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas
}

/** Single stat cell with count-up animation triggered by viewport entry. */
function StatCell({ stat, inView, reducedMotion }: { stat: StatItem; inView: boolean; reducedMotion: boolean }) {
  const Icon = ICON_MAP[stat.icon]
  const decimals = stat.decimals ?? 0
  const useCommas = stat.useCommas ?? false

  // When not yet in view, target is 0 so the hook counts from 0.
  // When reduced motion is preferred, jump straight to the final value.
  const target = inView ? stat.numericValue : 0
  const duration = reducedMotion ? 0 : COUNT_UP_DURATION
  const animated = useCountUp(target, duration)

  // Show final value immediately for reduced motion or before animation starts
  const displayValue = reducedMotion && inView
    ? formatValue(stat.numericValue, decimals, useCommas)
    : formatValue(animated, decimals, useCommas)

  return (
    <div className="text-center space-y-2">
      <Icon
        className="mx-auto text-indigo-500"
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <p className="text-3xl font-mono font-semibold text-text-primary">
        {stat.prefix}
        {displayValue}
        {stat.suffix}
      </p>
      <p className="text-xs text-text-muted tracking-[0.08em]">{stat.label}</p>
    </div>
  )
}

export function StatsStrip() {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-40px' })
  const reducedMotion = useReducedMotion() ?? false

  return (
    <section
      ref={sectionRef}
      className="py-16 px-6 border-b border-border-subtle"
      aria-label="Platform statistics"
    >
      <motion.div
        className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10"
        variants={reducedMotion ? undefined : containerVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {STATS.map((stat) => (
          <motion.div
            key={stat.label}
            variants={reducedMotion ? undefined : itemVariants}
          >
            <StatCell stat={stat} inView={inView} reducedMotion={reducedMotion} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
