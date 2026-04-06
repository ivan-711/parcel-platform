import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTask } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#8A8580' },
  { value: 'normal', label: 'Normal', color: '#8B7AFF' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'urgent', label: 'Urgent', color: '#F87171' },
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
        className="inline-flex items-center gap-1.5 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
      >
        <Plus size={12} />
        Add Task
      </button>
    )
  }

  return (
    <div className="bg-[#0C0B0A] border border-[#1E1D1B] rounded-xl p-4 space-y-3">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title..."
        autoFocus
        className="w-full h-9 px-3 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSubmit() }}
      />

      {/* Priority pills */}
      <div className="flex items-center gap-1.5">
        {PRIORITIES.map(p => (
          <button
            key={p.value}
            onClick={() => setPriority(p.value)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
              priority === p.value
                ? 'bg-[#141311] text-[#F0EDE8] border border-[#1E1D1B]'
                : 'text-[#8A8580] hover:text-[#C5C0B8]'
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Due date */}
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        className="h-9 px-3 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#C5C0B8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)..."
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all resize-none"
      />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || createMutation.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-40 cursor-pointer"
        >
          {createMutation.isPending ? 'Adding...' : 'Add Task'}
        </button>
        <button
          onClick={() => { setExpanded(false); setTitle(''); setDescription('') }}
          className="px-3 py-2 rounded-lg text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
