import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  DollarSign,
  Shield,
  Calendar,
  TrendingUp,
  Check,
  Clock,
  MoreHorizontal,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { duration, ease, prefersReducedMotion } from '@/lib/motion'
import { useObligations, useCompleteObligation, useUpdateObligation } from '@/hooks/useFinancing'
import type { Obligation, CompleteObligationRequest } from '@/types/financing'

type TimeFilter = '7' | '30' | '90' | 'all'

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'Next 7 Days', value: '7' },
  { label: 'Next 30 Days', value: '30' },
  { label: 'Next 90 Days', value: '90' },
  { label: 'All', value: 'all' },
]

const OBLIGATION_ICONS: Record<string, React.ElementType> = {
  monthly_payment: DollarSign,
  balloon_payment: AlertTriangle,
  insurance_renewal: Shield,
  option_expiration: Calendar,
  rate_adjustment: TrendingUp,
  manual: Calendar,
}

const SEVERITY_COLORS: Record<string, { border: string; header: string; text: string }> = {
  overdue: { border: 'border-l-loss', header: 'bg-loss-bg text-loss', text: 'text-loss' },
  critical: { border: 'border-l-warning', header: 'bg-warning-bg text-warning', text: 'text-warning' },
  high: { border: 'border-l-warning', header: 'bg-warning-bg text-warning', text: 'text-warning' },
  normal: { border: 'border-l-gray-9', header: 'bg-border-default text-text-secondary', text: 'text-text-secondary' },
}

function getDateFilter(filter: TimeFilter): string | undefined {
  if (filter === 'all') return undefined
  const d = new Date()
  d.setDate(d.getDate() + Number(filter))
  return d.toISOString().split('T')[0]
}

export default function ObligationsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30')
  const dueBefore = getDateFilter(timeFilter)

  const { data, isLoading } = useObligations({
    status: 'active',
    due_before: dueBefore,
    per_page: 200,
  })

  const obligations = data?.items ?? []

  // Group obligations
  const groups = useMemo(() => {
    const overdue: Obligation[] = []
    const critical: Obligation[] = []
    const high: Obligation[] = []
    const normal: Obligation[] = []

    for (const ob of obligations) {
      if (ob.is_overdue) {
        overdue.push(ob)
      } else if (ob.severity === 'critical') {
        critical.push(ob)
      } else if (ob.severity === 'high') {
        high.push(ob)
      } else {
        normal.push(ob)
      }
    }

    return { overdue, critical, high, normal }
  }, [obligations])

  const totalActive = obligations.length
  const overdueCount = groups.overdue.length
  const dueThisWeek = obligations.filter((o) => {
    if (!o.days_until_due || o.is_overdue) return false
    return o.days_until_due <= 7
  }).length

  // PostHog
  try {
    (window as any).posthog?.capture?.('obligations_page_viewed', {
      total_active: totalActive,
      overdue_count: overdueCount,
    })
  } catch { /* ignore */ }

  if (isLoading) {
    return (
      <AppShell title="Obligations">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-app-recessed rounded-xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Obligations">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-xl sm:text-2xl text-text-primary mb-4 font-brand font-light"
          >
            Obligations
          </h1>

          {/* KPI row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <KpiChip label="Active" value={totalActive} />
            <KpiChip label="Due This Week" value={dueThisWeek} />
            <KpiChip label="Overdue" value={overdueCount} variant={overdueCount > 0 ? 'danger' : 'default'} />
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-1 p-1 bg-app-recessed rounded-lg border border-border-default w-fit">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTimeFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                  timeFilter === f.value
                    ? 'bg-violet-400/15 text-violet-400'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {obligations.length === 0 && (
          <EmptyState
            icon={CheckCircle}
            heading="All clear — no upcoming obligations"
            description="Add financing instruments to your properties to start tracking obligations."
          />
        )}

        {/* Obligation groups */}
        {groups.overdue.length > 0 && (
          <ObligationGroup label="OVERDUE" severity="overdue" obligations={groups.overdue} />
        )}
        {groups.critical.length > 0 && (
          <ObligationGroup label="CRITICAL" severity="critical" obligations={groups.critical} />
        )}
        {groups.high.length > 0 && (
          <ObligationGroup label="HIGH" severity="high" obligations={groups.high} />
        )}
        {groups.normal.length > 0 && (
          <ObligationGroup label="NORMAL" severity="normal" obligations={groups.normal} />
        )}
      </div>
    </AppShell>
  )
}

/* ─── KPI Chip ─── */

function KpiChip({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'danger' }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-app-recessed border border-border-default rounded-lg">
      <span
        className={cn(
          'text-base font-medium tabular-nums',
          variant === 'danger' && value > 0 ? 'text-loss' : 'text-text-primary'
        )}
      >
        {value}
      </span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  )
}

/* ─── Obligation Group ─── */

function ObligationGroup({
  label,
  severity,
  obligations,
}: {
  label: string
  severity: string
  obligations: Obligation[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider mb-2 cursor-pointer',
          colors.header
        )}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        {label}
        <span className="ml-auto opacity-70">{obligations.length}</span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: duration.normal, ease: ease.luxury as any }}
            className="space-y-2 overflow-hidden"
          >
            {obligations.map((ob) => (
              <ObligationCard key={ob.id} obligation={ob} severity={severity} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Obligation Card ─── */

function ObligationCard({ obligation, severity }: { obligation: Obligation; severity: string }) {
  const navigate = useNavigate()
  const [showComplete, setShowComplete] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const completeMutation = useCompleteObligation()
  const updateMutation = useUpdateObligation()

  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal
  const Icon = OBLIGATION_ICONS[obligation.obligation_type] || Calendar

  const daysText = obligation.is_overdue
    ? `${Math.abs(obligation.days_until_due ?? 0)} days overdue`
    : obligation.days_until_due != null
      ? `in ${obligation.days_until_due} days`
      : ''

  const isBalloon = obligation.obligation_type === 'balloon_payment'

  return (
    <motion.div
      layout={!prefersReducedMotion}
      exit={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: duration.fast }}
      className={cn(
        'bg-app-recessed border border-border-default rounded-xl p-4',
        colors.border
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center shrink-0">
          <Icon size={14} className={colors.text} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-text-primary font-medium">{obligation.title}</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {obligation.instrument_name}
                {obligation.property_address && ` · ${obligation.property_address}`}
              </p>
            </div>

            <div className="text-right shrink-0">
              {obligation.amount != null && (
                <p className="text-base text-text-primary font-medium tabular-nums">
                  ${Number(obligation.amount).toLocaleString()}
                </p>
              )}
              {isBalloon && obligation.days_until_due != null && !obligation.is_overdue && (
                <p className={cn('text-2xl font-bold tabular-nums mt-1', colors.text)}>
                  {obligation.days_until_due} <span className="text-xs font-normal">DAYS</span>
                </p>
              )}
            </div>
          </div>

          {/* Due date line */}
          <div className="flex items-center gap-3 mt-2">
            {obligation.next_due && (
              <span className="text-xs text-text-muted">
                Due {new Date(obligation.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {daysText && (
              <span className={cn('text-xs font-medium', obligation.is_overdue ? 'text-loss' : colors.text)}>
                {daysText}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => { setShowComplete(!showComplete); setShowSnooze(false) }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-profit-bg text-profit hover:bg-profit/20 transition-colors cursor-pointer"
            >
              <Check size={12} /> Complete
            </button>
            <button
              onClick={() => { setShowSnooze(!showSnooze); setShowComplete(false) }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-border-default text-text-secondary hover:bg-border-strong transition-colors cursor-pointer"
            >
              <Clock size={12} /> Snooze
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More actions"
                className="p-1.5 rounded-md text-text-muted hover:bg-border-default transition-colors cursor-pointer"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-10 w-44 bg-app-recessed border border-border-default rounded-lg shadow-xl py-1">
                  <button
                    onClick={() => { navigate(`/properties/${obligation.property_id}?tab=financing`); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-border-default cursor-pointer"
                  >
                    View Property
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-border-default cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Complete inline form */}
      <AnimatePresence>
        {showComplete && (
          <CompleteForm
            obligation={obligation}
            onComplete={(data) => {
              completeMutation.mutate(
                { id: obligation.id, data },
                {
                  onSuccess: () => {
                    setShowComplete(false)
                    try {
                      (window as any).posthog?.capture?.('obligation_completed_ui', {
                        obligation_type: obligation.obligation_type,
                        was_overdue: obligation.is_overdue,
                        had_payment: !!data.payment_amount,
                      })
                    } catch { /* ignore */ }
                  },
                }
              )
            }}
            isPending={completeMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Snooze form */}
      <AnimatePresence>
        {showSnooze && (
          <SnoozeForm
            onSnooze={(newDate) => {
              const daysFromNow = Math.round((new Date(newDate).getTime() - Date.now()) / 86_400_000)
              updateMutation.mutate(
                { id: obligation.id, data: { status: 'snoozed', next_due: newDate } },
                {
                  onSuccess: () => {
                    setShowSnooze(false)
                    try {
                      (window as any).posthog?.capture?.('obligation_snoozed', {
                        obligation_type: obligation.obligation_type,
                        snooze_days: daysFromNow,
                      })
                    } catch { /* ignore */ }
                  },
                }
              )
            }}
            isPending={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Click outside to close menu */}
      {showMenu && <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />}
    </motion.div>
  )
}

/* ─── Complete Form ─── */

function CompleteForm({
  obligation,
  onComplete,
  isPending,
}: {
  obligation: Obligation
  onComplete: (data: CompleteObligationRequest) => void
  isPending: boolean
}) {
  const [amount, setAmount] = useState(obligation.amount != null ? String(obligation.amount) : '')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('bank_transfer')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 pt-3 border-t border-border-default overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="check">Check</option>
            <option value="cash">Cash</option>
            <option value="auto_pay">Auto-Pay</option>
          </select>
        </div>
      </div>
      <button
        onClick={() => onComplete({
          payment_amount: amount ? Number(amount) : undefined,
          payment_date: paymentDate,
          payment_method: method,
        })}
        disabled={isPending}
        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-profit text-app-bg font-medium hover:bg-profit-strong transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Check size={14} />
        {isPending ? 'Recording...' : 'Record Payment'}
      </button>
    </motion.div>
  )
}

/* ─── Snooze Form ─── */

function SnoozeForm({
  onSnooze,
  isPending,
}: {
  onSnooze: (date: string) => void
  isPending: boolean
}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 7)
  const [snoozeDate, setSnoozeDate] = useState(tomorrow.toISOString().split('T')[0])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 pt-3 border-t border-border-default overflow-hidden"
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted mb-1 block">Snooze until</label>
          <input
            type="date"
            value={snoozeDate}
            onChange={(e) => setSnoozeDate(e.target.value)}
            className="w-full px-3 py-2 bg-app-bg border border-border-default rounded-lg text-sm text-text-primary focus:border-violet-400 outline-none"
          />
        </div>
        <button
          onClick={() => onSnooze(snoozeDate)}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-lg bg-border-default text-text-secondary hover:bg-border-strong transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? 'Snoozing...' : 'Snooze'}
        </button>
      </div>
    </motion.div>
  )
}
