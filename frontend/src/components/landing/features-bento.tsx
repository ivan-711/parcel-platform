/** FeaturesBento — bento grid features section: 2-col large + right card + full-width kanban. */

import { motion } from 'framer-motion'
import { Calculator, FileText, GitBranch } from 'lucide-react'
import { STRATEGY_COLORS } from './constants'
import type { StrategyKey } from './constants'

export function FeaturesBento() {
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
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Features
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">
            The full stack for deal professionals
          </h2>
          <p className="text-sm text-text-secondary max-w-md leading-relaxed">
            One platform replaces five spreadsheets, two apps, and your legal pad.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Large: Multi-Strategy Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="md:col-span-2 rounded-2xl border border-border-subtle bg-app-surface p-6 space-y-5 overflow-hidden relative cursor-default"
          >
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <Calculator size={17} className="text-accent-primary" />
              </div>
              <h3 className="font-semibold text-text-primary">Multi-Strategy Analysis</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
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

            {/* Mini KPI mockup */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Cash-on-Cash', value: '8.4%',   color: '#10B981' },
                { label: 'Cap Rate',     value: '6.2%',   color: '#F1F5F9' },
                { label: 'Risk Score',   value: '23 / Low', color: '#10B981' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl bg-app-elevated border border-border-subtle space-y-1"
                >
                  <p className="text-[9px] uppercase tracking-widest text-text-muted">{label}</p>
                  <p className="text-base font-mono font-semibold leading-none" style={{ color }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: AI Document Processing */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-2xl border border-border-subtle bg-app-surface p-6 space-y-5 cursor-default"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center">
                <FileText size={17} className="text-accent-secondary" />
              </div>
              <h3 className="font-semibold text-text-primary">AI Document Processing</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Upload contracts and leases. Claude extracts key terms, flags risks, and answers your questions in plain English.
              </p>
            </div>

            {/* Mini doc list mockup */}
            <div className="space-y-2">
              {[
                { name: 'Purchase Agreement.pdf', status: 'Ready',      color: '#10B981', dot: '#10B981' },
                { name: 'Inspection Report.pdf',  status: 'Processing', color: '#F59E0B', dot: '#F59E0B' },
                { name: 'Title Commitment.pdf',   status: 'Queued',     color: '#3B82F6', dot: '#3B82F6' },
              ].map(({ name, status, color, dot }) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-app-elevated border border-border-subtle gap-2"
                >
                  <p className="text-[10px] text-text-secondary font-mono truncate flex-1">{name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                    <span className="text-[9px] font-semibold" style={{ color }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Full width: Deal Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="md:col-span-3 rounded-2xl border border-border-subtle bg-app-surface p-6 space-y-5 cursor-default"
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-accent-success/10 border border-accent-success/20 flex items-center justify-center">
                  <GitBranch size={17} className="text-accent-success" />
                </div>
                <h3 className="font-semibold text-text-primary">Deal Pipeline</h3>
                <p className="text-xs text-text-secondary leading-relaxed max-w-md">
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
                <div key={stage} className="bg-app-elevated rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-semibold">
                      {stage}
                    </p>
                    <span className="text-[9px] font-mono text-text-disabled bg-app-overlay px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  </div>
                  {deals.map((deal) => (
                    <div key={deal} className="p-2 rounded-lg bg-app-surface border border-border-subtle">
                      <p className="text-[10px] text-text-secondary font-mono truncate">{deal}</p>
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
