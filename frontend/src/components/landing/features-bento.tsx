/** FeaturesBento — bento grid features section: 2-col large + right card + full-width kanban. */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, FileText, GitBranch } from 'lucide-react'
import { STRATEGY_COLORS } from './constants'
import type { StrategyKey } from './constants'
import { useCountUp } from '@/hooks/useCountUp'

/** Animated KPI value that counts up from 0 when rendered. */
function AnimatedKPI({
  target,
  suffix,
  label,
  color,
  decimals = 1,
}: {
  target: number
  suffix: string
  label: string
  color: string
  decimals?: number
}) {
  const value = useCountUp(target, 1200)

  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
      <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400">{label}</p>
      <p className="text-base font-semibold leading-none tabular-nums" style={{ color }}>
        {value.toFixed(decimals)}{suffix}
      </p>
    </div>
  )
}

/** Static KPI placeholder showing "0" before the section enters the viewport. */
function StaticKPI({
  suffix,
  label,
  color,
  decimals = 1,
}: {
  suffix: string
  label: string
  color: string
  decimals?: number
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
      <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400">{label}</p>
      <p className="text-base font-semibold leading-none tabular-nums" style={{ color }}>
        {(0).toFixed(decimals)}{suffix}
      </p>
    </div>
  )
}

const KPI_DATA = [
  { label: 'Cash-on-Cash', target: 8.4,  suffix: '%',      color: '#0284C7', decimals: 1 },
  { label: 'Cap Rate',     target: 6.2,  suffix: '%',      color: '#344054', decimals: 1 },
  { label: 'Risk Score',   target: 23,   suffix: ' / Low', color: '#0284C7', decimals: 0 },
] as const

export function FeaturesBento() {
  const [kpiInView, setKpiInView] = useState(false)

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto space-y-14">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.08em] text-lime-700 font-semibold">
            Features
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900">
            Calculator. Pipeline. AI. One login.
          </h2>
          <p className="text-sm text-gray-500 max-w-md leading-relaxed">
            One platform replaces five spreadsheets, two apps, and your legal pad.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Large: Multi-Strategy Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 space-y-5 overflow-hidden relative cursor-default shadow-xs"
          >
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-400/40 to-transparent" />

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-lime-50 border border-lime-200 flex items-center justify-center">
                <Calculator size={17} className="text-lime-700" />
              </div>
              <h3 className="font-semibold text-gray-900">Five strategies. One click.</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                Run wholesale, creative finance, BRRRR, buy & hold, and flip simultaneously. Know which strategy wins before you make the call.
              </p>
            </div>

            {/* Strategy badge strip */}
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STRATEGY_COLORS) as StrategyKey[]).map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-md"
                  style={{ backgroundColor: STRATEGY_COLORS[s].bg, color: STRATEGY_COLORS[s].text }}
                >
                  {s}
                </span>
              ))}
            </div>

            {/* Animated KPI mockup */}
            <motion.div
              className="grid grid-cols-3 gap-2"
              viewport={{ once: true }}
              onViewportEnter={() => setKpiInView(true)}
            >
              {kpiInView
                ? KPI_DATA.map(({ label, target, suffix, color, decimals }) => (
                    <AnimatedKPI
                      key={label}
                      target={target}
                      suffix={suffix}
                      label={label}
                      color={color}
                      decimals={decimals}
                    />
                  ))
                : KPI_DATA.map(({ label, suffix, color, decimals }) => (
                    <StaticKPI
                      key={label}
                      suffix={suffix}
                      label={label}
                      color={color}
                      decimals={decimals}
                    />
                  ))
              }
            </motion.div>
          </motion.div>

          {/* Right: AI Document Processing */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5 cursor-default shadow-xs"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <FileText size={17} className="text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Upload a contract. Get answers.</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Upload contracts and leases. Claude extracts key terms, flags risks, and answers your questions in plain English.
              </p>
            </div>

            {/* Mini doc list mockup */}
            <div className="space-y-2">
              {[
                { name: 'Purchase Agreement.pdf', status: 'Ready',      color: '#0284C7', dot: '#0284C7' },
                { name: 'Inspection Report.pdf',  status: 'Processing', color: '#D97706', dot: '#D97706' },
                { name: 'Title Commitment.pdf',   status: 'Queued',     color: '#4F46E5', dot: '#4F46E5' },
              ].map(({ name, status, color, dot }) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200 gap-2"
                >
                  <p className="text-[10px] text-gray-500 font-mono truncate flex-1">{name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                    <span className="text-[10px] font-semibold" style={{ color }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Full width: Deal Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="md:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 space-y-5 cursor-default shadow-xs"
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                  <GitBranch size={17} className="text-sky-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Deal Pipeline</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                  Drag deals through a Kanban board from lead to close. Full pipeline visibility for your entire team.
                </p>
              </div>
            </div>

            {/* Mini Kanban */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { stage: 'Lead',           count: 4, deals: ['1842 Pine St', '903 Elm Ave', '6601 Oak Rd'] },
                { stage: 'Analyzing',      count: 2, deals: ['2847 Oak St', '4102 Maple Ln'] },
                { stage: 'Offer Sent',     count: 1, deals: ['4421 Birch Dr'] },
                { stage: 'Under Contract', count: 1, deals: ['7709 Cedar Blvd'] },
              ].map(({ stage, count, deals }) => (
                <div key={stage} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold">
                      {stage}
                    </p>
                    <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded tabular-nums">
                      {count}
                    </span>
                  </div>
                  {deals.map((deal, dealIndex) => (
                    <div
                      key={deal}
                      className={`p-2 rounded-lg bg-white border border-gray-200${
                        stage === 'Lead' && dealIndex === 0
                          ? ' motion-safe:animate-pipeline-slide'
                          : ''
                      }`}
                    >
                      <p className="text-[10px] text-gray-500 font-mono truncate">{deal}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
