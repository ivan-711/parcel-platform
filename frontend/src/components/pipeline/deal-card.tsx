/** DealCard — individual pipeline deal card with context menu for close/remove actions. */

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Trash2, CheckCircle2 } from 'lucide-react'
import { STRATEGY_COLORS, STRATEGY_LABELS } from './constants'
import type { PipelineCard, Stage } from './constants'

/** Strategy badge — color-coded pill by strategy key. */
function StrategyBadge({ strategy }: { strategy: string }) {
  const colors = STRATEGY_COLORS[strategy] ?? { bg: '#1A1A2E', text: '#94A3B8' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STRATEGY_LABELS[strategy] ?? strategy}
    </span>
  )
}

/** Risk score badge — color-coded by severity threshold. */
function RiskBadge({ score }: { score?: number }) {
  if (score == null) return null
  const color =
    score <= 30 ? '#10B981' :
    score <= 60 ? '#F59E0B' :
    score <= 80 ? '#EF4444' : '#7F1D1D'
  return (
    <span
      className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}22` }}
    >
      {score}
    </span>
  )
}

interface DealCardProps {
  card: PipelineCard
  isDragging?: boolean
  isFocused?: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
}

export const DealCard = memo(function DealCard({ card, isDragging = false, isFocused = false, onRemove, onCloseDeal }: DealCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div
      className={[
        'group relative rounded-xl border bg-[#0F0F1A] p-4 space-y-3 transition-all duration-150 outline-none',
        isFocused
          ? 'ring-2 ring-[#6366F1]/60 ring-offset-2 ring-offset-[#08080F] border-[#6366F1]/40'
          : 'border-[#1A1A2E]',
      ].join(' ')}
      style={{
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? 'none' : undefined,
      }}
    >
      {/* Address */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#F1F5F9] leading-tight line-clamp-2">
          {card.address}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {(onRemove || onCloseDeal) && (
            <button
              type="button"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-[#475569] md:text-[#334155] hover:text-[#94A3B8] transition-all min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
            >
              <MoreHorizontal size={14} />
            </button>
          )}
          <GripVertical
            size={14}
            className="hidden md:block text-[#334155] group-hover:text-[#475569] cursor-grab active:cursor-grabbing transition-colors"
          />
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (onRemove || onCloseDeal) && (
        <div
          ref={menuRef}
          className="absolute top-10 right-3 z-40 rounded-lg border border-[#1A1A2E] bg-[#0F0F1A] shadow-lg py-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {onCloseDeal && card.stage !== 'dead' && (
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#94A3B8] hover:bg-[#1A1A2E] hover:text-[#10B981] w-full transition-colors"
              onClick={() => {
                onCloseDeal(card)
                setMenuOpen(false)
              }}
            >
              <CheckCircle2 size={14} />
              Close Deal
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#94A3B8] hover:bg-[#1A1A2E] hover:text-red-400 w-full transition-colors"
              onClick={() => {
                onRemove(card.pipeline_id, card.stage)
                setMenuOpen(false)
              }}
            >
              <Trash2 size={14} />
              Remove from pipeline
            </button>
          )}
        </div>
      )}

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StrategyBadge strategy={card.strategy} />
        <RiskBadge score={card.asking_price} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between">
        {card.asking_price > 0 && (
          <span className="text-[12px] font-mono text-[#94A3B8]">
            ${card.asking_price.toLocaleString()}
          </span>
        )}
        <span className="text-[11px] text-[#475569] ml-auto">
          {card.days_in_stage}d in stage
        </span>
      </div>
    </div>
  )
})

interface SortableDealCardProps {
  card: PipelineCard
  isFocused?: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
  /** Callback to register this card's DOM element for keyboard focus management. */
  registerRef?: (el: HTMLDivElement | null) => void
}

/** SortableDealCard — wraps DealCard with @dnd-kit/sortable for drag-and-drop. */
export function SortableDealCard({ card, isFocused = false, onRemove, onCloseDeal, registerRef }: SortableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.pipeline_id, data: { card } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  /** Combine dnd-kit ref with keyboard ref registration. */
  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      if (registerRef) registerRef(el)
    },
    [setNodeRef, registerRef]
  )

  return (
    <div
      ref={combinedRef}
      style={style}
      tabIndex={0}
      role="option"
      aria-label={`${card.address}, ${STRATEGY_LABELS[card.strategy] ?? card.strategy}, $${card.asking_price.toLocaleString()}`}
      aria-selected={isFocused}
      className="outline-none"
      {...attributes}
      {...listeners}
    >
      <DealCard card={card} isDragging={isDragging} isFocused={isFocused} onRemove={onRemove} onCloseDeal={onCloseDeal} />
    </div>
  )
}
