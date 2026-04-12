/** CompareBar — floating bottom bar shown when exactly 2 deals are selected for comparison. */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { Columns } from 'lucide-react'

interface CompareBarProps {
  compareIds: Set<string>
}

export function CompareBar({ compareIds }: CompareBarProps) {
  const navigate = useNavigate()

  if (compareIds.size !== 2) return null

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <button
        type="button"
        onClick={() => {
          const ids = Array.from(compareIds)
          navigate(`/compare?a=${ids[0]}&b=${ids[1]}`)
        }}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-400 hover:bg-violet-500 text-accent-text-on-accent text-sm font-medium shadow-lg shadow-violet-400/20 transition-colors"
      >
        <Columns size={16} />
        Compare Selected
      </button>
    </motion.div>
  )
}
