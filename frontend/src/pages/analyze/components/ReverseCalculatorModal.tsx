import { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { ScenarioDetail, ReverseCalculateResponse } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenario: ScenarioDetail
  strategy: string
  onApplyPrice: (price: number) => void
}

interface TargetOption {
  metric: string
  label: string
  unit: 'pct' | 'dollar'
  defaultValue: number
  priceLabel: string
}

const STRATEGY_TARGETS: Record<string, TargetOption[]> = {
  buy_and_hold: [
    { metric: 'coc_return', label: 'CoC Return', unit: 'pct', defaultValue: 12, priceLabel: 'Max Purchase Price' },
    { metric: 'cap_rate', label: 'Cap Rate', unit: 'pct', defaultValue: 7, priceLabel: 'Max Purchase Price' },
    { metric: 'monthly_cash_flow', label: 'Cash Flow', unit: 'dollar', defaultValue: 300, priceLabel: 'Max Purchase Price' },
  ],
  flip: [
    { metric: 'roi', label: 'Return on Investment', unit: 'pct', defaultValue: 20, priceLabel: 'Max Purchase Price' },
  ],
  brrrr: [
    { metric: 'capital_recycled_pct', label: 'Capital Recycled', unit: 'pct', defaultValue: 100, priceLabel: 'Max Purchase Price' },
  ],
  creative_finance: [
    { metric: 'monthly_cash_flow', label: 'Monthly Cash Flow', unit: 'dollar', defaultValue: 300, priceLabel: 'Max Loan Balance' },
  ],
}

const fmt = (v: number) => '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })
const fmtPct = (v: number) => v.toFixed(2) + '%'

export function ReverseCalculatorModal({ open, onOpenChange, scenario, strategy, onApplyPrice }: Props) {
  const targets = STRATEGY_TARGETS[strategy]
  const [selectedMetric, setSelectedMetric] = useState(targets?.[0]?.metric || '')
  const [targetValue, setTargetValue] = useState(targets?.[0]?.defaultValue || 0)
  const [rawInput, setRawInput] = useState(String(targets?.[0]?.defaultValue || 0))
  const [result, setResult] = useState<ReverseCalculateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  // Reset state when strategy changes or modal opens
  useEffect(() => {
    if (open && targets?.length) {
      setSelectedMetric(targets[0].metric)
      setTargetValue(targets[0].defaultValue)
      setRawInput(String(targets[0].defaultValue))
      setResult(null)
      setConfirming(false)
    }
  }, [open, strategy])

  const activeTarget = targets?.find(t => t.metric === selectedMetric) || targets?.[0]

  const runCalculation = useCallback(async (metric: string, value: number) => {
    if (!scenario || !strategy) return

    const thisRequestId = ++requestIdRef.current
    setLoading(true)
    setResult(null)

    // Build ALL inputs from scenario — use != null to include 0 values
    const inputs: Record<string, number | string> = {}
    if (scenario.inputs_extended) {
      for (const [k, v] of Object.entries(scenario.inputs_extended)) {
        if (v != null) inputs[k] = v
      }
    }
    // Typed columns override extended inputs
    if (scenario.purchase_price != null) inputs.purchase_price = scenario.purchase_price
    if (scenario.monthly_rent != null) inputs.monthly_rent = scenario.monthly_rent
    if (scenario.after_repair_value != null) inputs.after_repair_value = scenario.after_repair_value
    if (scenario.repair_cost != null) inputs.repair_cost = scenario.repair_cost
    if (scenario.down_payment_pct != null) inputs.down_payment_pct = scenario.down_payment_pct
    if (scenario.interest_rate != null) inputs.interest_rate = scenario.interest_rate
    if (scenario.loan_term_years != null) inputs.loan_term_years = scenario.loan_term_years

    try {
      const res = await api.analysis.reverseCalculate(strategy, metric, value, inputs)
      // Only apply if this is still the latest request (prevents stale overwrites)
      if (thisRequestId === requestIdRef.current) {
        setResult(res)
      }
    } catch {
      if (thisRequestId === requestIdRef.current) {
        setResult({
          max_purchase_price: null,
          scenario_at_max: null,
          risk_score: null,
          feasible: false,
          message: 'Calculation failed. Check your inputs.',
        })
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [scenario, strategy])

  // Debounced calculation on target value change
  const handleValueChange = useCallback((raw: string) => {
    setRawInput(raw)
    setConfirming(false)

    const v = parseFloat(raw)
    if (isNaN(v)) return

    setTargetValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runCalculation(selectedMetric, v), 400)
  }, [selectedMetric, runCalculation])

  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric)
    const target = targets?.find(t => t.metric === metric)
    if (target) {
      setTargetValue(target.defaultValue)
      setRawInput(String(target.defaultValue))
    }
    setResult(null)
    setConfirming(false)
  }

  const handleApply = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    if (result?.max_purchase_price) {
      onApplyPrice(result.max_purchase_price)
      onOpenChange(false)
    }
  }

  if (!targets || targets.length === 0) return null

  // Metrics to show from forward calc at max price
  const scenarioAtMax = result?.scenario_at_max || {}

  // Detect which financing inputs were defaulted — strategy-specific labels
  const defaultedAssumptions: string[] = []
  if (strategy === 'buy_and_hold') {
    if (scenario.down_payment_pct == null) defaultedAssumptions.push('20% down')
    if (scenario.interest_rate == null) defaultedAssumptions.push('7.25% rate')
    if (scenario.loan_term_years == null) defaultedAssumptions.push('30yr term')
  } else if (strategy === 'brrrr') {
    if (scenario.interest_rate == null) defaultedAssumptions.push('7.25% refi rate')
    if (scenario.loan_term_years == null) defaultedAssumptions.push('30yr term')
    if (!(scenario.inputs_extended as Record<string, unknown> | undefined)?.refinance_ltv_pct) defaultedAssumptions.push('75% refi LTV')
  } else if (strategy === 'creative_finance') {
    if (scenario.interest_rate == null) defaultedAssumptions.push('7.25% note rate')
    if (scenario.loan_term_years == null) defaultedAssumptions.push('25yr term')
    defaultedAssumptions.push('Seller finance')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-brand font-light">
            Reverse Calculator
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            What&rsquo;s the most I can pay to hit my target?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Target metric selector */}
          {targets.length > 1 && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                Target Metric
              </label>
              <div className="relative">
                <select
                  value={selectedMetric}
                  onChange={e => handleMetricChange(e.target.value)}
                  className="w-full h-10 rounded-md bg-app-bg border border-border-default text-text-primary text-sm pl-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                >
                  {targets.map(t => (
                    <option key={t.metric} value={t.metric}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}

          {/* Target value input */}
          {activeTarget && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                Target {activeTarget.label}
              </label>
              <div className="relative">
                {activeTarget.unit === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
                )}
                <input
                  type="number"
                  value={rawInput}
                  onChange={e => handleValueChange(e.target.value)}
                  step={activeTarget.unit === 'pct' ? '0.5' : '50'}
                  className={`w-full h-10 rounded-md bg-app-bg border border-border-default text-text-primary text-lg font-light tabular-nums pr-12 focus:outline-none focus:ring-2 focus:ring-violet-400/30 ${
                    activeTarget.unit === 'dollar' ? 'pl-7' : 'pl-3'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                  {activeTarget.unit === 'pct' ? '%' : '/mo'}
                </span>
              </div>
            </div>
          )}

          {/* Calculate button */}
          {!result && !loading && (
            <button
              onClick={() => runCalculation(selectedMetric, targetValue)}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors cursor-pointer"
            >
              Calculate
            </button>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-violet-400" />
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="space-y-4">
              {/* Max price hero */}
              <div className={`rounded-xl p-4 text-center ${
                result.feasible
                  ? 'bg-violet-400/[0.08] border border-violet-400/20'
                  : 'bg-loss/[0.08] border border-loss/20'
              }`}>
                {result.feasible && result.max_purchase_price ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                      {activeTarget?.priceLabel || 'Max Purchase Price'}
                    </p>
                    <p className="text-2xl font-medium tabular-nums text-text-primary font-brand">
                      {fmt(result.max_purchase_price)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-loss">
                    {result.message}
                  </p>
                )}
              </div>

              {/* Defaulted assumptions label */}
              {result.feasible && defaultedAssumptions.length > 0 && (
                <p className="text-xs text-text-muted text-center -mt-2">
                  Based on: {defaultedAssumptions.join(' · ')}
                </p>
              )}

              {/* Forward calc metrics */}
              {result.feasible && Object.keys(scenarioAtMax).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                    At this price
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {strategy === 'buy_and_hold' && (
                      <>
                        <MetricPill label="Cash Flow" value={fmt(Number(scenarioAtMax.monthly_cash_flow || 0))} suffix="/mo" />
                        <MetricPill label="Cap Rate" value={fmtPct(Number(scenarioAtMax.cap_rate || 0))} />
                        <MetricPill label="DSCR" value={String(Number(scenarioAtMax.dscr || 0).toFixed(2))} />
                        <MetricPill label="CoC Return" value={fmtPct(Number(scenarioAtMax.coc_return || 0))} />
                      </>
                    )}
                    {strategy === 'flip' && (
                      <>
                        <MetricPill label="Profit" value={fmt(Number(scenarioAtMax.gross_profit || 0))} />
                        <MetricPill label="ROI" value={fmtPct(Number(scenarioAtMax.roi || 0))} />
                        <MetricPill label="Margin" value={fmtPct(Number(scenarioAtMax.profit_margin_pct || 0))} />
                        <MetricPill label="Ann. ROI" value={fmtPct(Number(scenarioAtMax.annualized_roi || 0))} />
                      </>
                    )}
                    {strategy === 'brrrr' && (
                      <>
                        <MetricPill label="Cash Left" value={fmt(Number(scenarioAtMax.money_left_in || 0))} />
                        <MetricPill label="Recycled" value={fmtPct(Number(scenarioAtMax.capital_recycled_pct || 0))} />
                        <MetricPill label="Cash Flow" value={fmt(Number(scenarioAtMax.monthly_cash_flow || 0))} suffix="/mo" />
                        <MetricPill label="CoC Return" value={scenarioAtMax.coc_return != null ? fmtPct(Number(scenarioAtMax.coc_return)) : 'Infinite'} />
                      </>
                    )}
                    {strategy === 'creative_finance' && (
                      <>
                        <MetricPill label="Cash Flow" value={fmt(Number(scenarioAtMax.monthly_cash_flow || 0))} suffix="/mo" />
                        <MetricPill label="DSCR" value={String(Number(scenarioAtMax.dscr || 0).toFixed(2))} />
                        <MetricPill label="Equity Day 1" value={fmt(Number(scenarioAtMax.equity_day_one || 0))} />
                        <MetricPill label="Eff. Yield" value={fmtPct(Number(scenarioAtMax.effective_yield || 0))} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              {result.feasible && result.message && (
                <p className="text-xs text-text-muted text-center">
                  {result.message}
                </p>
              )}

              {/* Apply button */}
              {result.feasible && result.max_purchase_price && (
                <button
                  onClick={handleApply}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    confirming
                      ? 'bg-violet-400 text-white'
                      : 'border border-violet-400/30 text-violet-400 hover:bg-violet-400/10'
                  }`}
                >
                  <ArrowRight size={14} />
                  {confirming
                    ? `Confirm — update price to ${fmt(result.max_purchase_price)}`
                    : 'Apply This Price'
                  }
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MetricPill({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-app-bg border border-border-default rounded-lg px-3 py-2">
      <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
      <p className="text-sm tabular-nums font-medium text-text-primary">
        {value}{suffix && <span className="text-text-muted font-normal">{suffix}</span>}
      </p>
    </div>
  )
}
