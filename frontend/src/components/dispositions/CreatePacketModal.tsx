// frontend/src/components/dispositions/CreatePacketModal.tsx
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreatePacket } from '@/hooks/useDispositions'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  scenarioId: string
  propertyAddress: string
  strategy: string | null
  purchasePrice: number | null
  selectedBuyerIds: string[]
  onSuccess: () => void
}

const inputCls =
  'w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-violet-400 focus:outline-none transition-colors'
const labelCls = 'text-[10px] uppercase tracking-wider text-text-muted mb-1.5 block'

function strategyLabel(s: string | null): string {
  if (!s) return 'Deal'
  const map: Record<string, string> = {
    wholesale: 'Wholesale',
    flip: 'Flip',
    buy_and_hold: 'Buy & Hold',
    brrrr: 'BRRRR',
    creative_finance: 'Creative Finance',
  }
  return map[s] ?? s
}

export function CreatePacketModal({
  open,
  onOpenChange,
  propertyId,
  scenarioId,
  propertyAddress,
  strategy,
  purchasePrice,
  selectedBuyerIds,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const createPacket = useCreatePacket()

  const defaultTitle = `${propertyAddress} — ${strategyLabel(strategy)} Analysis`

  const [title, setTitle] = useState(defaultTitle)
  const [askingPrice, setAskingPrice] = useState(purchasePrice ? String(purchasePrice) : '')
  const [assignmentFee, setAssignmentFee] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdPacketId, setCreatedPacketId] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTitle(`${propertyAddress} — ${strategyLabel(strategy)} Analysis`)
      setAskingPrice(purchasePrice ? String(purchasePrice) : '')
      setAssignmentFee('')
      setNotes('')
      setSubmitting(false)
      setCreatedPacketId(null)
    }
  }, [open, propertyAddress, strategy, purchasePrice])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      let pid = createdPacketId
      // Phase 1: create packet (skip if already created)
      if (!pid) {
        const packet = await createPacket.mutateAsync({
          property_id: propertyId,
          scenario_id: scenarioId,
          title: title.trim(),
          asking_price: askingPrice ? Number(askingPrice) : undefined,
          assignment_fee: assignmentFee ? Number(assignmentFee) : undefined,
          notes_to_buyer: notes.trim() || undefined,
        })
        pid = packet.id
        setCreatedPacketId(pid)
      }

      // Phase 2: send to selected buyers
      if (selectedBuyerIds.length > 0) {
        const result = await api.dispositions.packets.send(pid, {
          buyer_contact_ids: selectedBuyerIds,
          message: notes.trim() || undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['u', userId, 'dispositions', 'packets'] })
        queryClient.invalidateQueries({ queryKey: ['u', userId, 'buyers'] })
        toast.success(`Packet sent to ${result.sent_count} buyer${result.sent_count !== 1 ? 's' : ''}`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      if (createdPacketId) {
        toast.error('Packet created but sending failed. Click send to retry.')
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to create packet')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !submitting && onOpenChange(false)}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-app-recessed border border-border-default rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div>
            <h2
              className="text-base text-text-primary font-brand font-light"
            >
              Send Buyer Packet
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {selectedBuyerIds.length} buyer{selectedBuyerIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={() => !submitting && onOpenChange(false)}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-app-elevated transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="packet-title" className={labelCls}>Packet Title</label>
            <input
              id="packet-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. 123 Main St — Wholesale Analysis"
              required
              aria-required="true"
            />
          </div>

          {/* Asking price + Assignment fee side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="packet-asking-price" className={labelCls}>Asking Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                <input
                  id="packet-asking-price"
                  type="number"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  className={cn(inputCls, 'pl-6')}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label htmlFor="packet-assignment-fee" className={labelCls}>Assignment Fee <span className="normal-case text-text-muted">(opt)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                <input
                  id="packet-assignment-fee"
                  type="number"
                  value={assignmentFee}
                  onChange={(e) => setAssignmentFee(e.target.value)}
                  className={cn(inputCls, 'pl-6')}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="packet-notes" className={labelCls}>Notes to Buyer <span className="normal-case text-text-muted">(opt)</span></label>
            <textarea
              id="packet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(inputCls, 'resize-none')}
              placeholder="Any additional details, terms, or context for the buyer…"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-400 text-accent-text-on-accent transition-opacity',
                'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {submitting ? 'Sending…' : createdPacketId ? 'Retry Send' : `Send to ${selectedBuyerIds.length} Buyer${selectedBuyerIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
