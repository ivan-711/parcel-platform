import { useState, useEffect } from 'react'
import { Loader2, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ScenarioDetail, StrategyResult, CompareResponse } from '@/types'

const STRATEGY_LABELS: Record<string, string> = {
  wholesale: 'Wholesale', brrrr: 'BRRRR', buy_and_hold: 'Buy & Hold',
  flip: 'Flip', creative_finance: 'Creative',
}

type SortKey = 'roi' | 'risk_score' | 'break_even_months' | 'five_year_total_return'

interface Props {
  propertyId: string
  activeStrategy: string
  scenarios: ScenarioDetail[]
  onStrategySwitch: (strategy: string) => void
}

export function StrategyComparison({ propertyId, activeStrategy, scenarios, onStrategySwitch }: Props) {
  const [comparison, setComparison] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [showReason, setShowReason] = useState(false)

  useEffect(() => {
    if (!scenarios.length) return

    const scenario = scenarios.find(s => s.strategy === activeStrategy) || scenarios[0]
    if (!scenario) return

    const inputs: Record<string, number | string> = {}
    if (scenario.purchase_price) inputs.purchase_price = scenario.purchase_price
    if (scenario.monthly_rent) inputs.monthly_rent = scenario.monthly_rent
    if (scenario.after_repair_value) inputs.arv = scenario.after_repair_value
    if (scenario.repair_cost) inputs.repair_cost = scenario.repair_cost
    if (scenario.down_payment_pct) inputs.down_payment_pct = scenario.down_payment_pct
    if (scenario.interest_rate) inputs.interest_rate = scenario.interest_rate
    if (scenario.loan_term_years) inputs.loan_term_years = scenario.loan_term_years
    if (scenario.inputs_extended) {
      Object.assign(inputs, scenario.inputs_extended)
    }

    setLoading(true)
    api.analysis.compare(inputs)
      .then(setComparison)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [scenarios, activeStrategy])

  if (loading) {
    return (
      <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#8B7AFF]" />
      </div>
    )
  }

  if (!comparison) return null

  let sorted = [...comparison.strategies]
  if (sortBy) {
    sorted.sort((a, b) => {
      const av = a[sortBy] ?? 999
      const bv = b[sortBy] ?? 999
      return sortBy === 'risk_score' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }

  const handleSort = (key: SortKey) => {
    setSortBy(sortBy === key ? null : key)
    try { (window as any).posthog?.capture?.('comparison_sorted', { sort_by: key }) } catch { /* ignore */ }
  }

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
        Compare Strategies
      </h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-[#8A8580] uppercase tracking-wider border-b border-[#1E1D1B]">
              <th className="text-left py-2 pr-3">Strategy</th>
              <th className="text-right py-2 px-3">Key Metric</th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('roi')}>
                ROI <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('risk_score')}>
                Risk <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-center py-2 px-3">Horizon</th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('break_even_months')}>
                Break-Even <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('five_year_total_return')}>
                5yr Return <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-left py-2 pl-3">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const isRecommended = r.strategy === comparison.recommendation
              const isActive = r.strategy === activeStrategy
              return (
                <tr
                  key={r.strategy}
                  onClick={() => onStrategySwitch(r.strategy)}
                  className={cn(
                    'border-b border-[#1E1D1B]/50 last:border-0 cursor-pointer transition-colors',
                    isRecommended ? 'bg-[#8B7AFF]/5 border-l-2 border-l-[#8B7AFF]' : 'hover:bg-[#1A1918]',
                    isActive && 'bg-[#1E1D1B]/50'
                  )}
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#F0EDE8] font-medium">{STRATEGY_LABELS[r.strategy] || r.strategy}</span>
                      {isRecommended && (
                        <span className="text-[9px] bg-[#8B7AFF]/15 text-[#8B7AFF] px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Best
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#F0EDE8]">
                    {r.key_metric != null ? `$${Math.round(r.key_metric).toLocaleString()}` : '—'}
                    <span className="text-[9px] text-[#8A8580] block">{r.key_metric_label}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#F0EDE8]">
                    {r.roi != null ? `${r.roi.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn(
                      'text-xs tabular-nums',
                      r.risk_score <= 33 ? 'text-[#4ADE80]' : r.risk_score <= 66 ? 'text-[#FBBF24]' : 'text-[#F87171]'
                    )}>
                      {r.risk_score}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-[#C5C0B8] capitalize">{r.time_horizon}</td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#C5C0B8]">
                    {r.break_even_months != null ? `${r.break_even_months}mo` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#F0EDE8]">
                    {r.five_year_total_return != null ? `$${Math.round(r.five_year_total_return).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 pl-3 text-xs text-[#8A8580] max-w-[200px] truncate">{r.verdict}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map(r => {
          const isRecommended = r.strategy === comparison.recommendation
          return (
            <button
              key={r.strategy}
              onClick={() => onStrategySwitch(r.strategy)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors cursor-pointer',
                isRecommended
                  ? 'bg-[#8B7AFF]/5 border-[#8B7AFF]/30'
                  : 'bg-[#0C0B0A] border-[#1E1D1B] hover:border-[#8B7AFF]/20'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#F0EDE8] font-medium">{STRATEGY_LABELS[r.strategy]}</span>
                {isRecommended && (
                  <span className="text-[9px] bg-[#8B7AFF]/15 text-[#8B7AFF] px-1.5 py-0.5 rounded uppercase tracking-wider">Best</span>
                )}
              </div>
              <p className="text-xs text-[#8A8580]">{r.verdict}</p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-[#F0EDE8] tabular-nums">{r.key_metric != null ? `$${Math.round(r.key_metric).toLocaleString()}` : '—'}</span>
                <span className={r.risk_score <= 33 ? 'text-[#4ADE80]' : r.risk_score <= 66 ? 'text-[#FBBF24]' : 'text-[#F87171]'}>
                  Risk: {r.risk_score}
                </span>
                <span className="text-[#8A8580] capitalize">{r.time_horizon}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Why this recommendation */}
      {comparison.recommendation_reason && (
        <button
          onClick={() => setShowReason(!showReason)}
          className="flex items-center gap-1 mt-4 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
        >
          {showReason ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Why {STRATEGY_LABELS[comparison.recommendation] || comparison.recommendation}?
        </button>
      )}
      {showReason && (
        <p className="mt-2 text-xs text-[#C5C0B8] pl-4 border-l-2 border-[#8B7AFF]/20">
          {comparison.recommendation_reason}
        </p>
      )}
    </div>
  )
}
