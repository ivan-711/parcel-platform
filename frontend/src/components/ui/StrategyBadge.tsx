/** Color-coded badge for each real estate investment strategy. */

type Strategy = 'wholesale' | 'creative_finance' | 'brrrr' | 'buy_and_hold' | 'flip'

interface StrategyBadgeProps {
  strategy: Strategy
}

const STRATEGY_CONFIG: Record<Strategy, { bgVar: string; textVar: string; borderVar: string; label: string }> = {
  wholesale:        { bgVar: 'var(--strategy-wholesale-bg)', textVar: 'var(--strategy-wholesale-text)', borderVar: 'var(--strategy-wholesale-border)', label: 'Wholesale' },
  creative_finance: { bgVar: 'var(--strategy-creative-bg)',  textVar: 'var(--strategy-creative-text)',  borderVar: 'var(--strategy-creative-border)',  label: 'Creative Finance' },
  brrrr:            { bgVar: 'var(--strategy-brrrr-bg)',     textVar: 'var(--strategy-brrrr-text)',     borderVar: 'var(--strategy-brrrr-border)',     label: 'BRRRR' },
  buy_and_hold:     { bgVar: 'var(--strategy-buyhold-bg)',   textVar: 'var(--strategy-buyhold-text)',   borderVar: 'var(--strategy-buyhold-border)',   label: 'Buy & Hold' },
  flip:             { bgVar: 'var(--strategy-flip-bg)',      textVar: 'var(--strategy-flip-text)',      borderVar: 'var(--strategy-flip-border)',      label: 'Flip' },
}

/** Renders a color-coded pill badge for a given investment strategy. */
export function StrategyBadge({ strategy }: StrategyBadgeProps) {
  const config = STRATEGY_CONFIG[strategy]
  return (
    <span
      style={{
        backgroundColor: config.bgVar,
        color: config.textVar,
        borderColor: config.borderVar,
      }}
      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border"
    >
      {config.label}
    </span>
  )
}
