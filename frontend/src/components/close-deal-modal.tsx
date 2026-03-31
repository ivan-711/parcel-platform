/** Modal for closing a pipeline deal and adding it to the portfolio. */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useShake } from '@/lib/motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { api } from '@/lib/api'
import type { Strategy } from '@/types'

interface CloseDealModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  address: string
  strategy: Strategy
  askingPrice: number
  pipelineId: string
}

export function CloseDealModal({
  isOpen,
  onClose,
  dealId,
  address,
  strategy,
  askingPrice,
  pipelineId,
}: CloseDealModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { triggerShake, shakeProps } = useShake()

  const [closedDate, setClosedDate] = useState('')
  const [closedPrice, setClosedPrice] = useState('')
  const [profit, setProfit] = useState('')
  const [monthlyCashFlow, setMonthlyCashFlow] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setClosedDate(new Date().toISOString().slice(0, 10))
    setClosedPrice(askingPrice > 0 ? String(askingPrice) : '')
    setProfit('')
    setMonthlyCashFlow('')
    setNotes('')
    setErrors({})
    setSubmitError('')
  }, [isOpen, dealId, askingPrice])

  const closeDealMutation = useMutation({
    mutationFn: async () => {
      await api.portfolio.addEntry({
        deal_id: dealId,
        closed_date: closedDate,
        closed_price: Number(closedPrice),
        profit: Number(profit),
        monthly_cash_flow: Number(monthlyCashFlow) || 0,
        notes: notes || undefined,
      })
      await api.pipeline.updateStage(pipelineId, { stage: 'closed' })
    },
    onSuccess: () => {
      toast.success('Deal closed! Added to Portfolio.', {
        action: {
          label: 'View Portfolio \u2192',
          onClick: () => navigate('/portfolio'),
        },
      })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      onClose()
    },
    onError: (err) => {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong \u2014 try again')
    },
  })

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!closedDate) newErrors.closedDate = 'Required'
    if (!closedPrice || Number(closedPrice) <= 0) newErrors.closedPrice = 'Required'
    if (!profit && profit !== '0') newErrors.profit = 'Required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      triggerShake()
      return
    }
    setErrors({})
    setSubmitError('')
    closeDealMutation.mutate()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="border-gray-200 bg-white sm:max-w-md">
        <motion.div
          {...shakeProps}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={shakeProps.animate === 'shake' ? 'shake' : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-gray-900">Close Deal</DialogTitle>
              <StrategyBadge strategy={strategy} />
            </div>
            <DialogDescription className="text-gray-500">
              {address}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Closed Date */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Closed Date
              </label>
              <input
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              {errors.closedDate && (
                <p className="mt-1 text-xs text-red-500">{errors.closedDate}</p>
              )}
            </div>

            {/* Closed Price */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Closed Price
              </label>
              <input
                type="number"
                value={closedPrice}
                onChange={(e) => setClosedPrice(e.target.value)}
                placeholder="e.g. 250000"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 tabular-nums focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              {errors.closedPrice && (
                <p className="mt-1 text-xs text-red-500">{errors.closedPrice}</p>
              )}
            </div>

            {/* Profit / Assignment Fee */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Profit / Assignment Fee
              </label>
              <input
                type="number"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                placeholder="e.g. 18500"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 tabular-nums focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              {errors.profit && (
                <p className="mt-1 text-xs text-red-500">{errors.profit}</p>
              )}
            </div>

            {/* Monthly Cash Flow */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Monthly Cash Flow
              </label>
              <input
                type="number"
                value={monthlyCashFlow}
                onChange={(e) => setMonthlyCashFlow(e.target.value)}
                placeholder="0 if wholesale/flip"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 tabular-nums focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did this deal go?"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 resize-none"
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={closeDealMutation.isPending}
              className="w-full rounded-lg bg-lime-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-lime-700 transition-colors disabled:opacity-50"
            >
              {closeDealMutation.isPending ? 'Closing...' : 'Add to Portfolio'}
            </button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
