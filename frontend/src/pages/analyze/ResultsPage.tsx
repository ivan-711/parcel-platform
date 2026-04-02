/** Deal results page — strategy-aware KPI cards, outputs table, risk gauge, and action buttons. */

import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, PlusCircle, ChevronDown, ChevronRight, Share2, Save, Check, HelpCircle, FileDown, FileText, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { OfferLetterModal } from '@/components/offer-letter-modal'
import { generateDealReport } from '@/lib/pdf-report'
import { CashFlowProjection } from '@/components/charts/CashFlowProjection'

import { useDeal, useAddToPipeline, useUpdateDeal } from '@/hooks/useDeals'
import { api } from '@/lib/api'
import { staggerContainer, staggerItem, slideUp } from '@/lib/motion'
import {
  formatLabel,
  formatCurrency,
  formatPercent,
  formatOutputValue,
  getRecommendationColor,
} from '@/lib/format'
import { getStrategyKPIs } from '@/lib/strategy-kpis'
import type { KPIDefinition } from '@/lib/strategy-kpis'
import type { Strategy, PlanTier } from '@/types'
import { hasAccess } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { Lock } from 'lucide-react'

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'offer_sent', label: 'Offer Sent' },
  { key: 'under_contract', label: 'Under Contract' },
  { key: 'due_diligence', label: 'Due Diligence' },
]

const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  wholesale: 'Wholesale',
  buy_and_hold: 'Buy & Hold',
  flip: 'Flip',
  brrrr: 'BRRRR',
  creative_finance: 'Creative Finance',
}

export default function ResultsPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const navigate = useNavigate()
  const { data: deal, isLoading, isError, error } = useDeal(dealId ?? '')
  const addToPipeline = useAddToPipeline()
  const updateDeal = useUpdateDeal(dealId ?? '')
  const [saved, setSaved] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [addedToPipeline, setAddedToPipeline] = useState(false)
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [offerLetterOpen, setOfferLetterOpen] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const stageMenuRef = useRef<HTMLDivElement>(null)
  const stageItemsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [focusedStageIndex, setFocusedStageIndex] = useState(-1)

  const authUser = useAuthStore((s) => s.user)
  const effectiveTier: PlanTier =
    authUser?.trial_active && authUser.plan_tier === 'free'
      ? 'pro'
      : (authUser?.plan_tier ?? 'free') as PlanTier
  const isDemo = authUser?.email === 'demo@parcel.app'
  const canAccessPro = isDemo || hasAccess(effectiveTier, 'pro')

  const deleteDeal = useMutation({
    mutationFn: () => api.deals.delete(dealId ?? ''),
    onSuccess: () => {
      toast.success('Deal deleted')
      navigate('/deals')
    },
    onError: () => {
      toast.error('Failed to delete deal')
    },
  })

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

  useEffect(() => {
    if (stageMenuOpen && focusedStageIndex >= 0) {
      stageItemsRef.current[focusedStageIndex]?.focus()
    }
  }, [stageMenuOpen, focusedStageIndex])

  useEffect(() => {
    if (!stageMenuOpen) setFocusedStageIndex(-1)
  }, [stageMenuOpen])

  if (isError) {
    return (
      <AppShell title="Deal Results">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-[#D4766A]/20 bg-[#D4766A]/10 p-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#D4766A] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-primary">Failed to load deal</p>
              <p className="text-xs text-text-secondary">
                {error instanceof Error ? error.message : 'Something went wrong.'}
              </p>
              <Link to="/deals" className="text-xs text-[#8B7AFF] hover:underline">
                Back to My Deals
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

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

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setStageMenuOpen((v) => !v)
      if (!stageMenuOpen) setFocusedStageIndex(0)
    } else if (e.key === 'Escape') {
      setStageMenuOpen(false)
    }
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedStageIndex((prev) => Math.min(prev + 1, PIPELINE_STAGES.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedStageIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedStageIndex >= 0 && focusedStageIndex < PIPELINE_STAGES.length) {
        handleAddToPipeline(PIPELINE_STAGES[focusedStageIndex].key)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setStageMenuOpen(false)
    }
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
          toast.success('Deal saved', {
            action: {
              label: 'View My Deals →',
              onClick: () => navigate('/deals'),
            },
          })
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const handleDownloadReport = () => {
    setGeneratingPDF(true)
    // Defer to next tick so the button shows loading state
    setTimeout(async () => {
      try {
        await generateDealReport(deal)
        toast.success('Report downloaded')
      } catch {
        toast.error('Failed to generate report')
      } finally {
        setGeneratingPDF(false)
      }
    }, 50)
  }

  /** Render a single KPI card based on its definition and render mode. */
  const renderKPI = (kpi: KPIDefinition) => {
    const rawValue = outputs[kpi.key]

    // Handle percent_or_infinite — null means infinite capital return
    if (kpi.format === 'percent_or_infinite') {
      if (rawValue === null || rawValue === undefined) {
        return (
          <div key={kpi.key} className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1 shadow-xs">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-[0.08em]">
              {kpi.label}
            </p>
            <p className="text-kpi-display text-3xl text-[#7CCBA5]">&infin;</p>
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
        <div key={kpi.key} className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1 shadow-xs">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-[0.08em]">
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
        <div key={kpi.key} className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-1 shadow-xs">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-[0.08em]">
            {kpi.label}
          </p>
          <p
            className={`text-kpi-display text-3xl ${
              numValue >= 0 ? 'text-[#7CCBA5]' : 'text-[#D4766A]'
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
      <motion.div
        className="max-w-5xl mx-auto space-y-6"
        variants={staggerContainer(60)}
        initial="hidden"
        animate="visible"
      >
        {/* Breadcrumbs */}
        <motion.nav variants={staggerItem} aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs">
            <li>
              <Link to="/dashboard" className="text-text-muted hover:text-[#8B7AFF] transition-colors">
                Dashboard
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} className="text-text-disabled" /></li>
            <li>
              <Link to="/analyze" className="text-text-muted hover:text-[#8B7AFF] transition-colors">
                Analyzer
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} className="text-text-disabled" /></li>
            <li>
              <Link
                to={`/analyze/${deal.strategy}`}
                className="text-text-muted hover:text-[#8B7AFF] transition-colors"
              >
                {STRATEGY_DISPLAY_NAMES[deal.strategy] ?? deal.strategy}
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} className="text-text-disabled" /></li>
            <li aria-current="page" className="text-text-primary font-medium">
              Results
            </li>
          </ol>
        </motion.nav>

        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-center gap-3">
          <StrategyBadge strategy={deal.strategy as Strategy} />
          <h2 className="text-lg font-semibold text-text-primary">{deal.address}</h2>
        </motion.div>

        {/* Section 1: KPI Row */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(renderKPI)}
        </motion.div>

        {/* Section 2: Two Columns */}
        <motion.div variants={staggerItem} className="grid md:grid-cols-5 gap-6">
          {/* Left — Outputs Table */}
          <div className="md:col-span-3 rounded-xl border border-border-subtle bg-app-surface overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-text-primary">All Outputs</h3>
            </div>
            <div>
              {outputEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className={`flex items-center justify-between py-2 px-3 border-b border-border-subtle last:border-0 ${
                    i % 2 === 0 ? 'bg-transparent' : 'bg-layer-1'
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
                    <span className="text-[13px] text-text-primary tabular-nums">
                      {formatOutputValue(key, value as number | string | null | undefined)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Risk Gauge */}
          <div className="md:col-span-2 rounded-xl border border-border-subtle bg-app-surface p-6 flex flex-col items-center justify-center shadow-xs">
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Risk Score</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Risk score details" className="text-text-muted hover:text-text-secondary transition-colors">
                    <HelpCircle size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 bg-app-elevated border-border-default p-4 shadow-[0_8px_32px_rgba(0,0,0,0.55)]" side="left">
                  <p className="text-sm font-semibold text-text-primary mb-2">Risk Score Breakdown</p>
                  {deal.risk_factors && Object.keys(deal.risk_factors).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(deal.risk_factors).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">{formatLabel(key)}</span>
                          <span className="text-text-primary tabular-nums">
                            {formatOutputValue(key, value as number | string)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">Breakdown not available for this deal.</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <RiskGauge score={riskScore} />
          </div>
        </motion.div>

        {/* Section 3: Cash Flow Projection */}
        <motion.div variants={staggerItem}>
          <CashFlowProjection
            outputs={outputs as Record<string, number | string>}
            strategy={deal.strategy as Strategy}
            dealId={deal.id}
          />
        </motion.div>

        {/* Section 4: Actions */}
        <motion.div variants={slideUp} className="flex gap-2 sm:gap-3 justify-end flex-wrap">
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
                className="inline-flex items-center gap-2 rounded-lg border border-[#8B7AFF]/20 bg-[#8B7AFF]/10 px-4 py-2 min-h-[44px] md:min-h-0 text-sm font-medium text-[#8B7AFF] cursor-default"
              >
                <Check size={14} />
                In Pipeline
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStageMenuOpen((v) => !v)}
                onKeyDown={handleTriggerKeyDown}
                disabled={addToPipeline.isPending}
                aria-haspopup="true"
                aria-expanded={stageMenuOpen}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] px-4 py-2 min-h-[44px] md:min-h-0 text-sm font-medium text-accent-text-on-accent hover:opacity-90 transition-colors disabled:opacity-50"
              >
                <PlusCircle size={14} />
                {addToPipeline.isPending ? 'Adding...' : 'Add to Pipeline'}
                <ChevronDown size={14} />
              </button>
            )}
            {stageMenuOpen && (
              <div
                role="menu"
                onKeyDown={handleMenuKeyDown}
                className="absolute bottom-full mb-1 right-0 z-50 min-w-[180px] rounded-lg border border-border-default bg-app-elevated py-1 shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
              >
                {PIPELINE_STAGES.map((s, i) => (
                  <button
                    key={s.key}
                    ref={(el) => { stageItemsRef.current[i] = el }}
                    type="button"
                    role="menuitem"
                    tabIndex={focusedStageIndex === i ? 0 : -1}
                    className="flex w-full items-center px-3 py-2 text-sm text-text-secondary hover:bg-layer-3 hover:text-text-primary transition-colors"
                    onClick={() => handleAddToPipeline(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleShare} disabled={sharing || copied} className="gap-2 bg-layer-3 border-border-default text-text-secondary hover:bg-layer-4">
            <Share2 size={14} />
            {copied ? 'Link copied!' : sharing ? 'Sharing...' : deal.status === 'shared' ? 'Copy Share Link' : 'Share Deal'}
          </Button>
          {canAccessPro ? (
            <Button variant="outline" onClick={handleDownloadReport} disabled={generatingPDF} className="gap-2 bg-layer-3 border-border-default text-text-secondary hover:bg-layer-4">
              <FileDown size={14} />
              {generatingPDF ? 'Generating...' : 'Download Report'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/pricing')} className="gap-2 bg-layer-3 border-border-default text-text-disabled hover:bg-layer-4">
              <Lock size={14} />
              Export PDF (Pro)
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="gap-2 text-[#D4766A] hover:text-[#D4766A] hover:bg-[#D4766A]/10">
                <Trash2 size={14} />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-app-elevated border-border-default">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-text-primary">Delete this deal?</AlertDialogTitle>
                <AlertDialogDescription className="text-text-secondary">
                  This will permanently delete {deal.address}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-layer-3 border-border-default text-text-secondary hover:bg-layer-4">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteDeal.mutate()} className="bg-[#D4766A] hover:bg-[#D4766A]/90 text-[#0C0B0A]">
                  {deleteDeal.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            onClick={() => navigate(`/chat?dealId=${deal.id}`)}
            className="gap-2 bg-layer-3 border-border-default text-text-secondary hover:bg-layer-4"
          >
            <MessageSquare size={14} />
            Chat about Deal
          </Button>
          {canAccessPro ? (
            <Button
              variant="outline"
              onClick={() => setOfferLetterOpen(true)}
              className="gap-2 bg-layer-3 border-border-default text-text-secondary hover:bg-layer-4"
            >
              <FileText size={14} />
              Offer Letter
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/pricing')} className="gap-2 bg-layer-3 border-border-default text-text-disabled hover:bg-layer-4">
              <Lock size={14} />
              Offer Letter (Pro)
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saved || updateDeal.isPending}
            className="gap-2 bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent hover:opacity-90"
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
        </motion.div>

        {/* Disclaimer */}
        <motion.div variants={staggerItem} className="flex items-start gap-3 rounded-xl border border-[#D4A867]/20 bg-[#D4A867]/10 px-4 py-3">
          <AlertTriangle size={16} className="text-[#D4A867] shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            This analysis is for informational purposes only. It does not constitute an appraisal, financial advice, or investment recommendation. AI-generated content may contain errors. Consult a qualified professional before making investment decisions.
          </p>
        </motion.div>
      </motion.div>

      <OfferLetterModal
        isOpen={offerLetterOpen}
        onClose={() => setOfferLetterOpen(false)}
        dealId={deal.id}
        address={deal.address}
        strategy={deal.strategy as Strategy}
      />
    </AppShell>
  )
}
