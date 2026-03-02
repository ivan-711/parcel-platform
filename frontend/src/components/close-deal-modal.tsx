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
  strategy: string
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
          label: 'View Portfolio →',
          onClick: () => navigate('/portfolio'),
        },
      })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      onClose()
    },
    onError: (err) => {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong — try again')
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
      <DialogContent className="border-[#1A1A2E] bg-[#0F0F1A] sm:max-w-md">
        <motion.div
          {...shakeProps}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={shakeProps.animate === 'shake' ? 'shake' : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-text-primary">Close Deal</DialogTitle>
              <StrategyBadge strategy={strategy as Strategy} />
            </div>
            <DialogDescription className="text-[#94A3B8]">
              {address}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Closed Date */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Closed Date
              </label>
              <input
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                className="w-full rounded-lg border border-[#1A1A2E] bg-[#08080F] px-3 py-2 text-sm text-text-primary focus:border-[#6366F1] focus:outline-none"
              />
              {errors.closedDate && (
                <p className="mt-1 text-xs text-red-400">{errors.closedDate}</p>
              )}
            </div>

            {/* Closed Price */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Closed Price
              </label>
              <input
                type="number"
                value={closedPrice}
                onChange={(e) => setClosedPrice(e.target.value)}
                placeholder="e.g. 250000"
                className="w-full rounded-lg border border-[#1A1A2E] bg-[#08080F] px-3 py-2 font-mono text-sm text-text-primary focus:border-[#6366F1] focus:outline-none"
              />
              {errors.closedPrice && (
                <p className="mt-1 text-xs text-red-400">{errors.closedPrice}</p>
              )}
            </div>

            {/* Profit / Assignment Fee */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Profit / Assignment Fee
              </label>
              <input
                type="number"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                placeholder="e.g. 18500"
                className="w-full rounded-lg border border-[#1A1A2E] bg-[#08080F] px-3 py-2 font-mono text-sm text-text-primary focus:border-[#6366F1] focus:outline-none"
              />
              {errors.profit && (
                <p className="mt-1 text-xs text-red-400">{errors.profit}</p>
              )}
            </div>

            {/* Monthly Cash Flow */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Monthly Cash Flow
              </label>
              <input
                type="number"
                value={monthlyCashFlow}
                onChange={(e) => setMonthlyCashFlow(e.target.value)}
                placeholder="0 if wholesale/flip"
                className="w-full rounded-lg border border-[#1A1A2E] bg-[#08080F] px-3 py-2 font-mono text-sm text-text-primary focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did this deal go?"
                rows={3}
                className="w-full rounded-lg border border-[#1A1A2E] bg-[#08080F] px-3 py-2 text-sm text-text-primary focus:border-[#6366F1] focus:outline-none resize-none"
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-400">{submitError}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={closeDealMutation.isPending}
              className="w-full rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6366F1]/90 transition-colors disabled:opacity-50"
            >
              {closeDealMutation.isPending ? 'Closing...' : 'Add to Portfolio'}
            </button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
