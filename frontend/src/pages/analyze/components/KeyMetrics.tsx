import type { ScenarioDetail } from '@/types'

interface MetricDef {
  key: string
  label: string
  prefix?: string
  suffix?: string
  threshold?: { green: number; yellow: number }
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
    { key: 'cap_rate', label: 'CAP RATE', suffix: '%', threshold: { green: 7, yellow: 5 } },
    { key: 'coc_return', label: 'COC RETURN', suffix: '%', threshold: { green: 8, yellow: 5 } },
    { key: 'dscr', label: 'DSCR', threshold: { green: 1.25, yellow: 1.0 } },
    { key: 'annual_cash_flow', label: 'ANNUAL CASH FLOW', prefix: '$' },
    { key: 'monthly_pi', label: 'MONTHLY PMT', prefix: '$' },
    { key: 'break_even_rent', label: 'BREAK-EVEN RENT', prefix: '$' },
    { key: 'rent_to_price_ratio', label: '1% RULE', suffix: '%', threshold: { green: 1, yellow: 0.7 } },
    { key: 'expense_ratio', label: 'EXPENSE RATIO', suffix: '%' },
    { key: 'debt_yield', label: 'DEBT YIELD', suffix: '%' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$' },
  ],
  wholesale: [
    { key: 'profit_at_ask', label: 'PROFIT AT ASK', prefix: '$' },
    { key: 'break_even_price', label: 'BREAK-EVEN', prefix: '$' },
    { key: 'closing_costs', label: 'CLOSING COSTS', prefix: '$' },
    { key: 'recommendation', label: 'VERDICT' },
    { key: 'mao_65', label: 'MAO 65%', prefix: '$' },
    { key: 'mao_75', label: 'MAO 75%', prefix: '$' },
    { key: 'assignment_fee_pct_arv', label: 'FEE % ARV', suffix: '%' },
  ],
  flip: [
    { key: 'roi', label: 'ROI', suffix: '%', threshold: { green: 15, yellow: 8 } },
    { key: 'annualized_roi', label: 'ANNUALIZED ROI', suffix: '%' },
    { key: 'total_cost', label: 'TOTAL COST', prefix: '$' },
    { key: 'profit_margin_pct', label: 'MARGIN', suffix: '%' },
    { key: 'selling_costs', label: 'SELLING COSTS', prefix: '$' },
    { key: 'cost_per_sqft_rehab', label: '$/SQFT REHAB', prefix: '$' },
    { key: 'five_year_total_return', label: 'TOTAL PROFIT', prefix: '$' },
  ],
  brrrr: [
    { key: 'refi_proceeds', label: 'REFI PROCEEDS', prefix: '$' },
    { key: 'equity_captured', label: 'EQUITY CAPTURED', prefix: '$' },
    { key: 'capital_recycled_pct', label: 'CAPITAL RECYCLED', suffix: '%' },
    { key: 'monthly_cash_flow', label: 'CASH FLOW', prefix: '$', suffix: '/mo' },
    { key: 'coc_return', label: 'COC RETURN', suffix: '%' },
    { key: 'infinite_return', label: 'INFINITE RETURN' },
    { key: 'forced_appreciation', label: 'FORCED APPREC.', prefix: '$' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$' },
  ],
  creative_finance: [
    { key: 'dscr', label: 'DSCR', threshold: { green: 1.25, yellow: 1.0 } },
    { key: 'equity_day_one', label: 'DAY-1 EQUITY', prefix: '$' },
    { key: 'effective_yield', label: 'YIELD', suffix: '%' },
    { key: 'annual_cash_flow', label: 'ANNUAL FLOW', prefix: '$' },
    { key: 'wrap_spread_monthly', label: 'WRAP SPREAD', prefix: '$', suffix: '/mo' },
    { key: 'sub_to_risk_score', label: 'SUB-TO RISK' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$' },
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

interface Props {
  scenario: ScenarioDetail
}

export function KeyMetrics({ scenario }: Props) {
  const strategy = scenario.strategy
  const outputs = scenario.outputs || {}
  const primary = STRATEGY_PRIMARY[strategy] || STRATEGY_PRIMARY.buy_and_hold
  const supporting = SUPPORTING_METRICS[strategy] || SUPPORTING_METRICS.buy_and_hold
  const primaryVal = outputs[primary.key]

  return (
    <div>
      {/* Primary metric */}
      <div className="mb-6">
        <p className="text-[11px] text-[#8A8580] uppercase tracking-wider mb-1">{primary.label}</p>
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
        {scenario.risk_score !== null && (
          <p className="text-xs text-[#8A8580] mt-1">
            Risk: <span className={
              scenario.risk_score <= 33 ? 'text-[#4ADE80]' :
              scenario.risk_score <= 66 ? 'text-[#FBBF24]' : 'text-[#F87171]'
            }>{scenario.risk_score}/100</span>
          </p>
        )}
      </div>

      {/* Supporting metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {supporting.map(m => {
          const val = outputs[m.key]
          if (val === undefined || val === null) return null
          const numVal = typeof val === 'number' ? val : null
          return (
            <div key={m.key} className="bg-[#0C0B0A] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {m.threshold && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor(numVal, m.threshold) }}
                  />
                )}
                <p className="text-[10px] text-[#8A8580] uppercase tracking-wider">{m.label}</p>
              </div>
              <p className="text-lg text-[#F0EDE8] font-light">
                {formatVal(val, m.prefix, m.suffix)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
