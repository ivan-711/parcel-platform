/** Deal results page — KPI cards, outputs table, risk gauge, and action buttons. */

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

/** Color class for recommendation badge. */
function getRecommendationColor(value: string): string {
  const lower = value.toLowerCase()
  if (lower.includes('strong') || lower.includes('good')) return 'bg-emerald-500/20 text-emerald-400'
  if (lower.includes('marginal') || lower.includes('caution')) return 'bg-amber-500/20 text-amber-400'
  return 'bg-red-500/20 text-red-400'
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
  const mao = typeof outputs.mao === 'number' ? outputs.mao : 0
  const profitAtAsk = typeof outputs.profit_at_ask === 'number' ? outputs.profit_at_ask : 0
  const breakEvenPrice = typeof outputs.break_even_price === 'number' ? outputs.break_even_price : 0
  const recommendation = typeof outputs.recommendation === 'string' ? outputs.recommendation : 'N/A'
  const riskScore = deal.risk_score ?? 0

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
          <KPICard label="MAO" value={mao} format="currency" />
          <div className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Profit at Ask
            </p>
            <p
              className={`text-3xl font-semibold font-mono ${
                profitAtAsk >= 0 ? 'text-accent-success' : 'text-accent-danger'
              }`}
            >
              {formatCurrency(profitAtAsk)}
            </p>
          </div>
          <KPICard label="Break-Even Price" value={breakEvenPrice} format="currency" />
          <div className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Recommendation
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${getRecommendationColor(recommendation)}`}
            >
              {recommendation}
            </span>
          </div>
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
                  {key === 'recommendation' ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getRecommendationColor(String(value))}`}
                    >
                      {String(value)}
                    </span>
                  ) : (
                    <span className="font-mono text-[13px] text-text-primary">
                      {typeof value === 'number' ? formatCurrency(value) : String(value)}
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
