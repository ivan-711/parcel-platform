/**
 * ProductPreview — a real Parcel analysis pulled apart into the pieces
 * that float on the void: dashboard, AI narrative, and risk readout.
 *
 * Asymmetric composition (inspired by fey.com): 60/40 column split on
 * desktop. Main dashboard panel sits forward with a heavier shadow; the
 * right-side panels are recessed and staggered in on scroll. No browser
 * chrome frames — the panels are the interface, standing on their own.
 *
 * The AI narrative card uses a subtle semi-transparent backdrop-blur
 * treatment to communicate "generated content" vs the measured data in
 * the left-side panel — glass is purposeful here, not decorative.
 */

import { motion } from 'framer-motion'
import { MapPin, Check } from 'lucide-react'
import { ease } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

/* -- Mock analysis data for the dashboard panel -- */
const CASH_FLOW_DATA = [820, 890, 1020, 1110, 1180, 1240, 1320, 1280, 1210, 1150, 1080, 1000]

/** 12-month bar chart — pure divs so it's responsive without a chart lib. */
function CashFlowMiniChart() {
  const max = Math.max(...CASH_FLOW_DATA)
  return (
    <div className="flex items-end gap-1.5 h-16" aria-hidden="true">
      {CASH_FLOW_DATA.map((v, i) => {
        const heightPct = (v / max) * 100
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-[#7CCBA5]/20 via-[#7CCBA5]/55 to-[#7CCBA5]/90"
            style={{ height: `${heightPct}%` }}
          />
        )
      })}
    </div>
  )
}

/** Compact SVG risk gauge — simplified from RiskGauge.tsx for panel scale. */
function RiskGaugeMini() {
  const score = 72
  const radius = 44
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = '#D4A867' // amber — matches "Moderate Risk" semantics

  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 120 120"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={60}
        cy={60}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={60}
        cy={60}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text
        x={60}
        y={58}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: '26px',
          fontWeight: 300,
          fill: '#F0EDE8',
          fontFamily: "'Satoshi', 'Satoshi Fallback', system-ui, sans-serif",
          fontFeatureSettings: '"tnum"',
        }}
      >
        72
      </text>
      <text
        x={60}
        y={82}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: '9px',
          fontWeight: 500,
          fill: '#A09D98',
          fontFamily: "'General Sans', sans-serif",
        }}
      >
        / 100
      </text>
    </svg>
  )
}

export function ProductPreview() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  return (
    <section
      ref={ref}
      id="product-preview"
      className="relative overflow-hidden py-32 md:py-40 lg:py-48"
    >
      {/* Ambient top wash — subtle violet, as if the panels catch a light source */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(139,122,255,0.04), transparent 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: ease.luxury }}
          className="text-center mb-16 md:mb-24"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted">
            THE PRODUCT
          </p>
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary mt-4"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)' }}
          >
            See <span className="font-medium">every angle</span> of the deal.
          </h2>
          <p className="text-base md:text-lg text-text-secondary mt-5 max-w-2xl mx-auto leading-relaxed">
            One address. The numbers, the narrative, and the risk readout — every angle analyzed in under sixty seconds.
          </p>
        </motion.div>

        {/* Floating panel composition — 60/40 on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 lg:gap-6 max-w-6xl mx-auto">
          {/* === Panel 1 — Dashboard (forward) === */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={isVisible ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, ease: ease.vercel }}
            className="relative bg-app-surface border border-border-default rounded-xl shadow-2xl edge-highlight p-6 md:p-7 flex flex-col gap-5 min-h-[420px]"
          >
            {/* Address header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin
                  className="w-4 h-4 text-text-secondary shrink-0"
                  strokeWidth={2}
                />
                <span className="text-sm text-text-primary font-medium truncate">
                  1847 Maple Ave, Kansas City, MO
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6DBEA3]/10 text-[#6DBEA3] border border-[#6DBEA3]/25 text-[10px] font-medium shrink-0">
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Analyzed
              </span>
            </div>

            {/* KPI trio */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-app-elevated border border-border-subtle rounded-lg p-3 edge-highlight">
                <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                  Cap Rate
                </p>
                <p
                  className="font-brand font-light text-2xl md:text-[1.625rem] text-text-primary mt-1 leading-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  7.2<span className="text-sm text-text-muted">%</span>
                </p>
              </div>
              <div className="bg-app-elevated border border-border-subtle rounded-lg p-3 edge-highlight">
                <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                  Cash Flow
                </p>
                <p
                  className="font-brand font-light text-2xl md:text-[1.625rem] text-[#7CCBA5] mt-1 leading-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  $1,240
                  <span className="text-sm text-text-muted">/mo</span>
                </p>
              </div>
              <div className="bg-app-elevated border border-border-subtle rounded-lg p-3 edge-highlight">
                <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                  ROI
                </p>
                <p
                  className="font-brand font-light text-2xl md:text-[1.625rem] text-text-primary mt-1 leading-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  18.4<span className="text-sm text-text-muted">%</span>
                </p>
              </div>
            </div>

            {/* Strategy verdicts */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted mb-2">
                Strategy verdicts
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#E5A84B]/10 text-[#E5A84B] border border-[#E5A84B]/25">
                  Wholesale
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#7B9FCC]/10 text-[#7B9FCC] border border-[#7B9FCC]/25">
                  BRRRR
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#7CCBA5]/10 text-[#7CCBA5] border border-[#7CCBA5]/25">
                  Buy &amp; Hold
                </span>
              </div>
            </div>

            {/* Cash flow chart footer */}
            <div className="mt-auto pt-4 border-t border-border-subtle">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
                  12-Month Cash Flow Projection
                </p>
                <p
                  className="text-[10px] font-medium text-[#7CCBA5]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  &uarr; 12.2% YoY
                </p>
              </div>
              <CashFlowMiniChart />
            </div>
          </motion.div>

          {/* === Right column — stacked panels (recessed) === */}
          <div className="flex flex-col gap-5 lg:gap-6">
            {/* Panel 2 — AI Narrative (glass) */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={isVisible ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.6, delay: 0.15, ease: ease.vercel }}
              className="relative bg-app-surface/75 backdrop-blur-md border border-border-subtle rounded-xl shadow-xl edge-highlight p-5 md:p-6"
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle">
                <div className="w-5 h-5 rounded-full bg-text-secondary/15 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-text-muted">
                  AI Narrative
                </span>
              </div>
              <div className="space-y-2.5 text-sm text-text-secondary leading-relaxed">
                <p>
                  The data shows an{' '}
                  <span className="text-[#7CCBA5] font-medium">8% equity cushion</span>
                  {' '}&mdash; tight for a 1965 build.
                </p>
                <p>
                  At 7.25% financing, monthly cash flow is{' '}
                  <span className="text-[#7CCBA5] font-medium">$127</span>.
                  Consider budgeting 7&ndash;8% for CapEx given the age.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#6DBEA3]/10 text-[#6DBEA3] border border-[#6DBEA3]/25 text-[10px] font-medium uppercase tracking-[0.05em]">
                  Confidence: High
                </span>
              </div>
            </motion.div>

            {/* Panel 3 — Risk Assessment */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={isVisible ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.6, delay: 0.3, ease: ease.vercel }}
              className="relative bg-app-surface border border-border-subtle rounded-xl shadow-xl edge-highlight p-5 md:p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-text-muted">
                  Risk Assessment
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#D4A867]/10 text-[#D4A867] border border-[#D4A867]/25 text-[10px] font-medium">
                  Moderate
                </span>
              </div>
              <div className="flex items-center gap-5">
                <RiskGaugeMini />
                <ul className="flex-1 space-y-2.5 text-[11px] text-text-secondary leading-relaxed">
                  <li className="flex gap-2.5">
                    <span
                      className="w-1 h-1 mt-1.5 rounded-full bg-[#D4A867] shrink-0"
                      aria-hidden="true"
                    />
                    <span>1965 build &mdash; CapEx reserve recommended</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span
                      className="w-1 h-1 mt-1.5 rounded-full bg-[#D4A867] shrink-0"
                      aria-hidden="true"
                    />
                    <span>Rent-to-price ratio below market average</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span
                      className="w-1 h-1 mt-1.5 rounded-full bg-[#D4A867] shrink-0"
                      aria-hidden="true"
                    />
                    <span>Property tax trajectory rising YoY</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
