/** FilterBar — strategy, status, sort dropdowns with preset save and clear controls. */

import { useRef, useEffect } from 'react'
import { Check, X, Bookmark } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STRATEGIES, STATUSES, SORTS } from './constants'

interface FilterBarProps {
  strategy: string
  status: string
  sort: string
  hasActiveFilters: boolean
  showPresetInput: boolean
  presetName: string
  onStrategyChange: (v: string) => void
  onStatusChange: (v: string) => void
  onSortChange: (v: string) => void
  onClearFilters: () => void
  onShowPresetInput: () => void
  onPresetNameChange: (v: string) => void
  onSavePreset: () => void
  onCancelPresetInput: () => void
}

export function FilterBar({
  strategy,
  status,
  sort,
  hasActiveFilters,
  showPresetInput,
  presetName,
  onStrategyChange,
  onStatusChange,
  onSortChange,
  onClearFilters,
  onShowPresetInput,
  onPresetNameChange,
  onSavePreset,
  onCancelPresetInput,
}: FilterBarProps) {
  const presetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showPresetInput) presetInputRef.current?.focus()
  }, [showPresetInput])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={strategy} onValueChange={onStrategyChange}>
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

      <Select value={status} onValueChange={onStatusChange}>
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

      <Select value={sort} onValueChange={onSortChange}>
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
          onClick={onClearFilters}
          className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
        >
          Clear filters
        </button>
      )}

      <button
        onClick={onShowPresetInput}
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
            onChange={(e) => onPresetNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSavePreset()
              if (e.key === 'Escape') onCancelPresetInput()
            }}
            placeholder="Preset name…"
            className="h-8 w-[140px] text-xs bg-app-surface border-border-subtle"
          />
          <button
            onClick={onSavePreset}
            disabled={!presetName.trim()}
            className="p-1 rounded hover:bg-app-elevated text-accent-success transition-colors disabled:opacity-40"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancelPresetInput}
            className="p-1 rounded hover:bg-app-elevated text-text-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
