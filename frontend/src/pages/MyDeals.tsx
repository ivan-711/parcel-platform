import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, AlertCircle, Columns, Bookmark, Check, X, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeals } from '@/hooks/useDeals'
import { api } from '@/lib/api'
import type { Strategy, DealsFilters, FilterPreset } from '@/types'

const STRATEGIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Strategies' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'creative_finance', label: 'Creative Finance' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'flip', label: 'Flip' },
]

const STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'saved', label: 'Saved' },
  { value: 'shared', label: 'Shared' },
]

const SORTS: { value: string; label: string }[] = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
]

const PER_PAGE = 12

function riskColor(score: number | null): string {
  if (score === null) return 'text-text-muted'
  if (score <= 30) return 'text-accent-success'
  if (score <= 60) return 'text-yellow-400'
  return 'text-accent-danger'
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatMetricValue(label: string | null, value: number | null): string {
  if (label === null || value === null) return '—'
  const lower = label.toLowerCase()
  if (lower.includes('%') || lower.includes('rate') || lower.includes('return') || lower.includes('coc') || lower.includes('roi')) {
    return `${value.toFixed(1)}%`
  }
  if (lower.includes('$') || lower.includes('profit') || lower.includes('cash') || lower.includes('flow') || lower.includes('fee') || lower.includes('price') || lower.includes('equity')) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

/** My Deals — filterable grid of all user deals with pagination. */
export default function MyDeals() {
  const navigate = useNavigate()
  const [strategy, setStrategy] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('created_at_desc')
  const [page, setPage] = useState(1)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const deleteDeal = useMutation({
    mutationFn: (id: string) => api.deals.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      toast.success('Deal deleted')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Failed to delete deal')
      setDeletingId(null)
    },
  })

  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const stored = localStorage.getItem('parcel_filter_presets')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [presetName, setPresetName] = useState('')
  const presetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('parcel_filter_presets', JSON.stringify(presets))
  }, [presets])

  useEffect(() => {
    if (showPresetInput) presetInputRef.current?.focus()
  }, [showPresetInput])

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 2) {
        next.add(id)
      }
      return next
    })
  }

  const filters: DealsFilters = {
    ...(strategy !== 'all' && { strategy }),
    ...(status !== 'all' && { status }),
    sort,
    page,
    per_page: PER_PAGE,
  }

  const hasActiveFilters = strategy !== 'all' || status !== 'all'

  const { data: deals, isLoading, isError, error } = useDeals(filters)

  const clearFilters = () => {
    setStrategy('all')
    setStatus('all')
    setPage(1)
  }

  const savePreset = () => {
    const trimmed = presetName.trim()
    if (!trimmed) return
    const filters: DealsFilters = {}
    if (strategy !== 'all') filters.strategy = strategy
    if (status !== 'all') filters.status = status
    if (sort !== 'created_at_desc') filters.sort = sort
    const preset: FilterPreset = { id: crypto.randomUUID(), name: trimmed, filters }
    setPresets((prev) => [...prev, preset])
    setPresetName('')
    setShowPresetInput(false)
  }

  const deletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }

  const applyPreset = (preset: FilterPreset) => {
    setStrategy(preset.filters.strategy ?? 'all')
    setStatus(preset.filters.status ?? 'all')
    setSort(preset.filters.sort ?? 'created_at_desc')
    setPage(1)
  }

  const isPresetActive = (preset: FilterPreset) => {
    return (
      (preset.filters.strategy ?? 'all') === strategy &&
      (preset.filters.status ?? 'all') === status &&
      (preset.filters.sort ?? 'created_at_desc') === sort
    )
  }

  const hasMore = deals !== undefined && deals.length === PER_PAGE
  const showingFrom = deals && deals.length > 0 ? (page - 1) * PER_PAGE + 1 : 0
  const showingTo = deals ? (page - 1) * PER_PAGE + deals.length : 0

  return (
    <AppShell title="My Deals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">My Deals</h1>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Analyze New Deal
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={strategy} onValueChange={(v) => { setStrategy(v); setPage(1) }}>
            <SelectTrigger className="w-[170px] bg-app-surface border-border-subtle text-text-primary text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-app-surface border-border-subtle">
              {STRATEGIES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-text-primary text-sm focus:bg-app-elevated focus:text-text-primary">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] bg-app-surface border-border-subtle text-text-primary text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-app-surface border-border-subtle">
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-text-primary text-sm focus:bg-app-elevated focus:text-text-primary">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] bg-app-surface border-border-subtle text-text-primary text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-app-surface border-border-subtle">
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-text-primary text-sm focus:bg-app-elevated focus:text-text-primary">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              Clear filters
            </button>
          )}

          <button
            onClick={() => setShowPresetInput(true)}
            disabled={!hasActiveFilters || showPresetInput}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Bookmark size={14} />
            Save Preset
          </button>

          {showPresetInput && (
            <div className="inline-flex items-center gap-1.5">
              <Input
                ref={presetInputRef}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePreset()
                  if (e.key === 'Escape') { setShowPresetInput(false); setPresetName('') }
                }}
                placeholder="Preset name…"
                className="h-8 w-[140px] text-xs bg-app-surface border-border-subtle"
              />
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="p-1 rounded hover:bg-app-elevated text-accent-success transition-colors disabled:opacity-40"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setShowPresetInput(false); setPresetName('') }}
                className="p-1 rounded hover:bg-app-elevated text-text-muted transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Preset chips */}
        {presets.length > 0 && (
          <div className="flex overflow-x-auto gap-2 pb-1 -mt-3">
            <AnimatePresence>
              {presets.map((preset) => (
                <motion.button
                  key={preset.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => applyPreset(preset)}
                  className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-sm border transition-colors ${
                    isPresetActive(preset)
                      ? 'border-[#6366F1] text-[#6366F1] bg-[#6366F1]/10'
                      : 'bg-[#1A1A2E] border-[#2A2A3E] text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {preset.name}
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); deletePreset(preset.id) }}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X size={12} />
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 p-6 flex items-start gap-3 max-w-lg">
            <AlertCircle size={20} className="text-accent-danger shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">Failed to load deals</p>
              <p className="text-xs text-text-secondary">
                {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} lines={4} />
            ))}
          </div>
        )}

        {/* Empty state — no deals at all */}
        {!isLoading && !isError && deals && deals.length === 0 && !hasActiveFilters && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-app-surface border border-border-subtle flex items-center justify-center">
              <Search size={20} className="text-text-muted" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-text-primary">No deals yet</p>
              <p className="text-xs text-text-muted">Analyze your first property to get started.</p>
            </div>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Analyze a Deal
            </Link>
          </div>
        )}

        {/* Empty state — filters active, no results */}
        {!isLoading && !isError && deals && deals.length === 0 && hasActiveFilters && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-app-surface border border-border-subtle flex items-center justify-center">
              <Search size={20} className="text-text-muted" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-text-primary">No deals match your filters</p>
              <p className="text-xs text-text-muted">Try adjusting your filters or clear them to see all deals.</p>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Deals grid */}
        {!isLoading && !isError && deals && deals.length > 0 && (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {deals.map((deal) => (
                <motion.div key={deal.id} variants={itemVariants}>
                  <Link
                    to={`/analyze/results/${deal.id}`}
                    className="relative block p-5 rounded-xl border border-border-subtle bg-app-surface hover:border-accent-primary/40 transition-colors space-y-3 group"
                  >
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(deal.id) }}
                      className="absolute top-3 right-10 p-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Delete deal"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Compare checkbox */}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(deal.id) }}
                      className={`absolute top-3 right-3 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        compareIds.has(deal.id)
                          ? 'bg-accent-primary border-accent-primary'
                          : 'border-border-subtle hover:border-text-muted bg-transparent'
                      }`}
                      aria-label={compareIds.has(deal.id) ? 'Remove from comparison' : 'Add to comparison'}
                    >
                      {compareIds.has(deal.id) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Top row: strategy + status */}
                    <div className="flex items-center justify-between pr-6">
                      <StrategyBadge strategy={deal.strategy as Strategy} />
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-app-elevated text-text-secondary">
                        {statusLabel(deal.status)}
                      </span>
                    </div>

                    {/* Address */}
                    <p className="text-sm font-medium text-text-primary truncate">{deal.address}</p>

                    {/* Metrics row */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs text-text-muted">{deal.primary_metric_label ?? 'Primary Metric'}</p>
                        <p className="text-lg font-mono font-semibold text-text-primary">
                          {formatMetricValue(deal.primary_metric_label, deal.primary_metric_value)}
                        </p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-xs text-text-muted">Risk Score</p>
                        <p className={`text-lg font-mono font-semibold ${riskColor(deal.risk_score)}`}>
                          {deal.risk_score !== null ? deal.risk_score : '—'}
                        </p>
                      </div>
                    </div>

                    {/* View link */}
                    <p className="text-xs font-medium text-accent-primary group-hover:text-accent-primary/80 transition-colors">
                      View Analysis →
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-text-muted">
                Showing {showingFrom}–{showingTo} deals
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle bg-app-surface text-xs font-medium text-text-secondary hover:bg-app-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted font-mono">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle bg-app-surface text-xs font-medium text-text-secondary hover:bg-app-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        {/* Floating compare bar */}
        {compareIds.size === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(compareIds)
                navigate(`/compare?a=${ids[0]}&b=${ids[1]}`)
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-sm font-medium shadow-lg shadow-accent-primary/20 transition-colors"
            >
              <Columns size={16} />
              Compare Selected
            </button>
          </motion.div>
        )}
        {/* Delete confirmation dialog */}
        <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
          <AlertDialogContent className="bg-app-surface border-border-subtle">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-text-primary">Delete this deal?</AlertDialogTitle>
              <AlertDialogDescription className="text-text-secondary">
                This will permanently delete this deal. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-app-elevated border-border-subtle text-text-primary">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deletingId) deleteDeal.mutate(deletingId) }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteDeal.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  )
}
