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
import { api } from '@/lib/api'
import {
  formatLabel,
  formatCurrency,
  formatPercent,
  formatOutputValue,
  getRecommendationColor,
} from '@/lib/format'
import type { Strategy } from '@/types'

type RenderMode = 'standard' | 'color_coded' | 'badge'

interface KPIDefinition {
  key: string
  label: string
  format: 'currency' | 'percent' | 'decimal' | 'percent_or_infinite'
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
    case 'flip':
      return [
        { key: 'gross_profit', label: 'Gross Profit', format: 'currency', renderMode: 'standard' },
        { key: 'roi', label: 'ROI', format: 'percent', renderMode: 'standard' },
        { key: 'annualized_roi', label: 'Annualized ROI', format: 'percent', renderMode: 'standard' },
        { key: 'total_cost', label: 'Total Cost', format: 'currency', renderMode: 'standard' },
      ]
    case 'brrrr':
      return [
        { key: 'money_left_in', label: 'Money Left In', format: 'currency', renderMode: 'standard' },
        { key: 'coc_return', label: 'Cash-on-Cash', format: 'percent_or_infinite', renderMode: 'standard' },
        { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency', renderMode: 'color_coded' },
        { key: 'equity_captured', label: 'Equity Captured', format: 'currency', renderMode: 'standard' },
      ]
    case 'creative_finance':
      return [
        { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency', renderMode: 'color_coded' },
        { key: 'dscr', label: 'DSCR', format: 'decimal', renderMode: 'standard' },
        { key: 'equity_day_one', label: 'Equity Day One', format: 'currency', renderMode: 'standard' },
        { key: 'effective_yield', label: 'Effective Yield', format: 'percent', renderMode: 'standard' },
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
  const [sharing, setSharing] = useState(false)

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
    if (deal.status === 'shared') {
      const url = `${window.location.origin}/share/${deal.id}`
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied to clipboard')
      return
    }
    setSharing(true)
    try {
      const res = await api.deals.share(deal.id)
      await navigator.clipboard.writeText(res.share_url)
      toast.success('Deal shared! Link copied to clipboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share deal')
    } finally {
      setSharing(false)
    }
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

    // Handle percent_or_infinite — null means infinite capital return
    if (kpi.format === 'percent_or_infinite') {
      if (rawValue === null || rawValue === undefined) {
        return (
          <div key={kpi.key} className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {kpi.label}
            </p>
            <p className="text-3xl font-semibold font-mono text-accent-success">∞</p>
          </div>
        )
      }
      return (
        <KPICard key={kpi.key} label={kpi.label} value={rawValue as number} format="percent" />
      )
    }

    // Handle decimal (e.g., DSCR) — map to KPICard 'number' format
    if (kpi.format === 'decimal') {
      const numValue = typeof rawValue === 'number' ? rawValue : 0
      return (
        <KPICard key={kpi.key} label={kpi.label} value={numValue} format="number" />
      )
    }

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
                      {formatOutputValue(key, value as number | string | null | undefined)}
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
          <Button variant="outline" onClick={handleShare} disabled={sharing} className="gap-2">
            <Share2 size={14} />
            {sharing ? 'Sharing...' : deal.status === 'shared' ? 'Copy Share Link' : 'Share Deal'}
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
