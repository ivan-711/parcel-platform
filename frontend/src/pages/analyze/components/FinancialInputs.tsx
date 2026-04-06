import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ScenarioDetail } from '@/types'

interface InputField {
  key: string
  label: string
  prefix?: string
  suffix?: string
  step?: string
  advanced?: boolean
}

const FIELDS: Record<string, InputField[]> = {
  buy_and_hold: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'down_payment_pct', label: 'Down Payment', suffix: '%' },
    { key: 'interest_rate', label: 'Interest Rate', suffix: '%', step: '0.01' },
    { key: 'monthly_rent', label: 'Gross Monthly', prefix: '$' },
    { key: 'monthly_taxes', label: 'Property Taxes', prefix: '$', suffix: '/mo', advanced: true },
    { key: 'monthly_insurance', label: 'Insurance', prefix: '$', suffix: '/mo', advanced: true },
    { key: 'vacancy_rate_pct', label: 'Vacancy', suffix: '%', advanced: true },
    { key: 'maintenance_pct', label: 'Maintenance', suffix: '%', advanced: true },
    { key: 'mgmt_fee_pct', label: 'Management', suffix: '%', advanced: true },
  ],
  wholesale: [
    { key: 'purchase_price', label: 'Purchase / MAO', prefix: '$' },
    { key: 'after_repair_value', label: 'ARV', prefix: '$' },
    { key: 'repair_cost', label: 'Repair Cost', prefix: '$' },
  ],
  flip: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'after_repair_value', label: 'ARV', prefix: '$' },
    { key: 'repair_cost', label: 'Rehab Budget', prefix: '$' },
  ],
  brrrr: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'repair_cost', label: 'Rehab Cost', prefix: '$' },
    { key: 'after_repair_value', label: 'ARV', prefix: '$' },
    { key: 'monthly_rent', label: 'Monthly Rent', prefix: '$' },
    { key: 'interest_rate', label: 'Refi Rate', suffix: '%', step: '0.01' },
  ],
  creative_finance: [
    { key: 'purchase_price', label: 'Purchase Price', prefix: '$' },
    { key: 'monthly_rent', label: 'Monthly Rent', prefix: '$' },
    { key: 'interest_rate', label: 'Rate', suffix: '%', step: '0.01' },
  ],
}

function badgeForField(fieldKey: string, sourceConfidence: ScenarioDetail['source_confidence'], editedFields: Set<string>): { text: string; color: string } {
  if (editedFields.has(fieldKey)) return { text: 'YOUR INPUT', color: '#8A8580' }
  if (!sourceConfidence) return { text: 'NEEDED', color: '#F87171' }
  const info = sourceConfidence[fieldKey]
  if (!info) return { text: 'NEEDED', color: '#F87171' }
  if (info.confidence === 'single_source' || info.confidence === 'high') return { text: 'VERIFIED', color: '#4ADE80' }
  if (info.confidence === 'estimated') return { text: 'ESTIMATED', color: '#FBBF24' }
  return { text: 'NEEDED', color: '#F87171' }
}

interface Props {
  scenario: ScenarioDetail
  onInputsChange: (inputs: Record<string, number>) => void
}

export function FinancialInputs({ scenario, onInputsChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const debounce = useRef<ReturnType<typeof setTimeout>>()

  const strategy = scenario.strategy
  const fields = FIELDS[strategy] || FIELDS.buy_and_hold

  // Initialize local values from scenario
  useEffect(() => {
    const vals: Record<string, string> = {}
    const typedKeys: Record<string, keyof ScenarioDetail> = {
      purchase_price: 'purchase_price',
      after_repair_value: 'after_repair_value',
      repair_cost: 'repair_cost',
      monthly_rent: 'monthly_rent',
      down_payment_pct: 'down_payment_pct',
      interest_rate: 'interest_rate',
    }

    for (const f of fields) {
      const typedKey = typedKeys[f.key]
      if (typedKey) {
        const v = scenario[typedKey]
        if (v !== null && v !== undefined) vals[f.key] = String(v)
      } else if (scenario.inputs_extended?.[f.key] !== undefined) {
        vals[f.key] = String(scenario.inputs_extended[f.key])
      }
    }
    setLocalValues(vals)
    setEditedFields(new Set())
  }, [scenario.id])

  const handleChange = useCallback((key: string, raw: string) => {
    setLocalValues(prev => ({ ...prev, [key]: raw }))
    setEditedFields(prev => new Set(prev).add(key))

    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      const clean: Record<string, number> = {}
      for (const [k, v] of Object.entries({ ...localValues, [key]: raw })) {
        const num = parseFloat(v)
        if (!isNaN(num)) clean[k] = num
      }
      onInputsChange(clean)
    }, 500)
  }, [localValues, onInputsChange])

  const mainFields = fields.filter(f => !f.advanced)
  const advFields = fields.filter(f => f.advanced)

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
        Financial Inputs
      </h3>

      <div className="space-y-4">
        {mainFields.map(f => {
          const badge = badgeForField(f.key, scenario.source_confidence, editedFields)
          return (
            <div key={f.key}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs text-[#8A8580] uppercase tracking-wider">{f.label}</label>
                <span
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border font-medium"
                  style={{ color: badge.color, borderColor: badge.color + '40' }}
                >
                  {badge.text}
                </span>
              </div>
              <div className="relative">
                {f.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8580]">{f.prefix}</span>
                )}
                <input
                  type="number"
                  step={f.step || '1'}
                  value={localValues[f.key] ?? ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className={`w-full h-10 rounded-md bg-[#0C0B0A] border border-[#1E1D1B] text-[#F0EDE8] text-lg font-light focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/30 ${f.prefix ? 'pl-7' : 'px-3'} ${f.suffix ? 'pr-12' : 'pr-3'}`}
                />
                {f.suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8580]">{f.suffix}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Advanced expenses */}
      {advFields.length > 0 && (
        <>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-[#8A8580] hover:text-[#C5C0B8] mt-5 transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Edit Advanced Expenses
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 pl-3 border-l border-[#1E1D1B]">
              {advFields.map(f => {
                const badge = badgeForField(f.key, scenario.source_confidence, editedFields)
                return (
                  <div key={f.key}>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[10px] text-[#8A8580] uppercase tracking-wider">{f.label}</label>
                      <span
                        className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded-sm border"
                        style={{ color: badge.color, borderColor: badge.color + '40' }}
                      >
                        {badge.text}
                      </span>
                    </div>
                    <div className="relative">
                      {f.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8580]">{f.prefix}</span>}
                      <input
                        type="number"
                        step={f.step || '1'}
                        value={localValues[f.key] ?? ''}
                        onChange={e => handleChange(f.key, e.target.value)}
                        className={`w-full h-9 rounded-md bg-[#0C0B0A] border border-[#1E1D1B] text-[#F0EDE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/30 ${f.prefix ? 'pl-7' : 'px-3'} ${f.suffix ? 'pr-12' : 'pr-3'}`}
                      />
                      {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8580]">{f.suffix}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
