import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Clock,
  DollarSign,
  ArrowRight,
  Users,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { TaskList } from '@/components/tasks/TaskList'
import { AddTaskForm } from '@/components/tasks/AddTaskForm'
import { useTasksList } from '@/hooks/useTasks'
import { api } from '@/lib/api'
import { STAGES, STRATEGY_COLORS, STRATEGY_LABELS } from './constants'
import type { PipelineCard, Stage } from './constants'
import { cn } from '@/lib/utils'

interface Props {
  card: PipelineCard | null
  isOpen: boolean
  onClose: () => void
}

export function DealSidePanel({ card, isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const { data: tasksData } = useTasksList(
    card ? { deal_id: card.deal_id, per_page: 10 } : {},
    { enabled: isOpen && !!card }
  )

  const moveMutation = useMutation({
    mutationFn: ({ pipelineId, stage }: { pipelineId: string; stage: string }) =>
      api.pipeline.updateStage(pipelineId, { stage }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['today'] })
      // Update the card prop via parent callback would be ideal,
      // but we can at least reflect the new stage locally
      if (card) {
        card.stage = variables.stage as Stage
        card.days_in_stage = 0
      }
      toast.success('Stage updated')
      try {
        (window as any).posthog?.capture?.('deal_stage_moved', {
          deal_id: card?.deal_id,
          method: 'dropdown',
        })
      } catch { /* ignore */ }
    },
    onError: () => toast.error('Failed to move stage'),
  })

  if (!card) return null

  const strategyColors = STRATEGY_COLORS[card.strategy] ?? { bg: 'rgba(122,120,114,0.12)', text: '#7A7872' }
  const stageInfo = STAGES.find(s => s.key === card.stage)

  const daysColor = card.days_in_stage >= 30
    ? 'text-[#F87171]'
    : card.days_in_stage >= 14
      ? 'text-[#FBBF24]'
      : 'text-[#4ADE80]'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] p-0 bg-[#0C0B0A] border-l border-[#1E1D1B] overflow-y-auto"
      >
        <SheetTitle className="sr-only">Deal Details</SheetTitle>

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1E1D1B]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg text-[#F0EDE8] font-medium truncate">
                {card.address}
              </h2>
              {(card.city || card.state) && (
                <p className="text-sm text-[#8A8580] mt-0.5">
                  {[card.city, card.state].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: strategyColors.bg, color: strategyColors.text }}
                >
                  {STRATEGY_LABELS[card.strategy] ?? card.strategy}
                </span>
                {stageInfo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1E1D1B] text-[#C5C0B8]">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageInfo.color }} />
                    {stageInfo.label}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4">
          <StatBox
            icon={DollarSign}
            label="Price"
            value={card.asking_price != null ? `$${card.asking_price.toLocaleString()}` : '—'}
          />
          <StatBox
            icon={ArrowRight}
            label="Strategy"
            value={STRATEGY_LABELS[card.strategy] ?? card.strategy}
          />
          <StatBox
            icon={Clock}
            label="In Stage"
            value={`${card.days_in_stage}d`}
            valueColor={daysColor}
          />
        </div>

        {/* Move Stage */}
        <div className="px-6 py-3 border-t border-[#1E1D1B]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8580] font-medium mb-2">
            Move Stage
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.filter(s => s.key !== 'dead').map((stage) => (
              <button
                key={stage.key}
                onClick={() => {
                  if (stage.key !== card.stage) {
                    moveMutation.mutate({
                      pipelineId: card.pipeline_id,
                      stage: stage.key,
                    })
                  }
                }}
                disabled={moveMutation.isPending}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer',
                  card.stage === stage.key
                    ? 'bg-[#8B7AFF]/15 text-[#A89FFF] border border-[#8B7AFF]/30'
                    : 'text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311]'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contacts placeholder */}
        <div className="px-6 py-4 border-t border-[#1E1D1B]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8580] font-medium mb-2">
            Linked Contacts
          </p>
          <div className="flex items-center gap-2 py-3 text-sm text-[#8A8580]">
            <Users size={14} />
            No linked contacts
          </div>
        </div>

        {/* Tasks */}
        <div className="px-6 py-4 border-t border-[#1E1D1B]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8580] font-medium mb-2">
            Tasks
          </p>
          {tasksData && tasksData.tasks.length > 0 ? (
            <TaskList tasks={tasksData.tasks} compact />
          ) : (
            <p className="text-sm text-[#8A8580] py-2">No tasks.</p>
          )}
          <div className="mt-2">
            <AddTaskForm dealId={card.deal_id} />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#1E1D1B]">
          <Link
            to={`/analyze/deal/${card.deal_id}`}
            onClick={() => {
              try {
                (window as any).posthog?.capture?.('deal_side_panel_action', { action: 'view_analysis' })
              } catch { /* ignore */ }
            }}
            className="inline-flex items-center gap-1.5 text-sm text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
          >
            <ExternalLink size={14} />
            View Full Analysis
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StatBox({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="bg-[#141311] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-[#8A8580]" />
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580]">{label}</p>
      </div>
      <p className={cn('text-sm font-medium tabular-nums', valueColor || 'text-[#F0EDE8]')}>
        {value}
      </p>
    </div>
  )
}
