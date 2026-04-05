// frontend/src/components/financing/AddInstrumentModal.tsx
import { useState, useMemo, useRef, useEffect } from 'react'
// framer-motion not needed for this modal
import {
  X,
  Building,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  FileText,
  Shield,
  Key,
  Landmark,
  Layers,
  BookOpen,
  Home,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateInstrument } from '@/hooks/useFinancing'
import type { CreateInstrumentRequest, FinancingInstrumentType } from '@/types/financing'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  propertyAddress: string
  /** Existing instruments on this property — for wrap underlying selector */
  existingInstruments?: { id: string; name: string }[]
}

const INSTRUMENT_TYPES: {
  type: FinancingInstrumentType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { type: 'conventional_mortgage', label: 'Conventional Mortgage', description: 'Standard bank loan', icon: Landmark },
  { type: 'sub_to_mortgage', label: 'Sub-To Mortgage', description: 'Subject to existing loan', icon: Key },
  { type: 'seller_finance', label: 'Seller Finance', description: 'Owner-financed purchase', icon: Home },
  { type: 'wrap_mortgage', label: 'Wrap Mortgage', description: 'Wrap around existing debt', icon: Layers },
  { type: 'lease_option', label: 'Lease Option', description: 'Lease with purchase option', icon: BookOpen },
  { type: 'hard_money', label: 'Hard Money', description: 'Short-term asset-based loan', icon: DollarSign },
  { type: 'private_money', label: 'Private Money', description: 'Private lender financing', icon: DollarSign },
  { type: 'heloc', label: 'HELOC', description: 'Home equity line of credit', icon: FileText },
  { type: 'land_contract', label: 'Land Contract', description: 'Contract for deed', icon: Building },
]

export function AddInstrumentModal({ open, onOpenChange, propertyId, propertyAddress, existingInstruments = [] }: Props) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<CreateInstrumentRequest>>({
    property_id: propertyId,
    requires_insurance: true,
  })

  const createMutation = useCreateInstrument()

  // Reset form when modal opens
  const prevOpen = useRef(open)
  useEffect(() => {
    if (open && !prevOpen.current) {
      setStep(1)
      setFormData({ property_id: propertyId, requires_insurance: true })
    }
    prevOpen.current = open
  }, [open, propertyId])

  const selectedType = INSTRUMENT_TYPES.find((t) => t.type === formData.instrument_type)

  function updateField<K extends keyof CreateInstrumentRequest>(key: K, value: CreateInstrumentRequest[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Auto-calculations
  const calculatedPayment = useMemo(() => {
    const bal = formData.original_balance
    const rate = formData.interest_rate
    const term = formData.term_months
    if (!bal || rate == null || !term || term <= 0) return null
    const p = Number(bal)
    const n = Number(term)
    if (p <= 0 || n <= 0) return null
    // 0% interest: simple division
    if (Number(rate) === 0) return Math.round((p / n) * 100) / 100
    const r = Number(rate) / 100 / 12
    return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 100) / 100
  }, [formData.original_balance, formData.interest_rate, formData.term_months])

  const calculatedMaturity = useMemo(() => {
    if (!formData.origination_date || !formData.term_months) return null
    const d = new Date(formData.origination_date)
    d.setMonth(d.getMonth() + Number(formData.term_months))
    return d.toISOString().split('T')[0]
  }, [formData.origination_date, formData.term_months])

  function handleSubmit() {
    const data: CreateInstrumentRequest = {
      property_id: propertyId,
      name: formData.name || `${selectedType?.label ?? 'Instrument'} — ${propertyAddress}`,
      instrument_type: formData.instrument_type!,
      position: formData.position ?? 1,
      original_balance: formData.original_balance,
      current_balance: formData.current_balance ?? formData.original_balance,
      interest_rate: formData.interest_rate,
      rate_type: formData.rate_type,
      term_months: formData.term_months,
      monthly_payment: formData.monthly_payment ?? calculatedPayment ?? undefined,
      origination_date: formData.origination_date,
      maturity_date: formData.maturity_date ?? calculatedMaturity ?? undefined,
      amortization_months: formData.amortization_months,
      first_payment_date: formData.first_payment_date,
      has_balloon: formData.has_balloon ?? false,
      balloon_date: formData.balloon_date,
      balloon_amount: formData.balloon_amount,
      requires_insurance: formData.requires_insurance ?? true,
      escrow_amount: formData.escrow_amount,
      // Sub-to fields
      is_sub_to: formData.instrument_type === 'sub_to_mortgage',
      original_borrower: formData.original_borrower,
      servicer: formData.servicer,
      loan_number_last4: formData.loan_number_last4,
      // Wrap fields
      is_wrap: formData.instrument_type === 'wrap_mortgage',
      underlying_instrument_id: formData.underlying_instrument_id,
      wrap_rate: formData.wrap_rate,
      wrap_payment: formData.wrap_payment,
      // Lease option
      option_consideration: formData.option_consideration,
      option_expiration: formData.option_expiration,
      monthly_credit: formData.monthly_credit,
      strike_price: formData.strike_price,
      // Seller finance
      down_payment: formData.down_payment,
      late_fee_pct: formData.late_fee_pct,
      late_fee_grace_days: formData.late_fee_grace_days,
      prepayment_penalty: formData.prepayment_penalty,
      notes: formData.notes,
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        try {
          (window as any).posthog?.capture?.('instrument_created', {
            instrument_type: data.instrument_type,
            has_balloon: data.has_balloon,
            is_wrap: data.is_wrap,
          })
        } catch { /* ignore */ }
        onOpenChange(false)
        setStep(1)
        setFormData({ property_id: propertyId, requires_insurance: true })
      },
    })
  }

  function handleClose() {
    onOpenChange(false)
    setStep(1)
    setFormData({ property_id: propertyId, requires_insurance: true })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#0C0B0A]/75 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-[#141311] border border-[#1E1D1B] rounded-2xl shadow-2xl scrollbar-luxury">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#141311] border-b border-[#1E1D1B] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
              Add Instrument
            </h2>
            <p className="text-xs text-[#8A8580] mt-0.5">Step {step} of 4</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg text-[#8A8580] hover:bg-[#1E1D1B] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 rounded-full flex-1 transition-colors',
                  s <= step ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {step === 1 && (
            <Step1TypeSelect
              selectedType={formData.instrument_type}
              onSelect={(type) => {
                updateField('instrument_type', type)
                updateField('name', `${INSTRUMENT_TYPES.find((t) => t.type === type)?.label ?? ''} — ${propertyAddress}`)
                try {
                  (window as any).posthog?.capture?.('add_instrument_step', { step: 1, instrument_type: type })
                } catch { /* ignore */ }
                setStep(2)
              }}
            />
          )}
          {step === 2 && (
            <Step2CoreTerms
              formData={formData}
              updateField={updateField}
              calculatedPayment={calculatedPayment}
              calculatedMaturity={calculatedMaturity}
              existingInstruments={existingInstruments}
            />
          )}
          {step === 3 && (
            <Step3BalloonInsurance formData={formData} updateField={updateField} />
          )}
          {step === 4 && (
            <Step4Review formData={formData} selectedType={selectedType} calculatedPayment={calculatedPayment} calculatedMaturity={calculatedMaturity} />
          )}
        </div>

        {/* Footer */}
        {step > 1 && (
          <div className="sticky bottom-0 bg-[#141311] border-t border-[#1E1D1B] px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[#C5C0B8] hover:text-[#F0EDE8] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            {step < 4 ? (
              <button
                onClick={() => {
                  try {
                    (window as any).posthog?.capture?.('add_instrument_step', { step, instrument_type: formData.instrument_type })
                  } catch { /* ignore */ }
                  setStep(step + 1)
                }}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
                {createMutation.isPending ? 'Creating...' : 'Create Instrument'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Step 1: Type Select ─── */

function Step1TypeSelect({
  selectedType,
  onSelect,
}: {
  selectedType: string | undefined
  onSelect: (type: FinancingInstrumentType) => void
}) {
  return (
    <div>
      <p className="text-sm text-[#C5C0B8] mb-4">What type of financing instrument is this?</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {INSTRUMENT_TYPES.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              className={cn(
                'text-left p-3 rounded-lg border transition-colors cursor-pointer',
                selectedType === t.type
                  ? 'bg-[#8B7AFF]/10 border-[#8B7AFF]/40 text-[#F0EDE8]'
                  : 'bg-[#0C0B0A] border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/20'
              )}
            >
              <Icon size={16} className="text-[#8A8580] mb-1.5" />
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-[10px] text-[#8A8580] mt-0.5">{t.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 2: Core Terms ─── */

function Step2CoreTerms({
  formData,
  updateField,
  calculatedPayment,
  calculatedMaturity,
  existingInstruments,
}: {
  formData: Partial<CreateInstrumentRequest>
  updateField: <K extends keyof CreateInstrumentRequest>(key: K, value: CreateInstrumentRequest[K]) => void
  calculatedPayment: number | null
  calculatedMaturity: string | null
  existingInstruments: { id: string; name: string }[]
}) {
  const instrumentType = formData.instrument_type
  return (
    <div className="space-y-4">
      <FormField label="Name">
        <input
          type="text"
          value={formData.name ?? ''}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Position">
          <select
            value={formData.position ?? 1}
            onChange={(e) => updateField('position', Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value={1}>1st Position</option>
            <option value={2}>2nd Position</option>
            <option value={3}>3rd Position</option>
          </select>
        </FormField>
        <FormField label="Rate Type">
          <select
            value={formData.rate_type ?? 'fixed'}
            onChange={(e) => updateField('rate_type', e.target.value)}
            className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
          >
            <option value="fixed">Fixed</option>
            <option value="adjustable">Adjustable</option>
            <option value="interest_only">Interest Only</option>
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Original Balance ($)" value={formData.original_balance} onChange={(v) => updateField('original_balance', v)} />
        <NumberField label="Current Balance ($)" value={formData.current_balance ?? formData.original_balance} onChange={(v) => updateField('current_balance', v)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Interest Rate (%)" value={formData.interest_rate} onChange={(v) => updateField('interest_rate', v)} step="0.01" />
        <NumberField label="Term (months)" value={formData.term_months} onChange={(v) => updateField('term_months', v)} />
        <div>
          <NumberField
            label="Monthly Payment ($)"
            value={formData.monthly_payment ?? calculatedPayment}
            onChange={(v) => updateField('monthly_payment', v)}
          />
          {calculatedPayment && !formData.monthly_payment && (
            <span className="text-[10px] text-[#8B7AFF] mt-0.5 block">Calculated</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Origination Date">
          <input type="date" value={formData.origination_date ?? ''} onChange={(e) => updateField('origination_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
        </FormField>
        <div>
          <FormField label="Maturity Date">
            <input type="date" value={formData.maturity_date ?? calculatedMaturity ?? ''} onChange={(e) => updateField('maturity_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
          </FormField>
          {calculatedMaturity && !formData.maturity_date && (
            <span className="text-[10px] text-[#8B7AFF] mt-0.5 block">Calculated</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Amortization Period (months)" value={formData.amortization_months ?? formData.term_months} onChange={(v) => updateField('amortization_months', v)} />
        <FormField label="First Payment Date">
          <input type="date" value={formData.first_payment_date ?? ''} onChange={(e) => updateField('first_payment_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
        </FormField>
      </div>

      {/* Sub-to specific */}
      {instrumentType === 'sub_to_mortgage' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Sub-To Details</p>
          <FormField label="Original Borrower">
            <input type="text" value={formData.original_borrower ?? ''} onChange={(e) => updateField('original_borrower', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Servicer">
              <input type="text" value={formData.servicer ?? ''} onChange={(e) => updateField('servicer', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
            <FormField label="Loan # (last 4)">
              <input type="text" maxLength={4} value={formData.loan_number_last4 ?? ''} onChange={(e) => updateField('loan_number_last4', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
          </div>
        </div>
      )}

      {/* Wrap specific */}
      {instrumentType === 'wrap_mortgage' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Wrap Details</p>
          {existingInstruments.length > 0 && (
            <FormField label="Underlying Instrument">
              <select
                value={formData.underlying_instrument_id ?? ''}
                onChange={(e) => updateField('underlying_instrument_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="">Select instrument...</option>
                {existingInstruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Wrap Rate (%)" value={formData.wrap_rate} onChange={(v) => updateField('wrap_rate', v)} step="0.01" />
            <NumberField label="Wrap Payment ($)" value={formData.wrap_payment} onChange={(v) => updateField('wrap_payment', v)} />
          </div>
        </div>
      )}

      {/* Lease option specific */}
      {instrumentType === 'lease_option' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Lease Option Details</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Option Consideration ($)" value={formData.option_consideration} onChange={(v) => updateField('option_consideration', v)} />
            <FormField label="Option Expiration">
              <input type="date" value={formData.option_expiration ?? ''} onChange={(e) => updateField('option_expiration', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Monthly Credit ($)" value={formData.monthly_credit} onChange={(v) => updateField('monthly_credit', v)} />
            <NumberField label="Strike Price ($)" value={formData.strike_price} onChange={(v) => updateField('strike_price', v)} />
          </div>
        </div>
      )}

      {/* Seller finance specific */}
      {instrumentType === 'seller_finance' && (
        <div className="space-y-3 pt-3 border-t border-[#1E1D1B]">
          <p className="text-xs text-[#8A8580] font-medium uppercase tracking-wider">Seller Finance Details</p>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Down Payment ($)" value={formData.down_payment} onChange={(v) => updateField('down_payment', v)} />
            <NumberField label="Late Fee (%)" value={formData.late_fee_pct} onChange={(v) => updateField('late_fee_pct', v)} step="0.1" />
            <NumberField label="Grace Days" value={formData.late_fee_grace_days} onChange={(v) => updateField('late_fee_grace_days', v)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.prepayment_penalty ?? false}
              onChange={(e) => updateField('prepayment_penalty', e.target.checked)}
              className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
            />
            Prepayment penalty
          </label>
        </div>
      )}
    </div>
  )
}

/* ─── Step 3: Balloon & Insurance ─── */

function Step3BalloonInsurance({
  formData,
  updateField,
}: {
  formData: Partial<CreateInstrumentRequest>
  updateField: <K extends keyof CreateInstrumentRequest>(key: K, value: CreateInstrumentRequest[K]) => void
}) {
  return (
    <div className="space-y-4">
      {/* Balloon */}
      <div>
        <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.has_balloon ?? false}
            onChange={(e) => updateField('has_balloon', e.target.checked)}
            className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
          />
          Has balloon payment
        </label>
        {formData.has_balloon && (
          <div className="grid grid-cols-2 gap-3 ml-6">
            <FormField label="Balloon Date">
              <input type="date" value={formData.balloon_date ?? ''} onChange={(e) => updateField('balloon_date', e.target.value)} className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none" />
            </FormField>
            <NumberField label="Balloon Amount ($)" value={formData.balloon_amount} onChange={(v) => updateField('balloon_amount', v)} />
          </div>
        )}
      </div>

      {/* Insurance */}
      <div>
        <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.requires_insurance ?? true}
            onChange={(e) => updateField('requires_insurance', e.target.checked)}
            className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
          />
          Requires insurance
        </label>
        {formData.requires_insurance && (
          <div className="ml-6">
            <NumberField label="Escrow Amount ($)" value={formData.escrow_amount} onChange={(v) => updateField('escrow_amount', v)} />
          </div>
        )}
      </div>

      {/* Notes */}
      <FormField label="Notes (optional)">
        <textarea
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none resize-none"
        />
      </FormField>
    </div>
  )
}

/* ─── Step 4: Review ─── */

function Step4Review({
  formData,
  selectedType,
  calculatedPayment,
  calculatedMaturity,
}: {
  formData: Partial<CreateInstrumentRequest>
  selectedType: { label: string } | undefined
  calculatedPayment: number | null
  calculatedMaturity: string | null
}) {
  const rows: [string, string][] = [
    ['Type', selectedType?.label ?? '—'],
    ['Name', formData.name ?? '—'],
    ['Position', formData.position ? `${formData.position}${formData.position === 1 ? 'st' : formData.position === 2 ? 'nd' : 'rd'}` : '1st'],
    ['Original Balance', formData.original_balance ? `$${Number(formData.original_balance).toLocaleString()}` : '—'],
    ['Interest Rate', formData.interest_rate ? `${formData.interest_rate}%` : '—'],
    ['Term', formData.term_months ? `${formData.term_months} months` : '—'],
    ['Monthly Payment', (formData.monthly_payment ?? calculatedPayment) ? `$${(formData.monthly_payment ?? calculatedPayment!).toLocaleString()}` : '—'],
    ['Maturity Date', (formData.maturity_date ?? calculatedMaturity) ?? '—'],
  ]

  if (formData.has_balloon) {
    rows.push(['Balloon Amount', formData.balloon_amount ? `$${Number(formData.balloon_amount).toLocaleString()}` : '—'])
    rows.push(['Balloon Date', formData.balloon_date ?? '—'])
  }

  return (
    <div>
      <p className="text-sm text-[#C5C0B8] mb-4">Review your instrument details before creating.</p>
      <div className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg p-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1 text-sm">
            <span className="text-[#8A8580]">{label}</span>
            <span className="text-[#F0EDE8] tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Shared Form Components ─── */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | undefined) => void
  step?: string
}) {
  return (
    <FormField label={label}>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
        placeholder="0"
      />
    </FormField>
  )
}
