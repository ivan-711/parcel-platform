import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, GitBranch, FileText, MessageSquare, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useDashboard } from '@/hooks/useDashboard'

interface HintCard {
  icon: React.ElementType
  title: string
  description: string
}

const HINT_CARDS: HintCard[] = [
  {
    icon: GitBranch,
    title: 'Pipeline',
    description: 'Track deals from lead to close',
  },
  {
    icon: FileText,
    title: 'Documents',
    description: 'Upload contracts and leases',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Ask anything about a deal',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

function riskColor(score: number | null): string {
  if (score === null) return 'text-text-muted'
  if (score <= 30) return 'text-accent-success'
  if (score <= 60) return 'text-yellow-400'
  return 'text-accent-danger'
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  analyzing: 'Analyzing',
  offer_sent: 'Offer Sent',
  under_contract: 'Under Contract',
  due_diligence: 'Due Diligence',
  closed: 'Closed',
}

/** Dashboard — shows KPI overview when user has deals, empty state otherwise. */
export default function Dashboard() {
  const navigate = useNavigate()
  const { data: stats, isLoading, isError, error } = useDashboard()

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </AppShell>
    )
  }

  /* ── Error state ── */
  if (isError) {
    return (
      <AppShell title="Dashboard">
        <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 p-6 flex items-start gap-3 max-w-lg">
          <AlertCircle size={20} className="text-accent-danger shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">Failed to load dashboard</p>
            <p className="text-xs text-text-secondary">
              {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  /* ── Empty state (no deals yet) ── */
  if (!stats || stats.total_deals === 0) {
    return (
      <AppShell title="Dashboard">
        <motion.div
          className="max-w-2xl space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={itemVariants}
            className="text-3xl font-semibold text-text-primary"
          >
            Let&apos;s analyze your first deal.
          </motion.h1>

          <motion.div variants={itemVariants}>
            <motion.button
              onClick={() => navigate('/analyze')}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="w-full text-left p-6 rounded-xl border border-accent-primary/30 bg-accent-primary/10 hover:border-accent-primary/60 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-text-primary">
                    Analyze Your First Deal
                  </p>
                  <p className="text-sm text-text-secondary">
                    Run numbers on any strategy — wholesale, BRRRR, flip, or buy &amp; hold.
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  className="text-accent-primary shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform"
                />
              </div>
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            {HINT_CARDS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-4 rounded-xl border border-border-subtle bg-app-surface space-y-2 cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-app-elevated flex items-center justify-center">
                  <Icon size={16} className="text-text-secondary" />
                </div>
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="text-xs text-text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </AppShell>
    )
  }

  /* ── Populated state ── */
  const closedDeals = stats.pipeline_by_stage?.closed ?? 0

  const pipelineEntries = Object.entries(stats.pipeline_by_stage ?? {}).filter(
    ([, count]) => count > 0
  )

  return (
    <AppShell title="Dashboard">
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* KPI Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Deals" value={stats.total_deals} format="number" />
          <KPICard label="Active Pipeline" value={stats.active_pipeline_deals} format="number" />
          <KPICard label="Closed Deals" value={closedDeals} format="number" />
          <KPICard label="Deals Analyzed" value={stats.total_deals} format="number" />
        </motion.div>

        {/* Recent Deals */}
        {stats.recent_deals.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Recent Deals</h2>
              <Link
                to="/deals"
                className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="rounded-xl border border-border-subtle bg-app-surface overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Address</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Strategy</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Risk</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_deals.map((deal) => (
                    <tr key={deal.id} className="border-b border-border-subtle last:border-0 hover:bg-app-elevated/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary">{deal.address}</td>
                      <td className="px-4 py-3">
                        <StrategyBadge strategy={deal.strategy} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono font-medium ${riskColor(deal.risk_score)}`}>
                          {deal.risk_score !== null ? deal.risk_score : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-app-elevated text-text-secondary">
                          {statusLabel(deal.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/analyze/results/${deal.id}`}
                          className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Pipeline Summary */}
        {pipelineEntries.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Pipeline Summary</h2>
            <div className="rounded-xl border border-border-subtle bg-app-surface p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {pipelineEntries.map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between p-3 rounded-lg bg-app-elevated">
                    <span className="text-sm text-text-secondary">
                      {STAGE_LABELS[stage] ?? statusLabel(stage)}
                    </span>
                    <span className="text-lg font-mono font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  )
}
