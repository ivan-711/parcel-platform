import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { METRIC_TOOLTIPS } from './MetricTooltips'
import type { ScenarioDetail } from '@/types'

interface MetricDef {
  key: string
  label: string
  prefix?: string
  suffix?: string
  threshold?: { green: number; yellow: number }
  tier: 'primary' | 'secondary'
}

const STRATEGY_PRIMARY: Record<string, { key: string; label: string; prefix?: string; suffix?: string }> = {
  buy_and_hold: { key: 'monthly_cash_flow', label: 'NET CASH FLOW', prefix: '$', suffix: '/mo' },
  wholesale: { key: 'mao', label: 'MAX ALLOWABLE OFFER', prefix: '$' },
  flip: { key: 'gross_profit', label: 'NET PROFIT', prefix: '$' },
  brrrr: { key: 'money_left_in', label: 'CASH LEFT IN DEAL', prefix: '$' },
  creative_finance: { key: 'monthly_cash_flow', label: 'MONTHLY SPREAD', prefix: '$', suffix: '/mo' },
}

const SUPPORTING_METRICS: Record<string, MetricDef[]> = {
  buy_and_hold: [
    // Primary (5)
    { key: 'cap_rate', label: 'CAP RATE', suffix: '%', threshold: { green: 7, yellow: 5 }, tier: 'primary' },
    { key: 'coc_return', label: 'COC RETURN', suffix: '%', threshold: { green: 8, yellow: 5 }, tier: 'primary' },
    { key: 'dscr', label: 'DSCR', threshold: { green: 1.25, yellow: 1.0 }, tier: 'primary' },
    { key: 'rent_to_price_ratio', label: '1% RULE', suffix: '%', threshold: { green: 1, yellow: 0.7 }, tier: 'primary' },
    { key: 'annual_cash_flow', label: 'ANNUAL CASH FLOW', prefix: '$', tier: 'primary' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$', tier: 'primary' },
    // Secondary (3)
    { key: 'monthly_pi', label: 'MONTHLY PMT', prefix: '$', tier: 'secondary' },
    { key: 'break_even_rent', label: 'BREAK-EVEN RENT', prefix: '$', tier: 'secondary' },
    { key: 'expense_ratio', label: 'EXPENSE RATIO', suffix: '%', tier: 'secondary' },
  ],
  wholesale: [
    // Primary (3)
    { key: 'profit_at_ask', label: 'PROFIT AT ASK', prefix: '$', tier: 'primary' },
    { key: 'break_even_price', label: 'BREAK-EVEN', prefix: '$', tier: 'primary' },
    { key: 'recommendation', label: 'VERDICT', tier: 'primary' },
    // Secondary (4)
    { key: 'mao_65', label: 'MAO 65%', prefix: '$', tier: 'secondary' },
    { key: 'mao_75', label: 'MAO 75%', prefix: '$', tier: 'secondary' },
    { key: 'closing_costs', label: 'CLOSING COSTS', prefix: '$', tier: 'secondary' },
    { key: 'assignment_fee_pct_arv', label: 'FEE % ARV', suffix: '%', tier: 'secondary' },
  ],
  flip: [
    // Primary (4)
    { key: 'roi', label: 'ROI', suffix: '%', threshold: { green: 15, yellow: 8 }, tier: 'primary' },
    { key: 'annualized_roi', label: 'ANNUALIZED ROI', suffix: '%', tier: 'primary' },
    { key: 'total_cost', label: 'TOTAL COST', prefix: '$', tier: 'primary' },
    { key: 'profit_margin_pct', label: 'MARGIN', suffix: '%', tier: 'primary' },
    // Secondary (3)
    { key: 'selling_costs', label: 'SELLING COSTS', prefix: '$', tier: 'secondary' },
    { key: 'cost_per_sqft_rehab', label: '$/SQFT REHAB', prefix: '$', tier: 'secondary' },
    { key: 'five_year_total_return', label: 'TOTAL PROFIT', prefix: '$', tier: 'secondary' },
  ],
  brrrr: [
    // Primary (5)
    { key: 'refi_proceeds', label: 'REFI PROCEEDS', prefix: '$', tier: 'primary' },
    { key: 'equity_captured', label: 'EQUITY CAPTURED', prefix: '$', tier: 'primary' },
    { key: 'capital_recycled_pct', label: 'CAPITAL RECYCLED', suffix: '%', tier: 'primary' },
    { key: 'coc_return', label: 'COC RETURN', suffix: '%', tier: 'primary' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$', tier: 'primary' },
    // Secondary (3)
    { key: 'monthly_cash_flow', label: 'CASH FLOW', prefix: '$', suffix: '/mo', tier: 'secondary' },
    { key: 'infinite_return', label: 'INFINITE RETURN', tier: 'secondary' },
    { key: 'forced_appreciation', label: 'FORCED APPREC.', prefix: '$', tier: 'secondary' },
  ],
  creative_finance: [
    // Primary (4)
    { key: 'dscr', label: 'DSCR', threshold: { green: 1.25, yellow: 1.0 }, tier: 'primary' },
    { key: 'equity_day_one', label: 'DAY-1 EQUITY', prefix: '$', tier: 'primary' },
    { key: 'annual_cash_flow', label: 'ANNUAL FLOW', prefix: '$', tier: 'primary' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$', tier: 'primary' },
    // Secondary (3)
    { key: 'effective_yield', label: 'YIELD', suffix: '%', tier: 'secondary' },
    { key: 'wrap_spread_monthly', label: 'WRAP SPREAD', prefix: '$', suffix: '/mo', tier: 'secondary' },
    { key: 'sub_to_risk_score', label: 'SUB-TO RISK', tier: 'secondary' },
  ],
}

function dotColor(value: number | null, threshold?: { green: number; yellow: number }): string {
  if (value === null || !threshold) return '#8A8580'
  if (value >= threshold.green) return '#4ADE80'
  if (value >= threshold.yellow) return '#FBBF24'
  return '#F87171'
}

function formatVal(v: number | string | boolean | null | undefined, prefix?: string, suffix?: string): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string') return v
  const formatted = Math.abs(v) >= 1000
    ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : v.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return `${prefix || ''}${formatted}${suffix || ''}`
}

function MetricTooltipPopover({ metricKey, outputs }: { metricKey: string; outputs: Record<string, any> }) {
  const tip = METRIC_TOOLTIPS[metricKey]
  if (!tip) return null
  const computed = tip.compute(outputs)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Info about ${metricKey}`}
          className="text-[var(--chart-axis-text)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <HelpCircle size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 space-y-2">
        <p className="text-xs text-[var(--chart-tooltip-label)] leading-relaxed">{tip.description}</p>
        <p className="text-xs font-mono text-[var(--chart-tooltip-text)]">{tip.formula}</p>
        {computed && (
          <p className="text-xs font-mono font-medium text-[var(--chart-tooltip-text)] pt-1 border-t border-[var(--border-subtle)]">
            {computed}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function MetricCard({ m, val, outputs }: { m: MetricDef; val: number | string | boolean | null | undefined; outputs: Record<string, any> }) {
  if (val === undefined || val === null) return null
  const numVal = typeof val === 'number' ? val : null
  return (
    <div className="bg-[#0C0B0A] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {m.threshold && (
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor(numVal, m.threshold) }}
          />
        )}
        <p className="text-[10px] text-[#8A8580] uppercase tracking-wider flex-1">{m.label}</p>
        <MetricTooltipPopover metricKey={m.key} outputs={outputs} />
      </div>
      <p className="text-lg text-[#F0EDE8] font-light">
        {formatVal(val, m.prefix, m.suffix)}
      </p>
    </div>
  )
}

interface Props {
  scenario: ScenarioDetail
}

export function KeyMetrics({ scenario }: Props) {
  const [showMore, setShowMore] = useState(false)
  const strategy = scenario.strategy
  const outputs = scenario.outputs || {}
  const primary = STRATEGY_PRIMARY[strategy] || STRATEGY_PRIMARY.buy_and_hold
  const allMetrics = SUPPORTING_METRICS[strategy] || SUPPORTING_METRICS.buy_and_hold
  const primaryVal = outputs[primary.key]

  const primaryMetrics = allMetrics.filter(m => m.tier === 'primary')
  const secondaryMetrics = allMetrics.filter(m => m.tier === 'secondary')
  const secondaryCount = secondaryMetrics.filter(m => outputs[m.key] !== undefined && outputs[m.key] !== null).length

  return (
    <div>
      {/* Primary metric */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[11px] text-[#8A8580] uppercase tracking-wider">{primary.label}</p>
          <MetricTooltipPopover metricKey={primary.key} outputs={outputs} />
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl sm:text-5xl font-light ${
            typeof primaryVal === 'number' && primaryVal > 0 ? 'text-[#4ADE80]' :
            typeof primaryVal === 'number' && primaryVal < 0 ? 'text-[#F87171]' :
            'text-[#F0EDE8]'
          }`}>
            {formatVal(primaryVal, primary.prefix)}
          </span>
          {primary.suffix && <span className="text-[#8A8580] text-sm">{primary.suffix}</span>}
        </div>
      </div>

      {/* Primary supporting metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {primaryMetrics.map(m => (
          <MetricCard key={m.key} m={m} val={outputs[m.key]} outputs={outputs} />
        ))}
      </div>

      {/* Secondary metrics expandable */}
      {secondaryCount > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1.5 text-xs text-[#8A8580] hover:text-[#C5C0B8] transition-colors cursor-pointer"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showMore ? 'rotate-180 text-[#8B7AFF]' : ''}`}
            />
            {showMore ? 'Hide metrics' : `More Metrics (${secondaryCount})`}
          </button>
          <AnimatePresence initial={false}>
            {showMore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {secondaryMetrics.map(m => (
                    <MetricCard key={m.key} m={m} val={outputs[m.key]} outputs={outputs} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
