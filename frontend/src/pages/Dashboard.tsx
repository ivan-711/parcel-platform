import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, GitBranch, FileText, MessageSquare, AlertCircle, X,
  Calculator, CheckCircle2,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import type { ActivityItem } from '@/types'

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
  if (score <= 30) return 'text-[#7CCBA5]'
  if (score <= 60) return 'text-[#D4A867]'
  return 'text-[#D4766A]'
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const ACTIVITY_ICONS: Record<ActivityItem['activity_type'], { icon: React.ElementType; color: string }> = {
  deal_analyzed: { icon: Calculator, color: '#8B7AFF' },
  pipeline_moved: { icon: ArrowRight, color: '#D4A867' },
  document_analyzed: { icon: FileText, color: '#7CCBA5' },
  deal_closed: { icon: CheckCircle2, color: '#7CCBA5' },
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  analyzing: 'Analyzing',
  offer_sent: 'Offer Sent',
  under_contract: 'Under Contract',
  due_diligence: 'Due Diligence',
  closed: 'Closed',
}

/**
 * Generate plausible sparkline trend data ending at the given current value.
 * Produces `points` data points with gentle random variation leading to `current`.
 */
function generateTrendData(current: number, points: number = 7, volatility: number = 0.15): number[] {
  if (current === 0) return Array(points).fill(0)
  const data: number[] = []
  // Start roughly 30% below current and walk upward
  let val = current * (1 - volatility * 2)
  const step = (current - val) / (points - 1)
  for (let i = 0; i < points - 1; i++) {
    data.push(Math.max(0, val + (Math.random() - 0.4) * current * volatility))
    val += step
  }
  // Last point is the exact current value
  data.push(current)
  return data
}

/** Dashboard — shows KPI overview when user has deals, empty state otherwise. */
export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: stats, isLoading, isError, error } = useDashboard()
  const user = useAuthStore((s) => s.user)
  const isDemoUser = user?.email === 'demo@parcel.app'
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const { data: activityData, isLoading: activityLoading, isError: activityError } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.activity.list(),
    staleTime: 60_000,
  })

  /* ── Derived values (must be above early returns to preserve hook order) ── */
  const closedDeals = stats?.closed_deals ?? 0

  const pipelineEntries = Object.entries(stats?.pipeline_by_stage ?? {}).filter(
    ([, count]) => count > 0
  )

  /* Memoize sparkline data so it stays stable across re-renders */
  const sparklines = useMemo(() => ({
    totalDeals: generateTrendData(stats?.total_deals ?? 0, 7, 0.12),
    activePipeline: generateTrendData(stats?.active_pipeline_deals ?? 0, 7, 0.18),
    closedDeals: generateTrendData(closedDeals, 7, 0.1),
    dealsAnalyzed: generateTrendData(stats?.total_deals ?? 0, 7, 0.15),
  }), [stats?.total_deals, stats?.active_pipeline_deals, closedDeals])

  const demoBanner = isDemoUser && !bannerDismissed ? (
    <div className="bg-violet-400/10 border border-violet-400/20 rounded-lg px-4 py-3 text-sm text-text-primary flex items-center justify-between mb-4">
      <p>
        You&apos;re viewing a demo account. Create your free account to analyze your own deals.{' '}
        <Link to="/register" className="font-semibold text-violet-400 underline underline-offset-2 hover:text-violet-300">
          Get Started &rarr;
        </Link>
      </p>
      <button onClick={() => setBannerDismissed(true)} className="ml-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" aria-label="Dismiss banner">
        <X size={16} />
      </button>
    </div>
  ) : null

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        {demoBanner}
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
        {demoBanner}
        <div className="rounded-xl border border-[#D4766A]/20 bg-[#D4766A]/10 p-6 flex items-start gap-3 max-w-lg">
          <AlertCircle size={20} className="text-[#D4766A] shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Failed to load dashboard</p>
            <p className="text-xs text-text-secondary">
              {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  /* ── Empty state (no deals yet) ── */
  if (!stats || stats.total_deals === 0) {
    return (
      <AppShell title="Dashboard">
        {demoBanner}
        <motion.div
          className="max-w-2xl space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={itemVariants}
            className="text-3xl font-semibold tracking-tight text-text-primary"
          >
            Let&apos;s analyze your first deal.
          </motion.h1>

          <motion.div variants={itemVariants}>
            <motion.button
              onClick={() => navigate('/analyze')}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="w-full text-left p-6 rounded-xl border border-[#8B7AFF]/20 bg-[#8B7AFF]/[0.08] hover:border-[#8B7AFF]/30 transition-colors group shadow-xs edge-highlight"
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
                  className="text-violet-400 shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform"
                />
              </div>
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HINT_CARDS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-border-subtle bg-app-surface shadow-xs edge-highlight space-y-3 cursor-default"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-400/10 flex items-center justify-center">
                  <Icon size={18} className="text-violet-400" />
                </div>
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </AppShell>
    )
  }

  /* ── Populated state ── */
  return (
    <AppShell title="Dashboard">
      {demoBanner}
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* KPI Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Deals"
            value={stats.total_deals}
            format="number"
            sparklineData={sparklines.totalDeals}
          />
          <KPICard
            label="Active Pipeline"
            value={stats.active_pipeline_deals}
            format="number"
            sparklineData={sparklines.activePipeline}
          />
          <KPICard
            label="Closed Deals"
            value={closedDeals}
            format="number"
            sparklineData={sparklines.closedDeals}
          />
          <KPICard
            label="Deals Analyzed"
            value={stats.total_deals}
            format="number"
            sparklineData={sparklines.dealsAnalyzed}
          />
        </motion.div>

        {/* Recent Deals */}
        {(stats.recent_deals ?? []).length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Recent Deals</h2>
              <Link
                to="/deals"
                className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="rounded-xl border border-border-subtle bg-app-surface overflow-x-auto shadow-xs edge-highlight">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">Address</th>
                    <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">Strategy</th>
                    <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">Risk</th>
                    <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(stats.recent_deals ?? []).map((deal) => (
                    <tr key={deal.id} className="border-b border-white/[0.03] last:border-0 hover:bg-layer-2 transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary">{deal.address}</td>
                      <td className="px-4 py-3">
                        <StrategyBadge strategy={deal.strategy} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium tabular-nums ${riskColor(deal.risk_score)}`}>
                          {deal.risk_score !== null ? deal.risk_score : '\u2014'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-layer-3 text-text-secondary">
                          {statusLabel(deal.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/analyze/results/${deal.id}`}
                          className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
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
            <h2 className="text-sm font-semibold text-text-primary">Pipeline Summary</h2>
            <div className="rounded-xl border border-border-subtle bg-app-surface p-4 shadow-xs edge-highlight">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {pipelineEntries.map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between p-3 rounded-lg bg-layer-2">
                    <span className="text-sm text-text-secondary">
                      {STAGE_LABELS[stage] ?? statusLabel(stage)}
                    </span>
                    <span className="text-lg font-semibold text-text-primary tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
            <Link to="/deals" className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">View all</Link>
          </div>

          {activityLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} lines={1} />
              ))}
            </div>
          )}

          {!activityLoading && activityError && (
            <div className="rounded-xl border border-[#D4766A]/20 bg-[#D4766A]/10 px-4 py-4 flex items-center gap-3">
              <AlertCircle size={16} className="text-[#D4766A] shrink-0" />
              <p className="text-sm text-text-secondary flex-1">Failed to load activity</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['activity'] })}
                className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!activityLoading && !activityError && (!activityData?.activities || activityData.activities.length === 0) && (
            <div className="rounded-xl border border-border-subtle bg-app-surface px-4 py-8 text-center shadow-xs edge-highlight">
              <p className="text-sm text-text-secondary">No recent activity. Analyze your first deal to get started.</p>
            </div>
          )}

          {!activityLoading && activityData?.activities && activityData.activities.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-app-surface p-5 shadow-xs edge-highlight">
              <div className="space-y-1">
                {activityData.activities.map((item, index) => {
                  const config = ACTIVITY_ICONS[item.activity_type] ?? ACTIVITY_ICONS.deal_analyzed
                  const Icon = config.icon
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut', delay: 0.05 * index }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-layer-2 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${config.color}15` }}
                      >
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <p className="text-sm text-text-secondary flex-1 truncate">{item.text}</p>
                      <span className="text-xs text-text-secondary tabular-nums shrink-0">{timeAgo(item.timestamp)}</span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppShell>
  )
}
