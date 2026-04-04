import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Landmark,
  DollarSign,
  TrendingUp,
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
              <div key={i} className="h-24 bg-[#141311] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-60 bg-[#141311] rounded-xl animate-pulse" />
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
            className="text-xl sm:text-2xl text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Financing Dashboard
          </h1>
          <Link
            to="/obligations"
            className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
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
                  <tr className="text-[10px] uppercase tracking-wider text-[#8A8580] border-b border-[#1E1D1B]">
                    <th className="text-left py-2 pr-4">Property</th>
                    <th className="text-right py-2 px-4">Monthly Spread</th>
                    <th className="text-right py-2 pl-4">Annual Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {data.wrap_spreads.map((ws, i) => (
                    <tr key={i} className="border-b border-[#1E1D1B]/50 last:border-0">
                      <td className="py-3 pr-4 text-[#F0EDE8]">{ws.property_address}</td>
                      <td className="py-3 px-4 text-right text-[#4ADE80] tabular-nums font-medium">
                        ${ws.monthly_spread.toLocaleString()}
                      </td>
                      <td className="py-3 pl-4 text-right text-[#C5C0B8] tabular-nums">
                        ${ws.annual_spread.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1E1D1B]">
                    <td className="py-3 pr-4 text-xs text-[#8A8580] font-medium">TOTAL</td>
                    <td className="py-3 px-4 text-right text-[#4ADE80] tabular-nums font-medium">
                      ${data.wrap_spreads.reduce((s, w) => s + w.monthly_spread, 0).toLocaleString()}
                    </td>
                    <td className="py-3 pl-4 text-right text-[#C5C0B8] tabular-nums">
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
    variant === 'success' ? 'text-[#4ADE80]' :
    variant === 'danger' ? 'text-[#F87171]' :
    'text-[#F0EDE8]'

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[#8A8580]" />
        <span className="text-[10px] uppercase tracking-wider text-[#8A8580]">{label}</span>
      </div>
      <p className={cn('text-xl font-medium tabular-nums', valueColor)}>{value}</p>
      {subtitle && <p className="text-xs text-[#F87171] mt-1">{subtitle}</p>}
    </div>
  )
}

/* ─── Section ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ─── Due-on-Sale Risk Card ─── */

const RISK_BADGE: Record<string, string> = {
  high: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  medium: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  low: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
}

function DueOnSaleRiskCard({ risk }: { risk: DueOnSaleRiskItem }) {
  const badge = RISK_BADGE[risk.risk_level] || RISK_BADGE.low
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B]">
      <div className="min-w-0">
        <p className="text-sm text-[#F0EDE8] truncate">{risk.property_address}</p>
        <p className="text-xs text-[#8A8580] mt-0.5">{risk.instrument_name}</p>
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
    days < 90 ? 'text-[#F87171]' :
    days < 180 ? 'text-[#FBBF24]' :
    'text-[#4ADE80]'

  const borderColor =
    days < 90 ? 'border-l-[#F87171]' :
    days < 180 ? 'border-l-[#FBBF24]' :
    'border-l-[#4ADE80]'

  return (
    <div className={cn('flex-shrink-0 w-[260px] bg-[#0C0B0A] border border-[#1E1D1B] border-l-[3px] rounded-xl p-4', borderColor)}>
      <p className="text-sm text-[#F0EDE8] font-medium truncate">{balloon.property_address}</p>
      <p className="text-xs text-[#8A8580] mt-1">{balloon.instrument_name}</p>
      {balloon.balloon_amount != null && (
        <p className="text-lg text-[#F0EDE8] font-medium tabular-nums mt-2">
          ${Number(balloon.balloon_amount).toLocaleString()}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {balloon.balloon_date && (
          <span className="text-xs text-[#8A8580]">
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
