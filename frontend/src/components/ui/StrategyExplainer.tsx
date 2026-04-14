import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { prefersReducedMotion, duration, ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface StrategyInfo {
  name: string
  summary: string
  keyMetric: string
  keyMetricLabel: string
  bestFor: string
  color: string        // strategy accent color
}

const STRATEGY_INFO: Record<string, StrategyInfo> = {
  wholesale: {
    name: 'Wholesale',
    summary: 'Find a property under market value, put it under contract, then assign that contract to another investor for a fee. You never buy the property yourself.',
    keyMetric: 'mao',
    keyMetricLabel: 'MAO (Maximum Allowable Offer)',
    bestFor: 'Beginners with limited capital. Low risk, low capital required.',
    color: '#E5A84B',
  },
  brrrr: {
    name: 'BRRRR',
    summary: 'Buy, Rehab, Rent, Refinance, Repeat. Purchase below value, renovate, rent out, refinance at the new higher value to pull your cash back out, then repeat.',
    keyMetric: 'money_left_in',
    keyMetricLabel: 'Money Left in Deal',
    bestFor: 'Building a rental portfolio by recycling the same capital.',
    color: '#D4A867',
  },
  buy_and_hold: {
    name: 'Buy & Hold',
    summary: 'Purchase a rental property and hold it long-term for monthly cash flow, equity buildup from mortgage paydown, and property appreciation.',
    keyMetric: 'monthly_cash_flow',
    keyMetricLabel: 'Monthly Cash Flow',
    bestFor: 'Long-term passive income builders.',
    color: '#6DBEA3',
  },
  flip: {
    name: 'Fix & Flip',
    summary: 'Buy below market, renovate to increase value, and sell for profit. A short-term project (3\u20139 months), not a long-term hold.',
    keyMetric: 'roi',
    keyMetricLabel: 'ROI (Return on Investment)',
    bestFor: 'Active investors with rehab experience or contractor relationships.',
    color: '#D4766A',
  },
  creative_finance: {
    name: 'Creative Finance',
    summary: 'Acquire property using non-traditional financing \u2014 seller financing, subject-to, lease options, or wrap mortgages. Control properties with little to no money down.',
    keyMetric: 'equity_day_one',
    keyMetricLabel: 'Equity Day One',
    bestFor: 'Experienced investors comfortable with legal complexity.',
    color: '#C4BEFF',
  },
}

interface StrategyExplainerProps {
  strategy: string
  defaultExpanded?: boolean
  className?: string
}

export function StrategyExplainer({ strategy, defaultExpanded = false, className }: StrategyExplainerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const info = STRATEGY_INFO[strategy]
  if (!info) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-app-bg overflow-hidden',
        className
      )}
      style={{ borderLeftWidth: '2px', borderLeftColor: info.color }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-layer-1 transition-colors"
      >
        <span className="text-xs text-text-muted font-medium">
          About {info.name}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'ml-auto text-text-muted transition-transform',
            expanded && 'rotate-180'
          )}
          style={{ transitionDuration: `${duration.normal * 1000}ms` }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: duration.normal, ease: ease.luxury }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <p className="text-sm text-text-secondary leading-relaxed">
                {info.summary}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Key metric:</span>
                <span className="text-xs text-text-primary">{info.keyMetricLabel}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Best for:</span>
                <span className="text-xs text-text-secondary">{info.bestFor}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
