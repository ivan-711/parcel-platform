/**
 * ComparisonTable — 3-column feature comparison section (Parcel vs Spreadsheets vs Other Tools).
 * Highlights Parcel's comprehensive feature set with staggered row entrance animations.
 */

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Possible cell states for each competitor column. */
type CellValue = 'yes' | 'no' | 'manual' | 'limited'

interface FeatureRow {
  feature: string
  parcel: CellValue
  spreadsheets: CellValue
  competitors: CellValue
}

const FEATURES: FeatureRow[] = [
  { feature: 'Multi-strategy analysis (5 strategies)', parcel: 'yes', spreadsheets: 'manual', competitors: 'limited' },
  { feature: 'AI-powered document processing',         parcel: 'yes', spreadsheets: 'no',     competitors: 'no' },
  { feature: 'Deal pipeline (Kanban)',                  parcel: 'yes', spreadsheets: 'no',     competitors: 'yes' },
  { feature: 'PDF report export',                       parcel: 'yes', spreadsheets: 'manual', competitors: 'yes' },
  { feature: 'Real-time collaboration',                 parcel: 'yes', spreadsheets: 'no',     competitors: 'limited' },
  { feature: 'Offer letter generator',                  parcel: 'yes', spreadsheets: 'no',     competitors: 'no' },
  { feature: 'Portfolio dashboard',                     parcel: 'yes', spreadsheets: 'no',     competitors: 'yes' },
  { feature: 'Market comparison data',                  parcel: 'yes', spreadsheets: 'no',     competitors: 'yes' },
  { feature: 'Mobile-friendly interface',               parcel: 'yes', spreadsheets: 'no',     competitors: 'limited' },
  { feature: 'Free tier available',                     parcel: 'yes', spreadsheets: 'yes',    competitors: 'no' },
]

const COLUMNS = ['Parcel', 'Spreadsheets', 'Other Tools'] as const

/**
 * Renders a single cell value as a check icon, X icon, or qualifier text.
 */
function CellIndicator({ value, column }: { value: CellValue; column: string }) {
  switch (value) {
    case 'yes':
      return <Check size={16} className="text-accent-success" aria-label={`${column}: Yes`} />
    case 'no':
      return <X size={16} className="text-accent-danger" aria-label={`${column}: No`} />
    case 'manual':
      return <span className="text-text-muted text-xs" aria-label={`${column}: Manual`}>Manual</span>
    case 'limited':
      return <span className="text-text-muted text-xs" aria-label={`${column}: Limited`}>Limited</span>
  }
}

export function ComparisonTable() {
  return (
    <section className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto space-y-14">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.08em] text-accent-primary font-semibold">
            Comparison
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-text-primary">
            Parcel vs. your spreadsheet
          </h2>
          <p className="text-sm text-text-secondary max-w-lg">
            See how Parcel stacks up against spreadsheets and other deal analysis tools.
          </p>
        </motion.div>

        {/* Table container */}
        <div className="rounded-2xl border border-border-subtle bg-app-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              {/* Header row */}
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="sticky left-0 z-10 bg-app-surface text-left py-4 px-5 text-xs font-medium text-text-muted uppercase tracking-[0.08em] w-[45%]">
                    Feature
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className={cn(
                        'py-4 px-5 text-center text-xs font-medium uppercase tracking-[0.08em]',
                        col === 'Parcel'
                          ? 'text-accent-primary font-semibold border-l-2 border-accent-primary/30'
                          : 'text-text-muted',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Feature rows */}
              <tbody>
                {FEATURES.map((row, index) => {
                  const isEven = index % 2 === 1
                  const rowBg = isEven ? 'bg-app-elevated/50' : 'bg-app-surface'
                  const stickyBg = isEven ? 'bg-app-elevated/50' : 'bg-app-surface'

                  return (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{ duration: 0.3, delay: index * 0.06 }}
                      className={cn(rowBg, 'border-b border-border-subtle/50 last:border-b-0')}
                    >
                      {/* Feature name — sticky on mobile */}
                      <td
                        className={cn(
                          'sticky left-0 z-10 py-3.5 px-5 text-sm text-text-secondary',
                          stickyBg,
                        )}
                      >
                        {row.feature}
                      </td>

                      {/* Parcel column */}
                      <td className="py-3.5 px-5 text-center border-l-2 border-accent-primary/30">
                        <span className="inline-flex items-center justify-center">
                          <CellIndicator value={row.parcel} column="Parcel" />
                        </span>
                      </td>

                      {/* Spreadsheets column */}
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center justify-center">
                          <CellIndicator value={row.spreadsheets} column="Spreadsheets" />
                        </span>
                      </td>

                      {/* Competitors column */}
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center justify-center">
                          <CellIndicator value={row.competitors} column="Other Tools" />
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
