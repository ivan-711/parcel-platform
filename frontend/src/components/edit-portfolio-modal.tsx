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
      <DialogContent className="bg-white border-gray-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit Portfolio Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {entry && (
            <div className="text-sm text-gray-600 mb-4">
              <span className="text-gray-400">Editing:</span>{' '}
              <span className="text-gray-900">{entry.address}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-closed-date" className="text-gray-600 text-xs">Closed Date</Label>
            <Input
              id="edit-closed-date"
              type="date"
              value={closedDate}
              onChange={(e) => setClosedDate(e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-closed-price" className="text-gray-600 text-xs">Closed Price ($)</Label>
            <Input
              id="edit-closed-price"
              type="number"
              value={closedPrice}
              onChange={(e) => setClosedPrice(e.target.value)}
              placeholder="0"
              className="bg-white border-gray-300 text-gray-900 tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-profit" className="text-gray-600 text-xs">Profit ($)</Label>
            <Input
              id="edit-profit"
              type="number"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              placeholder="0"
              className="bg-white border-gray-300 text-gray-900 tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cash-flow" className="text-gray-600 text-xs">Monthly Cash Flow ($)</Label>
            <Input
              id="edit-cash-flow"
              type="number"
              value={monthlyCashFlow}
              onChange={(e) => setMonthlyCashFlow(e.target.value)}
              placeholder="0"
              className="bg-white border-gray-300 text-gray-900 tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-gray-600 text-xs">Notes (optional)</Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none"
              placeholder="Optional notes about this deal"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-lime-700 text-white hover:bg-lime-800"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
