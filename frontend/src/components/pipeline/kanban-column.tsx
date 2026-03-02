/** KanbanColumn — a single stage column in the pipeline Kanban board with sortable context. */

import { useCallback } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { ColumnSkeleton } from './column-skeleton'
import { SortableDealCard } from './deal-card'
import type { PipelineCard, Stage } from './constants'

interface KanbanColumnProps {
  stage: { key: Stage; label: string; color: string }
  cards: PipelineCard[]
  isOver: boolean
  isLoading: boolean
  /** Column index in the Kanban board (for keyboard navigation). */
  columnIndex?: number
  /** Card index that currently has keyboard focus within this column (-1 = none). */
  focusedCardIndex?: number
  /** Whether keyboard navigation is active (controls focus ring visibility). */
  isKeyboardActive?: boolean
  /** Callback to register a card's DOM element for keyboard focus management. */
  registerCardRef?: (colIndex: number, cardIndex: number, el: HTMLDivElement | null) => void
  onRemove?: (pipelineId: string, stage: Stage) => void
  onCloseDeal?: (card: PipelineCard) => void
}

export function KanbanColumn({
  stage,
  cards,
  isOver,
  isLoading,
  columnIndex = 0,
  focusedCardIndex = -1,
  isKeyboardActive = false,
  registerCardRef,
  onRemove,
  onCloseDeal,
}: KanbanColumnProps) {
  const isColumnFocused = isKeyboardActive && focusedCardIndex >= 0

  /** Create a stable ref registration callback for a specific card index. */
  const makeRegisterRef = useCallback(
    (cardIdx: number) => {
      if (!registerCardRef) return undefined
      return (el: HTMLDivElement | null) => {
        registerCardRef(columnIndex, cardIdx, el)
      }
    },
    [columnIndex, registerCardRef]
  )

  return (
    <div
      className="flex flex-col min-w-[240px] max-w-[240px]"
      role="listbox"
      aria-label={`${stage.label} column, ${cards.length} deal${cards.length !== 1 ? 's' : ''}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span
          className={[
            'text-[11px] font-medium uppercase tracking-widest transition-colors duration-150',
            isColumnFocused ? 'text-[#F1F5F9]' : 'text-[#94A3B8]',
          ].join(' ')}
        >
          {stage.label}
        </span>
        <span
          className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded"
          style={{
            color: stage.color,
            backgroundColor: `${stage.color}22`,
          }}
        >
          {cards.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-all duration-150"
        style={{
          backgroundColor: isOver ? `${stage.color}12` : 'transparent',
          border: isOver ? `1px dashed ${stage.color}55` : '1px dashed transparent',
        }}
      >
        {isLoading ? (
          <ColumnSkeleton />
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 opacity-30">
            <Inbox size={20} className="text-[#475569]" />
            <p className="text-[11px] text-[#475569]">Drop here</p>
          </div>
        ) : (
          <SortableContext
            items={cards.map((c) => c.pipeline_id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence>
              {cards.map((card, i) => (
                <motion.div
                  key={card.pipeline_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                >
                  <SortableDealCard
                    card={card}
                    isFocused={isKeyboardActive && focusedCardIndex === i}
                    onRemove={onRemove}
                    onCloseDeal={onCloseDeal}
                    registerRef={makeRegisterRef(i)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        )}
      </div>
    </div>
  )
}
