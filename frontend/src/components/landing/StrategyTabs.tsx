/**
 * StrategyTabs — tabbed breakdown of 5 investment strategies.
 * Content floats directly on the void; the tab strip is the only
 * visual container, and it's kept minimal (pill triggers, no frame).
 * Each tab's content is a composed paragraph, not a card.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'
import { STRATEGIES, STRATEGY_COLORS, DEMO_METRICS } from './constants'
import type { StrategyKey } from './constants'

/** Key metrics label set per strategy */
const STRATEGY_METRICS: Record<StrategyKey, string[]> = {
  'Wholesale':        ['Assignment Fee', 'ARV Spread', 'Days to Close'],
  'BRRRR':            ['Cash-on-Cash', 'Cap Rate', 'Capital Recovery'],
  'Buy & Hold':       ['Cash-on-Cash', 'Cap Rate', 'Monthly Cash Flow'],
  'Flip':             ['ROI', 'Rehab Budget', 'Projected Profit'],
  'Creative Finance': ['Cash-on-Cash', 'Monthly Cash Flow', 'Entry Cost'],
}

function toTabValue(s: StrategyKey) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')
}

export function StrategyTabs() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })
  const [activeTab, setActiveTab] = useState(toTabValue(STRATEGIES[0]))

  return (
    <section ref={ref} id="features" className="py-32 md:py-48">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: ease.luxury }}
          className="text-center mb-16 md:mb-20"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted">
            STRATEGIES
          </p>
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary mt-4"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)' }}
          >
            Five strategies. <span className="font-medium">One</span> address.
          </h2>
        </motion.div>

        {/* Tabs — minimal trigger strip, content floats on the void */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, delay: 0.2, ease: ease.luxury }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex flex-wrap justify-center gap-1.5 bg-transparent border-0 p-0 h-auto mb-14">
              {STRATEGIES.map((strategy) => {
                const value = toTabValue(strategy)
                const colors = STRATEGY_COLORS[strategy]
                const isActive = activeTab === value
                return (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-full px-4 py-2 text-xs md:text-sm font-medium transition-all duration-200 text-text-secondary hover:text-text-primary data-[state=active]:shadow-sm focus-ring"
                    style={isActive ? { backgroundColor: colors.bg, color: colors.text } : undefined}
                  >
                    {strategy}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Tab content — no card, no border, content flows */}
            {STRATEGIES.map((strategy) => {
              const value = toTabValue(strategy)
              const metrics = DEMO_METRICS[strategy]
              const metricLabels = STRATEGY_METRICS[strategy]

              return (
                <TabsContent key={value} value={value} forceMount>
                  <AnimatePresence mode="wait">
                    {activeTab === value && (
                      <motion.div
                        key={value}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, ease: ease.luxury }}
                        className="max-w-2xl mx-auto"
                      >
                        {/* Metric labels — dot-separated eyebrow */}
                        <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted text-center">
                          {metricLabels.join(' · ')}
                        </p>

                        {/* Highlight numbers */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mt-8 text-center">
                          {metrics.coc !== '—' && (
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                                Cash-on-Cash
                              </p>
                              <p
                                className="font-brand font-light text-text-primary mt-2 leading-none"
                                style={{
                                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {metrics.coc}
                              </p>
                            </div>
                          )}
                          {metrics.capRate !== '—' && (
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                                Cap Rate
                              </p>
                              <p
                                className="font-brand font-light text-text-primary mt-2 leading-none"
                                style={{
                                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {metrics.capRate}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                              {strategy === 'Flip' ? 'Projected Profit' : 'Cash Flow'}
                            </p>
                            <p
                              className="font-brand font-light text-text-primary mt-2 leading-none"
                              style={{
                                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {metrics.cashFlow}
                            </p>
                          </div>
                        </div>

                        {/* AI summary — the anchor */}
                        <p className="text-base md:text-lg text-text-secondary leading-relaxed mt-12 text-center">
                          {metrics.aiSummary}
                        </p>

                        {/* Risk indicator — inline dot */}
                        <div className="flex items-center justify-center gap-2 mt-8">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: metrics.riskColor }}
                            aria-hidden="true"
                          />
                          <span className="text-xs text-text-muted">{metrics.riskLabel}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>
              )
            })}
          </Tabs>
        </motion.div>
      </div>
    </section>
  )
}
