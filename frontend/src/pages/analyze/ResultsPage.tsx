/** Deal results page — strategy-aware KPI cards, outputs table, risk gauge, and action buttons. */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Share2, Save, Check } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { Button } from '@/components/ui/button'
import { useDeal, useAddToPipeline, useUpdateDeal } from '@/hooks/useDeals'
import type { Strategy } from '@/types'

/** Format an output key into a human-readable label. */
function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Format a numeric value as currency. */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/** Format a numeric value as a percentage. */
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/** Color class for recommendation badge. */
function getRecommendationColor(value: string): string {
  const lower = value.toLowerCase()
  if (lower.includes('strong') || lower.includes('good')) return 'bg-emerald-500/20 text-emerald-400'
  if (lower.includes('marginal') || lower.includes('caution')) return 'bg-amber-500/20 text-amber-400'
  return 'bg-red-500/20 text-red-400'
}

/** Determine if an output key should be formatted as a percentage. */
function isPercentKey(key: string): boolean {
  const lower = key.toLowerCase()
  return /rate|return|pct|cap_rate|coc|roi|vacancy|maintenance|mgmt/.test(lower)
}

/** Determine if an output key should be formatted as currency. */
function isCurrencyKey(key: string): boolean {
  const lower = key.toLowerCase()
  return /price|cost|payment|flow|income|rent|noi|mao|profit|equity|down|taxes|insurance/.test(lower)
}

/** Format an output value based on its key name. */
function formatOutputValue(key: string, value: number | string): string {
  if (typeof value === 'string') return value
  if (isPercentKey(key)) return formatPercent(value)
  if (isCurrencyKey(key)) return formatCurrency(value)
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

type RenderMode = 'standard' | 'color_coded' | 'badge'

interface KPIDefinition {
  key: string
  label: string
  format: 'currency' | 'percent'
  renderMode: RenderMode
}

/** Get KPI definitions per strategy. */
function getStrategyKPIs(strategy: string): KPIDefinition[] {
  switch (strategy) {
    case 'buy_and_hold':
      return [
        { key: 'cap_rate', label: 'Cap Rate', format: 'percent', renderMode: 'standard' },
        { key: 'coc_return', label: 'Cash-on-Cash Return', format: 'percent', renderMode: 'standard' },
        { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency', renderMode: 'color_coded' },
        { key: 'noi_annual', label: 'NOI Annual', format: 'currency', renderMode: 'standard' },
      ]
    case 'wholesale':
    default:
      return [
        { key: 'mao', label: 'MAO', format: 'currency', renderMode: 'standard' },
        { key: 'profit_at_ask', label: 'Profit at Ask', format: 'currency', renderMode: 'color_coded' },
        { key: 'break_even_price', label: 'Break-Even Price', format: 'currency', renderMode: 'standard' },
        { key: 'recommendation', label: 'Recommendation', format: 'currency', renderMode: 'badge' },
      ]
  }
}

export default function ResultsPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const { data: deal, isLoading } = useDeal(dealId ?? '')
  const addToPipeline = useAddToPipeline()
  const updateDeal = useUpdateDeal(dealId ?? '')
  const [saved, setSaved] = useState(false)

  if (isLoading || !deal) {
    return (
      <AppShell title="Deal Results">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
          <div className="grid md:grid-cols-5 gap-6">
            <SkeletonCard className="md:col-span-3" lines={8} />
            <SkeletonCard className="md:col-span-2" lines={4} />
          </div>
        </div>
      </AppShell>
    )
  }

  const outputs = deal.outputs ?? {}
  const riskScore = deal.risk_score ?? 0
  const kpis = getStrategyKPIs(deal.strategy)
  const outputEntries = Object.entries(outputs)

  const handleAddToPipeline = () => {
    addToPipeline.mutate(
      { deal_id: deal.id, stage: 'lead' },
      {
        onSuccess: () => toast.success('Deal added to pipeline'),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/share/${deal.id}`
    await navigator.clipboard.writeText(url)
    toast.success('Share link copied to clipboard')
  }

  const handleSave = () => {
    updateDeal.mutate(
      { status: 'saved' },
      {
        onSuccess: () => {
          setSaved(true)
          toast.success('Deal saved')
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  /** Render a single KPI card based on its definition and render mode. */
  const renderKPI = (kpi: KPIDefinition) => {
    const rawValue = outputs[kpi.key]

    if (kpi.renderMode === 'badge') {
      const strValue = typeof rawValue === 'string' ? rawValue : 'N/A'
      return (
        <div key={kpi.key} className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            {kpi.label}
          </p>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${getRecommendationColor(strValue)}`}
          >
            {strValue}
          </span>
        </div>
      )
    }

    const numValue = typeof rawValue === 'number' ? rawValue : 0

    if (kpi.renderMode === 'color_coded') {
      const formatted = kpi.format === 'percent' ? formatPercent(numValue) : formatCurrency(numValue)
      return (
        <div key={kpi.key} className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            {kpi.label}
          </p>
          <p
            className={`text-3xl font-semibold font-mono ${
              numValue >= 0 ? 'text-accent-success' : 'text-accent-danger'
            }`}
          >
            {formatted}
          </p>
        </div>
      )
    }

    return (
      <KPICard key={kpi.key} label={kpi.label} value={numValue} format={kpi.format} />
    )
  }

  return (
    <AppShell title="Deal Results">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <StrategyBadge strategy={deal.strategy as Strategy} />
          <h2 className="text-lg font-semibold text-text-primary">{deal.address}</h2>
        </div>

        {/* Section 1: KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(renderKPI)}
        </div>

        {/* Section 2: Two Columns */}
        <div className="grid md:grid-cols-5 gap-6">
          {/* Left — Outputs Table */}
          <div className="md:col-span-3 rounded-xl border border-border-subtle bg-app-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1A1A2E]">
              <h3 className="text-sm font-semibold text-text-primary">All Outputs</h3>
            </div>
            <div>
              {outputEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className={`flex items-center justify-between py-2 px-3 border-b border-[#1A1A2E] ${
                    i % 2 === 0 ? 'bg-[#0F0F1A]' : 'bg-[#08080F]'
                  }`}
                >
                  <span className="text-sm text-text-secondary">{formatLabel(key)}</span>
                  {typeof value === 'string' && key === 'recommendation' ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getRecommendationColor(value)}`}
                    >
                      {value}
                    </span>
                  ) : (
                    <span className="font-mono text-[13px] text-text-primary">
                      {formatOutputValue(key, value as number | string)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Risk Gauge */}
          <div className="md:col-span-2 rounded-xl border border-border-subtle bg-app-surface p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Risk Score</h3>
            <RiskGauge score={riskScore} />
          </div>
        </div>

        {/* Section 3: Actions */}
        <div className="flex gap-3 justify-end flex-wrap">
          <Button variant="ghost" asChild>
            <Link to="/analyze" className="gap-2">
              <ArrowLeft size={14} />
              Back to Analyzer
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleAddToPipeline}
            disabled={addToPipeline.isPending}
            className="gap-2"
          >
            <Plus size={14} />
            {addToPipeline.isPending ? 'Adding...' : 'Add to Pipeline'}
          </Button>
          <Button variant="outline" onClick={handleShare} className="gap-2">
            <Share2 size={14} />
            Share Deal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saved || updateDeal.isPending}
            className="gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white"
          >
            {saved ? (
              <>
                <Check size={14} />
                Saved
              </>
            ) : (
              <>
                <Save size={14} />
                {updateDeal.isPending ? 'Saving...' : 'Save Deal'}
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
