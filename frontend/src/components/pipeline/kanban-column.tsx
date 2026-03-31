/** KanbanColumn — a single stage column in the pipeline Kanban board with sortable context. */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { ColumnSkeleton } from './column-skeleton'
import { SortableDealCard } from './deal-card'
import { formatCompactValue } from './constants'
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

  // Column scroll overflow detection for gradient fade mask
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isScrollable, setIsScrollable] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      setIsScrollable(el.scrollHeight > el.clientHeight)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [cards.length])

  // Total column value
  const totalValue = useMemo(
    () => cards.reduce((sum, c) => sum + (c.asking_price ?? 0), 0),
    [cards]
  )

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[280px]"
      role="listbox"
      aria-label={`${stage.label} column, ${cards.length} deal${cards.length !== 1 ? 's' : ''}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 h-9 px-1 mb-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em]">
          {stage.label}
        </span>
        <span className="text-[12px] tabular-nums text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
          {cards.length}
        </span>
        {totalValue > 0 && (
          <span className="text-[12px] tabular-nums text-gray-400 ml-auto">
            {formatCompactValue(totalValue)}
          </span>
        )}
      </div>

      {/* Drop zone with per-column scroll */}
      <div
        ref={scrollRef}
        className={[
          'column-scroll flex flex-col gap-2 min-h-[100px] rounded-xl p-2 transition-all duration-150',
          'max-h-[calc(100vh-200px)] overflow-y-auto',
          isScrollable ? 'column-scroll-mask' : '',
        ].join(' ')}
        style={{
          backgroundColor: isOver ? `${stage.color}0F` : 'transparent',
          border: isOver ? `1px dashed ${stage.color}4D` : '1px dashed transparent',
        }}
      >
        {isLoading ? (
          <ColumnSkeleton />
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[100px] py-8 border border-dashed border-gray-200 rounded-xl">
            <Inbox size={16} className="text-gray-300 mb-1.5" />
            <p className="text-[12px] text-gray-400">No deals</p>
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
                  transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.04 }}
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
