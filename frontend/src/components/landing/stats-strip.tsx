/** StatsStrip — social proof stats row with staggered fade-in animations. */

import { motion } from 'framer-motion'
import { STATS } from './constants'

export function StatsStrip() {
  return (
    <section className="py-16 px-6 border-b border-border-subtle">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
        {STATS.map(({ value, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="text-center space-y-1"
          >
            <p className="text-3xl font-mono font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted tracking-wide">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
