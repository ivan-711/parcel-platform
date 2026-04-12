/** Edit Portfolio Entry Modal — controlled modal with no internal API calls. */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { PortfolioEntry } from '@/types'

export interface EditPortfolioData {
  closed_date: string
  closed_price: number
  profit: number
  monthly_cash_flow: number
  notes?: string
}

interface EditPortfolioModalProps {
  isOpen: boolean
  onClose: () => void
  entry: PortfolioEntry | null
  onSave: (id: string, data: EditPortfolioData) => void
  isSaving: boolean
}

export function EditPortfolioModal({
  isOpen,
  onClose,
  entry,
  onSave,
  isSaving,
}: EditPortfolioModalProps) {
  const [closedDate, setClosedDate] = useState('')
  const [closedPrice, setClosedPrice] = useState('')
  const [profit, setProfit] = useState('')
  const [monthlyCashFlow, setMonthlyCashFlow] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize form state when entry changes
  useEffect(() => {
    if (entry) {
      setClosedDate(entry.closed_date)
      setClosedPrice(String(parseFloat(String(entry.closed_price)) || 0))
      setProfit(String(parseFloat(String(entry.profit)) || 0))
      setMonthlyCashFlow(String(parseFloat(String(entry.monthly_cash_flow)) || 0))
      setNotes(entry.notes || '')
    }
  }, [entry])

  const canSubmit = closedDate && closedPrice && profit && !isSaving

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !entry) return
    onSave(entry.id, {
      closed_date: closedDate,
      closed_price: Number(closedPrice),
      profit: Number(profit),
      monthly_cash_flow: Number(monthlyCashFlow) || 0,
      notes: notes || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-app-elevated border border-border-default rounded-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Edit Portfolio Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {entry && (
            <div className="text-sm text-text-secondary mb-4">
              <span className="text-text-muted">Editing:</span>{' '}
              <span className="text-text-primary">{entry.address}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-closed-date" className="text-text-secondary text-xs">Closed Date</Label>
            <Input
              id="edit-closed-date"
              type="date"
              value={closedDate}
              onChange={(e) => setClosedDate(e.target.value)}
              className="bg-app-recessed border border-border-default text-text-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-closed-price" className="text-text-secondary text-xs">Closed Price ($)</Label>
            <Input
              id="edit-closed-price"
              type="number"
              value={closedPrice}
              onChange={(e) => setClosedPrice(e.target.value)}
              placeholder="0"
              className="bg-app-recessed border border-border-default text-text-primary tabular-nums placeholder:text-text-disabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-profit" className="text-text-secondary text-xs">Profit ($)</Label>
            <Input
              id="edit-profit"
              type="number"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              placeholder="0"
              className="bg-app-recessed border border-border-default text-text-primary tabular-nums placeholder:text-text-disabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cash-flow" className="text-text-secondary text-xs">Monthly Cash Flow ($)</Label>
            <Input
              id="edit-cash-flow"
              type="number"
              value={monthlyCashFlow}
              onChange={(e) => setMonthlyCashFlow(e.target.value)}
              placeholder="0"
              className="bg-app-recessed border border-border-default text-text-primary tabular-nums placeholder:text-text-disabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-text-secondary text-xs">Notes (optional)</Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border-default bg-app-recessed px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400/40 resize-none"
              placeholder="Optional notes about this deal"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="border-border-default text-text-secondary hover:bg-layer-2 hover:text-text-primary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-gradient-to-r from-violet-400 to-violet-500 text-accent-text-on-accent hover:brightness-110"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
