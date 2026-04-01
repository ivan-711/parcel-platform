/** My Deals — filterable grid of all user deals with pagination, comparison, and bulk delete. */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, AlertCircle, CheckSquare, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
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
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { api } from '@/lib/api'
import { PER_PAGE } from '@/components/deals/constants'
import { FilterBar } from '@/components/deals/filter-bar'
import { PresetChips } from '@/components/deals/preset-chips'
import { DealGrid } from '@/components/deals/deal-grid'
import { CompareBar } from '@/components/deals/compare-bar'
import type { DealsFilters, FilterPreset } from '@/types'

export default function MyDeals() {
  const [strategy, setStrategy] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('created_at_desc')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

  useEffect(() => {
    localStorage.setItem('parcel_filter_presets', JSON.stringify(presets))
  }, [presets])

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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  const selectAll = () => {
    if (!deals) return
    const allIds = deals.map(d => d.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.deals.delete(id)))
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      toast.success(`${selectedIds.size} deal${selectedIds.size > 1 ? 's' : ''} deleted`)
    } catch {
      toast.error('Some deals could not be deleted')
    } finally {
      exitSelectionMode()
      setIsDeleting(false)
    }
  }

  const filters: DealsFilters = {
    ...(strategy !== 'all' && { strategy }),
    ...(status !== 'all' && { status }),
    ...(debouncedSearch && { q: debouncedSearch }),
    sort,
    page,
    per_page: PER_PAGE,
  }

  const hasActiveFilters = strategy !== 'all' || status !== 'all'
  const hasSearchQuery = debouncedSearch.length > 0

  const { data: deals, isLoading, isError, error } = useDeals(filters)

  const clearFilters = () => {
    setStrategy('all')
    setStatus('all')
    setSearchQuery('')
    setPage(1)
  }

  const savePreset = () => {
    const trimmed = presetName.trim()
    if (!trimmed) return
    const presetFilters: DealsFilters = {}
    if (strategy !== 'all') presetFilters.strategy = strategy
    if (status !== 'all') presetFilters.status = status
    if (sort !== 'created_at_desc') presetFilters.sort = sort
    const preset: FilterPreset = { id: crypto.randomUUID(), name: trimmed, filters: presetFilters }
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

  return (
    <AppShell title="My Deals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[#F0EDE8]">My Deals</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode ? (
              <>
                <button
                  onClick={selectAll}
                  className="text-xs font-medium text-[#A09D98] hover:text-[#F0EDE8] transition-colors"
                >
                  {deals && deals.every(d => selectedIds.has(d.id)) ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  onClick={exitSelectionMode}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:border-white/[0.08] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4766A] hover:bg-[#D4766A]/80 text-[#F0EDE8] text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedIds.size})
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectionMode(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:border-white/[0.08] text-sm font-medium transition-colors"
                >
                  <CheckSquare size={16} />
                  Select
                </button>
                <Link
                  to="/analyze"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-400 hover:bg-violet-400/80 text-[#0C0B0A] text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Analyze New Deal
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7872] pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            placeholder="Search deals by address..."
            aria-label="Search deals by address"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-[#131210] border border-white/[0.06] text-sm text-[#F0EDE8] placeholder:text-[#5C5A56] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setPage(1); searchInputRef.current?.focus() }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7872] hover:text-[#F0EDE8] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter bar */}
        <FilterBar
          strategy={strategy}
          status={status}
          sort={sort}
          hasActiveFilters={hasActiveFilters}
          showPresetInput={showPresetInput}
          presetName={presetName}
          onStrategyChange={(v) => { setStrategy(v); setPage(1) }}
          onStatusChange={(v) => { setStatus(v); setPage(1) }}
          onSortChange={(v) => { setSort(v); setPage(1) }}
          onClearFilters={clearFilters}
          onShowPresetInput={() => setShowPresetInput(true)}
          onPresetNameChange={setPresetName}
          onSavePreset={savePreset}
          onCancelPresetInput={() => { setShowPresetInput(false); setPresetName('') }}
        />

        {/* Preset chips */}
        <PresetChips
          presets={presets}
          onApply={applyPreset}
          onDelete={deletePreset}
          isPresetActive={isPresetActive}
        />

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-[#D4766A]/20 bg-[#D4766A]/10 p-6 flex items-start gap-3 max-w-lg">
            <AlertCircle size={20} className="text-[#D4766A] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#F0EDE8]">Failed to load deals</p>
              <p className="text-xs text-[#A09D98]">
                {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
              </p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['deals'] })}
                className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                Try again
              </button>
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
        {!isLoading && !isError && deals && deals.length === 0 && !hasActiveFilters && !hasSearchQuery && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#1A1916] border border-white/[0.04] flex items-center justify-center">
              <Search size={20} className="text-[#7A7872]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#F0EDE8]">No deals yet</p>
              <p className="text-xs text-[#7A7872]">Analyze your first property to get started.</p>
            </div>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-400 hover:bg-violet-400/80 text-[#0C0B0A] text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Analyze a Deal
            </Link>
          </div>
        )}

        {/* Empty state — search active, no results */}
        {!isLoading && !isError && deals && deals.length === 0 && hasSearchQuery && !hasActiveFilters && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#1A1916] border border-white/[0.04] flex items-center justify-center">
              <Search size={20} className="text-[#7A7872]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#F0EDE8]">No deals match your search</p>
              <p className="text-xs text-[#7A7872]">Try a different address or clear your search.</p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
              className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Empty state — filters active (with or without search), no results */}
        {!isLoading && !isError && deals && deals.length === 0 && (hasActiveFilters || (hasSearchQuery && hasActiveFilters)) && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#1A1916] border border-white/[0.04] flex items-center justify-center">
              <Search size={20} className="text-[#7A7872]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#F0EDE8]">No deals match your filters</p>
              <p className="text-xs text-[#7A7872]">Try adjusting your filters or clear them to see all deals.</p>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Deals grid */}
        {!isLoading && !isError && deals && deals.length > 0 && (
          <DealGrid
            deals={deals}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            compareIds={compareIds}
            page={page}
            perPage={PER_PAGE}
            hasMore={hasMore}
            onToggleSelection={toggleSelection}
            onToggleCompare={toggleCompare}
            onDelete={(id) => setDeletingId(id)}
            onPageChange={setPage}
          />
        )}

        {/* Floating compare bar */}
        <CompareBar compareIds={compareIds} />

        {/* Delete confirmation dialog */}
        <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
          <AlertDialogContent className="bg-[#22211D] border-white/[0.06]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#F0EDE8]">Delete this deal?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A09D98]">
                This will permanently delete this deal. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/[0.04] border-white/[0.06] text-[#F0EDE8] hover:bg-white/[0.06]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deletingId) deleteDeal.mutate(deletingId) }}
                className="bg-[#D4766A] hover:bg-[#D4766A]/80 text-[#F0EDE8]"
              >
                {deleteDeal.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk delete confirmation dialog */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent className="bg-[#22211D] border-white/[0.06]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#F0EDE8]">Delete {selectedIds.size} deal{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A09D98]">
                This will permanently delete {selectedIds.size} selected deal{selectedIds.size > 1 ? 's' : ''}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/[0.04] border-white/[0.06] text-[#F0EDE8] hover:bg-white/[0.06]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="bg-[#D4766A] hover:bg-[#D4766A]/80 text-[#F0EDE8]"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  )
}
