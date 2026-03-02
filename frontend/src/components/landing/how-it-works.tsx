/** HowItWorks — editorial numbered steps section with large decorative mono numbers. */

import { motion } from 'framer-motion'
import { Calculator, GitBranch, TrendingUp } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      number: '01', title: 'Analyze',
      description: 'Enter any address and deal terms. Parcel runs all five investment strategies simultaneously and gives you a risk score in seconds — not hours.',
      icon: Calculator,
    },
    {
      number: '02', title: 'Track',
      description: 'Add the deal to your pipeline with one click. Move it through stages with drag-and-drop as you negotiate, inspect, and do your diligence.',
      icon: GitBranch,
    },
    {
      number: '03', title: 'Close',
      description: 'Generate offer letters, share deal summaries with your partners, and log every closed deal to your portfolio tracker.',
      icon: TrendingUp,
    },
  ]

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-4xl mx-auto space-y-16">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold">
            Process
          </p>
          <h2 className="text-3xl font-semibold text-text-primary">
            From lead to close in three steps
          </h2>
        </motion.div>

        <div className="space-y-0 divide-y divide-border-subtle">
          {steps.map(({ number, title, description, icon: Icon }, i) => (
            <motion.div
              key={number}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex items-start gap-8 py-9"
            >
              {/* Large decorative number */}
              <span
                className="font-mono font-bold shrink-0 leading-none select-none tabular-nums"
                style={{ fontSize: 'clamp(52px, 6vw, 72px)', color: 'rgba(99,102,241,0.13)' }}
              >
                {number}
              </span>

              {/* Content */}
              <div className="pt-1.5 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-app-elevated border border-border-subtle flex items-center justify-center">
                    <Icon size={14} className="text-accent-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed max-w-lg">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
