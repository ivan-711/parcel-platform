/** DealCard — individual deal card showing strategy, metrics, risk, and action buttons. */

import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { statusLabel, riskColor, formatMetricValue } from './constants'
import type { Strategy, DealListItem } from '@/types'

interface DealCardProps {
  deal: DealListItem
  selectionMode: boolean
  isSelected: boolean
  compareIds: Set<string>
  onToggleSelection: (id: string) => void
  onToggleCompare: (id: string) => void
  onDelete: (id: string) => void
}

export function DealCard({
  deal,
  selectionMode,
  isSelected,
  compareIds,
  onToggleSelection,
  onToggleCompare,
  onDelete,
}: DealCardProps) {
  const cardContent = (
    <>
      {/* Selection checkbox - top left */}
      {selectionMode && (
        <div
          className={`absolute top-3 left-3 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-violet-400 border-violet-400'
              : 'border-border-default bg-transparent opacity-60 group-hover:opacity-100'
          }`}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-accent-text-on-accent">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Delete button - hidden in selection mode */}
      {!selectionMode && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(deal.id) }}
          className="absolute top-3 right-10 p-1 rounded text-loss/60 hover:text-loss hover:bg-loss/10 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Delete deal"
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Compare checkbox - hidden in selection mode */}
      {!selectionMode && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(deal.id) }}
          className={`absolute top-3 right-3 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            compareIds.has(deal.id)
              ? 'bg-violet-400 border-violet-400'
              : 'border-border-default hover:border-border-strong bg-transparent'
          }`}
          aria-label={compareIds.has(deal.id) ? 'Remove from comparison' : 'Add to comparison'}
        >
          {compareIds.has(deal.id) && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-accent-text-on-accent">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Top row: strategy + status */}
      <div className={`flex items-center justify-between ${selectionMode ? 'pl-7' : 'pr-6'}`}>
        <StrategyBadge strategy={deal.strategy as Strategy} />
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-layer-3 text-text-secondary">
          {statusLabel(deal.status)}
        </span>
      </div>

      {/* Address */}
      <p className="text-sm font-medium text-text-primary truncate">{deal.address}</p>

      {/* Metrics row */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-text-secondary">{deal.primary_metric_label ?? 'Primary Metric'}</p>
          <p className="text-lg tabular-nums font-semibold text-text-primary">
            {formatMetricValue(deal.primary_metric_label, deal.primary_metric_value)}
          </p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-xs text-text-secondary">Risk Score</p>
          <p className={`text-lg tabular-nums font-semibold ${riskColor(deal.risk_score)}`}>
            {deal.risk_score !== null ? deal.risk_score : '—'}
          </p>
        </div>
      </div>

      {/* View link */}
      {!selectionMode ? (
        <p className="text-xs font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
          View Analysis →
        </p>
      ) : (
        <span className="text-xs font-medium text-text-secondary">
          View Analysis →
        </span>
      )}
    </>
  )

  if (selectionMode) {
    return (
      <div
        onClick={() => onToggleSelection(deal.id)}
        className={`relative p-5 rounded-xl border bg-app-surface shadow-xs transition-colors space-y-3 group cursor-pointer edge-highlight ${
          isSelected ? 'border-violet-400/40' : 'border-border-subtle hover:border-violet-400/30'
        }`}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      to={deal.property_id ? `/analyze/results/${deal.property_id}` : `/analyze/deal/${deal.id}`}
      className="relative block p-5 rounded-xl border border-border-subtle bg-app-surface shadow-xs hover:border-border-default hover:shadow-card-hover transition-all space-y-3 group edge-highlight"
    >
      {cardContent}
    </Link>
  )
}
