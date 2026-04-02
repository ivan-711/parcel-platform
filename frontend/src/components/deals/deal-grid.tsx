/** DealGrid — animated grid of deal cards with pagination. */

import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from './constants'
import { DealCard } from './deal-card'
import type { DealListItem } from '@/types'

interface DealGridProps {
  deals: DealListItem[]
  selectionMode: boolean
  selectedIds: Set<string>
  compareIds: Set<string>
  page: number
  perPage: number
  hasMore: boolean
  onToggleSelection: (id: string) => void
  onToggleCompare: (id: string) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
}

export function DealGrid({
  deals,
  selectionMode,
  selectedIds,
  compareIds,
  page,
  perPage,
  hasMore,
  onToggleSelection,
  onToggleCompare,
  onDelete,
  onPageChange,
}: DealGridProps) {
  const showingFrom = deals.length > 0 ? (page - 1) * perPage + 1 : 0
  const showingTo = (page - 1) * perPage + deals.length

  return (
    <>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {deals.map((deal) => (
          <motion.div key={deal.id} variants={itemVariants}>
            <DealCard
              deal={deal}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(deal.id)}
              compareIds={compareIds}
              onToggleSelection={onToggleSelection}
              onToggleCompare={onToggleCompare}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-text-secondary">
          Showing {showingFrom}–{showingTo} deals
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-border-default bg-layer-2 text-xs font-medium text-text-secondary hover:bg-layer-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-text-secondary tabular-nums">Page {page}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
            className="px-3 py-1.5 rounded-lg border border-border-default bg-layer-2 text-xs font-medium text-text-secondary hover:bg-layer-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
