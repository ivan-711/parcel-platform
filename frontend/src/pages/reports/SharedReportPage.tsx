/**
 * SharedReportPage — public, unauthenticated report view.
 * No AppShell, no sidebar. Professional document layout with brand kit support.
 * Engagement tracking via Intersection Observer + beacon on unload.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Link2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { MetricLabel } from '@/components/ui/MetricLabel'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Button } from '@/components/ui/button'
import { CashFlowProjection } from '@/components/charts/CashFlowProjection'
import type { Strategy } from '@/types'

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function isCurrencyKey(key: string): boolean {
  return /price|cost|value|profit|flow|arv|mao|payment|balance|equity|loan|cash|mgmt|maintenance|noi/i.test(key)
}

function isPercentKey(key: string): boolean {
  return /rate|pct|percent|return|ltv|vacancy|dscr|roi|cap_rate|coc/i.test(key)
}

function formatValue(key: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'string') return value
  if (isCurrencyKey(key)) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (isPercentKey(key)) return `${value.toFixed(2)}%`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Arv/g, 'ARV')
    .replace(/Mao/g, 'MAO')
    .replace(/Roi/g, 'ROI')
    .replace(/Noi/g, 'NOI')
    .replace(/Ltv/g, 'LTV')
    .replace(/Dscr/g, 'DSCR')
    .replace(/Coc/g, 'CoC')
}

function getRiskColor(score: number): string {
  if (score <= 30) return '#6DBEA3'
  if (score <= 60) return '#D4A867'
  if (score <= 80) return '#D4766A'
  return '#C45E52'
}

// ---------------------------------------------------------------------------
// Strategy KPI definitions for the report
// ---------------------------------------------------------------------------

const STRATEGY_KPIS: Record<string, { key: string; label: string }[]> = {
  wholesale: [
    { key: 'mao', label: 'MAO' },
    { key: 'profit_at_ask', label: 'Profit at Ask' },
    { key: 'repair_costs', label: 'Repair Costs' },
  ],
  buy_and_hold: [
    { key: 'monthly_cash_flow', label: 'Monthly Cash Flow' },
    { key: 'cap_rate', label: 'Cap Rate' },
    { key: 'coc_return', label: 'CoC Return' },
  ],
  flip: [
    { key: 'gross_profit', label: 'Gross Profit' },
    { key: 'roi', label: 'ROI' },
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
    { key: 'equity_day_one', label: 'Day-One Equity' },
  ],
}

const STRATEGY_TOOLTIPS: Record<string, string> = {
  wholesale: 'Lock a property under contract, then assign the contract to an end buyer for a fee. No rehab, no ownership.',
  buy_and_hold: 'Purchase and rent long-term for monthly cash flow, appreciation, and tax benefits.',
  flip: 'Buy, renovate, and sell for a one-time profit. Execution speed and rehab accuracy are key.',
  brrrr: 'Buy, Rehab, Rent, Refinance, Repeat. Pull your capital out via refinance to recycle into the next deal.',
  creative_finance: 'Non-traditional deal structures — seller finance, subject-to, lease options, or wrap mortgages.',
}

// ---------------------------------------------------------------------------
// PostHog tracking
// ---------------------------------------------------------------------------

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Logo component
// ---------------------------------------------------------------------------

function ReportLogo({ brandKit }: { brandKit?: { logo_url?: string; company_name?: string } | null }) {
  if (brandKit?.logo_url) {
    return (
      <div className="flex items-center gap-2">
        <img src={brandKit.logo_url} alt="" className="h-6 w-auto object-contain" />
        {brandKit.company_name && (
          <span className="text-sm font-semibold text-text-primary">{brandKit.company_name}</span>
        )}
      </div>
    )
  }

  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="w-6 h-6 rounded bg-violet-400 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">P</span>
      </div>
      <span className="text-sm font-semibold text-text-primary tracking-tight group-hover:text-violet-400 transition-colors">
        Parcel
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
          <ReportLogo />
        </div>
      </div>
      <div className="max-w-[720px] mx-auto px-6 py-10 space-y-6">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
        <SkeletonCard lines={8} />
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
          <ReportLogo />
        </div>
      </div>
      <div className="max-w-[720px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-app-surface border border-border-subtle flex items-center justify-center mx-auto">
            <span className="text-xl text-text-disabled">?</span>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            This report is no longer available.
          </h2>
          <Link to="/">
            <Button className="bg-gradient-to-r from-violet-400 to-violet-600 text-white text-sm mt-2 hover:opacity-90">
              Go to Parcel
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SharedReportPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const sectionsViewedRef = useRef<Set<string>>(new Set())
  const startTimeRef = useRef<number>(Date.now())

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['shared-report', shareToken],
    queryFn: () => api.reports.getShared(shareToken ?? ''),
    enabled: !!shareToken,
    retry: false,
  })

  // Track page view on mount
  useEffect(() => {
    if (shareToken) {
      trackEvent('report_shared_view', { report_token_prefix: shareToken?.slice(0, 4) })
    }
  }, [shareToken])

  // Beacon engagement on unload — use sendBeacon for reliability during page unload
  const sendEngagement = useCallback(() => {
    if (!shareToken) return
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
    const sections = Array.from(sectionsViewedRef.current)
    const payload = JSON.stringify({
      sections_viewed: sections,
      time_spent_seconds: timeSpent,
    })
    const apiUrl = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')
    const url = `${apiUrl}/api/reports/share/${shareToken}/view`
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
    } else {
      // Fallback for browsers without sendBeacon support
      api.reports.logView(shareToken, { sections_viewed: sections, time_spent_seconds: timeSpent })
    }
  }, [shareToken])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') sendEngagement()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', sendEngagement)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', sendEngagement)
    }
  }, [sendEngagement])

  // Intersection Observer for section tracking
  const observeSection = useCallback((el: HTMLElement | null, name: string) => {
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) sectionsViewedRef.current.add(name) },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (isLoading) return <LoadingState />
  if (isError || !report) return <ErrorState />

  const { report_data: data } = report
  const prop = data.property
  const scenario = data.scenario
  const brandKit = data.brand_kit
  const accentColor = brandKit?.primary_color || '#8B7AFF'
  const outputs = scenario.outputs || {}
  const kpis = STRATEGY_KPIS[scenario.strategy] || []
  const createdDate = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard')
    trackEvent('report_link_copied', { report_token_prefix: shareToken?.slice(0, 4) })
  }

  const outputEntries = Object.entries(outputs).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-app-bg print:bg-white"
    >
      {/* Sticky header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle print:hidden">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <ReportLogo brandKit={brandKit} />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border-default bg-transparent text-text-secondary hover:bg-layer-2"
              onClick={handleCopyLink}
            >
              <Link2 size={12} />
              Share Link
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-10 space-y-8">
        {/* Report title */}
        <div ref={(el) => observeSection(el, 'header')} className="space-y-3">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            {report.title}
          </h1>
          <div className="flex items-center gap-3 text-[12px] text-text-secondary flex-wrap">
            <span>{createdDate}</span>
            {prop.property_type && (
              <>
                <span className="text-border-default">&middot;</span>
                <span className="px-2 py-0.5 rounded bg-app-surface border border-border-subtle">
                  {prop.property_type}
                </span>
              </>
            )}
            {scenario.strategy && (
              <>
                <span className="text-border-default">&middot;</span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-2 py-0.5 rounded bg-app-surface border border-border-subtle cursor-help inline-flex items-center gap-1">
                        {scenario.strategy.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        <HelpCircle size={10} className="text-text-muted" />
                      </span>
                    </TooltipTrigger>
                    {STRATEGY_TOOLTIPS[scenario.strategy] && (
                      <TooltipContent
                        side="bottom"
                        className="max-w-[260px] bg-app-overlay border border-border-strong p-3 rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                        sideOffset={4}
                      >
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {STRATEGY_TOOLTIPS[scenario.strategy]}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            <span className="text-border-default">&middot;</span>
            <span>Prepared by {brandKit?.company_name || 'Parcel AI'}</span>
          </div>
        </div>

        {/* KPI cards */}
        <div ref={(el) => observeSection(el, 'metrics')} className="grid grid-cols-3 gap-4">
          {kpis.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl bg-app-surface border border-border-subtle p-5 space-y-1"
              style={{ borderTopColor: accentColor, borderTopWidth: '2px' }}
            >
              <MetricLabel metric={key} className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                {label}
              </MetricLabel>
              <p className="text-[24px] font-semibold text-text-primary leading-tight tabular-nums">
                {formatValue(key, outputs[key] as number | string | null)}
              </p>
            </div>
          ))}
        </div>

        {/* Executive summary */}
        {scenario.ai_narrative && (
          <div ref={(el) => observeSection(el, 'summary')} className="rounded-xl border border-border-strong bg-app-elevated p-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-3">
              Executive Summary
            </h3>
            <p className="text-sm text-text-primary/90 leading-relaxed whitespace-pre-line">
              {scenario.ai_narrative}
            </p>
          </div>
        )}

        {/* Cash flow projection */}
        <div ref={(el) => observeSection(el, 'projection')} className="rounded-xl border border-border-default bg-app-surface p-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-4">
            12-Month Cash Flow Projection
          </h3>
          <CashFlowProjection
            outputs={outputs as Record<string, number | string>}
            strategy={scenario.strategy as Strategy}
            dealId={shareToken || 'report'}
          />
        </div>

        {/* Risk score */}
        {scenario.risk_score !== null && scenario.risk_score !== undefined && (
          <div ref={(el) => observeSection(el, 'risk')} className="flex items-center gap-4 rounded-xl border border-border-subtle bg-app-surface p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-1">
                Risk Score
              </p>
              <p
                className="text-[32px] font-semibold leading-tight tabular-nums"
                style={{ color: getRiskColor(scenario.risk_score) }}
              >
                {Math.round(scenario.risk_score)}
              </p>
            </div>
            <div className="flex-1 h-2 bg-layer-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${scenario.risk_score}%`,
                  backgroundColor: getRiskColor(scenario.risk_score),
                }}
              />
            </div>
          </div>
        )}

        {/* Property details */}
        {(prop.bedrooms || prop.sqft || prop.year_built) && (
          <div ref={(el) => observeSection(el, 'property')} className="rounded-xl border border-border-subtle bg-app-surface p-5">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-3">
              Property Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {prop.bedrooms && (
                <div>
                  <p className="text-[10px] text-text-secondary uppercase">Bedrooms</p>
                  <p className="text-sm text-text-primary font-medium">{prop.bedrooms}</p>
                </div>
              )}
              {prop.bathrooms && (
                <div>
                  <p className="text-[10px] text-text-secondary uppercase">Bathrooms</p>
                  <p className="text-sm text-text-primary font-medium">{prop.bathrooms}</p>
                </div>
              )}
              {prop.sqft && (
                <div>
                  <p className="text-[10px] text-text-secondary uppercase">Sq Ft</p>
                  <p className="text-sm text-text-primary font-medium">{prop.sqft.toLocaleString()}</p>
                </div>
              )}
              {prop.year_built && (
                <div>
                  <p className="text-[10px] text-text-secondary uppercase">Year Built</p>
                  <p className="text-sm text-text-primary font-medium">{prop.year_built}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial breakdown (collapsible) */}
        {outputEntries.length > 0 && (
          <div ref={(el) => observeSection(el, 'financials')} className="rounded-xl border border-border-subtle bg-app-surface overflow-hidden">
            <button
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-layer-1 transition-colors cursor-pointer"
            >
              <h3 className="text-sm font-semibold text-text-primary">
                Full Financial Breakdown
              </h3>
              {breakdownOpen ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
            </button>
            {breakdownOpen && (
              <div className="border-t border-border-subtle">
                {outputEntries.map(([key, value], i) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between py-2.5 px-5',
                      i % 2 === 0 ? 'bg-layer-1' : 'bg-transparent'
                    )}
                  >
                    <MetricLabel metric={key} className="text-[13px] text-text-secondary">
                      {formatLabel(key)}
                    </MetricLabel>
                    <span className="text-[13px] text-text-primary tabular-nums">
                      {formatValue(key, value as number | string | null)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-12 print:hidden">
        <div className="max-w-[720px] mx-auto px-6 py-8">
          {/* Brand contact info */}
          {brandKit?.company_name && (
            <div className="flex items-center gap-4 text-[12px] text-text-secondary mb-6 flex-wrap">
              <span className="font-medium text-text-primary">{brandKit.company_name}</span>
              {brandKit.phone && <span>{brandKit.phone}</span>}
              {brandKit.email && <span>{brandKit.email}</span>}
              {brandKit.website && <span>{brandKit.website}</span>}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-secondary">Powered by Parcel</span>
            <a href="https://parceldesk.io" target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-to-r from-violet-400 to-violet-600 text-white text-sm hover:opacity-90">
                Try Parcel Free
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </a>
          </div>
        </div>
        <div className="max-w-[720px] mx-auto px-6 pb-8">
          <p className="text-[10px] text-text-disabled text-center">
            This report is for informational purposes only and does not constitute financial advice.
            Consult a qualified professional before making investment decisions.
          </p>
        </div>
      </footer>
    </motion.div>
  )
}
