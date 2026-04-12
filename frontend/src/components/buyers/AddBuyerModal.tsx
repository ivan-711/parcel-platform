// frontend/src/components/buyers/AddBuyerModal.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BuyBoxEditor } from '@/components/buyers/BuyBoxEditor'
import { useQuickAddBuyer } from '@/hooks/useBuyers'
import type { CreateBuyBoxRequest } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputCls =
  'w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none'
const labelCls = 'text-[10px] uppercase tracking-wider text-text-muted mb-1 block'

function Field({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

export function AddBuyerModal({ open, onOpenChange }: Props) {
  const quickAdd = useQuickAddBuyer()

  // Step 1: contact fields
  const [step, setStep] = useState<1 | 2>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')

  // Step 2: buy box data
  const [buyBoxData, setBuyBoxData] = useState<Partial<CreateBuyBoxRequest>>({})

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setCompany('')
      setBuyBoxData({})
    }
  }, [open])

  // Pre-fill buy box name when advancing to step 2
  function handleContinue() {
    if (!firstName.trim()) return
    const defaultName = `${firstName.trim()}'s Buy Box`
    setBuyBoxData((prev) => ({ ...prev, name: prev.name || defaultName }))
    setStep(2)
  }

  function handleSubmit() {
    if (!firstName.trim()) return
    quickAdd.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        buy_box: {
          name: buyBoxData.name || `${firstName.trim()}'s Buy Box`,
          ...buyBoxData,
        } as CreateBuyBoxRequest,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-app-recessed border-border-default max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle
            className="text-text-primary font-brand font-light"
          >
            Add Buyer
          </DialogTitle>
          {/* Step indicator */}
          <p className="text-xs text-text-muted mt-1">
            Step {step} of 2 —{' '}
            <span className="text-text-secondary">
              {step === 1 ? 'Contact Info' : 'First Buy Box'}
            </span>
          </p>
          <div className="flex gap-2 mt-3">
            {([1, 2] as const).map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  n <= step ? 'bg-violet-400' : 'bg-border-default'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 mt-4 pr-1">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <Field id="buyer-first-name" label="First Name *">
                  <input
                    id="buyer-first-name"
                    type="text"
                    className={inputCls}
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    aria-required="true"
                    autoFocus
                  />
                </Field>
                <Field id="buyer-last-name" label="Last Name">
                  <input
                    id="buyer-last-name"
                    type="text"
                    className={inputCls}
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Field>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <Field id="buyer-phone" label="Phone">
                  <input
                    id="buyer-phone"
                    type="tel"
                    className={inputCls}
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Field>
                <Field id="buyer-email" label="Email">
                  <input
                    id="buyer-email"
                    type="email"
                    className={inputCls}
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>

              {/* Company */}
              <Field id="buyer-company" label="Company">
                <input
                  id="buyer-company"
                  type="text"
                  className={inputCls}
                  placeholder="Acme Investments LLC"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Field>

              {/* Continue */}
              <button
                type="button"
                disabled={!firstName.trim()}
                onClick={handleContinue}
                className="w-full py-2.5 text-sm rounded-lg bg-violet-400 text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer mt-2"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <BuyBoxEditor value={buyBoxData} onChange={setBuyBoxData} />

              {/* Back + Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-border-default text-text-secondary hover:border-violet-400/40 hover:text-text-primary transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={quickAdd.isPending}
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-violet-400 text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {quickAdd.isPending ? 'Saving...' : 'Add Buyer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
