import { AnimatePresence } from 'framer-motion'
import { TaskCard } from './TaskCard'
import type { TaskItem } from '@/types'

interface Props {
  tasks: TaskItem[]
  compact?: boolean
  grouped?: boolean
}

export function TaskList({ tasks, compact, grouped }: Props) {
  if (tasks.length === 0) return null

  if (!grouped) {
    return (
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} compact={compact} />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  // Group by due status
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(today.getTime() + 86400000)

  const overdue: TaskItem[] = []
  const dueToday: TaskItem[] = []
  const upcoming: TaskItem[] = []
  const noDue: TaskItem[] = []

  for (const t of tasks) {
    if (t.status === 'done') continue
    if (!t.due_date) {
      noDue.push(t)
      continue
    }
    const due = new Date(t.due_date)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    if (dueDay < today) overdue.push(t)
    else if (dueDay < todayEnd) dueToday.push(t)
    else upcoming.push(t)
  }

  const groups: { label: string; items: TaskItem[] }[] = []
  if (overdue.length > 0) groups.push({ label: 'Overdue', items: overdue })
  if (dueToday.length > 0) groups.push({ label: 'Due Today', items: dueToday })
  if (upcoming.length > 0) groups.push({ label: 'Upcoming', items: upcoming })
  if (noDue.length > 0) groups.push({ label: 'No Due Date', items: noDue })

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.label}>
          <p className="text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-3 mb-1">
            {group.label}
          </p>
          <AnimatePresence mode="popLayout">
            {group.items.map(t => (
              <TaskCard key={t.id} task={t} compact={compact} />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
