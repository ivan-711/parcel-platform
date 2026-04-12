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
      <DialogContent className="sm:max-w-[480px] bg-app-recessed border-border-default">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-brand font-light">
            Add Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Property */}
          <Field id="txn-property" label="Property">
            <select
              id="txn-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
            >
              <option value="">Select property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </Field>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="txn-amount" label="Amount ($)">
              <input
                id="txn-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
                placeholder="0.00"
              />
            </Field>
            <Field id="txn-date" label="Date">
              <input
                id="txn-date"
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
              />
            </Field>
          </div>

          {/* Category pills */}
          <Field label="Category">
            <div className="flex gap-1 p-1 bg-app-bg rounded-lg border border-border-default">
              {(['income', 'expense', 'transfer'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer capitalize',
                    category === c
                      ? c === 'income' ? 'bg-profit/15 text-profit'
                        : c === 'expense' ? 'bg-loss/15 text-loss'
                        : 'bg-info/15 text-info'
                      : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          {/* Type */}
          <Field id="txn-type" label="Type">
            <select
              id="txn-type"
              value={txnType}
              onChange={(e) => setTxnType(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          {/* Description */}
          <Field id="txn-description" label="Description (optional)">
            <input
              id="txn-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
              placeholder="e.g., March rent payment"
            />
          </Field>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-border-default bg-app-bg"
              />
              Recurring
            </label>
            {isRecurring && (
              <select
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className="px-2 py-1 bg-app-bg border border-border-default rounded-lg text-xs text-text-primary outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            )}
          </div>

          {/* Notes */}
          <Field id="txn-notes" label="Notes (optional)">
            <textarea
              id="txn-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none resize-none"
            />
          </Field>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!propertyId || !amount || createMutation.isPending}
            className="w-full py-2.5 text-sm rounded-lg bg-violet-400 text-white font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {createMutation.isPending ? 'Saving...' : 'Add Transaction'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">{label}</label>
      {children}
    </div>
  )
}
