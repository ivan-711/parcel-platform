import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useRecordPayment } from '@/hooks/useFinancing'
import type { CreatePaymentRequest } from '@/types/financing'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill instrument and property if opened from context */
  defaults?: {
    instrumentId?: string
    instrumentName?: string
    propertyId?: string
    amount?: number
    direction?: 'outgoing' | 'incoming'
    obligationId?: string
  }
  /** Available instruments for selector */
  instruments?: { id: string; name: string; property_id: string }[]
}

export function RecordPaymentModal({ open, onOpenChange, defaults, instruments = [] }: Props) {
  const recordMutation = useRecordPayment()

  const [instrumentId, setInstrumentId] = useState(defaults?.instrumentId ?? '')
  const [propertyId] = useState(defaults?.propertyId ?? '')
  const [amount, setAmount] = useState(defaults?.amount ? String(defaults.amount) : '')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [direction, setDirection] = useState<string>(defaults?.direction ?? 'outgoing')
  const [paymentType, setPaymentType] = useState('regular')
  const [principalPortion, setPrincipalPortion] = useState('')
  const [interestPortion, setInterestPortion] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [confirmationNumber, setConfirmationNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Reset form when defaults change
  useEffect(() => {
    if (open) {
      setInstrumentId(defaults?.instrumentId ?? '')
      setAmount(defaults?.amount ? String(defaults.amount) : '')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setDirection(defaults?.direction ?? 'outgoing')
      setPaymentType('regular')
      setPrincipalPortion('')
      setInterestPortion('')
      setPaymentMethod('bank_transfer')
      setConfirmationNumber('')
      setNotes('')
    }
  }, [open, defaults?.instrumentId])

  function handleSubmit() {
    const selectedInstrument = instruments.find((i) => i.id === instrumentId)
    const data: CreatePaymentRequest = {
      instrument_id: instrumentId,
      property_id: selectedInstrument?.property_id ?? propertyId,
      obligation_id: defaults?.obligationId,
      payment_type: paymentType,
      amount: Number(amount),
      principal_portion: principalPortion ? Number(principalPortion) : undefined,
      interest_portion: interestPortion ? Number(interestPortion) : undefined,
      payment_date: paymentDate,
      direction,
      payment_method: paymentMethod,
      confirmation_number: confirmationNumber || undefined,
      notes: notes || undefined,
    }

    recordMutation.mutate(data, {
      onSuccess: () => {
        try {
          (window as any).posthog?.capture?.('payment_recorded_ui', {
            direction,
            amount: Number(amount),
            instrument_type: 'unknown',
          })
        } catch { /* ignore */ }
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#141311] border-[#1E1D1B]">
        <DialogHeader>
          <DialogTitle
            className="text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Instrument selector */}
          {!defaults?.instrumentId && instruments.length > 0 && (
            <Field label="Instrument">
              <select
                value={instrumentId}
                onChange={(e) => setInstrumentId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="">Select instrument...</option>
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </Field>
          )}
          {defaults?.instrumentName && (
            <Field label="Instrument">
              <p className="text-sm text-[#F0EDE8]">{defaults.instrumentName}</p>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="0.00"
              />
            </Field>
            <Field label="Payment Date">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="outgoing">Outgoing (you pay)</option>
                <option value="incoming">Incoming (you collect)</option>
              </select>
            </Field>
            <Field label="Payment Type">
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              >
                <option value="regular">Regular</option>
                <option value="extra_principal">Extra Principal</option>
                <option value="balloon">Balloon</option>
                <option value="late_fee">Late Fee</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Principal Portion ($)">
              <input
                type="number"
                value={principalPortion}
                onChange={(e) => setPrincipalPortion(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="Auto"
              />
            </Field>
            <Field label="Interest Portion ($)">
              <input
                type="number"
                value={interestPortion}
                onChange={(e) => setInterestPortion(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="Auto"
              />
            </Field>
          </div>

          <Field label="Payment Method">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="auto_pay">Auto-Pay</option>
            </select>
          </Field>

          <Field label="Confirmation # (optional)">
            <input
              type="text"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              placeholder="Optional"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none resize-none"
            />
          </Field>

          <button
            onClick={handleSubmit}
            disabled={!instrumentId || !amount || recordMutation.isPending}
            className="w-full py-2.5 text-sm rounded-lg bg-[#8B7AFF] text-white font-medium hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {recordMutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block">{label}</label>
      {children}
    </div>
  )
}
