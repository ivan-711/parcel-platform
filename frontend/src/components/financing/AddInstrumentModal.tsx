// frontend/src/components/financing/AddInstrumentModal.tsx
import { useState, useMemo, useRef, useEffect } from 'react'
// framer-motion not needed for this modal
import {
  Building,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  FileText,
  Key,
  Landmark,
  Layers,
  BookOpen,
  Home,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-app-recessed p-0 scrollbar-luxury" aria-describedby={undefined}>
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-app-recessed border-b border-border-default px-6 py-4 space-y-0">
          <DialogTitle className="text-lg text-text-primary font-brand font-light">
            Add Instrument
          </DialogTitle>
          <p className="text-xs text-text-muted mt-0.5">Step {step} of 4</p>
        </DialogHeader>

        {/* Step progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 rounded-full flex-1 transition-colors',
                  s <= step ? 'bg-violet-400' : 'bg-border-default'
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
          <div className="sticky bottom-0 bg-app-recessed border-t border-border-default px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-violet-400 text-white hover:bg-violet-500 transition-colors cursor-pointer"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-violet-400 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
                {createMutation.isPending ? 'Creating...' : 'Create Instrument'}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
      <p className="text-sm text-text-secondary mb-4">What type of financing instrument is this?</p>
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
                  ? 'bg-violet-400/10 border-violet-400/40 text-text-primary'
                  : 'bg-app-bg border-border-default text-text-secondary hover:border-violet-400/20'
              )}
            >
              <Icon size={16} className="text-text-muted mb-1.5" />
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t.description}</p>
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
      <FormField id="instrument-name" label="Name">
        <input
          id="instrument-name"
          type="text"
          value={formData.name ?? ''}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="instrument-position" label="Position">
          <select
            id="instrument-position"
            value={formData.position ?? 1}
            onChange={(e) => updateField('position', Number(e.target.value))}
            className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
          >
            <option value={1}>1st Position</option>
            <option value={2}>2nd Position</option>
            <option value={3}>3rd Position</option>
          </select>
        </FormField>
        <FormField id="instrument-rate-type" label="Rate Type">
          <select
            id="instrument-rate-type"
            value={formData.rate_type ?? 'fixed'}
            onChange={(e) => updateField('rate_type', e.target.value)}
            className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
          >
            <option value="fixed">Fixed</option>
            <option value="adjustable">Adjustable</option>
            <option value="interest_only">Interest Only</option>
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField id="instrument-original-balance" label="Original Balance ($)" value={formData.original_balance} onChange={(v) => updateField('original_balance', v)} />
        <NumberField id="instrument-current-balance" label="Current Balance ($)" value={formData.current_balance ?? formData.original_balance} onChange={(v) => updateField('current_balance', v)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField id="instrument-interest-rate" label="Interest Rate (%)" value={formData.interest_rate} onChange={(v) => updateField('interest_rate', v)} step="0.01" />
        <NumberField id="instrument-term-months" label="Term (months)" value={formData.term_months} onChange={(v) => updateField('term_months', v)} />
        <div>
          <NumberField
            id="instrument-monthly-payment"
            label="Monthly Payment ($)"
            value={formData.monthly_payment ?? calculatedPayment}
            onChange={(v) => updateField('monthly_payment', v)}
          />
          {calculatedPayment && !formData.monthly_payment && (
            <span className="text-[10px] text-violet-400 mt-0.5 block">Calculated</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="instrument-origination-date" label="Origination Date">
          <input id="instrument-origination-date" type="date" value={formData.origination_date ?? ''} onChange={(e) => updateField('origination_date', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
        </FormField>
        <div>
          <FormField id="instrument-maturity-date" label="Maturity Date">
            <input id="instrument-maturity-date" type="date" value={formData.maturity_date ?? calculatedMaturity ?? ''} onChange={(e) => updateField('maturity_date', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
          </FormField>
          {calculatedMaturity && !formData.maturity_date && (
            <span className="text-[10px] text-violet-400 mt-0.5 block">Calculated</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField id="instrument-amortization" label="Amortization Period (months)" value={formData.amortization_months ?? formData.term_months} onChange={(v) => updateField('amortization_months', v)} />
        <FormField id="instrument-first-payment-date" label="First Payment Date">
          <input id="instrument-first-payment-date" type="date" value={formData.first_payment_date ?? ''} onChange={(e) => updateField('first_payment_date', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
        </FormField>
      </div>

      {/* Sub-to specific */}
      {instrumentType === 'sub_to_mortgage' && (
        <div className="space-y-3 pt-3 border-t border-border-default">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Sub-To Details</p>
          <FormField id="instrument-original-borrower" label="Original Borrower">
            <input id="instrument-original-borrower" type="text" value={formData.original_borrower ?? ''} onChange={(e) => updateField('original_borrower', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="instrument-servicer" label="Servicer">
              <input id="instrument-servicer" type="text" value={formData.servicer ?? ''} onChange={(e) => updateField('servicer', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
            </FormField>
            <FormField id="instrument-loan-last4" label="Loan # (last 4)">
              <input id="instrument-loan-last4" type="text" maxLength={4} value={formData.loan_number_last4 ?? ''} onChange={(e) => updateField('loan_number_last4', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
            </FormField>
          </div>
        </div>
      )}

      {/* Wrap specific */}
      {instrumentType === 'wrap_mortgage' && (
        <div className="space-y-3 pt-3 border-t border-border-default">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Wrap Details</p>
          {existingInstruments.length > 0 && (
            <FormField id="instrument-underlying" label="Underlying Instrument">
              <select
                id="instrument-underlying"
                value={formData.underlying_instrument_id ?? ''}
                onChange={(e) => updateField('underlying_instrument_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
              >
                <option value="">Select instrument...</option>
                {existingInstruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="instrument-wrap-rate" label="Wrap Rate (%)" value={formData.wrap_rate} onChange={(v) => updateField('wrap_rate', v)} step="0.01" />
            <NumberField id="instrument-wrap-payment" label="Wrap Payment ($)" value={formData.wrap_payment} onChange={(v) => updateField('wrap_payment', v)} />
          </div>
        </div>
      )}

      {/* Lease option specific */}
      {instrumentType === 'lease_option' && (
        <div className="space-y-3 pt-3 border-t border-border-default">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Lease Option Details</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="instrument-option-consideration" label="Option Consideration ($)" value={formData.option_consideration} onChange={(v) => updateField('option_consideration', v)} />
            <FormField id="instrument-option-expiration" label="Option Expiration">
              <input id="instrument-option-expiration" type="date" value={formData.option_expiration ?? ''} onChange={(e) => updateField('option_expiration', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="instrument-monthly-credit" label="Monthly Credit ($)" value={formData.monthly_credit} onChange={(v) => updateField('monthly_credit', v)} />
            <NumberField id="instrument-strike-price" label="Strike Price ($)" value={formData.strike_price} onChange={(v) => updateField('strike_price', v)} />
          </div>
        </div>
      )}

      {/* Seller finance specific */}
      {instrumentType === 'seller_finance' && (
        <div className="space-y-3 pt-3 border-t border-border-default">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Seller Finance Details</p>
          <div className="grid grid-cols-3 gap-3">
            <NumberField id="instrument-down-payment" label="Down Payment ($)" value={formData.down_payment} onChange={(v) => updateField('down_payment', v)} />
            <NumberField id="instrument-late-fee-pct" label="Late Fee (%)" value={formData.late_fee_pct} onChange={(v) => updateField('late_fee_pct', v)} step="0.1" />
            <NumberField id="instrument-grace-days" label="Grace Days" value={formData.late_fee_grace_days} onChange={(v) => updateField('late_fee_grace_days', v)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={formData.prepayment_penalty ?? false}
              onChange={(e) => updateField('prepayment_penalty', e.target.checked)}
              className="rounded border-border-default bg-app-bg"
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
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.has_balloon ?? false}
            onChange={(e) => updateField('has_balloon', e.target.checked)}
            className="rounded border-border-default bg-app-bg"
          />
          Has balloon payment
        </label>
        {formData.has_balloon && (
          <div className="grid grid-cols-2 gap-3 ml-6">
            <FormField id="instrument-balloon-date" label="Balloon Date">
              <input id="instrument-balloon-date" type="date" value={formData.balloon_date ?? ''} onChange={(e) => updateField('balloon_date', e.target.value)} className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none" />
            </FormField>
            <NumberField id="instrument-balloon-amount" label="Balloon Amount ($)" value={formData.balloon_amount} onChange={(v) => updateField('balloon_amount', v)} />
          </div>
        )}
      </div>

      {/* Insurance */}
      <div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.requires_insurance ?? true}
            onChange={(e) => updateField('requires_insurance', e.target.checked)}
            className="rounded border-border-default bg-app-bg"
          />
          Requires insurance
        </label>
        {formData.requires_insurance && (
          <div className="ml-6">
            <NumberField id="instrument-escrow-amount" label="Escrow Amount ($)" value={formData.escrow_amount} onChange={(v) => updateField('escrow_amount', v)} />
          </div>
        )}
      </div>

      {/* Notes */}
      <FormField id="instrument-notes" label="Notes (optional)">
        <textarea
          id="instrument-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none resize-none"
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
      <p className="text-sm text-text-secondary mb-4">Review your instrument details before creating.</p>
      <div className="bg-app-bg border border-border-default rounded-lg p-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1 text-sm">
            <span className="text-text-muted">{label}</span>
            <span className="text-text-primary tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Shared Form Components ─── */

function FormField({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step = '1',
}: {
  id?: string
  label: string
  value: number | null | undefined
  onChange: (v: number | undefined) => void
  step?: string
}) {
  return (
    <FormField id={id} label={label}>
      <input
        id={id}
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
        placeholder="0"
      />
    </FormField>
  )
}
