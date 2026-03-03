/** DemoCard — interactive 5-strategy tab switcher that displays KPIs and an AI summary. */

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { STRATEGIES, STRATEGY_COLORS, DEMO_METRICS } from './constants'
import type { StrategyKey } from './constants'

export function DemoCard() {
  const [active, setActive] = useState<StrategyKey>('Buy & Hold')
  const metrics = DEMO_METRICS[active]
  const colors = STRATEGY_COLORS[active]
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = STRATEGIES.indexOf(active)
      let nextIndex: number | null = null

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % STRATEGIES.length
          break
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + STRATEGIES.length) % STRATEGIES.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = STRATEGIES.length - 1
          break
        default:
          return
      }

      e.preventDefault()
      const nextStrategy = STRATEGIES[nextIndex]
      setActive(nextStrategy)
      tabRefs.current[nextIndex]?.focus()
    },
    [active],
  )

  const metricCells: Array<{ label: string; value: string; color?: string }> = [
    { label: 'Cash-on-Cash', value: metrics.coc },
    { label: 'Cap Rate',     value: metrics.capRate },
    { label: 'Cash Flow',    value: metrics.cashFlow },
    { label: 'Risk Score',   value: String(metrics.risk), color: metrics.riskColor },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto rounded-2xl border border-border-default bg-app-surface overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)]"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-app-elevated/40">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {['#3a3a3a', '#3a3a3a', '#3a3a3a'].map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[11px] font-mono text-text-muted ml-1">
            2847 Oak Street, Memphis TN 38103
          </span>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {active}
        </span>
      </div>

      {/* Strategy tabs */}
      <div
        role="tablist"
        aria-label="Investment strategies"
        onKeyDown={handleTabKeyDown}
        className="flex border-b border-border-subtle overflow-x-auto scrollbar-none"
      >
        {STRATEGIES.map((s, i) => (
          <button
            key={s}
            ref={(el) => { tabRefs.current[i] = el }}
            role="tab"
            aria-selected={active === s}
            tabIndex={active === s ? 0 : -1}
            onClick={() => setActive(s)}
            className={cn(
              'flex-1 py-2.5 text-[11px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap min-w-0 px-2 rounded focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg focus-visible:outline-none',
              active === s
                ? 'text-accent-primary bg-accent-primary/5 border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-app-elevated/30',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          role="tabpanel"
          aria-label={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {/* KPI row */}
          <div className="grid grid-cols-4 divide-x divide-border-subtle border-b border-border-subtle">
            {metricCells.map(({ label, value, color }) => (
              <div key={label} className="px-4 py-4 space-y-1">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted font-medium">
                  {label}
                </p>
                <p
                  className="text-xl font-mono font-semibold text-text-primary leading-none"
                  style={color ? { color } : undefined}
                >
                  {value}
                </p>
                {label === 'Risk Score' && (
                  <p className="text-[9px] font-medium" style={{ color: metrics.riskColor }}>
                    {metrics.riskLabel}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* AI summary */}
          <div className="px-5 py-4">
            <div className="flex gap-3 p-3.5 rounded-xl bg-app-elevated border border-border-subtle">
              <div className="w-5 h-5 rounded-md bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center shrink-0 mt-px">
                <span className="text-[8px] font-bold text-accent-primary">AI</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-accent-primary font-semibold">
                  Analysis
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {metrics.aiSummary}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
