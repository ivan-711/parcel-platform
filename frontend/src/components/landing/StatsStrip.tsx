/**
 * StatsStrip — social proof numbers floating on the void.
 * No borders, no background blocks, no dividers — just type rhythm,
 * tabular numerals, and generous whitespace.
 */

import { motion } from 'framer-motion'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll, useCountUp, formatWithCommas } from './landing-utils'

interface StatDef {
  value: number
  suffix: string
  label: string
  decimals?: number
  useCommas?: boolean
}

const STATS: StatDef[] = [
  { value: 5, suffix: '', label: 'Strategy Calculators' },
  { value: 10000, suffix: '+', label: 'Deals Analyzed', useCommas: true },
  { value: 16, suffix: '', label: 'Financial Metrics' },
  { value: 30, suffix: 'sec', label: 'Average Analysis Time' },
]

function StatItem({
  stat,
  isVisible,
  index,
}: {
  stat: StatDef
  isVisible: boolean
  index: number
}) {
  const count = useCountUp(stat.value, 800, isVisible, stat.decimals ?? 0)
  const display = stat.useCommas ? formatWithCommas(count) : count

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, delay: 0.1 + index * 0.12, ease: ease.luxury }}
      className="text-center"
    >
      <p
        className="font-brand font-light tracking-[-0.02em] text-text-primary"
        style={{
          fontSize: 'clamp(2.25rem, 4vw + 0.25rem, 3rem)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
        {stat.suffix}
      </p>
      <p className="text-sm text-text-secondary mt-3">{stat.label}</p>
    </motion.div>
  )
}

export function StatsStrip() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.3 })

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-14 gap-x-8 md:gap-x-12 lg:gap-x-16">
          {STATS.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} isVisible={isVisible} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
