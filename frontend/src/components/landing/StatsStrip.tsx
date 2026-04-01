/**
 * StatsStrip — social proof numbers bar with count-up animation on viewport entry.
 */

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
  { value: 98, suffix: '%', label: 'Calculation Accuracy' },
  { value: 30, suffix: 'sec', label: 'Average Analysis Time' },
]

function StatItem({
  stat,
  isVisible,
  isLast,
}: {
  stat: StatDef
  isVisible: boolean
  isLast: boolean
}) {
  const count = useCountUp(stat.value, 800, isVisible, stat.decimals ?? 0)
  const display = stat.useCommas ? formatWithCommas(count) : count

  return (
    <div className="flex items-center">
      <div className="text-center px-4 md:px-8 py-2">
        <p className="font-brand text-4xl md:text-5xl font-light tracking-[-0.02em] text-[#F0EDE8]">
          {display}
          {stat.suffix}
        </p>
        <p className="text-sm text-[#A09D98] mt-2">{stat.label}</p>
      </div>
      {!isLast && (
        <div className="hidden md:block border-r border-white/[0.06] h-16 self-center" />
      )}
    </div>
  )
}

export function StatsStrip() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.3 })

  return (
    <section
      ref={ref}
      className="bg-[#131210] border-y border-white/[0.04] py-16"
    >
      {/* Desktop: row, Mobile: 2x2 grid */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="hidden md:flex items-center justify-center">
          {STATS.map((stat, i) => (
            <StatItem
              key={stat.label}
              stat={stat}
              isVisible={isVisible}
              isLast={i === STATS.length - 1}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-8 md:hidden">
          {STATS.map((stat) => (
            <StatItem key={stat.label} stat={stat} isVisible={isVisible} isLast />
          ))}
        </div>
      </div>
    </section>
  )
}
