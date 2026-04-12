/** PresetChips — row of saved filter preset buttons with delete capability. */

import { motion, AnimatePresence } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
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
          <motion.div
            key={preset.id}
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="inline-flex items-center shrink-0"
          >
            <button
              onClick={() => onApply(preset)}
              className={`inline-flex items-center gap-1.5 rounded-l-full px-3 py-1 text-sm border-y border-l transition-colors ${
                isPresetActive(preset)
                  ? 'border-violet-400/20 text-text-primary bg-violet-400/[0.08]'
                  : 'bg-layer-2 border-border-default text-text-secondary hover:border-border-strong'
              }`}
            >
              {preset.name}
            </button>
            <button
              onClick={() => onDelete(preset.id)}
              aria-label={`Delete preset ${preset.name}`}
              className={`inline-flex items-center rounded-r-full px-1.5 py-1 border-y border-r transition-colors hover:bg-layer-3 ${
                isPresetActive(preset)
                  ? 'border-violet-400/20 text-text-primary bg-violet-400/[0.08]'
                  : 'bg-layer-2 border-border-default text-text-secondary'
              }`}
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
