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
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { SampleBadge } from '@/components/SampleBadge'
import { useProperties, useDeleteProperty } from '@/hooks/useProperties'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  prospect: 'bg-[#8A8580]/20 text-[#C5C0B8] border-[#8A8580]/30',
  under_analysis: 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#60A5FA]/30',
  in_pipeline: 'bg-[#8B7AFF]/15 text-[#A89FFF] border-[#8B7AFF]/30',
  owned: 'bg-[#4ADE80]/15 text-[#6DBEA3] border-[#4ADE80]/30',
  sold: 'bg-[#C5C0B8]/15 text-[#8A8580] border-[#C5C0B8]/30',
  archived: 'bg-[#1E1D1B] text-[#8A8580] border-[#1E1D1B]',
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
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
        >
          Analyze Property
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Subtitle */}
        {total > 0 && (
          <p className="text-sm text-[#8A8580]">
            Total Value: ${totalValue.toLocaleString()} &middot; {activeCount} Active Asset{activeCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8580]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by address..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#141311] border border-[#1E1D1B] text-sm text-[#F0EDE8] placeholder-[#8A8580]/60 focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8580] hover:text-[#C5C0B8] cursor-pointer"
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
                    ? 'bg-[#8B7AFF]/15 text-[#A89FFF] border border-[#8B7AFF]/30'
                    : 'bg-[#141311] text-[#8A8580] border border-[#1E1D1B] hover:text-[#C5C0B8]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="bg-[#F87171]/10 border border-[#F87171]/20 rounded-lg p-4 text-sm text-[#F87171]">
            Failed to load properties. Please try again.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-[#141311] rounded-lg animate-pulse" />
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
            <button onClick={clearFilters} className="text-sm text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer">
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
            className="border border-[#1E1D1B] rounded-xl overflow-hidden"
          >
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#141311] border-b border-[#1E1D1B]">
                    <th className="text-left text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3">Address</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3">Type</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3">Status</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3">Strategy</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3">Key Metric</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3">Updated</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr
                      key={p.id}
                      className="group border-b border-[#1E1D1B] last:border-0 hover:bg-[#141311]/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/properties/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#F0EDE8] font-medium truncate max-w-[250px]">
                            {p.address_line1}
                          </span>
                          {p.is_sample && <SampleBadge />}
                        </div>
                        <p className="text-xs text-[#8A8580] mt-0.5">
                          {p.city}, {p.state} {p.zip_code}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#C5C0B8]">
                        {p.property_type?.toUpperCase() || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-[#C5C0B8]">
                        {p.primary_scenario?.strategy?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#F0EDE8] tabular-nums">
                        {getKeyMetric(p)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#8A8580] tabular-nums">
                        {formatRelativeTime(p.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <PropertyActions
                          property={p}
                          onDelete={() => handleDelete(p.id, p.address_line1)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#1E1D1B]">
              {properties.map((p) => (
                <Link
                  key={p.id}
                  to={`/properties/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#141311]/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#F0EDE8] font-medium truncate">{p.address_line1}</span>
                      {p.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-xs text-[#8A8580] mt-0.5">{p.city}, {p.state}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <StatusBadge status={p.status} />
                    <span className="text-sm text-[#F0EDE8] tabular-nums">{getKeyMetric(p)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8A8580]">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-[#C5C0B8] tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] disabled:opacity-30 transition-colors cursor-pointer"
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
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <MoreHorizontal size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-40 p-1 bg-[#141311] border border-[#1E1D1B] shadow-lg rounded-xl"
      >
        <Link
          to={`/properties/${property.id}`}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-[#C5C0B8] hover:bg-[#1A1918] hover:text-[#F0EDE8] transition-colors"
        >
          <Eye size={14} />
          View
        </Link>
        <Link
          to={`/properties/${property.id}?tab=overview`}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-[#C5C0B8] hover:bg-[#1A1918] hover:text-[#F0EDE8] transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-[#F87171] hover:bg-[#F87171]/10 transition-colors cursor-pointer"
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
