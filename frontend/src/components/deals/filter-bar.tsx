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
        <SelectTrigger className="w-[170px] bg-white border-gray-200 text-gray-900 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200">
          {STRATEGIES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-gray-900 text-sm focus:bg-gray-50 focus:text-gray-900">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px] bg-white border-gray-200 text-gray-900 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200">
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-gray-900 text-sm focus:bg-gray-50 focus:text-gray-900">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[160px] bg-white border-gray-200 text-gray-900 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200">
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-gray-900 text-sm focus:bg-gray-50 focus:text-gray-900">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs font-medium text-lime-700 hover:text-lime-600 transition-colors"
        >
          Clear filters
        </button>
      )}

      <button
        onClick={onShowPresetInput}
        disabled={!hasActiveFilters || showPresetInput}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="h-8 w-[140px] text-xs bg-white border-gray-200"
          />
          <button
            onClick={onSavePreset}
            disabled={!presetName.trim()}
            aria-label="Save preset"
            className="p-1 rounded hover:bg-gray-50 text-sky-600 transition-colors disabled:opacity-40"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancelPresetInput}
            aria-label="Cancel preset"
            className="p-1 rounded hover:bg-gray-50 text-gray-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
