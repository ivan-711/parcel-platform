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
  'w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none'
const labelCls = 'text-[10px] uppercase tracking-wider text-text-muted mb-1 block'

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
        <label htmlFor="buybox-name" className={labelCls}>Name *</label>
        <input
          id="buybox-name"
          type="text"
          className={inputCls}
          placeholder="e.g. Cash deals under $150K"
          value={value.name ?? ''}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          aria-required="true"
        />
      </div>

      {/* Target Markets */}
      <div>
        <label htmlFor="buybox-target-markets" className={labelCls}>Target Markets</label>
        <div className="flex gap-2">
          <input
            id="buybox-target-markets"
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
            className="flex items-center gap-1 px-3 py-2 bg-border-default hover:bg-app-overlay border border-border-default rounded-lg text-sm text-text-primary transition-colors shrink-0"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-400/15 border border-violet-400/30 rounded-full text-xs text-violet-400"
              >
                {m}
                <button
                  type="button"
                  onClick={() => removeMarket(m)}
                  aria-label={`Remove ${m}`}
                  className="hover:text-text-primary transition-colors"
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
        <span className={labelCls}>Price Range</span>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <label htmlFor="buybox-min-price" className="sr-only">Minimum Price</label>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
            <input
              id="buybox-min-price"
              type="number"
              className={`${inputCls} pl-6`}
              placeholder="Min"
              value={value.min_price ?? ''}
              onChange={(e) => setNum('min_price', e.target.value)}
            />
          </div>
          <div className="relative">
            <label htmlFor="buybox-max-price" className="sr-only">Maximum Price</label>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
            <input
              id="buybox-max-price"
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
                    ? 'bg-violet-400/20 border-violet-400/50 text-violet-400'
                    : 'bg-app-bg border-border-default text-text-secondary hover:border-violet-400/30'
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
                    ? 'bg-violet-400/20 border-violet-400/50 text-violet-400'
                    : 'bg-app-bg border-border-default text-text-secondary hover:border-violet-400/30'
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
          <label htmlFor="buybox-min-bedrooms" className={labelCls}>Min Bedrooms</label>
          <input
            id="buybox-min-bedrooms"
            type="number"
            min={0}
            className={inputCls}
            placeholder="e.g. 3"
            value={value.min_bedrooms ?? ''}
            onChange={(e) => setNum('min_bedrooms', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="buybox-min-bathrooms" className={labelCls}>Min Bathrooms</label>
          <input
            id="buybox-min-bathrooms"
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
        <label htmlFor="buybox-funding-type" className={labelCls}>Funding Type</label>
        <select
          id="buybox-funding-type"
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
        <label htmlFor="buybox-close-timeline" className={labelCls}>Close Timeline (days)</label>
        <input
          id="buybox-close-timeline"
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
          <p className="text-sm text-text-primary">Proof of Funds</p>
          <p className="text-xs text-text-muted mt-0.5">Buyer has verifiable proof of funds</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!value.proof_of_funds}
          onClick={() => onChange({ ...value, proof_of_funds: !value.proof_of_funds })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value.proof_of_funds ? 'bg-violet-400' : 'bg-border-default'
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
        <label htmlFor="buybox-notes" className={labelCls}>Notes</label>
        <textarea
          id="buybox-notes"
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
