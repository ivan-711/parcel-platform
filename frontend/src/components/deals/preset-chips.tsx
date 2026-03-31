/** PresetChips — row of saved filter preset buttons with delete capability. */

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { FilterPreset } from '@/types'

interface PresetChipsProps {
  presets: FilterPreset[]
  onApply: (preset: FilterPreset) => void
  onDelete: (id: string) => void
  isPresetActive: (preset: FilterPreset) => boolean
}

export function PresetChips({ presets, onApply, onDelete, isPresetActive }: PresetChipsProps) {
  if (presets.length === 0) return null

  return (
    <div className="flex overflow-x-auto gap-2 pb-1 -mt-3">
      <AnimatePresence>
        {presets.map((preset) => (
          <motion.button
            key={preset.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={() => onApply(preset)}
            className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-sm border transition-colors ${
              isPresetActive(preset)
                ? 'border-lime-600 text-lime-700 bg-lime-50'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {preset.name}
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onDelete(preset.id) }}
              className="ml-0.5 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={12} />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
