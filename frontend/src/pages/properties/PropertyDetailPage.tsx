import { useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building,
  Bed,
  Bath,
  Ruler,
  CalendarDays,
  MapPin,
  FileText,
  Activity,
  BarChart3,
  DollarSign,
  Trash2,
  Search,
  GitBranch,
  Database,
  Landmark,
  Users,
  Loader2,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { SampleBadge } from '@/components/SampleBadge'
import {
  useProperty,
  usePropertyScenarios,
  usePropertyActivity,
  useDeleteProperty,
} from '@/hooks/useProperties'
import { TaskList } from '@/components/tasks/TaskList'
import { AddTaskForm } from '@/components/tasks/AddTaskForm'
import { useTasksList } from '@/hooks/useTasks'
import { useInstruments, useInstrument } from '@/hooks/useFinancing'
import { useRehabProjects } from '@/hooks/useRehab'
import { useSkipTrace } from '@/hooks/useSkipTracing'
import { SkipTraceResultCard } from '@/components/skip-tracing/SkipTraceResultCard'
import { AddInstrumentModal } from '@/components/financing/AddInstrumentModal'
import { useTransactions } from '@/hooks/useTransactions'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { cn } from '@/lib/utils'
import type { PropertyDetail, ScenarioDetail, PropertyActivityEvent } from '@/types'
import type { InstrumentListItem } from '@/types/financing'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Building },
  { key: 'financials', label: 'Financials', icon: BarChart3 },
  { key: 'financing', label: 'Financing', icon: Landmark },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
] as const

type TabKey = (typeof TABS)[number]['key']

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-[#8A8580]/20 text-text-secondary border-[#8A8580]/30',
  under_analysis: 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#60A5FA]/30',
  in_pipeline: 'bg-[#8B7AFF]/15 text-[#A89FFF] border-[#8B7AFF]/30',
  owned: 'bg-[#4ADE80]/15 text-[#6DBEA3] border-[#4ADE80]/30',
  sold: 'bg-[#C5C0B8]/15 text-text-muted border-[#C5C0B8]/30',
  archived: 'bg-border-default text-text-muted border-border-default',
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.prospect
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', colors)}>
      {label}
    </span>
  )
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const activeTab = (searchParams.get('tab') as TabKey) || 'overview'
  const setActiveTab = (tab: TabKey) => {
    setSearchParams({ tab })
    try {
      (window as any).posthog?.capture?.('property_tab_switched', { from_tab: activeTab, to_tab: tab })
    } catch { /* ignore */ }
  }

  const { data: property, isLoading, isError } = useProperty(propertyId)
  const { data: scenarios } = usePropertyScenarios(propertyId)
  const { data: activityEvents } = usePropertyActivity(propertyId)
  const { data: tasksData } = useTasksList({ property_id: propertyId, per_page: 5 })
  const { data: instrumentsData } = useInstruments({ property_id: propertyId })
  const deleteMutation = useDeleteProperty()

  const [skipTraceResult, setSkipTraceResult] = useState<import('@/types').SkipTraceResult | null>(null)
  const skipTrace = useSkipTrace()
  const isTracing = skipTrace.isPending

  function handleSkipTrace() {
    if (!propertyId) return
    skipTrace.mutate({ property_id: propertyId, compliance_acknowledged: true }, {
      onSuccess: (result) => setSkipTraceResult(result),
    })
    try { (window as any).posthog?.capture?.('skip_trace_single', { source: 'property_detail', had_property_id: true }) } catch {}
  }

  // PostHog
  if (property) {
    try {
      (window as any).posthog?.capture?.('property_detail_viewed', {
        property_id: propertyId,
        status: property.status,
      })
    } catch { /* ignore */ }
  }

  const handleDelete = () => {
    if (!property || !propertyId) return
    if (!confirm(`Delete "${property.address_line1}"? This cannot be undone.`)) return
    deleteMutation.mutate(propertyId, {
      onSuccess: () => {
        toast.success('Property deleted')
        navigate('/properties')
      },
      onError: () => toast.error('Failed to delete property'),
    })
  }

  if (isLoading) {
    return (
      <AppShell title="Property">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-layer-2 rounded animate-pulse" />
          <div className="h-40 bg-layer-2 rounded-xl animate-pulse" />
          <div className="h-60 bg-layer-2 rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  if (isError || !property) {
    return (
      <AppShell title="Property">
        <EmptyState
          icon={Building}
          heading="Property not found"
          description="This property may have been deleted."
          ctaLabel="Back to Properties"
          ctaHref="/properties"
        />
      </AppShell>
    )
  }

  return (
    <AppShell
      title={property.address_line1}
      breadcrumbs={[
        { label: 'Properties', href: '/properties' },
        { label: property.address_line1 },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <PropertyHeader
          property={property}
          propertyId={propertyId!}
          navigate={navigate}
          onDelete={handleDelete}
          onSkipTrace={handleSkipTrace}
          isTracing={isTracing}
        />

        {/* Skip Trace Results */}
        {skipTraceResult && skipTraceResult.status === 'found' && (
          <div className="bg-layer-2 border border-border-default rounded-xl p-5">
            <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-4">Skip Trace Results</h3>
            <SkipTraceResultCard result={skipTraceResult} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border-default overflow-x-auto scrollbar-luxury">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px',
                  isActive
                    ? 'text-text-primary border-[#8B7AFF]'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                )}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              property={property}
              scenarios={scenarios ?? []}
              propertyId={propertyId!}
              tasks={tasksData?.tasks ?? []}
            />
          )}
          {activeTab === 'financials' && (
            <FinancialsTab
              scenarios={scenarios ?? []}
              propertyId={propertyId!}
            />
          )}
          {activeTab === 'financing' && (
            <FinancingTab
              instruments={instrumentsData?.items ?? []}
              propertyId={propertyId!}
              propertyAddress={property.address_line1}
            />
          )}
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'activity' && (
            <ActivityTab events={activityEvents ?? []} />
          )}
        </motion.div>
      </div>
    </AppShell>
  )
}

/* ─── Header ─── */

function PropertyHeader({
  property,
  propertyId,
  navigate,
  onDelete,
  onSkipTrace,
  isTracing,
}: {
  property: PropertyDetail
  propertyId: string
  navigate: (path: string) => void
  onDelete: () => void
  onSkipTrace: () => void
  isTracing: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-xl sm:text-2xl text-text-primary"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            {property.address_line1}
          </h1>
          <StatusBadge status={property.status} />
          {property.is_sample && <SampleBadge />}
        </div>
        <p className="text-sm text-text-muted">
          {property.city}, {property.state} {property.zip_code}
          {property.county && ` · ${property.county} County`}
        </p>

        {/* Property specs */}
        <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
          {property.property_type && (
            <span className="flex items-center gap-1">
              <Building size={12} className="text-text-muted" />
              {property.property_type.toUpperCase()}
            </span>
          )}
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed size={12} className="text-text-muted" />
              {property.bedrooms} bd
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath size={12} className="text-text-muted" />
              {property.bathrooms} ba
            </span>
          )}
          {property.sqft != null && (
            <span className="flex items-center gap-1">
              <Ruler size={12} className="text-text-muted" />
              {property.sqft.toLocaleString()} sqft
            </span>
          )}
          {property.year_built != null && (
            <span className="flex items-center gap-1">
              <CalendarDays size={12} className="text-text-muted" />
              {property.year_built}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/analyze"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
        >
          <Search size={14} />
          Analyze
        </Link>
        <button
          onClick={() => {
            try { ;(window as any).posthog?.capture?.('find_buyers_clicked', { source: 'property' }) } catch {}
            navigate(`/dispositions/matches/${propertyId}`)
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-[#8B7AFF]/30 hover:text-[#8B7AFF] transition-colors cursor-pointer"
        >
          <Users size={14} />
          Find Buyers
        </button>
        <button
          onClick={onSkipTrace}
          disabled={isTracing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-[#8B7AFF]/30 hover:text-[#8B7AFF] transition-colors cursor-pointer disabled:opacity-50"
        >
          {isTracing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Skip Trace
        </button>
        <Link
          to="/mail-campaigns/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border-default text-text-secondary hover:border-[#8B7AFF]/30 hover:text-[#8B7AFF] transition-colors"
        >
          <Mail size={14} />
          Send Mail
        </Link>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#F87171] border border-[#F87171]/20 hover:bg-[#F87171]/10 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  )
}

/* ─── Overview Tab ─── */

function OverviewTab({
  property,
  scenarios,
  propertyId,
  tasks,
}: {
  property: PropertyDetail
  scenarios: ScenarioDetail[]
  propertyId: string
  tasks: import('@/types').TaskItem[]
}) {
  const { data: rehabProjects } = useRehabProjects({ property_id: propertyId })
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-6">
        {/* Property Details */}
        <Card title="Property Details">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailRow label="Address" value={property.address_line1} />
            {property.address_line2 && <DetailRow label="Unit" value={property.address_line2} />}
            <DetailRow label="City" value={property.city} />
            <DetailRow label="State" value={property.state} />
            <DetailRow label="Zip" value={property.zip_code} />
            {property.county && <DetailRow label="County" value={property.county} />}
            <DetailRow label="Type" value={property.property_type?.toUpperCase() ?? '—'} />
            <DetailRow label="Bedrooms" value={property.bedrooms != null ? String(property.bedrooms) : '—'} />
            <DetailRow label="Bathrooms" value={property.bathrooms != null ? String(property.bathrooms) : '—'} />
            <DetailRow label="Sq Ft" value={property.sqft != null ? property.sqft.toLocaleString() : '—'} />
            <DetailRow label="Lot Sq Ft" value={property.lot_sqft != null ? property.lot_sqft.toLocaleString() : '—'} />
            <DetailRow label="Year Built" value={property.year_built != null ? String(property.year_built) : '—'} />
          </div>
        </Card>

        {/* Map placeholder */}
        <Card title="Location">
          <div className="flex items-center justify-center py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <MapPin size={24} className="text-text-muted" />
              <p className="text-sm text-text-muted">Map view coming soon</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Scenarios */}
        <Card title="Analysis Scenarios">
          {scenarios.length === 0 ? (
            <p className="text-sm text-text-muted py-4">No analyses yet.</p>
          ) : (
            <div className="space-y-2">
              {scenarios.map((s) => (
                <Link
                  key={s.id}
                  to={`/analyze/results/${propertyId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-app-bg hover:bg-layer-2 border border-border-default transition-colors"
                >
                  <div>
                    <span className="text-sm text-text-primary font-medium">
                      {s.strategy.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <p className="text-xs text-text-muted mt-0.5">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {s.risk_score != null && (
                      <span className="text-xs text-text-muted">
                        Risk: {s.risk_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link
            to="/analyze"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
          >
            <Search size={12} />
            New Analysis
          </Link>
        </Card>

        {/* Tasks */}
        <Card title="Tasks">
          {tasks.length === 0 ? (
            <p className="text-sm text-text-muted py-2">No tasks for this property.</p>
          ) : (
            <TaskList tasks={tasks} compact />
          )}
          <div className="mt-3">
            <AddTaskForm propertyId={propertyId} />
          </div>
        </Card>

        {/* Rehab Projects */}
        <Card title="Rehab Projects">
          {(!rehabProjects || rehabProjects.length === 0) ? (
            <div className="py-2">
              <p className="text-sm text-text-muted">No rehab projects.</p>
              <Link to="/rehabs" className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors mt-1 inline-block">
                + Create Rehab Project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {rehabProjects.map(proj => {
                const pct = proj.total_estimated > 0 ? Math.min((proj.total_actual / proj.total_estimated) * 100, 100) : 0
                const overBudget = proj.total_actual > proj.total_estimated && proj.total_estimated > 0
                return (
                  <Link key={proj.id} to={`/rehabs/${proj.id}`} className="block p-3 rounded-lg bg-app-bg border border-border-default hover:border-[#8B7AFF]/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text-primary">{proj.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted">{proj.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="h-1.5 bg-border-default rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${overBudget ? 'bg-[#F87171]' : 'bg-[#4ADE80]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>${Number(proj.total_actual).toLocaleString()} of ${Number(proj.total_estimated).toLocaleString()}</span>
                      <span>{proj.completion_pct}% complete</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        {/* Data Sources */}
        <Card title="Data Sources">
          {property.data_sources && Object.keys(property.data_sources).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(property.data_sources).map(([field, info]) => (
                <div key={field} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{field}</span>
                  <span className="text-text-muted">{info.source}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4">No data sources recorded.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ─── Financials Tab ─── */

function FinancialsTab({
  scenarios,
  propertyId,
}: {
  scenarios: ScenarioDetail[]
  propertyId: string
}) {
  const { data: txnData } = useTransactions({ property_id: propertyId, per_page: 20 })
  const recentTransactions = txnData?.items ?? []
  const [showAddTxn, setShowAddTxn] = useState(false)

  return (
    <div className="space-y-6">
      {/* Scenario summaries */}
      <Card title="Analysis Scenarios">
        {scenarios.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No analyses to show financial data.</p>
        ) : (
          <div className="space-y-4">
            {scenarios.map((s) => (
              <div key={s.id} className="p-4 rounded-lg bg-app-bg border border-border-default">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-text-primary font-medium">
                    {s.strategy.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <Link
                    to={`/analyze/results/${propertyId}`}
                    className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
                  >
                    View Analysis
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {s.purchase_price != null && (
                    <MetricBox label="Purchase Price" value={`$${s.purchase_price.toLocaleString()}`} />
                  )}
                  {s.after_repair_value != null && (
                    <MetricBox label="ARV" value={`$${s.after_repair_value.toLocaleString()}`} />
                  )}
                  {s.monthly_rent != null && (
                    <MetricBox label="Monthly Rent" value={`$${s.monthly_rent.toLocaleString()}`} />
                  )}
                  {s.risk_score != null && (
                    <MetricBox label="Risk Score" value={s.risk_score.toFixed(1)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card title="Transactions">
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <DollarSign size={24} className="text-text-muted" />
            <p className="text-sm text-text-muted">No transactions recorded yet.</p>
            <button
              onClick={() => setShowAddTxn(true)}
              className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer mt-1"
            >
              + Add Transaction
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1 mb-3">
              {recentTransactions.slice(0, 10).map((txn) => {
                const amt = Number(txn.amount)
                const isPositive = amt >= 0
                return (
                  <div key={txn.id} className="flex items-center justify-between py-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-text-muted shrink-0">
                        {new Date(txn.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-text-secondary truncate">{txn.description || txn.transaction_type.replace(/_/g, ' ')}</span>
                    </div>
                    <span className={cn('tabular-nums font-medium shrink-0 ml-2', isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                      {isPositive ? '+' : ''}${Math.abs(amt).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setShowAddTxn(true)}
              className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
            >
              + Add Transaction
            </button>
          </>
        )}
      </Card>

      <AddTransactionModal
        open={showAddTxn}
        onOpenChange={setShowAddTxn}
        properties={[{ id: propertyId, address: '' }]}
        defaultPropertyId={propertyId}
      />
    </div>
  )
}

/* ─── Financing Tab ─── */

const INSTRUMENT_TYPE_COLORS: Record<string, string> = {
  sub_to_mortgage: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  seller_finance: 'bg-[#8B7AFF]/15 text-[#A89FFF] border-[#8B7AFF]/30',
  wrap_mortgage: 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#60A5FA]/30',
  lease_option: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30',
  conventional_mortgage: 'bg-[#8A8580]/15 text-text-secondary border-[#8A8580]/30',
  hard_money: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
  private_money: 'bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30',
  heloc: 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30',
  land_contract: 'bg-[#FB923C]/15 text-[#FB923C] border-[#FB923C]/30',
}

const INSTRUMENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  paid_off: 'bg-[#8A8580]/15 text-text-secondary border-[#8A8580]/30',
  defaulted: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
}

function FinancingTab({
  instruments,
  propertyId,
  propertyAddress,
}: {
  instruments: InstrumentListItem[]
  propertyId: string
  propertyAddress: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Find wrap + underlying pairs for visualization
  const wrapInstrument = instruments.find((i) => i.is_wrap)
  const underlyingInstrument = wrapInstrument?.underlying_instrument_id
    ? instruments.find((i) => i.id === wrapInstrument.underlying_instrument_id)
    : null

  if (instruments.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Landmark}
          heading="No financing instruments"
          description="Add an instrument to track mortgages, wraps, and other financing on this property."
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
        >
          <Landmark size={14} />
          Add Instrument
        </button>
        <AddInstrumentModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          propertyId={propertyId}
          propertyAddress={propertyAddress}
          existingInstruments={[]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wrap visualization */}
      {wrapInstrument && underlyingInstrument && wrapInstrument.wrap_spread && (
        <Card title="Wrap Flow">
          <div className="flex items-center justify-center gap-4 py-4 flex-wrap">
            <div className="text-center p-3 bg-app-bg rounded-lg border border-border-default">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Buyer Pays You</p>
              <p className="text-lg text-text-primary font-medium tabular-nums">
                ${Number(wrapInstrument.wrap_payment ?? 0).toLocaleString()}/mo
              </p>
            </div>
            <div className="text-text-muted">→</div>
            <div className="text-center p-3 bg-[#4ADE80]/5 rounded-lg border border-[#4ADE80]/20">
              <p className="text-[10px] uppercase tracking-wider text-[#4ADE80] mb-1">Your Spread</p>
              <p className="text-lg text-[#4ADE80] font-medium tabular-nums">
                ${wrapInstrument.wrap_spread.monthly_spread.toLocaleString()}/mo
              </p>
            </div>
            <div className="text-text-muted">→</div>
            <div className="text-center p-3 bg-app-bg rounded-lg border border-border-default">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">You Pay Lender</p>
              <p className="text-lg text-text-primary font-medium tabular-nums">
                ${Number(underlyingInstrument.monthly_payment ?? 0).toLocaleString()}/mo
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Instruments list */}
      <Card title="Instruments">
        <div className="space-y-3">
          {instruments.map((inst) => {
            const typeColor = INSTRUMENT_TYPE_COLORS[inst.instrument_type] || INSTRUMENT_TYPE_COLORS.conventional_mortgage
            const statusColor = INSTRUMENT_STATUS_COLORS[inst.status] || INSTRUMENT_STATUS_COLORS.active
            const isExpanded = expandedId === inst.id
            const typeLabel = inst.instrument_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

            return (
              <div key={inst.id} className="bg-app-bg border border-border-default rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : inst.id)
                    try {
                      (window as any).posthog?.capture?.('instrument_detail_expanded', {
                        instrument_type: inst.instrument_type,
                        property_id: propertyId,
                      })
                    } catch { /* ignore */ }
                  }}
                  className="w-full text-left p-4 hover:bg-layer-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-text-primary font-medium">{inst.name}</span>
                        <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border', typeColor)}>
                          {typeLabel}
                        </span>
                        <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border', statusColor)}>
                          {inst.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                        <span>Position: {inst.position}{inst.position === 1 ? 'st' : inst.position === 2 ? 'nd' : 'rd'}</span>
                        {inst.interest_rate != null && <span>{Number(inst.interest_rate)}% rate</span>}
                        {inst.monthly_payment != null && <span>${Number(inst.monthly_payment).toLocaleString()}/mo</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {inst.current_balance != null && (
                        <p className="text-base text-text-primary font-medium tabular-nums">
                          ${Number(inst.current_balance).toLocaleString()}
                        </p>
                      )}
                      {inst.maturity_date && (
                        <p className="text-xs text-text-muted mt-0.5">
                          Matures {new Date(inst.maturity_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balloon callout */}
                  {inst.has_balloon && inst.balloon_amount != null && (
                    <div className="mt-2 px-2 py-1 bg-[#FBBF24]/10 rounded text-xs text-[#FBBF24] inline-block">
                      BALLOON: ${Number(inst.balloon_amount).toLocaleString()}
                      {inst.balloon_date && ` · ${new Date(inst.balloon_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </div>
                  )}

                  {/* Wrap spread inline */}
                  {inst.wrap_spread && (
                    <div className="mt-2 px-2 py-1 bg-[#4ADE80]/10 rounded text-xs text-[#4ADE80] inline-block">
                      Spread: ${inst.wrap_spread.monthly_spread.toLocaleString()}/mo
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && <InstrumentExpandedDetail instrumentId={inst.id} />}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Add Instrument button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
      >
        <Landmark size={14} />
        Add Instrument
      </button>

      <AddInstrumentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        propertyId={propertyId}
        propertyAddress={propertyAddress}
        existingInstruments={instruments.map((i) => ({ id: i.id, name: i.name }))}
      />
    </div>
  )
}

/* ─── Instrument Expanded Detail ─── */

function InstrumentExpandedDetail({ instrumentId }: { instrumentId: string }) {
  const { data: detail, isLoading } = useInstrument(instrumentId)

  if (isLoading) {
    return <div className="p-4 border-t border-border-default"><div className="h-20 bg-layer-2 rounded animate-pulse" /></div>
  }

  if (!detail) return null

  return (
    <div className="p-4 border-t border-border-default space-y-4">
      {/* Amortization schedule (next 12 months) */}
      {detail.amortization_schedule.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Amortization (Next 12 Months)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border-default">
                  <th className="text-left py-1.5 pr-3">Month</th>
                  <th className="text-right py-1.5 px-3">Payment</th>
                  <th className="text-right py-1.5 px-3">Principal</th>
                  <th className="text-right py-1.5 px-3">Interest</th>
                  <th className="text-right py-1.5 pl-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {detail.amortization_schedule.slice(0, 12).map((row) => (
                  <tr key={row.month} className="border-b border-border-default/30 last:border-0">
                    <td className="py-1.5 pr-3 text-text-secondary">{row.month}</td>
                    <td className="py-1.5 px-3 text-right text-text-primary tabular-nums">${row.payment.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-right text-text-secondary tabular-nums">${row.principal.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-right text-text-secondary tabular-nums">${row.interest.toLocaleString()}</td>
                    <td className="py-1.5 pl-3 text-right text-text-primary tabular-nums">${row.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent payments */}
      {detail.recent_payments.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Recent Payments</h4>
          <div className="space-y-1">
            {detail.recent_payments.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-text-secondary">
                  {new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={cn('tabular-nums font-medium', p.direction === 'incoming' ? 'text-[#4ADE80]' : 'text-text-primary')}>
                  {p.direction === 'incoming' ? '+' : '-'}${Number(p.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active obligations */}
      {detail.obligations.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Active Obligations</h4>
          <div className="space-y-1">
            {detail.obligations.filter((o) => o.status === 'active').map((ob) => (
              <div key={ob.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-text-secondary">{ob.title}</span>
                <span className="text-text-muted">
                  {ob.next_due ? new Date(ob.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Documents Tab ─── */

function DocumentsTab() {
  return (
    <EmptyState
      icon={FileText}
      heading="Documents coming soon"
      description="Document linking to properties is being built. You can upload documents from the Documents page."
      ctaLabel="Go to Documents"
      ctaHref="/documents"
    />
  )
}

/* ─── Activity Tab ─── */

function ActivityTab({ events }: { events: PropertyActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        heading="No activity yet"
        description="Activity will appear here as you analyze, create deals, and record transactions."
      />
    )
  }

  const ICONS: Record<string, React.ElementType> = {
    scenario_created: Search,
    deal_created: GitBranch,
    data_fetched: Database,
    transaction_recorded: DollarSign,
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = ICONS[event.type] || Activity
        return (
          <div
            key={`${event.type}-${event.entity_id}-${i}`}
            className="flex items-start gap-3 py-3 border-b border-border-default last:border-0"
          >
            <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={14} className="text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary">{event.description}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {event.timestamp ? formatRelativeTime(event.timestamp) : ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Shared Components ─── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-layer-2 border border-border-default rounded-xl p-5">
      <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">{label}</p>
      <p className="text-text-primary">{value}</p>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-layer-2 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{label}</p>
      <p className="text-sm text-text-primary font-medium tabular-nums">{value}</p>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
