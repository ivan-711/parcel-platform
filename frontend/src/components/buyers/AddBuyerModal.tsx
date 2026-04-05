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

const FUNDING_TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'hard_money', label: 'Hard Money' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'creative', label: 'Creative' },
]

const inputCls =
  'w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none'
const labelCls = 'text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
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
  const [fundingType, setFundingType] = useState('')
  const [proofOfFunds, setProofOfFunds] = useState(false)

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
      setFundingType('')
      setProofOfFunds(false)
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
        funding_type: fundingType || undefined,
        proof_of_funds: proofOfFunds || undefined,
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
      <DialogContent className="sm:max-w-[500px] bg-[#141311] border-[#1E1D1B] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle
            className="text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Add Buyer
          </DialogTitle>
          {/* Step indicator */}
          <p className="text-xs text-[#8A8580] mt-1">
            Step {step} of 2 —{' '}
            <span className="text-[#C5C0B8]">
              {step === 1 ? 'Contact Info' : 'First Buy Box'}
            </span>
          </p>
          <div className="flex gap-2 mt-3">
            {([1, 2] as const).map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  n <= step ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]'
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
                <Field label="First Name *">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Last Name">
                  <input
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
                <Field label="Phone">
                  <input
                    type="tel"
                    className={inputCls}
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={inputCls}
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>

              {/* Company */}
              <Field label="Company">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Acme Investments LLC"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Field>

              {/* Funding Type */}
              <Field label="Funding Type">
                <select
                  className={`${inputCls} cursor-pointer`}
                  value={fundingType}
                  onChange={(e) => setFundingType(e.target.value)}
                >
                  <option value="">Select funding type…</option>
                  {FUNDING_TYPE_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Proof of Funds */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-[#F0EDE8]">Proof of Funds</p>
                  <p className="text-xs text-[#8A8580] mt-0.5">
                    Buyer has verifiable proof of funds
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={proofOfFunds}
                  onClick={() => setProofOfFunds((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    proofOfFunds ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      proofOfFunds ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Continue */}
              <button
                type="button"
                disabled={!firstName.trim()}
                onClick={handleContinue}
                className="w-full py-2.5 text-sm rounded-lg bg-[#8B7AFF] text-white font-medium hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer mt-2"
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
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/40 hover:text-[#F0EDE8] transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={quickAdd.isPending}
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-[#8B7AFF] text-white font-medium hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
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
