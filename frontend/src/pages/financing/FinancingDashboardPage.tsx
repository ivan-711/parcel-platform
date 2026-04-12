import { Link } from 'react-router-dom'
import {
  Landmark,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { useFinancingDashboard } from '@/hooks/useFinancing'
import type { BalloonAlert, DueOnSaleRiskItem } from '@/types/financing'

export default function FinancingDashboardPage() {
  const { data, isLoading } = useFinancingDashboard()

  // PostHog
  if (data) {
    try {
      (window as any).posthog?.capture?.('financing_dashboard_viewed', {
        total_instruments: data.total_instruments,
        has_wraps: data.wrap_spreads.length > 0,
        total_balance: data.total_balance,
      })
    } catch { /* ignore */ }
  }

  if (isLoading) {
    return (
      <AppShell title="Financing">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-app-recessed rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-60 bg-app-recessed rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  if (!data || data.total_instruments === 0) {
    return (
      <AppShell title="Financing">
        <EmptyState
          icon={Landmark}
          heading="No financing instruments yet"
          description="Add instruments to your properties to see your financing overview here."
          ctaLabel="View Properties"
          ctaHref="/properties"
        />
      </AppShell>
    )
  }

  const urgentBalloons = data.upcoming_balloons.filter((b) => (b.days_until ?? 999) < 90)

  return (
    <AppShell title="Financing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1
            className="text-xl sm:text-2xl text-text-primary font-brand font-light"
          >
            Financing Dashboard
          </h1>
          <Link
            to="/obligations"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            View Obligations →
          </Link>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Active Instruments"
            value={String(data.total_instruments)}
            icon={Landmark}
          />
          <KpiCard
            label="Total Debt Balance"
            value={`$${formatCompact(data.total_balance)}`}
            icon={DollarSign}
          />
          <KpiCard
            label="Monthly Net Cash Flow"
            value={`${data.net_monthly_cash_flow >= 0 ? '+' : ''}$${formatCompact(Math.abs(data.net_monthly_cash_flow))}`}
            icon={data.net_monthly_cash_flow >= 0 ? ArrowUpRight : ArrowDownRight}
            variant={data.net_monthly_cash_flow >= 0 ? 'success' : 'danger'}
          />
          <KpiCard
            label="Upcoming Balloons"
            value={String(data.upcoming_balloons.length)}
            icon={AlertTriangle}
            variant={urgentBalloons.length > 0 ? 'danger' : 'default'}
            subtitle={urgentBalloons.length > 0 ? `${urgentBalloons.length} within 90 days` : undefined}
          />
        </div>

        {/* Wrap Spreads */}
        {data.wrap_spreads.length > 0 && (
          <Section title="Active Wrap Spreads">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border-default">
                    <th className="text-left py-2 pr-4">Property</th>
                    <th className="text-right py-2 px-4">Monthly Spread</th>
                    <th className="text-right py-2 pl-4">Annual Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {data.wrap_spreads.map((ws, i) => (
                    <tr key={i} className="border-b border-border-default/50 last:border-0">
                      <td className="py-3 pr-4 text-text-primary">{ws.property_address}</td>
                      <td className="py-3 px-4 text-right text-profit tabular-nums font-medium">
                        ${ws.monthly_spread.toLocaleString()}
                      </td>
                      <td className="py-3 pl-4 text-right text-text-secondary tabular-nums">
                        ${ws.annual_spread.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-default">
                    <td className="py-3 pr-4 text-xs text-text-muted font-medium">TOTAL</td>
                    <td className="py-3 px-4 text-right text-profit tabular-nums font-medium">
                      ${data.wrap_spreads.reduce((s, w) => s + w.monthly_spread, 0).toLocaleString()}
                    </td>
                    <td className="py-3 pl-4 text-right text-text-secondary tabular-nums">
                      ${data.wrap_spreads.reduce((s, w) => s + w.annual_spread, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        )}

        {/* Due-on-Sale Risk Monitor */}
        {data.due_on_sale_risks.length > 0 && (
          <Section title="Due-on-Sale Risk">
            <div className="space-y-2">
              {data.due_on_sale_risks.map((risk, i) => (
                <DueOnSaleRiskCard key={i} risk={risk} />
              ))}
            </div>
          </Section>
        )}

        {/* Upcoming Balloons Timeline */}
        {data.upcoming_balloons.length > 0 && (
          <Section title="Upcoming Balloons">
            <div className="flex gap-3 overflow-x-auto scrollbar-luxury pb-1">
              {data.upcoming_balloons.map((balloon, i) => (
                <BalloonCard key={i} balloon={balloon} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </AppShell>
  )
}

/* ─── KPI Card ─── */

function KpiCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: {
  label: string
  value: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'danger'
  subtitle?: string
}) {
  const valueColor =
    variant === 'success' ? 'text-profit' :
    variant === 'danger' ? 'text-loss' :
    'text-text-primary'

  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-text-muted" />
        <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <p className={cn('text-xl font-medium tabular-nums', valueColor)}>{value}</p>
      {subtitle && <p className="text-xs text-loss mt-1">{subtitle}</p>}
    </div>
  )
}

/* ─── Section ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5">
      <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ─── Due-on-Sale Risk Card ─── */

const RISK_BADGE: Record<string, string> = {
  high: 'bg-loss-bg text-loss border-loss/30',
  medium: 'bg-warning-bg text-warning border-warning/30',
  low: 'bg-profit-bg text-profit border-profit/30',
}

function DueOnSaleRiskCard({ risk }: { risk: DueOnSaleRiskItem }) {
  const badge = RISK_BADGE[risk.risk_level] || RISK_BADGE.low
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-app-bg border border-border-default">
      <div className="min-w-0">
        <p className="text-sm text-text-primary truncate">{risk.property_address}</p>
        <p className="text-xs text-text-muted mt-0.5">{risk.instrument_name}</p>
      </div>
      <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ml-3', badge)}>
        {risk.risk_level}
      </span>
    </div>
  )
}

/* ─── Balloon Card ─── */

function BalloonCard({ balloon }: { balloon: BalloonAlert }) {
  const days = balloon.days_until ?? 999
  const color =
    days < 90 ? 'text-loss' :
    days < 180 ? 'text-warning' :
    'text-profit'

  const borderColor =
    days < 90 ? 'border-l-loss' :
    days < 180 ? 'border-l-warning' :
    'border-l-profit'

  return (
    <div className={cn('flex-shrink-0 w-[260px] bg-app-bg border border-border-default rounded-xl p-4', borderColor)}>
      <p className="text-sm text-text-primary font-medium truncate">{balloon.property_address}</p>
      <p className="text-xs text-text-muted mt-1">{balloon.instrument_name}</p>
      {balloon.balloon_amount != null && (
        <p className="text-lg text-text-primary font-medium tabular-nums mt-2">
          ${Number(balloon.balloon_amount).toLocaleString()}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {balloon.balloon_date && (
          <span className="text-xs text-text-muted">
            {new Date(balloon.balloon_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <span className={cn('text-sm font-bold tabular-nums', color)}>
          {days} days
        </span>
      </div>
    </div>
  )
}

/* ─── Helpers ─── */

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}
