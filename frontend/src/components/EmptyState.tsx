/**
 * Reusable empty state component for pages with no data.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  heading: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  secondaryCta?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, heading, description, ctaLabel, ctaHref, secondaryCta }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-20 px-4"
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-[#8B7AFF]/10 flex items-center justify-center mb-5">
          <Icon size={22} className="text-[#8B7AFF]/60" />
        </div>
      )}

      <h2
        className="text-xl sm:text-2xl text-[#F0EDE8] mb-2"
        style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
      >
        {heading}
      </h2>

      <p className="text-sm text-[#C5C0B8] max-w-md mb-6">
        {description}
      </p>

      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors"
        >
          {ctaLabel}
        </Link>
      )}

      {secondaryCta && (
        <Link
          to={secondaryCta.href}
          className="mt-3 text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors"
        >
          {secondaryCta.label}
        </Link>
      )}
    </motion.div>
  )
}
