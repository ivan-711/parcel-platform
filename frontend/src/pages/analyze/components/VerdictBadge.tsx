/** Deal verdict badge — maps existing risk score (0-100) to a go/no-go label. */

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ScenarioDetail } from '@/types'

interface VerdictConfig {
  label: string
  bg: string
  text: string
  border: string
}

const VERDICT_TIERS: Array<{ max: number } & VerdictConfig> = [
  { max: 25, label: 'Strong Deal', bg: 'rgba(109,190,163,0.12)', text: '#6DBEA3', border: 'rgba(109,190,163,0.25)' },
  { max: 45, label: 'Good Deal',   bg: 'rgba(109,190,163,0.08)', text: '#7CCBA5', border: 'rgba(109,190,163,0.18)' },
  { max: 60, label: 'Marginal',    bg: 'rgba(212,168,103,0.12)', text: '#D4A867', border: 'rgba(212,168,103,0.25)' },
  { max: 75, label: 'Risky',       bg: 'rgba(212,118,106,0.10)', text: '#D4766A', border: 'rgba(212,118,106,0.20)' },
  { max: 100, label: 'Pass',       bg: 'rgba(212,118,106,0.15)', text: '#C45E52', border: 'rgba(212,118,106,0.30)' },
]

const INCOMPLETE_VERDICT: VerdictConfig = {
  label: 'Incomplete', bg: 'rgba(138,133,128,0.10)', text: '#8A8580', border: 'rgba(138,133,128,0.20)',
}

const WHOLESALE_MAP: Record<string, VerdictConfig> = {
  strong:   VERDICT_TIERS[0],
  marginal: VERDICT_TIERS[2],
  pass:     VERDICT_TIERS[4],
}

function tierFromScore(score: number): VerdictConfig {
  return VERDICT_TIERS.find(t => score <= t.max) || VERDICT_TIERS[4]
}

function resolveVerdict(scenario: ScenarioDetail): VerdictConfig | null {
  const { strategy, outputs, risk_score } = scenario
  const o = outputs || {}

  // Wholesale uses the deterministic recommendation field
  if (strategy === 'wholesale') {
    const rec = String(o.recommendation || '').toLowerCase()
    if (WHOLESALE_MAP[rec]) return WHOLESALE_MAP[rec]
  }

  if (risk_score === null || risk_score === undefined) return null

  // Hero metric guards — force verdict when key metric is non-positive or missing
  const cf = typeof o.monthly_cash_flow === 'number' ? o.monthly_cash_flow : null
  const profit = typeof o.gross_profit === 'number' ? o.gross_profit : null
  const moneyLeft = typeof o.money_left_in === 'number' ? o.money_left_in : null
  const purchasePrice = typeof scenario.purchase_price === 'number' ? scenario.purchase_price : 0

  // If the hero metric for this strategy is null/undefined, show neutral "Incomplete"
  const HERO_METRIC: Record<string, unknown> = {
    buy_and_hold: cf, flip: profit, brrrr: cf, creative_finance: cf,
  }
  if (strategy !== 'wholesale' && HERO_METRIC[strategy] === null) return INCOMPLETE_VERDICT

  if (strategy === 'buy_and_hold' && cf !== null) {
    if (cf < -200) return VERDICT_TIERS[4] // Pass
    if (cf <= 0) {
      const fromScore = tierFromScore(risk_score)
      return risk_score > 60 ? fromScore : VERDICT_TIERS[3]
    }
  }
  if (strategy === 'flip' && profit !== null && profit <= 0) return VERDICT_TIERS[4]
  if (strategy === 'brrrr' && cf !== null && cf < 0 && moneyLeft !== null && moneyLeft > purchasePrice * 0.5) return VERDICT_TIERS[4]
  if (strategy === 'creative_finance' && cf !== null && cf <= 0) return VERDICT_TIERS[4]

  return tierFromScore(risk_score)
}

interface Props {
  scenario: ScenarioDetail
}

export function VerdictBadge({ scenario }: Props) {
  const verdict = resolveVerdict(scenario)

  if (!verdict) {
    return (
      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border border-[var(--border-default)] text-[var(--text-muted)] bg-transparent">
        Analyzing...
      </span>
    )
  }

  const dealScore = scenario.risk_score !== null && scenario.risk_score !== undefined
    ? Math.round(100 - scenario.risk_score)
    : null
  const flags = scenario.risk_flags

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: verdict.bg, color: verdict.text, borderColor: verdict.border }}
        >
          {verdict.label}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72">
        {dealScore !== null && (
          <p className="text-sm font-semibold text-text-primary mb-2">
            Deal Score: {dealScore}/100
          </p>
        )}
        {flags && flags.length > 0 ? (
          <div className="space-y-1.5">
            {flags.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  f.severity === 'low' ? 'bg-[#6DBEA3]' :
                  f.severity === 'medium' ? 'bg-[#D4A867]' : 'bg-[#D4766A]'
                }`} />
                <span className="text-text-secondary">{f.explanation || f.flag}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">
            Score based on {scenario.strategy.replace('_', ' ')} risk factors.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
