/** MobilePipeline — tabbed/stacked stage view for small screens (dark theme). */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { STAGES } from './constants'
import type { PipelineCard, Stage } from './constants'
import { DealCard } from './deal-card'
import { ColumnSkeleton } from './column-skeleton'

interface MobilePipelineProps {
  board: Record<Stage, PipelineCard[]>
  isLoading: boolean
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
  onMoveStage?: (pipelineId: string, fromStage: Stage, toStage: Stage) => void
}

/** MobilePipeline renders a tabbed stage selector with a vertically scrollable card list. */
export function MobilePipeline({ board, isLoading, onRemove, onCloseDeal, onMoveStage }: MobilePipelineProps) {
  const [activeStage, setActiveStage] = useState<Stage>('lead')
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  const cards = board[activeStage] ?? []

  // Scroll active tab into view when the stage changes
  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current
      const tab = activeTabRef.current
      const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [activeStage])

  const handleStageChange = useCallback((stage: Stage) => {
    setActiveStage(stage)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* Stage tabs — horizontally scrollable */}
      <style>{`
        .mobile-tabs-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={tabsRef}
        className="mobile-tabs-scroll flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        role="tablist"
        aria-label="Pipeline stages"
      >
        {STAGES.map((stage) => {
          const count = board[stage.key]?.length ?? 0
          const isActive = activeStage === stage.key
          return (
            <button
              key={stage.key}
              ref={isActive ? activeTabRef : undefined}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${stage.key}`}
              onClick={() => handleStageChange(stage.key)}
              className={`
                flex-shrink-0 inline-flex items-center gap-1.5
                px-3 py-2 rounded-full
                text-[13px] font-medium
                transition-all duration-200
                min-h-[44px]
                cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7AFF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0B0A]
                ${isActive
                  ? 'bg-[#8B7AFF] text-[#0C0B0A] shadow-sm'
                  : 'bg-white/[0.04] text-[#A09D98] hover:bg-white/[0.06]'
                }
              `}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isActive ? '#0C0B0A' : stage.color }}
              />
              {stage.label}
              <span
                className={`
                  text-[11px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[22px] text-center
                  ${isActive
                    ? 'bg-[#0C0B0A]/20 text-[#0C0B0A]'
                    : 'bg-white/[0.06] text-[#7A7872]'
                  }
                `}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Card list for active stage */}
      <div
        id={`panel-${activeStage}`}
        role="tabpanel"
        aria-label={`${STAGES.find((s) => s.key === activeStage)?.label ?? activeStage} deals`}
        className="flex flex-col gap-3 min-h-[200px]"
      >
        {isLoading ? (
          <ColumnSkeleton />
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Inbox size={28} className="text-[#7A7872]/40" />
            <p className="text-sm text-[#7A7872]">
              No deals in {STAGES.find((s) => s.key === activeStage)?.label ?? activeStage}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              {cards.map((card, i) => (
                <motion.div
                  key={card.pipeline_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                >
                  <DealCard
                    card={card}
                    onRemove={onRemove}
                    onCloseDeal={onCloseDeal}
                    onMoveStage={onMoveStage}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
