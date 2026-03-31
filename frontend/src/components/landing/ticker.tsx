/** Ticker — CSS marquee of live deal data, pauses on hover, respects prefers-reduced-motion. */

import { useReducedMotion } from 'framer-motion'
import { TICKER_DEALS, STRATEGY_COLORS } from './constants'

export function Ticker() {
  const prefersReduced = useReducedMotion()
  const items = prefersReduced ? TICKER_DEALS : [...TICKER_DEALS, ...TICKER_DEALS]

  return (
    <div className="relative w-full overflow-hidden border-y border-gray-200 bg-white/60 py-3">
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F9FAFB] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F9FAFB] to-transparent z-10 pointer-events-none" />

      <div className={prefersReduced ? 'flex gap-10 w-max overflow-x-auto' : 'ticker-animate flex gap-10 w-max'}>
        {items.map((deal, i) => (
          <div key={i} className={`flex items-center gap-2.5 shrink-0${prefersReduced ? '' : ' hover:-translate-y-0.5 transition-transform duration-150'}`}>
            <span className="text-[10px] text-gray-400">{deal.city}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: STRATEGY_COLORS[deal.strategy].bg, color: STRATEGY_COLORS[deal.strategy].text }}
            >
              {deal.strategy}
            </span>
            <span className="text-[10px] font-semibold text-gray-600 tabular-nums">
              {deal.metric}
            </span>
            <span className="text-gray-300 text-[10px] mx-1">&middot;</span>
          </div>
        ))}
      </div>
    </div>
  )
}
