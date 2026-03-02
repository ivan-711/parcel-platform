/**
 * useKanbanKeyboard — manages keyboard navigation for the pipeline Kanban board.
 * Arrow keys move focus between columns and cards, Enter opens deal detail,
 * Escape returns focus from detail panel.
 */
import { useCallback, useRef, useState } from 'react'

interface UseKanbanKeyboardOptions {
  /** Number of columns in the board */
  columnCount: number
  /** Number of cards in each column, by column index */
  cardCounts: number[]
  /** Called when Enter is pressed on a focused card */
  onSelect?: (columnIndex: number, cardIndex: number) => void
  /** Called when Escape is pressed (e.g., close detail panel) */
  onEscape?: () => void
}

interface KanbanFocusState {
  columnIndex: number
  cardIndex: number
}

/**
 * Finds the next non-empty column index in a given direction, wrapping around.
 * Returns the starting index if all columns are empty.
 */
function findNextNonEmptyColumn(
  cardCounts: number[],
  currentCol: number,
  direction: 1 | -1
): number {
  const len = cardCounts.length
  if (len === 0) return currentCol

  let candidate = (currentCol + direction + len) % len
  let checked = 0

  while (checked < len) {
    if (cardCounts[candidate] > 0) return candidate
    candidate = (candidate + direction + len) % len
    checked++
  }

  // All columns empty — stay put
  return currentCol
}

export function useKanbanKeyboard({
  columnCount: _columnCount,
  cardCounts,
  onSelect,
  onEscape,
}: UseKanbanKeyboardOptions) {
  void _columnCount
  const [focusState, setFocusState] = useState<KanbanFocusState>({
    columnIndex: 0,
    cardIndex: 0,
  })

  /** Whether the keyboard has been used to navigate (shows focus ring) */
  const [isKeyboardActive, setIsKeyboardActive] = useState(false)

  /** Refs for all card DOM elements, indexed as cardRefs[colIndex][cardIndex] */
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  /** Register a card ref by column and card index */
  const registerCardRef = useCallback(
    (colIndex: number, cardIndex: number, el: HTMLDivElement | null) => {
      const key = `${colIndex}-${cardIndex}`
      if (el) {
        cardRefs.current.set(key, el)
      } else {
        cardRefs.current.delete(key)
      }
    },
    []
  )

  /** Focus the card at the given column/card index */
  const focusCard = useCallback(
    (colIndex: number, cardIdx: number) => {
      const key = `${colIndex}-${cardIdx}`
      const el = cardRefs.current.get(key)
      if (el) {
        el.focus({ preventScroll: false })
      }
    },
    []
  )

  /** Handle keydown on the Kanban container */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e

      // Only handle arrow keys, Enter, and Escape
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(key)) {
        return
      }

      // Activate keyboard mode on first navigation key
      if (!isKeyboardActive && key !== 'Escape') {
        setIsKeyboardActive(true)
      }

      if (key === 'Escape') {
        if (onEscape) {
          onEscape()
        }
        // Re-focus the current card after closing panel
        focusCard(focusState.columnIndex, focusState.cardIndex)
        return
      }

      if (key === 'Enter') {
        e.preventDefault()
        if (onSelect) {
          onSelect(focusState.columnIndex, focusState.cardIndex)
        }
        return
      }

      e.preventDefault()

      setFocusState((prev) => {
        let nextCol = prev.columnIndex
        let nextCard = prev.cardIndex

        if (key === 'ArrowRight') {
          nextCol = findNextNonEmptyColumn(cardCounts, prev.columnIndex, 1)
          // Clamp card index to new column's length
          const maxCard = Math.max(0, cardCounts[nextCol] - 1)
          nextCard = Math.min(prev.cardIndex, maxCard)
        } else if (key === 'ArrowLeft') {
          nextCol = findNextNonEmptyColumn(cardCounts, prev.columnIndex, -1)
          const maxCard = Math.max(0, cardCounts[nextCol] - 1)
          nextCard = Math.min(prev.cardIndex, maxCard)
        } else if (key === 'ArrowDown') {
          const colCards = cardCounts[prev.columnIndex] ?? 0
          if (colCards > 0) {
            nextCard = Math.min(prev.cardIndex + 1, colCards - 1)
          }
        } else if (key === 'ArrowUp') {
          nextCard = Math.max(prev.cardIndex - 1, 0)
        }

        // Schedule DOM focus after state update
        requestAnimationFrame(() => {
          focusCard(nextCol, nextCard)
        })

        return { columnIndex: nextCol, cardIndex: nextCard }
      })
    },
    [cardCounts, focusState, focusCard, isKeyboardActive, onEscape, onSelect]
  )

  /** Reset keyboard active state when mouse is used */
  const handleMouseDown = useCallback(() => {
    setIsKeyboardActive(false)
  }, [])

  return {
    focusState,
    isKeyboardActive,
    registerCardRef,
    handleKeyDown,
    handleMouseDown,
    setFocusState,
  }
}
