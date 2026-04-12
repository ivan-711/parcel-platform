import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTask } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'var(--text-muted)' },
  { value: 'normal', label: 'Normal', color: 'var(--accent-primary)' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'urgent', label: 'Urgent', color: 'var(--color-loss)' },
]

interface Props {
  propertyId?: string
  dealId?: string
  contactId?: string
  onCreated?: () => void
}

export function AddTaskForm({ propertyId, dealId, contactId, onCreated }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const createMutation = useCreateTask()

  const handleSubmit = () => {
    if (!title.trim()) return

    createMutation.mutate(
      {
        title: title.trim(),
        ...(description && { description: description.trim() }),
        priority,
        ...(dueDate && { due_date: new Date(dueDate).toISOString() }),
        ...(propertyId && { property_id: propertyId }),
        ...(dealId && { deal_id: dealId }),
        ...(contactId && { contact_id: contactId }),
      },
      {
        onSuccess: () => {
          toast.success('Task created')
          setTitle('')
          setDescription('')
          setPriority('normal')
          setDueDate('')
          setExpanded(false)
          onCreated?.()
          try {
            (window as any).posthog?.capture?.('task_created', {
              priority,
              has_due_date: !!dueDate,
              linked_entity_type: propertyId ? 'property' : dealId ? 'deal' : contactId ? 'contact' : null,
            })
          } catch { /* ignore */ }
        },
        onError: () => toast.error('Failed to create task'),
      }
    )
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
      >
        <Plus size={12} />
        Add Task
      </button>
    )
  }

  return (
    <div className="bg-app-bg border border-border-default rounded-xl p-4 space-y-3">
      {/* Title */}
      <div>
        <label htmlFor="task-title" className="sr-only">Task title</label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title..."
          autoFocus
          aria-required="true"
          className="w-full h-9 px-3 rounded-lg bg-app-recessed border border-border-default text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSubmit() }}
        />
      </div>

      {/* Priority pills */}
      <div className="flex items-center gap-1.5">
        {PRIORITIES.map(p => (
          <button
            key={p.value}
            onClick={() => setPriority(p.value)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
              priority === p.value
                ? 'bg-app-recessed text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Due date */}
      <div>
        <label htmlFor="task-due-date" className="sr-only">Due date</label>
        <input
          id="task-due-date"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="h-9 px-3 rounded-lg bg-app-recessed border border-border-default text-sm text-text-secondary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="task-description" className="sr-only">Description</label>
        <textarea
          id="task-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-app-recessed border border-border-default text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || createMutation.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {createMutation.isPending ? 'Adding...' : 'Add Task'}
        </button>
        <button
          onClick={() => { setExpanded(false); setTitle(''); setDescription('') }}
          className="px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
