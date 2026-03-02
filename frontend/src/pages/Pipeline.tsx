/**
 * PipelinePage — Kanban board for tracking deal stages.
 * Uses @dnd-kit/core and @dnd-kit/sortable for drag-and-drop.
 * Optimistic updates on stage change with rollback on error.
 * Route: /pipeline
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, Plus, Inbox, MoreHorizontal, Trash2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'
import { CloseDealModal } from '@/components/close-deal-modal'

// ─── Types ─────────────────────────────────────────────────────────────────

type Stage =
  | 'lead'
  | 'analyzing'
  | 'offer_sent'
  | 'under_contract'
  | 'due_diligence'
  | 'closed'
  | 'dead'

interface PipelineCard {
  pipeline_id: string
  deal_id: string
  address: string
  strategy: string
  asking_price: number
  stage: Stage
  days_in_stage: number
  entered_stage_at: string
}


// ─── Constants ─────────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'lead',           label: 'Lead',           color: '#475569' },
  { key: 'analyzing',      label: 'Analyzing',      color: '#6366F1' },
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#F59E0B' },
  { key: 'under_contract', label: 'Under Contract', color: '#3B82F6' },
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#8B5CF6' },
  { key: 'closed',         label: 'Closed',         color: '#10B981' },
  { key: 'dead',           label: 'Dead',           color: '#EF4444' },
]

const STRATEGY_COLORS: Record<string, { bg: string; text: string }> = {
  wholesale:        { bg: '#451A03', text: '#FCD34D' },
  creative_finance: { bg: '#2E1065', text: '#C4B5FD' },
  brrrr:            { bg: '#0C1A4A', text: '#93C5FD' },
  buy_and_hold:     { bg: '#064E3B', text: '#6EE7B7' },
  flip:             { bg: '#431407', text: '#FCA5A1' },
}

const STRATEGY_LABELS: Record<string, string> = {
  wholesale:        'Wholesale',
  creative_finance: 'Creative Finance',
  brrrr:            'BRRRR',
  buy_and_hold:     'Buy & Hold',
  flip:             'Flip',
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#1A1A2E] bg-[#0F0F1A] p-4 space-y-3"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className="h-3 w-3/4 rounded bg-[#1C1C30] overflow-hidden relative">
            <div className="shimmer absolute inset-0" />
          </div>
          <div className="h-3 w-1/2 rounded bg-[#1C1C30] overflow-hidden relative">
            <div className="shimmer absolute inset-0" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-[#1C1C30] overflow-hidden relative">
              <div className="shimmer absolute inset-0" />
            </div>
            <div className="h-5 w-10 rounded bg-[#1C1C30] overflow-hidden relative">
              <div className="shimmer absolute inset-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Strategy Badge ─────────────────────────────────────────────────────────

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

// ─── Risk Score Badge ───────────────────────────────────────────────────────

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

// ─── Deal Card (Sortable) ────────────────────────────────────────────────────

interface DealCardProps {
  card: PipelineCard
  isDragging?: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
}

function DealCard({ card, isDragging = false, onRemove, onCloseDeal }: DealCardProps) {
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
      className="group relative rounded-xl border border-[#1A1A2E] bg-[#0F0F1A] p-4 space-y-3 transition-all duration-150"
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
              className="opacity-0 group-hover:opacity-100 text-[#334155] hover:text-[#94A3B8] transition-all"
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
            className="text-[#334155] group-hover:text-[#475569] cursor-grab active:cursor-grabbing transition-colors"
          />
        </div>
      </div>

      {/* ⋯ dropdown */}
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
}

function SortableDealCard({ card, onRemove, onCloseDeal }: { card: PipelineCard; onRemove?: (pipelineId: string, stage: Stage) => void; onCloseDeal?: (card: PipelineCard) => void }) {
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard card={card} isDragging={isDragging} onRemove={onRemove} onCloseDeal={onCloseDeal} />
    </div>
  )
}

// ─── Kanban Column ──────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: { key: Stage; label: string; color: string }
  cards: PipelineCard[]
  isOver: boolean
  isLoading: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
}

function KanbanColumn({ stage, cards, isOver, isLoading, onRemove, onCloseDeal }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[240px] max-w-[240px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-[11px] font-medium uppercase tracking-widest text-[#94A3B8]">
          {stage.label}
        </span>
        <span
          className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded"
          style={{
            color: stage.color,
            backgroundColor: `${stage.color}22`,
          }}
        >
          {cards.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-all duration-150"
        style={{
          backgroundColor: isOver ? `${stage.color}12` : 'transparent',
          border: isOver ? `1px dashed ${stage.color}55` : '1px dashed transparent',
        }}
      >
        {isLoading ? (
          <ColumnSkeleton />
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 opacity-30">
            <Inbox size={20} className="text-[#475569]" />
            <p className="text-[11px] text-[#475569]">Drop here</p>
          </div>
        ) : (
          <SortableContext
            items={cards.map((c) => c.pipeline_id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence>
              {cards.map((card, i) => (
                <motion.div
                  key={card.pipeline_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                >
                  <SortableDealCard card={card} onRemove={onRemove} onCloseDeal={onCloseDeal} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        )}
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null)
  const [overColumnKey, setOverColumnKey] = useState<Stage | null>(null)
  const [closeDealCard, setCloseDealCard] = useState<PipelineCard | null>(null)

  const handleCloseDeal = useCallback((card: PipelineCard) => {
    setCloseDealCard(card)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api.pipeline.list(),
  })

  // Local board state — derived from server, mutated optimistically
  const [localBoard, setLocalBoard] = useState<Record<Stage, PipelineCard[]> | null>(null)

  const board: Record<Stage, PipelineCard[]> =
    localBoard ??
    (pipelineData?.data as Record<Stage, PipelineCard[]> | undefined) ??
    (Object.fromEntries(STAGES.map((s) => [s.key, []])) as unknown as Record<Stage, PipelineCard[]>)

  // ── Stage update mutation ──────────────────────────────────────────────
  const updateStageMutation = useMutation({
    mutationFn: ({ pipelineId, stage }: { pipelineId: string; stage: Stage }) =>
      api.pipeline.updateStage(pipelineId, { stage }),
    onError: () => {
      setLocalBoard(null)
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      setLocalBoard(null)
    },
  })

  // ── Remove mutation ──────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (pipelineId: string) => api.pipeline.remove(pipelineId),
    onError: () => {
      setLocalBoard(null)
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      setLocalBoard(null)
    },
  })

  const handleRemoveCard = useCallback(
    (pipelineId: string, stage: Stage) => {
      const newBoard = { ...board }
      newBoard[stage] = newBoard[stage].filter((c) => c.pipeline_id !== pipelineId)
      setLocalBoard(newBoard)
      removeMutation.mutate(pipelineId)
    },
    [board, removeMutation]
  )

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = event.active.data.current?.card as PipelineCard | undefined
      if (card) setActiveCard(card)
    },
    []
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event
      if (!over) {
        setOverColumnKey(null)
        return
      }
      // over.id is either a column key or a card pipeline_id
      const isColumn = STAGES.some((s) => s.key === over.id)
      if (isColumn) {
        setOverColumnKey(over.id as Stage)
      } else {
        // Find which column the hovered card belongs to
        for (const stage of STAGES) {
          if (board[stage.key].some((c) => c.pipeline_id === over.id)) {
            setOverColumnKey(stage.key)
            break
          }
        }
      }
    },
    [board]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)
      setOverColumnKey(null)

      if (!over || !active.data.current?.card) return

      const card = active.data.current.card as PipelineCard

      // Determine destination stage
      let destStage: Stage | null = null
      const isColumn = STAGES.some((s) => s.key === over.id)
      if (isColumn) {
        destStage = over.id as Stage
      } else {
        for (const stage of STAGES) {
          if (board[stage.key].some((c) => c.pipeline_id === over.id)) {
            destStage = stage.key
            break
          }
        }
      }

      if (!destStage || destStage === card.stage) return

      // Optimistic update
      const prevBoard = { ...board }
      const sourceCards = prevBoard[card.stage].filter(
        (c) => c.pipeline_id !== card.pipeline_id
      )
      const destCards = [
        { ...card, stage: destStage },
        ...prevBoard[destStage],
      ]

      setLocalBoard({
        ...prevBoard,
        [card.stage]: sourceCards,
        [destStage]: destCards,
      })

      updateStageMutation.mutate({
        pipelineId: card.pipeline_id,
        stage: destStage,
      })
    },
    [board, updateStageMutation]
  )

  // ── Total count ────────────────────────────────────────────────────────
  const totalDeals = STAGES.reduce((acc, s) => acc + (board[s.key]?.length ?? 0), 0)

  return (
    <AppShell>
      <PageHeader
        title="Pipeline"
        subtitle={totalDeals > 0 ? `${totalDeals} deal${totalDeals !== 1 ? 's' : ''} tracked` : undefined}
        action={
          <a
            href="/analyze"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium transition-colors"
          >
            <Plus size={14} />
            Add Deal
          </a>
        }
      />

      <PageContent>
        {/* Kanban board — horizontal scroll */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-160px)]">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                cards={board[stage.key] ?? []}
                isOver={overColumnKey === stage.key}
                isLoading={isLoading}
                onRemove={handleRemoveCard}
                onCloseDeal={handleCloseDeal}
              />
            ))}
          </div>

          {/* Drag overlay — floats under cursor */}
          <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
            {activeCard ? (
              <div
                className="rounded-xl border border-[#252540] bg-[#16162A] p-4 space-y-3 shadow-2xl rotate-1"
                style={{ width: 240, cursor: 'grabbing' }}
              >
                <p className="text-[13px] font-medium text-[#F1F5F9] leading-tight line-clamp-2">
                  {activeCard.address}
                </p>
                <div className="flex items-center gap-2">
                  <StrategyBadge strategy={activeCard.strategy} />
                </div>
                {activeCard.asking_price > 0 && (
                  <span className="text-[12px] font-mono text-[#94A3B8]">
                    ${activeCard.asking_price.toLocaleString()}
                  </span>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </PageContent>

      {closeDealCard && (
        <CloseDealModal
          isOpen={!!closeDealCard}
          onClose={() => setCloseDealCard(null)}
          dealId={closeDealCard.deal_id}
          address={closeDealCard.address}
          strategy={closeDealCard.strategy}
          askingPrice={closeDealCard.asking_price ?? 0}
          pipelineId={closeDealCard.pipeline_id}
        />
      )}

      {/* Shimmer keyframe — injected once */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.04) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </AppShell>
  )
}
