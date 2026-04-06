import { motion } from 'framer-motion'
import { Check, Clock, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCompleteTask, useSnoozeTask, useDeleteTask } from '@/hooks/useTasks'
import type { TaskItem } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#F87171',
  high: '#F97316',
  normal: '#8B7AFF',
  low: '#8A8580',
}

function getDueBadge(dueDate: string | null, status: string): { label: string; color: string } | null {
  if (!dueDate || status === 'done') return null
  const due = new Date(dueDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

  if (dueDay < today) return { label: 'Overdue', color: '#F87171' }
  if (dueDay.getTime() === today.getTime()) return { label: 'Today', color: '#FBBF24' }
  if (dueDay.getTime() === tomorrow.getTime()) return { label: 'Tomorrow', color: '#60A5FA' }

  const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / 86400000)
  if (diffDays <= 7) return { label: `${diffDays}d`, color: '#8A8580' }
  return { label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#8A8580' }
}

interface Props {
  task: TaskItem
  compact?: boolean
}

export function TaskCard({ task, compact }: Props) {
  const completeMutation = useCompleteTask()
  const snoozeMutation = useSnoozeTask()
  const deleteMutation = useDeleteTask()

  const isDone = task.status === 'done'
  const dueBadge = getDueBadge(task.due_date, task.status)
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    completeMutation.mutate(task.id, {
      onSuccess: () => {
        toast.success('Task completed')
        try { (window as any).posthog?.capture?.('task_completed', { task_id: task.id }) } catch {}
      },
    })
  }

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    snoozeMutation.mutate(
      { id: task.id, until: tomorrow.toISOString() },
      {
        onSuccess: () => {
          toast.success('Snoozed until tomorrow')
          try { (window as any).posthog?.capture?.('task_snoozed', { task_id: task.id, snooze_duration_days: 1 }) } catch {}
        },
      }
    )
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate(task.id, {
      onSuccess: () => toast.success('Task deleted'),
    })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
        isDone ? 'opacity-50' : 'hover:bg-[#141311]',
      )}
    >
      {/* Priority dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-[#F0EDE8]', isDone && 'line-through text-[#8A8580]')}>
          {task.title}
        </p>
        {!compact && task.description && (
          <p className="text-xs text-[#8A8580] mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      {/* Due badge */}
      {dueBadge && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
          style={{ color: dueBadge.color, backgroundColor: `${dueBadge.color}15` }}
        >
          {dueBadge.label}
        </span>
      )}

      {/* Quick actions */}
      {!isDone && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleComplete}
            className="w-6 h-6 rounded flex items-center justify-center text-[#4ADE80] hover:bg-[#4ADE80]/10 transition-colors cursor-pointer"
            title="Complete"
          >
            <Check size={13} />
          </button>
          <button
            onClick={handleSnooze}
            className="w-6 h-6 rounded flex items-center justify-center text-[#8A8580] hover:bg-[#8A8580]/10 transition-colors cursor-pointer"
            title="Snooze to tomorrow"
          >
            <Clock size={13} />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-6 h-6 rounded flex items-center justify-center text-[#8A8580] hover:bg-[#8A8580]/10 transition-colors cursor-pointer">
                <MoreHorizontal size={13} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={4} className="w-32 p-1 bg-[#141311] border border-[#1E1D1B] shadow-lg rounded-xl">
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-[#F87171] hover:bg-[#F87171]/10 transition-colors cursor-pointer"
              >
                <Trash2 size={13} /> Delete
              </button>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </motion.div>
  )
}
