/** DealCard — individual pipeline deal card with context menu for close/remove actions. */

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Trash2, CheckCircle2, ArrowRight } from 'lucide-react'
import { prefersReducedMotion } from '@/lib/motion'
import { SampleBadge } from '@/components/SampleBadge'
import { STAGES, STRATEGY_COLORS, STRATEGY_LABELS } from './constants'
import type { PipelineCard, Stage } from './constants'

/** Strategy badge — color-coded pill by strategy key. */
function StrategyBadge({ strategy }: { strategy: string }) {
  const colors = STRATEGY_COLORS[strategy] ?? { bg: 'rgba(122,120,114,0.12)', text: 'var(--text-muted)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STRATEGY_LABELS[strategy] ?? strategy}
    </span>
  )
}

/** Risk dot for days-in-stage thresholds. */
function RiskDot({ days }: { days: number }) {
  if (days < 14) return null
  const isStale = days >= 30
  const color = isStale ? '#D4766A' : '#D4A867'
  const label = isStale ? `Stale — ${days}d in stage` : `Aging — ${days}d in stage`
  return (
    <span
      className="w-1.5 h-1.5 rounded-full ml-1 flex-shrink-0"
      style={{ backgroundColor: color }}
      title={label}
      aria-label={label}
    />
  )
}

interface DealCardProps {
  card: PipelineCard
  isDragging?: boolean
  isFocused?: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
  onMoveStage?: (pipelineId: string, fromStage: Stage, toStage: Stage) => void
  onCardClick?: (card: PipelineCard) => void
}

export const DealCard = memo(function DealCard({ card: rawCard, isDragging = false, isFocused = false, onRemove, onCloseDeal, onMoveStage, onCardClick }: DealCardProps) {
  // Normalize cards that arrive with a nested `deal` object (e.g. from pipeline API
  // responses where deal fields are nested) into the flat PipelineCard shape.
  const raw = rawCard as unknown as Record<string, unknown>
  const deal = raw.deal as Record<string, unknown> | undefined
  const card: PipelineCard = deal
    ? {
        pipeline_id: rawCard.pipeline_id || raw.id as string,
        deal_id: rawCard.deal_id || (deal.id as string),
        address: rawCard.address || deal.address as string || '',
        city: rawCard.city ?? (deal.city as string | null) ?? null,
        state: rawCard.state ?? (deal.state as string | null) ?? null,
        strategy: rawCard.strategy || deal.strategy as string || '',
        asking_price: rawCard.asking_price ?? (deal.purchase_price as number | null) ?? (deal.arv as number | null) ?? null,
        stage: rawCard.stage,
        days_in_stage: rawCard.days_in_stage ?? 0,
        entered_stage_at: rawCard.entered_stage_at ?? raw.created_at as string ?? '',
        property_type: rawCard.property_type ?? null,
        is_sample: rawCard.is_sample ?? false,
      }
    : rawCard

  const [menuOpen, setMenuOpen] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
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

  // Reset move submenu when menu closes
  useEffect(() => {
    if (!menuOpen) setShowMoveMenu(false)
  }, [menuOpen])

  // Days-in-stage text color
  const daysColor = card.days_in_stage >= 30
    ? 'text-loss'
    : card.days_in_stage >= 14
      ? 'text-warning'
      : 'text-text-disabled'

  return (
    <motion.div
      whileHover={prefersReducedMotion || isDragging ? undefined : { y: -2 }}
      className={[
        'group relative rounded-xl border bg-app-elevated py-3.5 px-4 space-y-2.5 transition-shadow duration-200 outline-none',
        isDragging
          ? 'opacity-50 border-dashed border-border-default shadow-[0_0_24px_rgba(139,122,255,0.15)]'
          : isFocused
            ? 'ring-2 ring-accent-primary/40 ring-offset-2 ring-offset-app-bg border-accent-primary/40'
            : 'border-border-default hover:border-border-emphasis hover:shadow-lg',
        onCardClick && !isDragging ? 'cursor-pointer' : '',
      ].join(' ')}
      onClick={() => {
        if (onCardClick && !isDragging && !menuOpen) onCardClick(card)
      }}
    >
      {/* Address + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-medium text-text-primary leading-snug line-clamp-2">
              {card.address}
            </p>
            {card.is_sample && <SampleBadge />}
          </div>
          {(card.city || card.state) && (
            <p className="text-[11px] text-text-muted mt-0.5">
              {[card.city, card.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {(onRemove || onCloseDeal) && (
            <button
              type="button"
              aria-label="Deal actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-all min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
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
            className="hidden md:block text-text-disabled/50 hover:text-text-disabled cursor-grab active:cursor-grabbing transition-colors"
          />
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (onRemove || onCloseDeal) && (
        <div
          ref={menuRef}
          className="absolute top-10 right-3 z-40 rounded-lg border border-border-default bg-app-surface shadow-lg py-1"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.20)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setMenuOpen(false)
            }
          }}
        >
          {onCloseDeal && card.stage !== 'dead' && (
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-secondary hover:bg-layer-2 hover:text-profit w-full transition-colors min-h-[44px]"
              onClick={() => {
                onCloseDeal(card)
                setMenuOpen(false)
              }}
            >
              <CheckCircle2 size={14} />
              Close Deal
            </button>
          )}
          {onMoveStage && (
            <>
              <button
                type="button"
                className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-text-secondary hover:bg-layer-2 hover:text-accent-primary w-full transition-colors min-h-[44px]"
                onClick={() => setShowMoveMenu((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <ArrowRight size={14} />
                  Move to...
                </span>
              </button>
              {showMoveMenu && (
                <div className="border-t border-border-default py-1">
                  {STAGES.filter((s) => s.key !== card.stage).map((stage) => (
                    <button
                      key={stage.key}
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-secondary hover:bg-layer-2 w-full transition-colors min-h-[44px]"
                      onClick={() => {
                        onMoveStage(card.pipeline_id, card.stage, stage.key)
                        setMenuOpen(false)
                        setShowMoveMenu(false)
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {onRemove && (
            <>
              {(onCloseDeal || onMoveStage) && <div className="border-t border-border-default" />}
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-secondary hover:bg-layer-2 hover:text-error w-full transition-colors min-h-[44px]"
                onClick={() => {
                  onRemove(card.pipeline_id, card.stage)
                  setMenuOpen(false)
                }}
              >
                <Trash2 size={14} />
                Remove from pipeline
              </button>
            </>
          )}
        </div>
      )}

      {/* Strategy badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <StrategyBadge strategy={card.strategy} />
      </div>

      {/* Key metric + days-in-stage + risk dot */}
      <div className="flex items-center justify-between">
        {card.asking_price != null && card.asking_price > 0 && (
          <span className="text-[12px] tabular-nums font-medium text-text-secondary">
            ${card.asking_price.toLocaleString()}
          </span>
        )}
        <span className={`text-[11px] ${daysColor} ml-auto flex items-center`}>
          {card.days_in_stage}d
          <RiskDot days={card.days_in_stage} />
        </span>
      </div>
    </motion.div>
  )
})

interface SortableDealCardProps {
  card: PipelineCard
  isFocused?: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
  onCardClick?: (card: PipelineCard) => void
  /** Callback to register this card's DOM element for keyboard focus management. */
  registerRef?: (el: HTMLDivElement | null) => void
}

/** SortableDealCard — wraps DealCard with @dnd-kit/sortable for drag-and-drop. */
export function SortableDealCard({ card, isFocused = false, onRemove, onCloseDeal, onCardClick, registerRef }: SortableDealCardProps) {
  const {
    attributes: { tabIndex: _tabIndex, role: _role, ...restAttributes },
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
      {...restAttributes}
      {...listeners}
      tabIndex={0}
      role="option"
      aria-label={`${card.address}, ${STRATEGY_LABELS[card.strategy] ?? card.strategy}${card.asking_price != null ? `, $${card.asking_price.toLocaleString()}` : ''}`}
      aria-selected={isFocused}
      className="outline-none"
    >
      <DealCard card={card} isDragging={isDragging} isFocused={isFocused} onRemove={onRemove} onCloseDeal={onCloseDeal} onCardClick={onCardClick} />
    </div>
  )
}
