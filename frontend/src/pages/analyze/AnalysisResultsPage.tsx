import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Save, GitBranch, FileText, Loader2, Check } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CreateReportModal } from '@/components/reports/CreateReportModal'
import { NarrativeCard } from './components/NarrativeCard'
import { KeyMetrics } from './components/KeyMetrics'
import { FinancialInputs } from './components/FinancialInputs'
import { CashFlowChart } from './components/CashFlowChart'
import { BreakEvenChart } from './components/BreakEvenChart'
import { SensitivityMatrix } from './components/SensitivityMatrix'
import { StrategyComparison } from './components/StrategyComparison'
import { CompsCard } from '@/components/analysis/CompsCard'
import { api } from '@/lib/api'
import { useOnboardingStore } from '@/stores/onboardingStore'
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
  const [refreshingNarrative, setRefreshingNarrative] = useState(false)
  const [inputsChanged, setInputsChanged] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const activeScenario = scenarios.find(s => s.strategy === activeStrategy) || scenarios[0] || null

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
      setError('Could not load property data')
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

  const handleSave = () => {
    setSaved(true)
  }

  const handlePipeline = () => {
    navigate('/pipeline')
  }

  // --- Loading / Error ---

  if (loading) {
    return (
      <AppShell title="Analysis Results">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={24} className="animate-spin text-[#8B7AFF]" />
        </div>
      </AppShell>
    )
  }

  if (error || !property) {
    return (
      <AppShell title="Analysis Results">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-[#F87171] text-sm mb-4">{error || 'Property not found'}</p>
          <button onClick={() => navigate('/analyze')} className="text-sm text-[#8B7AFF] hover:text-[#A89FFF]">
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
            <h1 className="text-2xl sm:text-3xl text-[#F0EDE8] font-light" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {property.address_line1}
            </h1>
            <p className="text-sm text-[#C5C0B8] mt-1">
              {property.city}, {property.state} {property.zip_code}
            </p>
            {propInfo && <p className="text-xs text-[#8A8580] mt-1">{propInfo}</p>}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                saved
                  ? 'border-[#4ADE80]/30 text-[#4ADE80]'
                  : 'border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/30'
              }`}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={handlePipeline}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/30 transition-all"
            >
              <GitBranch size={14} />
              Pipeline
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-all cursor-pointer"
            >
              <FileText size={14} />
              Report
            </button>
          </div>
        </motion.div>

        {/* AI Narrative */}
        <NarrativeCard
          scenario={activeScenario}
          onRefreshNarrative={handleRefreshNarrative}
          refreshing={refreshingNarrative}
          inputsChanged={inputsChanged}
        />

        {/* Strategy + Metrics + Inputs layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 mb-6">
          {/* Strategy selector */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            <p className="hidden lg:block text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-2">
              Strategy Selection
            </p>
            {(['wholesale', 'brrrr', 'buy_and_hold', 'flip', 'creative_finance'] as const).map(s => (
              <button
                key={s}
                onClick={() => handleStrategySwitch(s)}
                className={`flex-shrink-0 text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeStrategy === s
                    ? 'bg-[#1E1D1B] text-[#F0EDE8] border-l-[3px] border-l-[#8B7AFF]'
                    : 'bg-[#141311] text-[#8A8580] hover:text-[#C5C0B8] border-l-[3px] border-l-transparent'
                }`}
              >
                {STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Key metrics */}
          <div className="relative">
            {recalculating && (
              <div className="absolute top-0 right-0 flex items-center gap-1.5 text-xs text-[#8B7AFF]">
                <Loader2 size={12} className="animate-spin" />
                Recalculating...
              </div>
            )}
            {activeScenario && <KeyMetrics scenario={activeScenario} />}
          </div>
        </div>

        {/* Chart */}
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

        {/* Financial inputs + Sensitivity in 2-col */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {activeScenario && (
            <FinancialInputs scenario={activeScenario} onInputsChange={handleInputsChange} />
          )}
          {activeScenario && (
            <SensitivityMatrix scenario={activeScenario} />
          )}
        </div>

        {/* Strategy comparison */}
        {propertyId && activeScenario && (
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
    </AppShell>
  )
}
