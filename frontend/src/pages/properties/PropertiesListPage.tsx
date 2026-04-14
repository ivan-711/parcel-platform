import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building,
  Search,
  X,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { prefersReducedMotion } from '@/lib/motion'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { SampleBadge } from '@/components/SampleBadge'
import { useProperties, useDeleteProperty } from '@/hooks/useProperties'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PropertyFilters, PropertyListItem } from '@/types'

const PER_PAGE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'under_analysis', label: 'Under Analysis' },
  { value: 'in_pipeline', label: 'In Pipeline' },
  { value: 'owned', label: 'Owned' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-text-muted/20 text-text-secondary border-text-muted/30',
  under_analysis: 'bg-info/15 text-info border-info/30',
  in_pipeline: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  owned: 'bg-profit/15 text-profit border-profit/30',
  sold: 'bg-text-secondary/15 text-text-muted border-text-secondary/30',
  archived: 'bg-border-default text-text-muted border-border-default',
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.prospect
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap', colors)}>
      {label}
    </span>
  )
}

function getKeyMetric(item: PropertyListItem): string {
  const outputs = item.primary_scenario?.outputs
  if (!outputs) return '—'
  const strategy = item.primary_scenario?.strategy

  if (strategy === 'buy_and_hold') {
    const cf = outputs.monthly_cash_flow
    if (typeof cf === 'number') return `$${cf.toLocaleString()}/mo`
  }
  if (strategy === 'wholesale') {
    const mao = outputs.mao
    if (typeof mao === 'number') return `MAO $${mao.toLocaleString()}`
  }
  if (strategy === 'flip') {
    const profit = outputs.gross_profit
    if (typeof profit === 'number') return `$${profit.toLocaleString()}`
  }
  if (strategy === 'brrrr') {
    const left = outputs.money_left_in
    if (typeof left === 'number') return `$${left.toLocaleString()} in`
  }
  if (strategy === 'creative_finance') {
    const cf = outputs.monthly_cash_flow
    if (typeof cf === 'number') return `$${cf.toLocaleString()}/mo`
  }

  const pp = item.primary_scenario?.purchase_price
  if (typeof pp === 'number') return `$${pp.toLocaleString()}`
  return '—'
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function PropertiesListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const filters: PropertyFilters = {
    page,
    per_page: PER_PAGE,
    ...(statusFilter && { status: statusFilter }),
    ...(debouncedSearch && { q: debouncedSearch }),
  }

  const { data, isLoading, isError } = useProperties(filters)
  const deleteMutation = useDeleteProperty()

  const properties = data?.properties ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)
  const hasFilters = !!statusFilter || !!debouncedSearch

  useEffect(() => {
    try {
      (window as any).posthog?.capture?.('properties_list_viewed', {
        count: total,
        filter_status: statusFilter || 'all',
      })
    } catch { /* ignore */ }
  }, [total, statusFilter])

  const handleDelete = (id: string, address: string) => {
    if (!confirm(`Delete "${address}"? This cannot be undone.`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Property deleted'),
      onError: () => toast.error('Failed to delete property'),
    })
    try {
      (window as any).posthog?.capture?.('property_deleted', { property_id: id })
    } catch { /* ignore */ }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }

  // Total value from purchase prices
  const totalValue = properties.reduce((acc, p) => {
    const pp = p.primary_scenario?.purchase_price
    return acc + (typeof pp === 'number' ? pp : 0)
  }, 0)
  const activeCount = properties.filter(p => p.status === 'owned' || p.status === 'in_pipeline').length

  return (
    <AppShell
      title="Properties"
      actions={
        <Link
          to="/analyze"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors"
        >
          Analyze Property
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Subtitle */}
        {total > 0 && (
          <p className="text-sm text-text-muted">
            Total Value: ${totalValue.toLocaleString()} &middot; {activeCount} Active Asset{activeCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by address..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-app-recessed border border-border-default text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-luxury">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer',
                  statusFilter === opt.value
                    ? 'bg-violet-400/15 text-violet-300 border border-violet-400/30'
                    : 'bg-app-recessed text-text-muted border border-border-default hover:text-text-secondary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="bg-loss-bg border border-loss/20 rounded-lg p-4 text-sm text-loss">
            Failed to load properties. Please try again.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-app-recessed rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty states */}
        {!isLoading && !isError && properties.length === 0 && !hasFilters && (
          <EmptyState
            icon={Building}
            heading="No properties yet"
            description="Analyze a property to add it to your collection."
            ctaLabel="Analyze a Property"
            ctaHref="/analyze"
          />
        )}

        {!isLoading && !isError && properties.length === 0 && hasFilters && (
          <EmptyState
            icon={Search}
            heading="No properties match"
            description="Try a different search or clear your filters."
            ctaLabel="Clear Filters"
            ctaHref="#"
            secondaryCta={{ label: '', href: '' }}
          />
        )}
        {!isLoading && !isError && properties.length === 0 && hasFilters && (
          <div className="flex justify-center -mt-4">
            <button onClick={clearFilters} className="text-sm text-accent-primary hover:text-accent-hover transition-colors cursor-pointer">
              Clear all filters
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && properties.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="border border-border-default rounded-xl overflow-hidden"
          >
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-app-recessed border-b border-border-default">
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Address</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Type</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Status</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Strategy</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help">
                              Key Metric
                              <HelpCircle size={12} className="text-text-muted hover:text-text-secondary transition-colors" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="max-w-[280px] bg-app-overlay border border-border-strong p-3 rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                            sideOffset={4}
                          >
                            <p className="text-xs text-text-secondary leading-relaxed">
                              Shows the primary financial output for each property's strategy — Cash Flow for Buy &amp; Hold, MAO for Wholesale, Profit for Flip, Money Left In for BRRRR.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Updated</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <motion.tr
                      key={p.id}
                      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                      className="group border-b border-border-default last:border-0 hover:bg-app-recessed/60 transition-shadow duration-200 hover:shadow-lg cursor-pointer"
                      onClick={() => navigate(`/properties/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary font-medium truncate max-w-[250px]">
                            {p.address_line1}
                          </span>
                          {p.is_sample && <SampleBadge />}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {p.city}, {p.state} {p.zip_code}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {p.property_type?.toUpperCase() || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {p.primary_scenario?.strategy?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-text-primary tabular-nums">
                        {getKeyMetric(p)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-text-muted tabular-nums">
                        {formatRelativeTime(p.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <PropertyActions
                          property={p}
                          onDelete={() => handleDelete(p.id, p.address_line1)}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border-default">
              {properties.map((p) => (
                <motion.div key={p.id} whileHover={prefersReducedMotion ? undefined : { y: -2 }}>
                <Link
                  to={`/properties/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-app-recessed/60 transition-shadow duration-200 hover:shadow-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary font-medium truncate">{p.address_line1}</span>
                      {p.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{p.city}, {p.state}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <StatusBadge status={p.status} />
                    <span className="text-sm text-text-primary tabular-nums">{getKeyMetric(p)}</span>
                  </div>
                </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-app-recessed disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-text-secondary tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-app-recessed disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function PropertyActions({
  property,
  onDelete,
}: {
  property: PropertyListItem
  onDelete: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Property actions"
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-app-recessed opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <MoreHorizontal size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-40 p-1 bg-app-recessed border border-border-default shadow-lg rounded-xl"
      >
        <Link
          to={`/properties/${property.id}`}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-text-secondary hover:bg-app-surface hover:text-text-primary transition-colors"
        >
          <Eye size={14} />
          View
        </Link>
        <Link
          to={`/properties/${property.id}?tab=overview`}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-text-secondary hover:bg-app-surface hover:text-text-primary transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-loss hover:bg-loss-bg transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </PopoverContent>
    </Popover>
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
