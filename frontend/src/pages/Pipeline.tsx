/**
 * PipelinePage — Kanban board for tracking deal stages.
 * Uses @dnd-kit/core and @dnd-kit/sortable for drag-and-drop.
 * Keyboard navigation via useKanbanKeyboard hook (arrow keys, Enter, Escape).
 * Optimistic updates on stage change with rollback on error.
 * Route: /pipeline
 */
import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'
import { CloseDealModal } from '@/components/close-deal-modal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { STAGES, STRATEGY_COLORS, STRATEGY_LABELS } from '@/components/pipeline/constants'
import type { PipelineCard, Stage } from '@/components/pipeline/constants'
import type { Strategy } from '@/types'
import { KanbanColumn } from '@/components/pipeline/kanban-column'
import { MobilePipeline } from '@/components/pipeline/mobile-pipeline'
import { PipelineEmpty } from '@/components/pipeline/pipeline-empty'
import { PipelineError } from '@/components/pipeline/pipeline-error'
import { useKanbanKeyboard } from '@/hooks/useKanbanKeyboard'
import { FeatureGate } from '@/components/billing/FeatureGate'
import { DealSidePanel } from '@/components/pipeline/DealSidePanel'
import { useAuthStore } from '@/stores/authStore'

/** Strategy badge used inside the drag overlay. */
function OverlayStrategyBadge({ strategy }: { strategy: string }) {
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

const STRATEGY_FILTERS = [
  { value: '', label: 'All Strategies' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'flip', label: 'Fix & Flip' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'creative_finance', label: 'Creative' },
]

export default function PipelinePage() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null)
  const [overColumnKey, setOverColumnKey] = useState<Stage | null>(null)
  const [closeDealCard, setCloseDealCard] = useState<PipelineCard | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ pipelineId: string; stage: Stage } | null>(null)
  const [strategyFilter, setStrategyFilter] = useState('')
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null)

  const handleCloseDeal = useCallback((card: PipelineCard) => {
    setCloseDealCard(card)
  }, [])

  const handleCardClick = useCallback((card: PipelineCard) => {
    setSelectedCard(card)
    try {
      (window as any).posthog?.capture?.('deal_card_clicked', {
        deal_id: card.deal_id,
        stage: card.stage,
        strategy: card.strategy,
      })
    } catch { /* ignore */ }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: pipelineData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['u', userId, 'pipeline', strategyFilter],
    queryFn: () => api.pipeline.list(strategyFilter || undefined),
  })

  // Local board state — derived from server, mutated optimistically
  const [localBoard, setLocalBoard] = useState<Record<Stage, PipelineCard[]> | null>(null)

  const rawBoard = (pipelineData as { data?: Record<string, PipelineCard[]> } | undefined)?.data ?? pipelineData
  const board: Record<Stage, PipelineCard[]> =
    localBoard ??
    (rawBoard as Record<Stage, PipelineCard[]> | undefined) ??
    (Object.fromEntries(STAGES.map((s) => [s.key, []])) as unknown as Record<Stage, PipelineCard[]>)

  // ── Keyboard navigation ────────────────────────────────────────────────
  const cardCounts = useMemo(
    () => STAGES.map((s) => (board[s.key]?.length ?? 0)),
    [board]
  )

  const handleKanbanSelect = useCallback(
    (columnIndex: number, cardIndex: number) => {
      const stageKey = STAGES[columnIndex]?.key
      if (!stageKey) return
      const cards = board[stageKey] ?? []
      const card = cards[cardIndex]
      if (card) {
        handleCardClick(card)
      }
    },
    [board, handleCardClick]
  )

  const {
    focusState,
    isKeyboardActive,
    registerCardRef,
    handleKeyDown: kanbanKeyDown,
    handleMouseDown: kanbanMouseDown,
  } = useKanbanKeyboard({
    cardCounts,
    onSelect: handleKanbanSelect,
  })

  // ── Stage update mutation ──────────────────────────────────────────────
  const updateStageMutation = useMutation({
    mutationFn: ({ pipelineId, stage }: { pipelineId: string; stage: Stage }) =>
      api.pipeline.updateStage(pipelineId, { stage }),
    onError: () => {
      setLocalBoard(null)
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'pipeline'] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'pipeline'] })
      setLocalBoard(null)
    },
  })

  // ── Remove mutation ──────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (pipelineId: string) => api.pipeline.remove(pipelineId),
    onError: () => {
      setLocalBoard(null)
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'pipeline'] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['u', userId, 'pipeline'] })
      setLocalBoard(null)
    },
  })

  const handleRemoveCard = useCallback(
    (pipelineId: string, stage: Stage) => {
      setRemoveTarget({ pipelineId, stage })
    },
    []
  )

  /** Move a card to a different stage (used by mobile "Move to..." menu). */
  const handleMoveStage = useCallback(
    (pipelineId: string, fromStage: Stage, toStage: Stage) => {
      const card = board[fromStage]?.find((c) => c.pipeline_id === pipelineId)
      if (!card) return
      const sourceCards = board[fromStage].filter((c) => c.pipeline_id !== pipelineId)
      const destCards = [{ ...card, stage: toStage }, ...board[toStage]]
      setLocalBoard({ ...board, [fromStage]: sourceCards, [toStage]: destCards })
      updateStageMutation.mutate({ pipelineId, stage: toStage })
    },
    [board, updateStageMutation]
  )

  const confirmRemoveCard = useCallback(() => {
    if (!removeTarget) return
    const { pipelineId, stage } = removeTarget
    const newBoard = { ...board }
    newBoard[stage] = newBoard[stage].filter((c) => c.pipeline_id !== pipelineId)
    setLocalBoard(newBoard)
    removeMutation.mutate(pipelineId)
    setRemoveTarget(null)
  }, [board, removeMutation, removeTarget])

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
      const isColumn = STAGES.some((s) => s.key === over.id)
      if (isColumn) {
        setOverColumnKey(over.id as Stage)
      } else {
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

  // ── Error state ──────────────────────────────────────────────────────
  if (isError) {
    return (
      <PipelineError
        error={error instanceof Error ? error : null}
        onRetry={() => refetch()}
      />
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────
  if (!isLoading && totalDeals === 0) {
    return <PipelineEmpty />
  }

  return (
    <AppShell>
      <FeatureGate feature="pipeline">
      <PageHeader
        title="Pipeline"
        subtitle={totalDeals > 0 ? `${totalDeals} deal${totalDeals !== 1 ? 's' : ''} tracked` : undefined}
        action={
          <Link
            to="/analyze"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-hover text-accent-text-on-accent text-xs font-medium transition-colors"
          >
            <Plus size={14} />
            Add Deal
          </Link>
        }
      />

      {/* Strategy filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-luxury px-4 md:px-6 lg:px-8 pb-3">
        {STRATEGY_FILTERS.map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              setStrategyFilter(opt.value)
              try {
                (window as any).posthog?.capture?.('pipeline_strategy_filtered', { strategy: opt.value || 'all' })
              } catch { /* ignore */ }
            }}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer',
              strategyFilter === opt.value
                ? 'bg-accent-primary/15 text-accent-secondary border border-accent-primary/30'
                : 'bg-app-recessed text-text-muted border border-border-default hover:text-text-secondary'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <PageContent>
        {/* Mobile — tabbed stage view (below md breakpoint) */}
        <div className="block md:hidden">
          <MobilePipeline
            board={board}
            isLoading={isLoading}
            onRemove={handleRemoveCard}
            onCloseDeal={handleCloseDeal}
            onMoveStage={handleMoveStage}
          />
        </div>

        {/* Desktop — Kanban board with horizontal scroll and keyboard navigation (md and above) */}
        <div className="hidden md:block">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className="pipeline-board flex gap-5 overflow-x-auto pb-6 px-1 min-h-[calc(100vh-180px)]"
              role="grid"
              aria-label="Pipeline Kanban board. Use arrow keys to navigate between columns and cards, Enter to open a deal, Escape to go back."
              onKeyDown={kanbanKeyDown}
              onMouseDown={kanbanMouseDown}
            >
              {STAGES.map((stage, colIndex) => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  cards={board[stage.key] ?? []}
                  isOver={overColumnKey === stage.key}
                  isLoading={isLoading}
                  columnIndex={colIndex}
                  focusedCardIndex={focusState.columnIndex === colIndex ? focusState.cardIndex : -1}
                  isKeyboardActive={isKeyboardActive}
                  registerCardRef={registerCardRef}
                  onRemove={handleRemoveCard}
                  onCloseDeal={handleCloseDeal}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>

            {/* Drag overlay — floats under cursor */}
            <DragOverlay dropAnimation={{
              duration: 180,
              easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
            }}>
              {activeCard ? (
                <div
                  className="rounded-xl border border-border-default bg-app-elevated space-y-2.5"
                  style={{
                    width: 280,
                    padding: '14px 16px',
                    cursor: 'grabbing',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.30), 0 4px 8px rgba(0,0,0,0.20), 0 0 24px rgba(139,122,255,0.15)',
                    transform: 'rotate(1.5deg) scale(1.02)',
                  }}
                >
                  <p className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2">
                    {activeCard.address}
                  </p>
                  <OverlayStrategyBadge strategy={activeCard.strategy} />
                  {activeCard.asking_price != null && activeCard.asking_price > 0 && (
                    <span className="block text-[12px] tabular-nums font-medium text-text-secondary">
                      ${activeCard.asking_price.toLocaleString()}
                    </span>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </PageContent>

      {closeDealCard && (
        <CloseDealModal
          isOpen={!!closeDealCard}
          onClose={() => setCloseDealCard(null)}
          dealId={closeDealCard.deal_id}
          address={closeDealCard.address}
          strategy={closeDealCard.strategy as Strategy}
          askingPrice={closeDealCard.asking_price ?? 0}
          pipelineId={closeDealCard.pipeline_id}
        />
      )}

      {/* Remove from pipeline confirmation dialog */}
      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent className="bg-app-surface border-border-default">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Remove from pipeline?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              This deal will be removed from your pipeline. You can always re-add it later from your deals list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-layer-2 border-border-default text-text-secondary hover:bg-layer-3 hover:text-text-primary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveCard}
              className="bg-error hover:bg-error-strong text-text-primary"
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pipeline-specific styles */}
      <style>{`
        /* Board horizontal scrollbar */
        .pipeline-board::-webkit-scrollbar { height: 6px; }
        .pipeline-board::-webkit-scrollbar-track { background: transparent; }
        .pipeline-board::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
        }
        .pipeline-board::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.10); }
        .pipeline-board {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }

        /* Column vertical scrollbar */
        .column-scroll::-webkit-scrollbar { width: 4px; }
        .column-scroll::-webkit-scrollbar-track { background: transparent; }
        .column-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 9999px;
        }
        .column-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.10); }
        .column-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }

        /* Column scroll gradient fade masks */
        .column-scroll-mask {
          mask-image: linear-gradient(
            to bottom,
            transparent 0px,
            black 8px,
            black calc(100% - 8px),
            transparent 100%
          );
        }

        /* Dark shimmer for skeleton loading */
        @keyframes shimmer-dark {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-dark {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.04) 50%,
            transparent 100%
          );
          animation: shimmer-dark 1.5s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer-dark { animation: none; }
        }
      `}</style>

      {/* Deal side panel */}
      <DealSidePanel
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
      </FeatureGate>
    </AppShell>
  )
}
