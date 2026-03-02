/** Public read-only deal share page — no AppShell, no sidebar, no auth required. */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, HelpCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  formatLabel,
  formatOutputValue,
  getRecommendationColor,
} from '@/lib/format'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Strategy } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════
   Strategy → 2 additional KPI keys (alongside primary metric)
═══════════════════════════════════════════════════════════════════════════ */

const STRATEGY_KPIS: Record<string, { key: string; label: string }[]> = {
  wholesale: [
    { key: 'repair_costs', label: 'Repair Costs' },
    { key: 'closing_costs', label: 'Closing Costs' },
  ],
  buy_and_hold: [
    { key: 'monthly_cash_flow', label: 'Monthly Cash Flow' },
    { key: 'cap_rate', label: 'Cap Rate' },
  ],
  flip: [
    { key: 'net_profit', label: 'Net Profit' },
    { key: 'annualized_roi', label: 'Annualized ROI' },
  ],
  brrrr: [
    { key: 'monthly_cash_flow', label: 'Monthly Cash Flow' },
    { key: 'equity_captured', label: 'Equity Captured' },
  ],
  creative_finance: [
    { key: 'dscr', label: 'DSCR' },
    { key: 'equity_position', label: 'Equity Position' },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════════
   Formatting helpers — currency / percent / plain detection
═══════════════════════════════════════════════════════════════════════════ */

function isCurrencyKey(key: string): boolean {
  return /price|cost|value|profit|flow|arv|mao|payment|balance|equity|loan|cash|mgmt|maintenance/i.test(key)
}

function isPercentKey(key: string): boolean {
  return /rate|pct|percent|return|ltv|vacancy|dscr/i.test(key)
}

function formatShareValue(key: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'string') return value
  if (isCurrencyKey(key)) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (isPercentKey(key)) return `${value.toFixed(2)}%`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/* ═══════════════════════════════════════════════════════════════════════════
   Risk score config
═══════════════════════════════════════════════════════════════════════════ */

function getRiskColor(score: number): string {
  if (score <= 30) return '#10B981'
  if (score <= 60) return '#F59E0B'
  if (score <= 80) return '#EF4444'
  return '#7F1D1D'
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
      <span className="text-sm font-semibold text-[#F1F5F9] tracking-tight group-hover:text-accent-primary transition-colors">
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
    <div className="min-h-screen bg-[#08080F]">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#08080F]/85 border-b border-[#1A1A2E]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
          <ParcelLogo />
        </div>
      </div>
      <div className="max-w-[720px] mx-auto px-6 py-10 space-y-6">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
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
    <div className="min-h-screen bg-[#08080F]">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#08080F]/85 border-b border-[#1A1A2E]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
          <ParcelLogo />
        </div>
      </div>
      <div className="max-w-[720px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0F0F1A] border border-[#1A1A2E] flex items-center justify-center mx-auto">
            <span className="text-xl text-[#475569]">?</span>
          </div>
          <h2 className="text-lg font-semibold text-[#F1F5F9]">
            This deal is no longer available or has not been shared publicly.
          </h2>
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
    queryKey: ['share', dealId],
    queryFn: () => api.deals.getShared(dealId ?? ''),
    enabled: !!dealId,
    retry: false,
  })

  if (isLoading) return <LoadingState />
  if (isError || !deal) return <ErrorState />

  const kpis = STRATEGY_KPIS[deal.strategy] ?? []
  const riskScore = deal.risk_score ?? 0
  const riskColor = getRiskColor(riskScore)
  const outputs = deal.outputs ?? {}
  const inputEntries = Object.entries(deal.inputs ?? {})
  const outputEntries = Object.entries(outputs)
  const allEntries = [...inputEntries, ...outputEntries]
  const createdDate = new Date(deal.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  /** Format the primary metric value. */
  const primaryDisplay = (() => {
    if (deal.primary_metric_value === null || deal.primary_metric_value === undefined) return 'N/A'
    const label = (deal.primary_metric_label ?? '').toLowerCase()
    if (label.includes('return') || label.includes('rate')) return `${deal.primary_metric_value.toFixed(2)}%`
    return `$${deal.primary_metric_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-[#08080F]"
    >
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#08080F]/85 border-b border-[#1A1A2E]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <ParcelLogo />
          <span className="text-[10px] text-[#475569] font-mono uppercase tracking-widest">
            Shared Deal
          </span>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-10 space-y-8">
        {/* ── Deal Header ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <StrategyBadge strategy={deal.strategy as Strategy} />
            <span className="text-[11px] text-[#94A3B8] font-mono px-2 py-0.5 rounded bg-[#0F0F1A] border border-[#1A1A2E]">
              {deal.property_type}
            </span>
          </div>
          <h1 className="text-[24px] font-semibold text-[#F1F5F9] tracking-tight">
            {deal.address}
          </h1>
          <p className="text-[12px] text-[#475569]">
            Shared by {deal.shared_by.name} &middot; {createdDate}
          </p>
        </div>

        {/* ── KPI Cards Row — 4 cards: primary + 2 strategy + risk ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Primary metric (emphasized) */}
          {deal.primary_metric_label && (
            <div className="rounded-xl bg-[#0F0F1A] border border-[#1A1A2E] p-5 space-y-1 border-l-4 border-l-accent-primary">
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
                {deal.primary_metric_label}
              </p>
              <p className="text-[28px] font-mono font-semibold text-[#F1F5F9] leading-tight">
                {primaryDisplay}
              </p>
            </div>
          )}

          {/* Cards 2-3: Strategy-specific outputs */}
          {kpis.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl bg-[#0F0F1A] border border-[#1A1A2E] p-5 space-y-1"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
                {label}
              </p>
              <p className="text-[28px] font-mono font-semibold text-[#F1F5F9] leading-tight">
                {formatShareValue(key, outputs[key] as number | string | null | undefined)}
              </p>
            </div>
          ))}

          {/* Card 4: Risk Score */}
          {deal.risk_score !== null && (
            <div className="rounded-xl bg-[#0F0F1A] border border-[#1A1A2E] p-5 space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
                  Risk Score
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
                      <HelpCircle size={14} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-[#0F0F1A] border-[#1A1A2E] p-4" side="bottom">
                    <p className="text-sm font-semibold text-[#F1F5F9] mb-2">Risk Score Breakdown</p>
                    {deal.risk_factors && Object.keys(deal.risk_factors).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(deal.risk_factors).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-[#94A3B8]">{formatLabel(key)}</span>
                            <span className="font-mono text-[#F1F5F9]">
                              {formatOutputValue(key, value as number | string)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#475569]">Breakdown not available for this deal.</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              <p
                className="text-[28px] font-mono font-semibold leading-tight"
                style={{ color: riskColor }}
              >
                {riskScore}
              </p>
            </div>
          )}
        </div>

        {/* ── Financial Breakdown (collapsible) ── */}
        {allEntries.length > 0 && (
          <div className="rounded-xl border border-[#1A1A2E] bg-[#0F0F1A] overflow-hidden">
            <button
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1A1A2E]/30 transition-colors cursor-pointer"
            >
              <h3 className="text-sm font-semibold text-[#F1F5F9]">
                {breakdownOpen ? 'View full breakdown \u2191' : 'View full breakdown \u2193'}
              </h3>
            </button>
            {breakdownOpen && (
              <div className="border-t border-[#1A1A2E]">
                {allEntries.map(([key, value], i) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between py-2.5 px-5',
                      i % 2 === 0 ? 'bg-[#0F0F1A]' : 'bg-transparent'
                    )}
                  >
                    <span className="text-[13px] text-[#94A3B8]">{formatLabel(key)}</span>
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
                      <span className="font-mono text-[13px] text-[#F1F5F9]">
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
      <footer className="border-t border-[#1A1A2E] mt-12">
        <div className="max-w-[720px] mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-[13px] text-[#94A3B8]">Analyzed with Parcel</span>
          <Link to="/">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white text-sm">
              Get started free
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
        </div>
        <div className="max-w-[720px] mx-auto px-6 pb-8 text-center">
          <p className="text-[11px] text-[#475569]">Powered by Parcel</p>
        </div>
      </footer>
    </motion.div>
  )
}
