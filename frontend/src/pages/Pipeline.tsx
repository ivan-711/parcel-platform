/**
 * PipelinePage — Kanban board for tracking deal stages.
 * Uses @dnd-kit/core and @dnd-kit/sortable for drag-and-drop.
 * Optimistic updates on stage change with rollback on error.
 * Route: /pipeline
 */
import { useState, useCallback } from 'react'
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
import { KanbanColumn } from '@/components/pipeline/kanban-column'
import { MobilePipeline } from '@/components/pipeline/mobile-pipeline'
import { PipelineEmpty } from '@/components/pipeline/pipeline-empty'
import { PipelineError } from '@/components/pipeline/pipeline-error'

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

  const board: Record<Stage, PipelineCard[]> =
    localBoard ??
    (pipelineData as Record<Stage, PipelineCard[]> | undefined) ??
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
      setRemoveTarget({ pipelineId, stage })
    },
    []
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
        {/* Mobile — tabbed stage view (below md breakpoint) */}
        <div className="block md:hidden">
          <MobilePipeline
            board={board}
            isLoading={isLoading}
            onRemove={handleRemoveCard}
            onCloseDeal={handleCloseDeal}
          />
        </div>

        {/* Desktop — Kanban board with horizontal scroll (md and above) */}
        <div className="hidden md:block">
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
                    <OverlayStrategyBadge strategy={activeCard.strategy} />
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
        </div>
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

      {/* Remove from pipeline confirmation dialog */}
      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent className="bg-[#0F0F1A] border-[#1A1A2E]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F1F5F9]">Remove from pipeline?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              This deal will be removed from your pipeline. You can always re-add it later from your deals list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1A1A2E] border-[#2A2A3E] text-[#F1F5F9] hover:bg-[#252540]">Cancel</AlertDialogCancel>
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
