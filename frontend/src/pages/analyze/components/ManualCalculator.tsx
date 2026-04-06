import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useOnboardingStore } from '@/stores/onboardingStore'
import type { Strategy } from '@/types'

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'flip', label: 'Flip' },
  { value: 'creative_finance', label: 'Creative Finance' },
]

const PERSONA_TO_STRATEGY: Record<string, Strategy> = {
  wholesale: 'wholesale',
  flip: 'flip',
  buy_and_hold: 'buy_and_hold',
  creative_finance: 'creative_finance',
  brrrr: 'brrrr',
  hybrid: 'buy_and_hold',
  agent: 'buy_and_hold',
  beginner: 'buy_and_hold',
}

interface InputFieldDef {
  key: string
  label: string
  suffix?: string
  prefix?: string
  step?: string
  defaultValue?: number
}

const STRATEGY_FIELDS: Record<Strategy, InputFieldDef[]> = {
  buy_and_hold: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'down_payment_pct', label: 'Down Payment', suffix: '%', defaultValue: 20 },
    { key: 'interest_rate', label: 'Interest Rate', suffix: '%', step: '0.01', defaultValue: 7.25 },
    { key: 'loan_term_years', label: 'Loan Term', suffix: 'years', defaultValue: 30 },
    { key: 'monthly_rent', label: 'Monthly Rent', prefix: '$' },
    { key: 'vacancy_rate_pct', label: 'Vacancy Rate', suffix: '%', defaultValue: 8 },
    { key: 'monthly_taxes', label: 'Property Taxes', prefix: '$', suffix: '/mo' },
    { key: 'monthly_insurance', label: 'Insurance', prefix: '$', suffix: '/mo' },
    { key: 'maintenance_pct', label: 'Maintenance', suffix: '%', defaultValue: 5 },
    { key: 'mgmt_fee_pct', label: 'Property Mgmt', suffix: '%', defaultValue: 8 },
  ],
  wholesale: [
    { key: 'arv', label: 'After Repair Value', prefix: '$' },
    { key: 'repair_costs', label: 'Repair Cost', prefix: '$' },
    { key: 'desired_profit', label: 'Assignment Fee', prefix: '$', defaultValue: 10000 },
    { key: 'closing_costs_pct', label: 'Closing Costs', suffix: '%', defaultValue: 3 },
    { key: 'asking_price', label: 'Asking Price', prefix: '$' },
  ],
  flip: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'arv', label: 'After Repair Value', prefix: '$' },
    { key: 'rehab_budget', label: 'Repair Cost', prefix: '$' },
    { key: 'holding_months', label: 'Holding Period', suffix: 'months', defaultValue: 5 },
    { key: 'selling_costs_pct', label: 'Selling Costs', suffix: '%', defaultValue: 8 },
    { key: 'financing_costs', label: 'Financing Costs', prefix: '$', defaultValue: 0 },
  ],
  brrrr: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'rehab_costs', label: 'Repair Cost', prefix: '$' },
    { key: 'arv_post_rehab', label: 'After Repair Value', prefix: '$' },
    { key: 'refinance_ltv_pct', label: 'Refinance LTV', suffix: '%', defaultValue: 75 },
    { key: 'new_loan_rate', label: 'Refi Interest Rate', suffix: '%', step: '0.01', defaultValue: 7.25 },
    { key: 'new_loan_term_years', label: 'Refi Term', suffix: 'years', defaultValue: 30 },
    { key: 'monthly_rent', label: 'Monthly Rent', prefix: '$' },
    { key: 'monthly_expenses', label: 'Monthly Expenses', prefix: '$', defaultValue: 400 },
  ],
  creative_finance: [
    { key: 'existing_loan_balance', label: 'Existing Loan Balance', prefix: '$' },
    { key: 'existing_interest_rate', label: 'Existing Rate', suffix: '%', step: '0.01' },
    { key: 'monthly_piti', label: 'Monthly PITI', prefix: '$' },
    { key: 'monthly_rent_estimate', label: 'Monthly Rent', prefix: '$' },
    { key: 'monthly_expenses', label: 'Monthly Expenses', prefix: '$', defaultValue: 300 },
    { key: 'finance_type', label: 'Type', suffix: '', defaultValue: 0 },
    { key: 'new_rate', label: 'New Rate', suffix: '%', step: '0.01' },
    { key: 'new_term_years', label: 'New Term', suffix: 'years', defaultValue: 30 },
    { key: 'arv', label: 'After Repair Value', prefix: '$' },
  ],
}

// Key metric to show prominently per strategy
const KEY_METRIC: Record<Strategy, { key: string; label: string; prefix?: string; suffix?: string }> = {
  buy_and_hold: { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', prefix: '$' },
  wholesale: { key: 'mao', label: 'Max Allowable Offer', prefix: '$' },
  flip: { key: 'gross_profit', label: 'Gross Profit', prefix: '$' },
  brrrr: { key: 'money_left_in', label: 'Cash Left In Deal', prefix: '$' },
  creative_finance: { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', prefix: '$' },
}

const METRIC_LABELS: Record<string, { label: string; prefix?: string; suffix?: string }> = {
  cap_rate: { label: 'Cap Rate', suffix: '%' },
  coc_return: { label: 'Cash-on-Cash', suffix: '%' },
  dscr: { label: 'DSCR' },
  roi: { label: 'ROI', suffix: '%' },
  monthly_cash_flow: { label: 'Monthly Cash Flow', prefix: '$' },
  annual_cash_flow: { label: 'Annual Cash Flow', prefix: '$' },
  mao: { label: 'MAO', prefix: '$' },
  gross_profit: { label: 'Gross Profit', prefix: '$' },
  money_left_in: { label: 'Cash Left In', prefix: '$' },
  refi_proceeds: { label: 'Refi Proceeds', prefix: '$' },
  equity_captured: { label: 'Equity Captured', prefix: '$' },
  profit_at_ask: { label: 'Profit at Ask', prefix: '$' },
  total_cost: { label: 'Total Cost', prefix: '$' },
  break_even_rent: { label: 'Break-Even Rent', prefix: '$' },
  annualized_roi: { label: 'Annualized ROI', suffix: '%' },
  capital_recycled_pct: { label: 'Capital Recycled', suffix: '%' },
  effective_yield: { label: 'Effective Yield', suffix: '%' },
}

interface Props {
  onBack: () => void
}

export function ManualCalculator({ onBack }: Props) {
  const persona = useOnboardingStore((s) => s.persona)
  const defaultStrategy = PERSONA_TO_STRATEGY[persona || 'buy_and_hold'] || 'buy_and_hold'

  const [strategy, setStrategy] = useState<Strategy>(defaultStrategy)
  const [inputs, setInputs] = useState<Record<string, number | string>>({})
  const [outputs, setOutputs] = useState<Record<string, number | string | null> | null>(null)
  const [riskScore, setRiskScore] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveAddress, setSaveAddress] = useState('')
  const [showSave, setShowSave] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()

  // Initialize default values when strategy changes
  useEffect(() => {
    const fields = STRATEGY_FIELDS[strategy]
    const defaults: Record<string, number | string> = {}
    fields.forEach(f => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue
    })
    // For creative_finance, default finance_type to string
    if (strategy === 'creative_finance') defaults['finance_type'] = 'subject_to'
    setInputs(defaults)
    setOutputs(null)
    setRiskScore(null)
  }, [strategy])

  const runCalc = useCallback(async (currentInputs: Record<string, number | string>) => {
    // Check if we have enough inputs to calculate
    const fields = STRATEGY_FIELDS[strategy]
    const requiredCount = fields.filter(f => f.defaultValue === undefined).length
    const filledCount = fields.filter(f => {
      const val = currentInputs[f.key]
      return val !== undefined && val !== '' && val !== 0
    }).length

    if (filledCount < Math.max(requiredCount, 2)) {
      setOutputs(null)
      return
    }

    setCalculating(true)
    try {
      const result = await api.analysis.calculate(strategy, currentInputs)
      setOutputs(result.outputs)
      setRiskScore(result.risk_score)
    } catch {
      // don't show error for partial inputs
    } finally {
      setCalculating(false)
    }
  }, [strategy])

  const handleInputChange = (key: string, raw: string) => {
    const val = key === 'finance_type' ? raw : (raw === '' ? '' : parseFloat(raw))
    const updated = { ...inputs, [key]: val }
    setInputs(updated)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      // Filter out empty values
      const clean: Record<string, number | string> = {}
      for (const [k, v] of Object.entries(updated)) {
        if (v !== '' && v !== undefined) clean[k] = v
      }
      runCalc(clean)
    }, 300)
  }

  const handleSave = async () => {
    if (!saveAddress || saveAddress.length < 5) return
    setSaving(true)
    try {
      await api.analysis.saveAsProperty(saveAddress, strategy, inputs)
      setShowSave(false)
      setSaveAddress('')
    } catch {
      // show error inline
    } finally {
      setSaving(false)
    }
  }

  const keyMetric = KEY_METRIC[strategy]
  const keyMetricValue = outputs?.[keyMetric.key]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Back link */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors mb-6">
        <ArrowLeft size={14} />
        Back to address lookup
      </button>

      {/* Heading */}
      <h2
        className="text-2xl sm:text-3xl text-[#F0EDE8] text-center mb-2"
        style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
      >
        Quick Calculator
      </h2>
      <p className="text-sm text-[#C5C0B8] text-center mb-8">
        Run the numbers without looking up a property
      </p>

      {/* Strategy tabs */}
      <div className="flex gap-1.5 justify-center flex-wrap mb-8">
        {STRATEGIES.map(s => (
          <button
            key={s.value}
            onClick={() => setStrategy(s.value)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              strategy === s.value
                ? 'bg-[#8B7AFF] text-white'
                : 'bg-[#141311] text-[#8A8580] hover:text-[#C5C0B8] border border-[#1E1D1B]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Inputs */}
        <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-[#8A8580] font-medium mb-4">Inputs</h3>
          <div className="space-y-3">
            {STRATEGY_FIELDS[strategy].map(field => (
              <div key={field.key}>
                <label className="text-xs text-[#8A8580] uppercase tracking-wider mb-1 block">
                  {field.label}
                </label>
                {field.key === 'finance_type' ? (
                  <select
                    value={String(inputs[field.key] || 'subject_to')}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-[#0C0B0A] border border-[#1E1D1B] text-[#F0EDE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/30"
                  >
                    <option value="subject_to">Subject-To</option>
                    <option value="seller_finance">Seller Finance</option>
                  </select>
                ) : (
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8580]">{field.prefix}</span>
                    )}
                    <input
                      type="number"
                      step={field.step || '1'}
                      value={inputs[field.key] ?? ''}
                      onChange={e => handleInputChange(field.key, e.target.value)}
                      placeholder="0"
                      className={`w-full h-10 rounded-md bg-[#0C0B0A] border border-[#1E1D1B] text-[#F0EDE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/30 ${field.prefix ? 'pl-7' : 'px-3'} ${field.suffix ? 'pr-12' : 'pr-3'}`}
                    />
                    {field.suffix && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8580]">{field.suffix}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wider text-[#8A8580] font-medium mb-4">Results</h3>

          {!outputs ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[#8A8580] text-sm">Enter inputs to see results</p>
              <p className="text-[#8A8580]/60 text-xs mt-1">Results update as you type</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Key metric */}
              <div className="text-center pb-4 border-b border-[#1E1D1B]">
                <p className="text-xs text-[#8A8580] uppercase tracking-wider mb-1">{keyMetric.label}</p>
                <p className={`text-4xl font-light ${
                  typeof keyMetricValue === 'number' && keyMetricValue > 0 ? 'text-[#4ADE80]' :
                  typeof keyMetricValue === 'number' && keyMetricValue < 0 ? 'text-[#F87171]' :
                  'text-[#F0EDE8]'
                }`}>
                  {keyMetric.prefix || ''}{typeof keyMetricValue === 'number' ? keyMetricValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                </p>
                {riskScore !== null && (
                  <p className="text-xs text-[#8A8580] mt-2">
                    Risk Score: <span className={riskScore <= 33 ? 'text-[#4ADE80]' : riskScore <= 66 ? 'text-[#FBBF24]' : 'text-[#F87171]'}>{riskScore}/100</span>
                  </p>
                )}
              </div>

              {/* Supporting metrics */}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(outputs).filter(([k]) => k !== keyMetric.key && METRIC_LABELS[k]).map(([k, v]) => {
                  const meta = METRIC_LABELS[k]
                  if (!meta || v === null || v === undefined) return null
                  const numVal = typeof v === 'number' ? v : parseFloat(String(v))
                  if (isNaN(numVal)) return null
                  return (
                    <div key={k} className="bg-[#0C0B0A] rounded-lg p-3">
                      <p className="text-[10px] text-[#8A8580] uppercase tracking-wider mb-0.5">{meta.label}</p>
                      <p className="text-lg text-[#F0EDE8] font-light">
                        {meta.prefix || ''}{numVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}{meta.suffix || ''}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Save as Property */}
              <div className="pt-4 border-t border-[#1E1D1B]">
                {!showSave ? (
                  <button
                    onClick={() => setShowSave(true)}
                    className="flex items-center gap-2 text-sm text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
                  >
                    <Save size={14} />
                    Save as Property
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[#8A8580]">Add an address to save this analysis</p>
                    <input
                      type="text"
                      value={saveAddress}
                      onChange={e => setSaveAddress(e.target.value)}
                      placeholder="e.g. 613 N 14th St, Sheboygan, WI"
                      className="w-full h-10 px-3 rounded-md bg-[#0C0B0A] border border-[#1E1D1B] text-[#F0EDE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving || saveAddress.length < 5}
                        className="px-4 py-2 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => { setShowSave(false); setSaveAddress('') }}
                        className="px-4 py-2 rounded-lg text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {calculating && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#141311]/50 rounded-xl">
              <Loader2 size={20} className="animate-spin text-[#8B7AFF]" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
