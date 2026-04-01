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
        <SelectTrigger className="w-[170px] bg-white/[0.04] border-white/[0.06] text-[#F0EDE8] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#22211D] border-white/[0.06]">
          {STRATEGIES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-[#F0EDE8] text-sm focus:bg-white/[0.06] focus:text-[#F0EDE8]">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.06] text-[#F0EDE8] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#22211D] border-white/[0.06]">
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-[#F0EDE8] text-sm focus:bg-white/[0.06] focus:text-[#F0EDE8]">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.06] text-[#F0EDE8] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#22211D] border-white/[0.06]">
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-[#F0EDE8] text-sm focus:bg-white/[0.06] focus:text-[#F0EDE8]">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          Clear filters
        </button>
      )}

      <button
        onClick={onShowPresetInput}
        disabled={!hasActiveFilters || showPresetInput}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A09D98] hover:text-[#F0EDE8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="h-8 w-[140px] text-xs bg-[#131210] border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56]"
          />
          <button
            onClick={onSavePreset}
            disabled={!presetName.trim()}
            aria-label="Save preset"
            className="p-1 rounded hover:bg-white/[0.04] text-violet-400 transition-colors disabled:opacity-40"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancelPresetInput}
            aria-label="Cancel preset"
            className="p-1 rounded hover:bg-white/[0.04] text-[#7A7872] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
