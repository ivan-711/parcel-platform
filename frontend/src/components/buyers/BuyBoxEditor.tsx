// frontend/src/components/buyers/BuyBoxEditor.tsx
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { CreateBuyBoxRequest } from '@/types'

interface Props {
  value: Partial<CreateBuyBoxRequest>
  onChange: (value: Partial<CreateBuyBoxRequest>) => void
}

const PROPERTY_TYPE_OPTIONS = [
  { value: 'single_family', label: 'SFH' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'triplex', label: 'Triplex' },
  { value: 'fourplex', label: 'Fourplex' },
  { value: 'multi_family', label: 'Multi-Family' },
]
const STRATEGY_OPTIONS = [
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'flip', label: 'Flip' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'creative_finance', label: 'Creative Finance' },
]
const FUNDING_TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'hard_money', label: 'Hard Money' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'creative', label: 'Creative' },
]

const inputCls =
  'w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none'
const labelCls = 'text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block'

export function BuyBoxEditor({ value, onChange }: Props) {
  const [marketInput, setMarketInput] = useState('')

  function addMarket() {
    if (!marketInput.trim()) return
    const current = value.target_markets || []
    if (!current.includes(marketInput.trim())) {
      onChange({ ...value, target_markets: [...current, marketInput.trim()] })
    }
    setMarketInput('')
  }

  function removeMarket(market: string) {
    onChange({
      ...value,
      target_markets: (value.target_markets || []).filter((m) => m !== market),
    })
  }

  function toggleArrayItem(field: 'property_types' | 'strategies', item: string) {
    const current = value[field] || []
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item]
    onChange({ ...value, [field]: next })
  }

  function setNum(field: keyof CreateBuyBoxRequest, raw: string) {
    const n = parseFloat(raw)
    onChange({ ...value, [field]: isNaN(n) ? undefined : n })
  }

  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className={labelCls}>Name *</label>
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. Cash deals under $150K"
          value={value.name ?? ''}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>

      {/* Target Markets */}
      <div>
        <label className={labelCls}>Target Markets</label>
        <div className="flex gap-2">
          <input
            type="text"
            className={inputCls}
            placeholder="City or zip code"
            value={marketInput}
            onChange={(e) => setMarketInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMarket()
              }
            }}
          />
          <button
            type="button"
            onClick={addMarket}
            className="flex items-center gap-1 px-3 py-2 bg-[#1E1D1B] hover:bg-[#2A2926] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {(value.target_markets || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {(value.target_markets || []).map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#8B7AFF]/15 border border-[#8B7AFF]/30 rounded-full text-xs text-[#8B7AFF]"
              >
                {m}
                <button
                  type="button"
                  onClick={() => removeMarket(m)}
                  className="hover:text-[#F0EDE8] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <label className={labelCls}>Price Range</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8580]">$</span>
            <input
              type="number"
              className={`${inputCls} pl-6`}
              placeholder="Min"
              value={value.min_price ?? ''}
              onChange={(e) => setNum('min_price', e.target.value)}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8580]">$</span>
            <input
              type="number"
              className={`${inputCls} pl-6`}
              placeholder="Max"
              value={value.max_price ?? ''}
              onChange={(e) => setNum('max_price', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Property Types */}
      <div>
        <label className={labelCls}>Property Types</label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map((pt) => {
            const selected = (value.property_types || []).includes(pt.value)
            return (
              <button
                key={pt.value}
                type="button"
                onClick={() => toggleArrayItem('property_types', pt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  selected
                    ? 'bg-[#8B7AFF]/20 border-[#8B7AFF]/50 text-[#8B7AFF]'
                    : 'bg-[#0C0B0A] border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/30'
                }`}
              >
                {pt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Strategies */}
      <div>
        <label className={labelCls}>Strategies</label>
        <div className="flex flex-wrap gap-2">
          {STRATEGY_OPTIONS.map((s) => {
            const selected = (value.strategies || []).includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleArrayItem('strategies', s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  selected
                    ? 'bg-[#8B7AFF]/20 border-[#8B7AFF]/50 text-[#8B7AFF]'
                    : 'bg-[#0C0B0A] border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/30'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bedrooms / Bathrooms */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Min Bedrooms</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            placeholder="e.g. 3"
            value={value.min_bedrooms ?? ''}
            onChange={(e) => setNum('min_bedrooms', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Min Bathrooms</label>
          <input
            type="number"
            min={0}
            step={0.5}
            className={inputCls}
            placeholder="e.g. 2"
            value={value.min_bathrooms ?? ''}
            onChange={(e) => setNum('min_bathrooms', e.target.value)}
          />
        </div>
      </div>

      {/* Funding Type */}
      <div>
        <label className={labelCls}>Funding Type</label>
        <select
          className={`${inputCls} cursor-pointer`}
          value={value.funding_type ?? ''}
          onChange={(e) => onChange({ ...value, funding_type: e.target.value || undefined })}
        >
          <option value="">Select funding type…</option>
          {FUNDING_TYPE_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Close Timeline */}
      <div>
        <label className={labelCls}>Close Timeline (days)</label>
        <input
          type="number"
          min={1}
          className={inputCls}
          placeholder="e.g. 30"
          value={value.can_close_days ?? ''}
          onChange={(e) => setNum('can_close_days', e.target.value)}
        />
      </div>

      {/* Proof of Funds */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#F0EDE8]">Proof of Funds</p>
          <p className="text-xs text-[#8A8580] mt-0.5">Buyer has verifiable proof of funds</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!value.proof_of_funds}
          onClick={() => onChange({ ...value, proof_of_funds: !value.proof_of_funds })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value.proof_of_funds ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              value.proof_of_funds ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Additional criteria or preferences…"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}
