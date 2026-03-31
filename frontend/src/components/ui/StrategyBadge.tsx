/** Color-coded badge for each real estate investment strategy. */

type Strategy = 'wholesale' | 'creative_finance' | 'brrrr' | 'buy_and_hold' | 'flip'

interface StrategyBadgeProps {
  strategy: Strategy
}

const STRATEGY_CONFIG: Record<Strategy, { bg: string; text: string; label: string }> = {
  wholesale:        { bg: '#FEF3C7', text: '#92400E', label: 'Wholesale' },
  creative_finance: { bg: '#EDE9FE', text: '#5B21B6', label: 'Creative Finance' },
  brrrr:            { bg: '#DBEAFE', text: '#1E40AF', label: 'BRRRR' },
  buy_and_hold:     { bg: '#D1FAE5', text: '#065F46', label: 'Buy & Hold' },
  flip:             { bg: '#FFE4E6', text: '#9F1239', label: 'Flip' },
}

/** Renders a color-coded pill badge for a given investment strategy. */
export function StrategyBadge({ strategy }: StrategyBadgeProps) {
  const config = STRATEGY_CONFIG[strategy]
  return (
    <span
      style={{ backgroundColor: config.bg, color: config.text }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
    >
      {config.label}
    </span>
  )
}
