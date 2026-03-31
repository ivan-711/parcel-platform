/** Strategy selection page — first step of the deal analyzer flow. */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import type { Strategy } from '@/types'

interface StrategyOption {
  strategy: Strategy
  name: string
  description: string
}

const STRATEGIES: StrategyOption[] = [
  {
    strategy: 'wholesale',
    name: 'Wholesale',
    description: 'Assign contracts to end buyers for a quick profit without rehabbing the property.',
  },
  {
    strategy: 'creative_finance',
    name: 'Creative Finance',
    description: 'Structure deals with seller financing, subject-to, or lease options.',
  },
  {
    strategy: 'brrrr',
    name: 'BRRRR',
    description: 'Buy, Rehab, Rent, Refinance, Repeat — build a rental portfolio with recycled capital.',
  },
  {
    strategy: 'buy_and_hold',
    name: 'Buy & Hold',
    description: 'Acquire rental properties for long-term cash flow and appreciation.',
  },
  {
    strategy: 'flip',
    name: 'Flip',
    description: 'Purchase, renovate, and resell properties for a one-time profit.',
  },
]

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
}

export default function StrategySelectPage() {
  return (
    <AppShell title="Analyzer">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Choose a Strategy</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select an investment strategy to analyze your deal.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {STRATEGIES.map((s) => (
            <motion.div key={s.strategy} variants={itemVariants}>
              <Link
                to={`/analyze/${s.strategy}`}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-lime-500 shadow-xs hover:shadow-sm transition-all duration-150"
              >
                <StrategyBadge strategy={s.strategy} />
                <span className="font-semibold text-gray-900">{s.name}</span>
                <span className="text-sm text-gray-600 leading-relaxed">{s.description}</span>
                <ArrowRight
                  size={16}
                  className="text-gray-400 group-hover:text-lime-700 transition-colors mt-auto"
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AppShell>
  )
}
