import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import {
  ArrowRight, GitBranch, FileText, AlertCircle, X,
  Calculator, CheckCircle2, MapPin, Search,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDashboard } from '@/hooks/useDashboard'
import { usePortfolioOverview } from '@/hooks/usePortfolio'
import { useAuthStore } from '@/stores/authStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/utils'

const containerVariants = prefersReducedMotion
  ? { hidden: {}, visible: {} }
  : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }

const itemVariants = prefersReducedMotion
  ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } } }

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  property_saved: { icon: MapPin, color: '#8B7AFF' },
  analysis_completed: { icon: Calculator, color: '#8B7AFF' },
  deal_created: { icon: GitBranch, color: '#D4A867' },
  document_uploaded: { icon: FileText, color: '#7CCBA5' },
  deal_analyzed: { icon: Calculator, color: '#8B7AFF' },
  pipeline_moved: { icon: ArrowRight, color: '#D4A867' },
  document_analyzed: { icon: FileText, color: '#7CCBA5' },
  deal_closed: { icon: CheckCircle2, color: '#7CCBA5' },
}

/**
 * Generate a flat sparkline at the current value.
 * We do NOT fabricate trends — that would be misleading in underwriting software.
 * Real historical data comes in Wave 2 when time-series tracking ships.
 */
function generateTrendData(current: number, points: number = 7): number[] {
  return Array(points).fill(current)
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', analyzing: 'Analyzing', offer_sent: 'Offer Sent',
  under_contract: 'Under Contract', due_diligence: 'Due Diligence', closed: 'Closed',
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function riskColor(score: number | null): string {
  if (score === null) return 'text-text-muted'
  if (score <= 30) return 'text-profit'
  if (score <= 60) return 'text-warning'
  return 'text-loss'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: stats, isLoading, isError, error } = useDashboard()
  const user = useAuthStore((s) => s.user)
  const isDemoUser = user?.email === 'demo@parcel.app'
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const { realPropertyCount, hasSampleData, fetchStatus, fetched: onboardingFetched } = useOnboardingStore()

  const { data: portfolioData } = usePortfolioOverview()

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.recentActivity.list(10),
    staleTime: 60_000,
  })

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Handle ?checkout=success redirect from Stripe
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Welcome! Your subscription is active.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  useEffect(() => {
    if (isAuthenticated && !onboardingFetched) fetchStatus()
  }, [isAuthenticated, onboardingFetched, fetchStatus])

  useEffect(() => {
    try {
      (window as any).posthog?.capture?.('dashboard_viewed', {
        state: realPropertyCount > 0 ? 'returning_user' : 'new_user',
        has_sample_data: hasSampleData,
        real_property_count: realPropertyCount,
      })
    } catch { /* ignore */ }
  }, [])

  const closedDeals = stats?.closed_deals ?? 0
  const pipelineEntries = Object.entries(stats?.pipeline_by_stage ?? {}).filter(([, count]) => count > 0)
  const sparklines = useMemo(() => ({
    totalDeals: generateTrendData(stats?.total_deals ?? 0),
    activePipeline: generateTrendData(stats?.active_pipeline_deals ?? 0),
    closedDeals: generateTrendData(closedDeals),
    dealsAnalyzed: generateTrendData(stats?.total_deals ?? 0),
  }), [stats?.total_deals, stats?.active_pipeline_deals, closedDeals])

  const firstName = user?.name?.split(' ')[0] || 'there'

  const demoBanner = isDemoUser && !bannerDismissed ? (
    <div className="bg-violet-400/10 border border-violet-400/20 rounded-lg px-4 py-3 text-sm text-text-primary flex items-center justify-between mb-4">
      <p>
        You&apos;re viewing a demo account.{' '}
        <Link to="/register" className="font-semibold text-violet-400 underline underline-offset-2 hover:text-violet-300">
          Create your free account &rarr;
        </Link>
      </p>
      <button onClick={() => setBannerDismissed(true)} className="ml-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  ) : null

  // Loading
  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        {demoBanner}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
          </div>
          <SkeletonCard lines={4} />
        </div>
      </AppShell>
    )
  }

  // Error
  if (isError) {
    return (
      <AppShell title="Dashboard">
        {demoBanner}
        <div className="rounded-xl border border-loss/20 bg-loss/10 p-6 flex items-start gap-3 max-w-lg">
          <AlertCircle size={20} className="text-loss shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Failed to load dashboard</p>
            <p className="text-xs text-text-secondary">{error instanceof Error ? error.message : 'Something went wrong.'}</p>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })} className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ─── STATE A: New User (no real data yet) ───
  const isNewUser = !stats || (stats.total_deals === 0 && realPropertyCount === 0)

  if (isNewUser) {
    return (
      <AppShell title="Dashboard">
        {demoBanner}
        <motion.div
          className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Welcome icon */}
          <motion.div variants={itemVariants} className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-6">
            <Search size={24} className="text-accent-primary/60" />
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-2xl sm:text-3xl text-text-primary font-brand font-light text-center mb-2"
          >
            Welcome to Parcel
          </motion.h1>

          <motion.p variants={itemVariants} className="text-sm text-text-secondary text-center mb-8 max-w-md">
            Analyze your first property to start building your briefing.
          </motion.p>

          <motion.div variants={itemVariants}>
            <button
              onClick={() => { navigate('/analyze'); try { (window as any).posthog?.capture?.('welcome_cta_clicked', { action: 'analyze' }) } catch {} }}
              className="px-6 py-3 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors"
            >
              Analyze a Property
            </button>
          </motion.div>

          {/* Sample data cards */}
          {hasSampleData && (
            <motion.div variants={itemVariants} className="mt-12 w-full max-w-2xl">
              <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-3 text-center">
                Sample Deal Preview
              </p>
              <div className="rounded-xl border border-dashed border-border-default bg-app-recessed/50 p-5 text-center">
                <p className="text-sm text-text-secondary mb-2">
                  Explore your sample deal to see what Parcel can do.
                </p>
                <p className="text-xs text-text-muted">
                  Sample data will be replaced when you analyze real properties.
                </p>
              </div>
            </motion.div>
          )}

          {/* Briefing placeholder */}
          <motion.div variants={itemVariants} className="mt-6 w-full max-w-2xl">
            <div className="rounded-xl border border-dashed border-border-default p-6 text-center">
              <p className="text-sm text-text-muted">
                Your morning briefing will appear here as you add properties and track deals.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </AppShell>
    )
  }

  // ─── STATE B: Returning User (has data) ───
  return (
    <AppShell title="Dashboard">
      {demoBanner}
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        {/* Greeting + Quick Actions */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-text-primary font-brand font-light">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-text-muted mt-1">{formatDate()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-accent-primary/30 transition-all">
              Log Activity
            </button>
            <button className="px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-accent-primary/30 transition-all">
              Add Contact
            </button>
            <button
              onClick={() => navigate('/analyze')}
              className="px-4 py-2 rounded-lg text-sm bg-accent-primary text-white hover:bg-accent-hover transition-colors"
            >
              Analyze Property
            </button>
          </div>
        </motion.div>

        {/* KPI Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Deals" value={stats?.total_deals ?? 0} format="number" sparklineData={sparklines.totalDeals} />
          <KPICard label="Active Pipeline" value={stats?.active_pipeline_deals ?? 0} format="number" sparklineData={sparklines.activePipeline} />
          <KPICard label="Closed Deals" value={closedDeals} format="number" sparklineData={sparklines.closedDeals} />
          <KPICard label="Properties" value={realPropertyCount} format="number" sparklineData={generateTrendData(realPropertyCount)} />
        </motion.div>

        {portfolioData && portfolioData.summary.total_properties > 0 && (
          <div className="bg-app-recessed border border-border-default rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Portfolio</h3>
              <Link to="/portfolio" className="text-xs text-accent-primary hover:text-accent-secondary transition-colors">
                View Portfolio →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">Total Value</p>
                <p className="text-lg text-text-primary font-medium tabular-nums">
                  ${portfolioData.summary.total_estimated_value >= 1_000_000
                    ? `${(portfolioData.summary.total_estimated_value / 1_000_000).toFixed(1)}M`
                    : `${Math.round(portfolioData.summary.total_estimated_value / 1000)}K`}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">Monthly CF</p>
                <p className={`text-lg font-medium tabular-nums ${portfolioData.summary.total_monthly_cash_flow >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {portfolioData.summary.total_monthly_cash_flow < 0 ? '-' : ''}${Math.abs(Math.round(portfolioData.summary.total_monthly_cash_flow)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">LTV</p>
                <p className="text-lg text-text-primary font-medium tabular-nums">{portfolioData.summary.ltv_ratio}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">Properties</p>
                <p className="text-lg text-text-primary font-medium tabular-nums">{portfolioData.summary.total_properties}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pipeline Summary */}
            {pipelineEntries.length > 0 ? (
              <motion.div variants={itemVariants} className="space-y-3">
                <h2 className="text-sm font-semibold text-text-primary">Pipeline Velocity</h2>
                <div className="rounded-xl border border-border-default bg-app-recessed p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pipelineEntries.map(([stage, count]) => (
                      <div key={stage} className="flex items-center justify-between p-3 rounded-lg bg-app-bg">
                        <span className="text-sm text-text-secondary">{STAGE_LABELS[stage] ?? statusLabel(stage)}</span>
                        <span className="text-lg font-semibold text-text-primary tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} className="rounded-xl border border-dashed border-border-default bg-app-recessed/50 p-6 text-center">
                <p className="text-sm text-text-muted mb-2">No active deals in your pipeline</p>
                <Link to="/analyze" className="text-xs text-accent-primary hover:text-accent-secondary transition-colors">
                  Analyze a property and move it to your pipeline →
                </Link>
              </motion.div>
            )}

            {/* Recent Deals Table */}
            {(stats?.recent_deals ?? []).length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text-primary">Recent Deals</h2>
                  <Link to="/deals" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</Link>
                </div>
                <div className="rounded-xl border border-border-default bg-app-recessed overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border-default">
                        <th className="text-left text-xs text-text-muted uppercase tracking-wider px-4 py-3">Address</th>
                        <th className="text-left text-xs text-text-muted uppercase tracking-wider px-4 py-3">Strategy</th>
                        <th className="text-left text-xs text-text-muted uppercase tracking-wider px-4 py-3">Risk</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_deals ?? []).map((deal) => (
                        <tr key={deal.id} className="border-b border-border-default/50 last:border-0 hover:bg-border-default/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-text-primary">{deal.address}</td>
                          <td className="px-4 py-3"><StrategyBadge strategy={deal.strategy} /></td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium tabular-nums ${riskColor(deal.risk_score)}`}>
                              {deal.risk_score ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/analyze/deal/${deal.id}`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right column: Recent Activity */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
            <div className="rounded-xl border border-border-default bg-app-recessed p-4">
              {activityLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
                </div>
              )}

              {!activityLoading && (!activityData || activityData.length === 0) && (
                <div className="py-8 text-center">
                  <p className="text-sm text-text-muted">Your activity will appear here as you use Parcel</p>
                </div>
              )}

              {!activityLoading && activityData && activityData.length > 0 && (
                <div className="space-y-1">
                  {activityData.slice(0, 8).map((item, i) => {
                    const config = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.property_saved
                    const Icon = config.icon
                    const clickable = !!item.entity_id
                    const handleClick = () => {
                      if (!item.entity_id) return
                      switch (item.entity_type) {
                        case 'property': navigate(`/analyze/results/${item.entity_id}`); break
                        case 'deal': navigate(`/analyze/deal/${item.entity_id}`); break
                        case 'document': navigate('/documents'); break
                      }
                    }
                    return (
                      <div
                        key={i}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? handleClick : undefined}
                        onKeyDown={clickable ? (e) => { if (e.key === 'Enter') handleClick() } : undefined}
                        className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors ${
                          clickable ? 'cursor-pointer hover:bg-app-bg' : 'hover:bg-app-bg'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                          <Icon size={14} style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary truncate">{item.description}</p>
                          <p className="text-[10px] text-text-muted">{item.timestamp ? timeAgo(item.timestamp) : ''}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  )
}
