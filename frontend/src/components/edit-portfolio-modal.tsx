/** Edit portfolio entry modal — pre-filled form for updating closed deal data. */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { PortfolioEntry } from '@/types'

interface EditPortfolioModalProps {
  isOpen: boolean
  onClose: () => void
  entry: PortfolioEntry
  onSuccess: () => void
}

export function EditPortfolioModal({ isOpen, onClose, entry, onSuccess }: EditPortfolioModalProps) {
  const [closedDate, setClosedDate] = useState(entry.closed_date)
  const [closedPrice, setClosedPrice] = useState(String(entry.closed_price))
  const [profit, setProfit] = useState(String(entry.profit))
  const [monthlyCashFlow, setMonthlyCashFlow] = useState(String(entry.monthly_cash_flow))
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: () =>
      api.portfolio.update(entry.id, {
        closed_date: closedDate,
        closed_price: Number(closedPrice),
        profit: Number(profit),
        monthly_cash_flow: Number(monthlyCashFlow),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Portfolio entry updated')
      onSuccess()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save')
    },
  })

  const canSubmit = closedDate && closedPrice && !updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    updateMutation.mutate()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-[#0F0F1A] border-[#1A1A2E] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Edit Portfolio Entry</DialogTitle>
          <DialogDescription className="text-text-muted">{entry.address}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">Closed Date</Label>
            <Input
              type="date"
              value={closedDate}
              onChange={(e) => setClosedDate(e.target.value)}
              className="bg-[#08080F] border-[#1A1A2E] text-text-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">Closed Price ($)</Label>
            <Input
              type="number"
              value={closedPrice}
              onChange={(e) => setClosedPrice(e.target.value)}
              placeholder="0"
              className="bg-[#08080F] border-[#1A1A2E] text-text-primary font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">Profit ($)</Label>
            <Input
              type="number"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              placeholder="0"
              className="bg-[#08080F] border-[#1A1A2E] text-text-primary font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">Monthly Cash Flow ($)</Label>
            <Input
              type="number"
              value={monthlyCashFlow}
              onChange={(e) => setMonthlyCashFlow(e.target.value)}
              placeholder="0"
              className="bg-[#08080F] border-[#1A1A2E] text-text-primary font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-[#1A1A2E] bg-[#08080F] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none"
              placeholder="Optional notes about this deal"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#1A1A2E] bg-[#1A1A2E] text-text-primary text-sm font-medium hover:bg-[#2A2A3E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
