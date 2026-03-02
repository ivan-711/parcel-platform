/** Deal results page — strategy-aware KPI cards, outputs table, risk gauge, and action buttons. */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, ChevronDown, Share2, Save, Check, HelpCircle, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { AppShell } from '@/components/layout/AppShell'
import { KPICard } from '@/components/ui/KPICard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DealPDF } from '@/components/deal-pdf'
import { OfferLetterModal } from '@/components/offer-letter-modal'
import { useDeal, useAddToPipeline, useUpdateDeal } from '@/hooks/useDeals'
import { api } from '@/lib/api'
import {
  formatLabel,
  formatCurrency,
  formatPercent,
  formatOutputValue,
  getRecommendationColor,
} from '@/lib/format'
import { getStrategyKPIs } from '@/lib/strategy-kpis'
import type { KPIDefinition } from '@/lib/strategy-kpis'
import type { Strategy } from '@/types'

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'offer_sent', label: 'Offer Sent' },
  { key: 'under_contract', label: 'Under Contract' },
  { key: 'due_diligence', label: 'Due Diligence' },
]

export default function ResultsPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const navigate = useNavigate()
  const { data: deal, isLoading } = useDeal(dealId ?? '')
  const addToPipeline = useAddToPipeline()
  const updateDeal = useUpdateDeal(dealId ?? '')
  const [saved, setSaved] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [addedToPipeline, setAddedToPipeline] = useState(false)
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [offerLetterOpen, setOfferLetterOpen] = useState(false)
  const stageMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAddedToPipeline(false)
  }, [dealId])

  useEffect(() => {
    if (!stageMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
        setStageMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [stageMenuOpen])

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
  const sanitizeFilename = (name: string) =>
    name.replace(/[\s,.\\/]+/g, '-').replace(/-+/g, '-').toLowerCase()
  const pdfDocument = useMemo(() => <DealPDF deal={deal} />, [deal])

  const handleAddToPipeline = (stage: string) => {
    setStageMenuOpen(false)
    const stageLabel = PIPELINE_STAGES.find((s) => s.key === stage)?.label ?? stage
    addToPipeline.mutate(
      { deal_id: deal.id, stage },
      {
        onSuccess: () => {
          setAddedToPipeline(true)
          toast.success(`Added to Pipeline · ${stageLabel}`, {
            action: {
              label: 'View Pipeline →',
              onClick: () => navigate('/pipeline'),
            },
          })
        },
        onError: (err) => {
          const msg = err.message.toLowerCase()
          if (msg.includes('already') || msg.includes('conflict') || msg.includes('duplicate')) {
            setAddedToPipeline(true)
            toast.info('Already in Pipeline')
          } else {
            toast.error('Failed to add to pipeline — try again')
          }
        },
      }
    )
  }

  const showCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (deal.status === 'shared') {
      const url = `${window.location.origin}/share/${deal.id}`
      await navigator.clipboard.writeText(url)
      showCopied()
      return
    }
    setSharing(true)
    try {
      const res = await api.deals.share(deal.id)
      await navigator.clipboard.writeText(res.share_url)
      showCopied()
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
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Risk Score</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
                    <HelpCircle size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 bg-app-surface border-border-subtle p-4" side="left">
                  <p className="text-sm font-semibold text-text-primary mb-2">Risk Score Breakdown</p>
                  {deal.risk_factors && Object.keys(deal.risk_factors).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(deal.risk_factors).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">{formatLabel(key)}</span>
                          <span className="font-mono text-text-primary">
                            {formatOutputValue(key, value as number | string)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">Breakdown not available for this deal.</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
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
          <div className="relative" ref={stageMenuRef}>
            {addedToPipeline ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-lg border border-[#10B981]/30 bg-[#16162A] px-4 py-2 text-sm font-medium text-[#10B981] cursor-default"
              >
                <Check size={14} />
                In Pipeline
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStageMenuOpen((v) => !v)}
                disabled={addToPipeline.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white hover:bg-[#5558E3] transition-colors disabled:opacity-50"
              >
                <PlusCircle size={14} />
                {addToPipeline.isPending ? 'Adding...' : 'Add to Pipeline'}
                <ChevronDown size={14} />
              </button>
            )}
            {stageMenuOpen && (
              <div className="absolute bottom-full mb-1 right-0 z-50 min-w-[180px] rounded-lg border border-[#1A1A2E] bg-[#0F0F1A] py-1 shadow-lg">
                {PIPELINE_STAGES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="flex w-full items-center px-3 py-2 text-sm text-[#F1F5F9] hover:bg-[#6366F1]/20 transition-colors"
                    onClick={() => handleAddToPipeline(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleShare} disabled={sharing || copied} className="gap-2">
            <Share2 size={14} />
            {copied ? 'Link copied!' : sharing ? 'Sharing...' : deal.status === 'shared' ? 'Copy Share Link' : 'Share Deal'}
          </Button>
          <PDFDownloadLink
            document={pdfDocument}
            fileName={`parcel-analysis-${sanitizeFilename(deal.address)}.pdf`}
          >
            {({ loading }) => (
              <Button variant="outline" disabled={loading} className="gap-2">
                <Download size={14} />
                {loading ? 'Preparing...' : 'Export PDF'}
              </Button>
            )}
          </PDFDownloadLink>
          <Button
            variant="outline"
            onClick={() => setOfferLetterOpen(true)}
            className="gap-2"
          >
            <FileText size={14} />
            Offer Letter
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

      <OfferLetterModal
        isOpen={offerLetterOpen}
        onClose={() => setOfferLetterOpen(false)}
        dealId={deal.id}
        address={deal.address}
        strategy={deal.strategy}
      />
    </AppShell>
  )
}
