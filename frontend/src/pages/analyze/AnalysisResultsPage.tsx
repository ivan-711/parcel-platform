import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, GitBranch, FileText, Loader2, Check, Users, ChevronDown, Calculator, Info, X } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { CreateReportModal } from '@/components/reports/CreateReportModal'
import { VerdictBadge } from './components/VerdictBadge'
import { NarrativeCard } from './components/NarrativeCard'
import { KeyMetrics } from './components/KeyMetrics'
import { FinancialInputs } from './components/FinancialInputs'
import { CashFlowChart } from './components/CashFlowChart'
import { BreakEvenChart } from './components/BreakEvenChart'
import { SensitivityMatrix } from './components/SensitivityMatrix'
import { StrategyComparison } from './components/StrategyComparison'
import { CashFlowBreakdown } from './components/CashFlowBreakdown'
import { CompsCard } from '@/components/analysis/CompsCard'
import { ReverseCalculatorModal } from './components/ReverseCalculatorModal'
import { api } from '@/lib/api'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useAuthStore } from '@/stores/authStore'
import { SampleBadge } from '@/components/SampleBadge'
import type { PropertyDetail, ScenarioDetail, Strategy } from '@/types'

const STRATEGY_LABELS: Record<string, string> = {
  wholesale: 'Wholesale', brrrr: 'BRRRR', buy_and_hold: 'Buy & Hold',
  flip: 'Flip', creative_finance: 'Creative Finance',
}

const PERSONA_DEFAULT_STRATEGY: Record<string, Strategy> = {
  wholesale: 'wholesale', flip: 'flip', buy_and_hold: 'buy_and_hold',
  creative_finance: 'creative_finance', brrrr: 'brrrr',
  hybrid: 'buy_and_hold', agent: 'buy_and_hold', beginner: 'buy_and_hold',
}

const GUIDANCE_DISMISSED_KEY = 'parcel_beginner_strategy_hint_dismissed'

export default function AnalysisResultsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const persona = useOnboardingStore(s => s.persona)

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioDetail[]>([])
  const [activeStrategy, setActiveStrategy] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [dealId, setDealId] = useState<string | null>(null)
  const [refreshingNarrative, setRefreshingNarrative] = useState(false)
  const [inputsChanged, setInputsChanged] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [sensitivityOpen, setSensitivityOpen] = useState(false)
  const [reverseModalOpen, setReverseModalOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  const [guidanceDismissed, setGuidanceDismissed] = useState(
    () => localStorage.getItem(GUIDANCE_DISMISSED_KEY) === 'true'
  )
  const showGuidance = persona === 'beginner' && !guidanceDismissed
  const isHybrid = persona === 'hybrid'
  const guidanceShownAt = useRef<number>(0)
  const hybridShownTracked = useRef(false)

  useEffect(() => {
    if (!showGuidance) return
    guidanceShownAt.current = Date.now()
    try {
      (window as any).posthog?.capture?.('beginner_guidance_shown', {
        persona: 'beginner',
        deal_id: dealId,
        user_id: user?.id ?? null,
      })
    } catch { /* ignore */ }
  }, [showGuidance])

  useEffect(() => {
    if (!isHybrid || hybridShownTracked.current) return
    if (loading || !property) return
    hybridShownTracked.current = true
    try {
      (window as any).posthog?.capture?.('hybrid_comparison_shown', {
        persona: 'hybrid',
        deal_id: dealId,
        user_id: user?.id ?? null,
      })
    } catch { /* ignore */ }
  }, [isHybrid, loading, property, dealId, user?.id])

  const handleDismissGuidance = () => {
    localStorage.setItem(GUIDANCE_DISMISSED_KEY, 'true')
    setGuidanceDismissed(true)
    try {
      (window as any).posthog?.capture?.('beginner_guidance_dismissed', {
        persona: 'beginner',
        deal_id: dealId,
        user_id: user?.id ?? null,
        dismissed_at_ms_since_shown: Date.now() - guidanceShownAt.current,
      })
    } catch { /* ignore */ }
  }

  const activeScenario = scenarios.find(s => s.strategy === activeStrategy) || null

  // Load data
  useEffect(() => {
    if (!propertyId) return

    const routerState = (location.state as any)?.analysisResult

    if (routerState?.property && routerState?.scenario) {
      // Use data from router state (navigated from analysis flow)
      const prop = routerState.property as PropertyDetail
      setProperty(prop)
      const scenario = routerState.scenario as ScenarioDetail
      setScenarios([scenario])
      setActiveStrategy(scenario.strategy)
      if (routerState.deal_id) setDealId(routerState.deal_id as string)
      setLoading(false)
    } else {
      // Fetch from API (direct URL navigation)
      loadFromAPI()
    }
  }, [propertyId])

  const loadFromAPI = async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      // Primary path: param is a property ID (links from dashboard, deal cards, etc.)
      const [prop, scens] = await Promise.all([
        api.properties.get(propertyId),
        api.properties.scenarios(propertyId),
      ])
      setProperty(prop)
      setScenarios(scens)

      // Pick default strategy based on persona or first scenario
      const defaultStrategy = PERSONA_DEFAULT_STRATEGY[persona || 'buy_and_hold'] || 'buy_and_hold'
      const match = scens.find(s => s.strategy === defaultStrategy)
      setActiveStrategy(match?.strategy || scens[0]?.strategy || 'buy_and_hold')
    } catch {
      // Fallback: param might be a scenario ID (direct URL with scenario UUID)
      try {
        const scenario = await api.analysis.getScenario(propertyId)
        const [prop, scens] = await Promise.all([
          api.properties.get(scenario.property_id),
          api.properties.scenarios(scenario.property_id),
        ])
        setProperty(prop)
        setScenarios(scens)
        setActiveStrategy(scenario.strategy)
      } catch {
        setError('Could not load property data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStrategySwitch = useCallback(async (strategy: string) => {
    setActiveStrategy(strategy)
    setInputsChanged(false)

    // If scenario doesn't exist yet, it was created by StrategyComparison
    // Refresh scenarios list
    if (propertyId && !scenarios.find(s => s.strategy === strategy)) {
      try {
        const scens = await api.properties.scenarios(propertyId)
        setScenarios(scens)
      } catch { /* ignore */ }
    }
  }, [propertyId, scenarios])

  const handleInputsChange = useCallback(async (inputs: Record<string, number>) => {
    if (!activeScenario) return
    setInputsChanged(true)
    setRecalculating(true)

    try {
      // Build full inputs from scenario + overrides
      const fullInputs: Record<string, number | string> = {}
      if (activeScenario.inputs_extended) {
        for (const [k, v] of Object.entries(activeScenario.inputs_extended)) {
          fullInputs[k] = v
        }
      }
      // Add typed columns
      if (activeScenario.purchase_price) fullInputs.purchase_price = activeScenario.purchase_price
      if (activeScenario.monthly_rent) fullInputs.monthly_rent = activeScenario.monthly_rent
      if (activeScenario.after_repair_value) fullInputs.after_repair_value = activeScenario.after_repair_value
      if (activeScenario.repair_cost) fullInputs.repair_cost = activeScenario.repair_cost
      if (activeScenario.down_payment_pct) fullInputs.down_payment_pct = activeScenario.down_payment_pct
      if (activeScenario.interest_rate) fullInputs.interest_rate = activeScenario.interest_rate
      if (activeScenario.loan_term_years) fullInputs.loan_term_years = activeScenario.loan_term_years

      // Apply overrides
      Object.assign(fullInputs, inputs)

      const result = await api.analysis.calculate(activeStrategy, fullInputs)

      // Update the active scenario's outputs locally
      setScenarios(prev => prev.map(s =>
        s.id === activeScenario.id ? { ...s, outputs: result.outputs, risk_score: result.risk_score } : s
      ))
    } catch { /* silently fail — inputs may be incomplete */ }
    finally { setRecalculating(false) }
  }, [activeScenario, activeStrategy])

  const handleRefreshNarrative = useCallback(async () => {
    if (!activeScenario) return
    setRefreshingNarrative(true)
    try {
      const updated = await api.analysis.regenerateNarrative(activeScenario.id)
      setScenarios(prev => prev.map(s =>
        s.id === activeScenario.id ? { ...s, ai_narrative: updated.ai_narrative, ai_narrative_generated_at: updated.ai_narrative_generated_at } : s
      ))
      setInputsChanged(false)
    } catch { /* silently fail */ }
    finally { setRefreshingNarrative(false) }
  }, [activeScenario])

  const handleSave = useCallback(async () => {
    if (saved || !dealId) return
    setSaved(true)
    try {
      await api.pipeline.add({ deal_id: dealId, stage: 'lead' })
      toast.success('Deal saved to pipeline', {
        action: { label: 'View Pipeline →', onClick: () => navigate('/pipeline') },
      })
    } catch {
      toast.success('Deal saved')
    }
    try { ;(window as any).posthog?.capture?.('deal_saved', { property_id: propertyId, deal_id: dealId }) } catch {}
  }, [saved, dealId, propertyId, navigate])

  const handlePipeline = useCallback(async () => {
    if (!dealId) {
      toast.error('No deal found — please re-analyze the property')
      return
    }
    try {
      await api.pipeline.add({ deal_id: dealId, stage: 'lead' })
      toast.success('Added to pipeline')
      try { ;(window as any).posthog?.capture?.('deal_added_to_pipeline', { property_id: propertyId, deal_id: dealId }) } catch {}
      navigate('/pipeline')
    } catch {
      toast.error('Could not add to pipeline')
    }
  }, [dealId, propertyId, navigate])

  const handleApplyReversePrice = useCallback(async (price: number) => {
    if (!activeScenario) return
    // Trigger recalculation with the new price
    const priceField = activeStrategy === 'creative_finance' ? 'existing_loan_balance' : 'purchase_price'
    await handleInputsChange({ [priceField]: price })
  }, [activeScenario, activeStrategy, handleInputsChange])

  // --- Loading / Error ---

  if (loading) {
    return (
      <AppShell title="Analysis Results">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={24} className="animate-spin text-accent-primary" />
        </div>
      </AppShell>
    )
  }

  if (error || !property) {
    return (
      <AppShell title="Analysis Results">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-loss text-sm mb-4">{error || 'Property not found'}</p>
          <button onClick={() => navigate('/analyze')} className="text-sm text-accent-primary hover:text-accent-hover transition-colors">
            ← Back to Analyze
          </button>
        </div>
      </AppShell>
    )
  }

  // --- Property info ---
  const propInfo = [
    property.bedrooms && `${property.bedrooms}BR`,
    property.bathrooms && `${property.bathrooms}BA`,
    property.sqft && `${property.sqft.toLocaleString()} sqft`,
    property.year_built && `Built ${property.year_built}`,
    property.property_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
  ].filter(Boolean).join(' · ')

  return (
    <AppShell title="Analysis">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl text-text-primary font-brand font-light">
                {property.address_line1}
              </h1>
              {property.is_sample && <SampleBadge />}
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {property.city}, {property.state} {property.zip_code}
            </p>
            {propInfo && <p className="text-xs text-text-muted mt-1">{propInfo}</p>}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto">
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                saved
                  ? 'border-profit/30 text-profit'
                  : 'border-border-default text-text-secondary hover:border-accent-primary/30'
              }`}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved' : 'Save'}
            </button>
            {persona !== 'beginner' && (
              <button
                onClick={handlePipeline}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-accent-primary/30 transition-all"
              >
                <GitBranch size={14} />
                Pipeline
              </button>
            )}
            {activeStrategy !== 'wholesale' && (
              <button
                onClick={() => setReverseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-accent-primary/30 hover:text-accent-primary transition-all cursor-pointer"
              >
                <Calculator size={14} />
                <span className="hidden sm:inline">Max Price</span>
              </button>
            )}
            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-accent-primary text-white hover:bg-accent-hover transition-all cursor-pointer"
            >
              <FileText size={14} />
              Report
            </button>
            {persona !== 'beginner' && (
              <button
                onClick={() => {
                  try { ;(window as any).posthog?.capture?.('find_buyers_clicked', { source: 'analysis' }) } catch {}
                  navigate(`/dispositions/matches/${propertyId}`)
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-accent-primary/30 hover:text-accent-primary transition-all cursor-pointer"
              >
                <Users size={14} />
                Find Buyers
              </button>
            )}
          </div>
        </motion.div>

        {/* Verdict + Hero metric */}
        {activeScenario && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <VerdictBadge scenario={activeScenario} />
          </div>
        )}

        {/* AI Narrative */}
        <NarrativeCard
          scenario={activeScenario}
          onRefreshNarrative={handleRefreshNarrative}
          refreshing={refreshingNarrative}
          inputsChanged={inputsChanged}
        />

        {/* Beginner strategy guidance */}
        {showGuidance && (
          <div className="flex items-start gap-3 rounded-lg border border-violet-400/10 bg-violet-400/[0.04] px-4 py-3 mb-6">
            <Info size={16} className="text-violet-400 mt-0.5 shrink-0" />
            <p className="text-sm text-text-secondary flex-1">
              We started with Buy &amp; Hold — the most common strategy for your first rental. Tap any strategy to compare.
            </p>
            <button
              onClick={handleDismissGuidance}
              aria-label="Dismiss guidance"
              className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Hybrid strategy comparison banner — surfaces multi-strategy view first */}
        {isHybrid && (
          <div className="flex items-start gap-3 rounded-lg border border-violet-400/10 bg-violet-400/[0.04] px-4 py-3 mb-6">
            <Info size={16} className="text-violet-400 mt-0.5 shrink-0" />
            <p className="text-sm text-text-secondary flex-1">
              You said you use multiple strategies, so we&apos;re showing all of them side-by-side. Tap any strategy below for the deeper view.
            </p>
          </div>
        )}

        {/* Strategy comparison — rendered first for hybrid persona */}
        {isHybrid && propertyId && activeScenario && (
          <div className="mb-6">
            <StrategyComparison
              propertyId={propertyId}
              activeStrategy={activeStrategy}
              scenarios={scenarios}
              onStrategySwitch={handleStrategySwitch}
            />
          </div>
        )}

        {/* Strategy + Metrics + Inputs layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 mb-6">
          {/* Strategy selector */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            <p className="hidden lg:block text-[11px] text-text-muted uppercase tracking-wider font-medium mb-2">
              Strategy Selection
            </p>
            {(['wholesale', 'brrrr', 'buy_and_hold', 'flip', 'creative_finance'] as const).map(s => (
              <button
                key={s}
                onClick={() => handleStrategySwitch(s)}
                className={`flex-shrink-0 text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeStrategy === s
                    ? 'bg-layer-3 text-text-primary ring-1 ring-accent-primary'
                    : 'bg-layer-2 text-text-muted hover:text-text-secondary'
                }`}
              >
                {STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Key metrics */}
          <div className="relative">
            {recalculating && (
              <div className="absolute top-0 right-0 flex items-center gap-1.5 text-xs text-accent-primary">
                <Loader2 size={12} className="animate-spin" />
                Recalculating...
              </div>
            )}
            {activeScenario ? (
              <KeyMetrics scenario={activeScenario} />
            ) : (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <p className="text-sm text-text-muted mb-2">No analysis for this strategy yet</p>
                  <p className="text-xs text-text-muted/60">Select a different strategy or run a new analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Waterfall — monthly cash flow breakdown */}
        {activeScenario && ['buy_and_hold', 'brrrr', 'creative_finance'].includes(activeStrategy) && (
          <div className="mb-6">
            <CashFlowBreakdown scenario={activeScenario} />
          </div>
        )}

        {/* 30-year cash flow projection */}
        {activeScenario && (activeStrategy === 'buy_and_hold' || activeStrategy === 'brrrr') && (
          <div className="mb-6">
            <CashFlowChart scenario={activeScenario} />
          </div>
        )}

        {/* Break-even timeline */}
        {activeScenario && (
          <div className="mb-6">
            <BreakEvenChart scenario={activeScenario} />
          </div>
        )}

        {/* Comparable Sales + Repairs (from Bricked data) */}
        {activeScenario && (
          <div className="mb-6">
            <CompsCard scenarioId={activeScenario.id} />
          </div>
        )}

        {/* Financial inputs (full width) */}
        {activeScenario && (
          <div className="mb-6">
            <FinancialInputs scenario={activeScenario} onInputsChange={handleInputsChange} />
          </div>
        )}

        {/* Sensitivity matrix (collapsed by default) */}
        {activeScenario && ['buy_and_hold', 'brrrr', 'creative_finance'].includes(activeStrategy) && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setSensitivityOpen(!sensitivityOpen)}
              aria-expanded={sensitivityOpen}
              aria-label="Toggle sensitivity analysis"
              className="flex w-full items-center justify-between py-3 text-left cursor-pointer group"
            >
              <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">
                Sensitivity Analysis
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform duration-200 ${
                  sensitivityOpen ? 'text-accent-primary rotate-180' : 'text-text-muted'
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {sensitivityOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <SensitivityMatrix scenario={activeScenario} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Strategy comparison — rendered at bottom for non-hybrid personas (hybrid sees it at top) */}
        {!isHybrid && propertyId && activeScenario && (
          <div className="mb-6">
            <StrategyComparison
              propertyId={propertyId}
              activeStrategy={activeStrategy}
              scenarios={scenarios}
              onStrategySwitch={handleStrategySwitch}
            />
          </div>
        )}
      </div>

      <CreateReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        propertyId={propertyId}
        scenarioId={activeScenario?.id}
        defaultTitle={property ? `Analysis Report — ${property.address_line1}` : 'Analysis Report'}
      />

      {activeScenario && activeStrategy !== 'wholesale' && (
        <ReverseCalculatorModal
          open={reverseModalOpen}
          onOpenChange={setReverseModalOpen}
          scenario={activeScenario}
          strategy={activeStrategy}
          onApplyPrice={handleApplyReversePrice}
        />
      )}
    </AppShell>
  )
}
