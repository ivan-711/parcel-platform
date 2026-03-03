/**
 * PipelinePage — Kanban board for tracking deal stages.
 * Uses @dnd-kit/core and @dnd-kit/sortable for drag-and-drop.
 * Keyboard navigation via useKanbanKeyboard hook (arrow keys, Enter, Escape).
 * Optimistic updates on stage change with rollback on error.
 * Route: /pipeline
 */
import { useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
import { Plus } from 'lucide-react'
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

/** Strategy badge used inside the drag overlay. */
function OverlayStrategyBadge({ strategy }: { strategy: string }) {
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

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null)
  const [overColumnKey, setOverColumnKey] = useState<Stage | null>(null)
  const [closeDealCard, setCloseDealCard] = useState<PipelineCard | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ pipelineId: string; stage: Stage } | null>(null)

  const handleCloseDeal = useCallback((card: PipelineCard) => {
    setCloseDealCard(card)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: pipelineData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api.pipeline.list(),
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
        navigate(`/analyze/results/${card.deal_id}`)
      }
    },
    [board, navigate]
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
      <PageHeader
        title="Pipeline"
        subtitle={totalDeals > 0 ? `${totalDeals} deal${totalDeals !== 1 ? 's' : ''} tracked` : undefined}
        action={
          <Link
            to="/analyze"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-hover text-white text-xs font-medium transition-colors"
          >
            <Plus size={14} />
            Add Deal
          </Link>
        }
      />

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
              className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-160px)]"
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
                />
              ))}
            </div>

            {/* Drag overlay — floats under cursor */}
            <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
              {activeCard ? (
                <div
                  className="rounded-xl border border-border-default bg-app-elevated p-4 space-y-3 shadow-2xl rotate-1"
                  style={{ width: 240, cursor: 'grabbing' }}
                >
                  <p className="text-xs font-medium text-text-primary leading-tight line-clamp-2">
                    {activeCard.address}
                  </p>
                  <div className="flex items-center gap-2">
                    <OverlayStrategyBadge strategy={activeCard.strategy} />
                  </div>
                  {activeCard.asking_price != null && activeCard.asking_price > 0 && (
                    <span className="text-xs font-mono text-text-secondary">
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
        <AlertDialogContent className="bg-app-surface border-border-subtle">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Remove from pipeline?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              This deal will be removed from your pipeline. You can always re-add it later from your deals list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-app-elevated border-border-default text-text-primary hover:bg-border-default">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveCard}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
