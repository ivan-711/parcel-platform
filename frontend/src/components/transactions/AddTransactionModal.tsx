// frontend/src/components/transactions/AddTransactionModal.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useCreateTransaction } from '@/hooks/useTransactions'

const TYPES_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  income: [
    { value: 'rent_income', label: 'Rent' },
    { value: 'late_fee', label: 'Late Fee' },
    { value: 'application_fee', label: 'Application Fee' },
    { value: 'laundry', label: 'Laundry' },
    { value: 'parking', label: 'Parking' },
    { value: 'other_income', label: 'Other Income' },
  ],
  expense: [
    { value: 'mortgage_payment', label: 'Mortgage' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'tax', label: 'Property Tax' },
    { value: 'expense', label: 'Maintenance' },
    { value: 'capex', label: 'CapEx' },
    { value: 'hoa', label: 'HOA' },
    { value: 'utility', label: 'Utilities' },
    { value: 'management', label: 'Management' },
    { value: 'other_expense', label: 'Other Expense' },
  ],
  transfer: [
    { value: 'owner_draw', label: 'Owner Draw' },
    { value: 'capital_contribution', label: 'Capital Contribution' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'refund', label: 'Refund' },
  ],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: { id: string; address: string }[]
  defaultPropertyId?: string
}

export function AddTransactionModal({ open, onOpenChange, properties, defaultPropertyId }: Props) {
  const createMutation = useCreateTransaction()

  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? '')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('expense')
  const [txnType, setTxnType] = useState('mortgage_payment')
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState('monthly')
  const [notes, setNotes] = useState('')

  // Reset on open
  useEffect(() => {
    if (open) {
      setPropertyId(defaultPropertyId ?? '')
      setAmount('')
      setCategory('expense')
      setTxnType('mortgage_payment')
      setTxnDate(new Date().toISOString().split('T')[0])
      setDescription('')
      setIsRecurring(false)
      setRecurrenceInterval('monthly')
      setNotes('')
    }
  }, [open, defaultPropertyId])

  // Reset type when category changes
  useEffect(() => {
    const types = TYPES_BY_CATEGORY[category]
    if (types && types.length > 0) {
      setTxnType(types[0].value)
    }
  }, [category])

  function handleSubmit() {
    if (!propertyId || !amount) return
    createMutation.mutate(
      {
        property_id: propertyId,
        amount: Number(amount),
        transaction_date: txnDate,
        category,
        transaction_type: txnType,
        description: description || undefined,
        notes: notes || undefined,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : undefined,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  const typeOptions = TYPES_BY_CATEGORY[category] || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#141311] border-[#1E1D1B]">
        <DialogHeader>
          <DialogTitle className="text-[#F0EDE8]" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}>
            Add Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Property */}
          <Field label="Property">
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            >
              <option value="">Select property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </Field>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
                placeholder="0.00"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              />
            </Field>
          </div>

          {/* Category pills */}
          <Field label="Category">
            <div className="flex gap-1 p-1 bg-[#0C0B0A] rounded-lg border border-[#1E1D1B]">
              {(['income', 'expense', 'transfer'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer capitalize',
                    category === c
                      ? c === 'income' ? 'bg-[#4ADE80]/15 text-[#4ADE80]'
                        : c === 'expense' ? 'bg-[#F87171]/15 text-[#F87171]'
                        : 'bg-[#60A5FA]/15 text-[#60A5FA]'
                      : 'text-[#8A8580] hover:text-[#C5C0B8]'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          {/* Type */}
          <Field label="Type">
            <select
              value={txnType}
              onChange={(e) => setTxnType(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          {/* Description */}
          <Field label="Description (optional)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none"
              placeholder="e.g., March rent payment"
            />
          </Field>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#C5C0B8] cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-[#1E1D1B] bg-[#0C0B0A]"
              />
              Recurring
            </label>
            {isRecurring && (
              <select
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className="px-2 py-1 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-xs text-[#F0EDE8] outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            )}
          </div>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] focus:border-[#8B7AFF] outline-none resize-none"
            />
          </Field>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!propertyId || !amount || createMutation.isPending}
            className="w-full py-2.5 text-sm rounded-lg bg-[#8B7AFF] text-white font-medium hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {createMutation.isPending ? 'Saving...' : 'Add Transaction'}
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
