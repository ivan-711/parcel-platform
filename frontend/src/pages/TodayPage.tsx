import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search,
  UserPlus,
  Activity,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { MetricLabel } from '@/components/ui/MetricLabel'
import { BriefingCards } from '@/components/today/BriefingCards'
import { PipelineSummaryBar } from '@/components/today/PipelineSummary'
import { TodayCashFlowChart } from '@/components/today/TodayCashFlowChart'
import { TaskList } from '@/components/tasks/TaskList'
import { AddTaskForm } from '@/components/tasks/AddTaskForm'
import { useToday } from '@/hooks/useToday'
import { useTasksToday } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'
import type { TodayActivityItem } from '@/types'

const ACTIVITY_DOTS: Record<string, string> = {
  property_saved: '#8B7AFF',
  analysis_completed: '#8B7AFF',
  deal_created: '#7B9FCC',
  deal_moved: '#7B9FCC',
  document_uploaded: 'var(--text-secondary)',
  contact_added: '#7CCBA5',
  pipeline_moved: '#D4A867',
}

export default function TodayPage() {
  const { data, isLoading, isError, refetch } = useToday()
  const { data: tasksToday } = useTasksToday()
  const navigate = useNavigate()

  useEffect(() => {
    if (!data) return
    try {
      (window as any).posthog?.capture?.('today_viewed', {
        state: data.has_real_data ? 'returning_user' : 'new_user',
        briefing_count: data.briefing_items.length,
        has_real_data: data.has_real_data,
      })
    } catch { /* ignore */ }
  }, [data?.has_real_data])

  if (isLoading) {
    return (
      <AppShell title="Today">
        <div className="space-y-6">
          <div className="h-10 w-64 bg-app-recessed rounded animate-pulse" />
          <div className="h-24 bg-app-recessed rounded-xl animate-pulse" />
          <div className="h-48 bg-app-recessed rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  if (isError || !data) {
    return (
      <AppShell title="Today">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
          <div className="max-w-sm">
            <p className="text-text-secondary text-sm mb-4">
              Unable to load your briefing. Please try again.
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // New user state
  if (!data.has_real_data) {
    return (
      <AppShell title="Today">
        <NewUserView
          hasSampleData={data.has_sample_data}
        />
      </AppShell>
    )
  }

  // Returning user state
  return (
    <AppShell title="Today">
      <div className="space-y-6">
        {/* Greeting + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1
              className="text-2xl sm:text-3xl text-text-primary font-brand font-light"
            >
              {data.greeting}
            </h1>
            <p className="text-sm text-text-muted mt-1">{data.date}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <QuickAction
              label="Log Activity"
              icon={Activity}
              onClick={() => {
                navigate('/contacts')
                trackQuickAction('log_activity')
              }}
            />
            <QuickAction
              label="Add Contact"
              icon={UserPlus}
              onClick={() => {
                navigate('/contacts')
                trackQuickAction('add_contact')
              }}
            />
            <Link
              to="/analyze"
              onClick={() => trackQuickAction('analyze')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors"
            >
              <Search size={14} />
              Analyze Property
            </Link>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — wider */}
          <div className="lg:col-span-3 space-y-6">
            {/* Briefing */}
            <div>
              <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-3">
                Morning Briefing
              </h2>
              <BriefingCards items={data.briefing_items} />
            </div>

            {/* Tasks */}
            <TasksSection tasksToday={tasksToday} />

            {/* Pipeline */}
            <PipelineSummaryBar pipeline={data.pipeline_summary} />

            {/* Cash Flow */}
            <TodayCashFlowChart portfolio={data.portfolio_summary} />
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Summary */}
            <PortfolioCard portfolio={data.portfolio_summary} />

            {/* Recent Activity */}
            <div className="bg-app-recessed border border-border-default rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                  Recent Activity
                </h3>
                <Link
                  to="/dashboard"
                  className="text-[10px] uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
                >
                  View All Activity
                </Link>
              </div>

              {data.recent_activity.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  Your activity will appear here as you use Parcel.
                </p>
              ) : (
                <div className="space-y-0">
                  {data.recent_activity.slice(0, 8).map((event, i) => (
                    <ActivityRow key={`${event.type}-${i}`} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

/* ─── New User View ─── */

function NewUserView({
  hasSampleData,
}: {
  hasSampleData: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg"
      >
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles size={24} className="text-accent-primary" />
        </div>

        <h1
          className="text-3xl sm:text-4xl text-text-primary font-brand font-light mb-3"
        >
          Welcome to Parcel
        </h1>

        <p className="text-text-secondary text-sm sm:text-base mb-8">
          Analyze your first property to start building your daily briefing.
        </p>

        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors"
        >
          <Search size={16} />
          Analyze a Property
        </Link>

        {hasSampleData && (
          <p className="text-xs text-text-muted mt-6">
            Explore your sample deals in{' '}
            <Link to="/pipeline" className="text-accent-primary hover:text-accent-secondary transition-colors">
              Pipeline
            </Link>{' '}
            to see what Parcel can do.
          </p>
        )}

        {/* Placeholder briefing card */}
        <div className="mt-10 border border-dashed border-border-default rounded-xl p-5 text-center">
          <p className="text-sm text-text-muted">
            Your morning briefing will appear here as you add properties and track deals.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Portfolio Card ─── */

function PortfolioCard({
  portfolio,
}: {
  portfolio: { total_value: number; total_cash_flow: number; property_count: number; change_pct: number }
}) {
  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
        Total Portfolio Value
      </p>
      <div className="flex items-baseline gap-3">
        <span
          className="text-2xl text-text-primary font-brand font-light tabular-nums"
        >
          ${portfolio.total_value.toLocaleString()}
        </span>
        {portfolio.change_pct !== 0 && (
          <span className={cn(
            'text-xs font-medium flex items-center gap-0.5',
            portfolio.change_pct > 0 ? 'text-profit' : 'text-loss'
          )}>
            <TrendingUp size={12} />
            {portfolio.change_pct > 0 ? '+' : ''}{portfolio.change_pct.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-app-bg rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1"><MetricLabel metric="monthly_cash_flow">Monthly Cash Flow</MetricLabel></p>
          <p className="text-sm text-text-primary font-medium tabular-nums">
            ${portfolio.total_cash_flow.toLocaleString()}/mo
          </p>
        </div>
        <div className="bg-app-bg rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Properties</p>
          <p className="text-sm text-text-primary font-medium tabular-nums">
            {portfolio.property_count}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Activity Row ─── */

function ActivityRow({ event }: { event: TodayActivityItem }) {
  const dotColor = ACTIVITY_DOTS[event.type] || '#7A7872'

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-default last:border-0">
      <div
        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary truncate">{event.description}</p>
        <p className="text-[10px] text-text-muted/60 mt-0.5">
          {formatRelativeTime(event.timestamp)}
        </p>
      </div>
    </div>
  )
}

/* ─── Tasks Section ─── */

function TasksSection({
  tasksToday,
}: {
  tasksToday: import('@/types').TasksTodayResponse | undefined
}) {
  const allTasks = [
    ...(tasksToday?.overdue ?? []),
    ...(tasksToday?.due_today ?? []),
    ...(tasksToday?.urgent ?? []),
  ]

  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
          Tasks {allTasks.length > 0 && <span className="text-text-secondary ml-1">{allTasks.length}</span>}
        </h3>
        <AddTaskForm />
      </div>

      {allTasks.length === 0 ? (
        <p className="text-sm text-text-muted py-3 text-center">
          No tasks yet. Add tasks to track your to-dos.
        </p>
      ) : (
        <TaskList tasks={allTasks} grouped compact />
      )}
    </div>
  )
}

/* ─── Quick Action Button ─── */

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ElementType
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary border border-border-default hover:bg-app-recessed hover:text-text-primary transition-colors cursor-pointer"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

/* ─── Helpers ─── */

function trackQuickAction(action: string) {
  try {
    (window as any).posthog?.capture?.('quick_action_clicked', { action })
  } catch { /* ignore */ }
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
