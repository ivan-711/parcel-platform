/** Color-coded badge for each real estate investment strategy. */

type Strategy = 'wholesale' | 'creative_finance' | 'brrrr' | 'buy_and_hold' | 'flip'

interface StrategyBadgeProps {
  strategy: Strategy
}

const STRATEGY_CONFIG: Record<Strategy, { bg: string; text: string; label: string }> = {
  wholesale:        { bg: '#451A03', text: '#FCD34D', label: 'Wholesale' },
  creative_finance: { bg: '#2E1065', text: '#C4B5FD', label: 'Creative Finance' },
  brrrr:            { bg: '#0C1A4A', text: '#93C5FD', label: 'BRRRR' },
  buy_and_hold:     { bg: '#064E3B', text: '#6EE7B7', label: 'Buy & Hold' },
  flip:             { bg: '#431407', text: '#FCA5A1', label: 'Flip' },
}

/** Renders a color-coded pill badge for a given investment strategy. */
export function StrategyBadge({ strategy }: StrategyBadgeProps) {
  const config = STRATEGY_CONFIG[strategy]
  return (
    <span
      style={{ backgroundColor: config.bg, color: config.text }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono"
    >
      {config.label}
    </span>
  )
}
