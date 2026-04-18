/**
 * Reusable empty state component for pages with no data.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import type { LucideIcon } from 'lucide-react'

const CTA_CLASSES = 'inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors'

interface Props {
  icon?: LucideIcon
  heading: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  secondaryCta?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, heading, description, ctaLabel, ctaHref, onCtaClick, secondaryCta }: Props) {
  if (process.env.NODE_ENV !== 'production' && ctaHref && onCtaClick) {
    console.warn('[EmptyState] Both ctaHref and onCtaClick provided; onCtaClick wins. Pass only one.')
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-20 px-4"
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-violet-400/10 flex items-center justify-center mb-5">
          <Icon size={22} className="text-violet-400/60" />
        </div>
      )}

      <h2
        className="text-xl sm:text-2xl text-text-primary mb-2 font-brand font-light"
      >
        {heading}
      </h2>

      <p className="text-sm text-text-secondary max-w-md mb-6">
        {description}
      </p>

      {ctaLabel && onCtaClick && (
        <button type="button" onClick={onCtaClick} className={CTA_CLASSES}>
          {ctaLabel}
        </button>
      )}
      {ctaLabel && ctaHref && !onCtaClick && (
        <Link to={ctaHref} className={CTA_CLASSES}>
          {ctaLabel}
        </Link>
      )}

      {secondaryCta && (
        <Link
          to={secondaryCta.href}
          className="mt-3 text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          {secondaryCta.label}
        </Link>
      )}
    </motion.div>
  )
}
