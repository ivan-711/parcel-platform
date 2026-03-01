/** Public read-only deal share page — no AppShell, no sidebar, no auth required. */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  formatLabel,
  formatCurrency,
  formatPercent,
  formatOutputValue,
  getRecommendationColor,
  isPercentKey,
  isCurrencyKey,
} from '@/lib/format'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Button } from '@/components/ui/button'
import type { Strategy } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════
   Strategy → 3 additional KPI keys (alongside primary metric)
═══════════════════════════════════════════════════════════════════════════ */

const STRATEGY_KPIS: Record<string, { key: string; label: string }[]> = {
  wholesale: [
    { key: 'mao', label: 'MAO' },
    { key: 'repair_costs', label: 'Repair Costs' },
    { key: 'closing_costs', label: 'Closing Costs' },
  ],
  buy_and_hold: [
    { key: 'coc_return', label: 'Cash-on-Cash' },
    { key: 'monthly_cash_flow', label: 'Monthly Cash Flow' },
    { key: 'cap_rate', label: 'Cap Rate' },
  ],
  flip: [
    { key: 'gross_profit', label: 'Gross Profit' },
    { key: 'net_profit', label: 'Net Profit' },
    { key: 'annualized_roi', label: 'Annualized ROI' },
  ],
  brrrr: [
    { key: 'money_left_in', label: 'Money Left In' },
    { key: 'monthly_cash_flow', label: 'Monthly Cash Flow' },
    { key: 'equity_captured', label: 'Equity Captured' },
  ],
  creative_finance: [
    { key: 'monthly_cash_flow', label: 'Monthly Cash Flow' },
    { key: 'dscr', label: 'DSCR' },
    { key: 'equity_day_one', label: 'Equity Day One' },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════════
   Risk score helpers
═══════════════════════════════════════════════════════════════════════════ */

function getRiskConfig(score: number): { label: string; color: string; bg: string } {
  if (score <= 25) return { label: 'Low Risk', color: '#10B981', bg: 'bg-emerald-500/15' }
  if (score <= 50) return { label: 'Medium Risk', color: '#F59E0B', bg: 'bg-amber-500/15' }
  if (score <= 75) return { label: 'High Risk', color: '#EF4444', bg: 'bg-red-500/15' }
  return { label: 'Very High Risk', color: '#DC2626', bg: 'bg-red-600/15' }
}

/** Format an individual KPI value based on its key. */
function formatKPIValue(key: string, outputs: Record<string, number | string>): string {
  const raw = outputs[key]
  if (raw === null || raw === undefined) return 'N/A'
  if (typeof raw === 'string') return raw
  if (isPercentKey(key)) return formatPercent(raw)
  if (isCurrencyKey(key)) return formatCurrency(raw)
  return raw.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/* ═══════════════════════════════════════════════════════════════════════════
   Logo — matches Landing.tsx Navbar
═══════════════════════════════════════════════════════════════════════════ */

function ParcelLogo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center">
        <span className="text-[10px] font-bold text-white font-mono">P</span>
      </div>
      <span className="text-sm font-semibold text-text-primary tracking-tight group-hover:text-accent-primary transition-colors">
        Parcel
      </span>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Loading State
═══════════════════════════════════════════════════════════════════════════ */

function LoadingState() {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
          <ParcelLogo />
        </div>
      </div>
      <div className="max-w-[720px] mx-auto px-6 py-10 space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={1} className="max-w-xs" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
        <SkeletonCard lines={1} className="max-w-[200px]" />
        <SkeletonCard lines={6} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Error / 404 State
═══════════════════════════════════════════════════════════════════════════ */

function ErrorState() {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
          <ParcelLogo />
        </div>
      </div>
      <div className="max-w-[720px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-app-surface border border-border-subtle flex items-center justify-center mx-auto">
            <span className="text-xl text-text-muted">?</span>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            This deal is no longer available
          </h2>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            The deal may have been removed or the link may be invalid.
          </p>
          <Link to="/">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white text-sm mt-2">
              Go to Parcel
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════════════ */

export default function ShareDealPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ['shared-deal', dealId],
    queryFn: () => api.deals.getShared(dealId ?? ''),
    enabled: !!dealId,
    retry: false,
  })

  if (isLoading) return <LoadingState />
  if (isError || !deal) return <ErrorState />

  const kpis = STRATEGY_KPIS[deal.strategy] ?? []
  const riskScore = deal.risk_score ?? 0
  const risk = getRiskConfig(riskScore)
  const outputs = deal.outputs ?? {}
  const outputEntries = Object.entries(outputs)
  const createdDate = new Date(deal.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  /** Format the primary metric value. */
  const primaryDisplay = (() => {
    if (deal.primary_metric_value === null || deal.primary_metric_value === undefined) return 'N/A'
    const label = (deal.primary_metric_label ?? '').toLowerCase()
    if (label.includes('return') || label.includes('rate')) return formatPercent(deal.primary_metric_value)
    return formatCurrency(deal.primary_metric_value)
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-app-bg"
    >
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <ParcelLogo />
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
            Shared Deal
          </span>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-10 space-y-8">
        {/* ── Deal Header ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <StrategyBadge strategy={deal.strategy as Strategy} />
            <span className="text-xs text-text-muted font-mono px-2 py-0.5 rounded bg-app-surface border border-border-subtle">
              {deal.property_type}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            {deal.address}
          </h1>
          <p className="text-sm text-text-secondary">
            Shared by <span className="text-text-primary font-medium">{deal.shared_by.name}</span>
            {' '}&middot;{' '}
            {createdDate}
          </p>
        </div>

        {/* ── Primary Metric Card ── */}
        {deal.primary_metric_label && (
          <div className="rounded-xl border-l-4 border-accent-primary bg-app-surface border border-border-subtle p-6">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
              {deal.primary_metric_label}
            </p>
            <p className="text-4xl font-bold font-mono text-text-primary">
              {primaryDisplay}
            </p>
          </div>
        )}

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map(({ key, label }) => {
            const val = formatKPIValue(key, outputs)
            const raw = outputs[key]
            const isNeg = typeof raw === 'number' && raw < 0
            return (
              <div
                key={key}
                className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1"
              >
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {label}
                </p>
                <p
                  className={cn(
                    'text-2xl font-semibold font-mono',
                    isNeg ? 'text-accent-danger' : 'text-text-primary'
                  )}
                >
                  {val}
                </p>
              </div>
            )
          })}
        </div>

        {/* ── Risk Score Card ── */}
        {deal.risk_score !== null && (
          <div className="rounded-xl border border-border-subtle bg-app-surface p-6 flex items-center gap-5">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                Risk Score
              </p>
              <p className="text-4xl font-bold font-mono" style={{ color: risk.color }}>
                {riskScore}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold',
                risk.bg
              )}
              style={{ color: risk.color }}
            >
              {risk.label}
            </span>
          </div>
        )}

        {/* ── Financial Breakdown (collapsible) ── */}
        {outputEntries.length > 0 && (
          <div className="rounded-xl border border-border-subtle bg-app-surface overflow-hidden">
            <button
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-app-elevated/30 transition-colors cursor-pointer"
            >
              <h3 className="text-sm font-semibold text-text-primary">Financial Breakdown</h3>
              {breakdownOpen ? (
                <ChevronUp size={16} className="text-text-muted" />
              ) : (
                <ChevronDown size={16} className="text-text-muted" />
              )}
            </button>
            {breakdownOpen && (
              <div className="border-t border-border-subtle">
                {outputEntries.map(([key, value], i) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between py-2.5 px-5',
                      i % 2 === 0 ? 'bg-[#0F0F1A]' : 'bg-[#08080F]'
                    )}
                  >
                    <span className="text-sm text-text-secondary">{formatLabel(key)}</span>
                    {typeof value === 'string' && key === 'recommendation' ? (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                          getRecommendationColor(value)
                        )}
                      >
                        {value}
                      </span>
                    ) : (
                      <span className="font-mono text-[13px] text-text-primary">
                        {formatOutputValue(key, value as number | string | null | undefined)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-subtle mt-12">
        <div className="max-w-[720px] mx-auto px-6 py-10 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
              <span className="text-[8px] font-bold text-accent-primary font-mono">P</span>
            </div>
            <span className="text-xs text-text-muted">Powered by Parcel</span>
          </div>
          <Link to="/">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white text-sm">
              Get started free
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      </footer>
    </motion.div>
  )
}
