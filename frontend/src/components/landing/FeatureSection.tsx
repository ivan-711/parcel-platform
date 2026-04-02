/**
 * FeatureSection — reusable alternating two-column feature block.
 * Text on one side, image placeholder on the other.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ease, duration } from '@/lib/motion'
import { useFadeInOnScroll } from './landing-utils'

interface FeatureSectionProps {
  label: string
  title: string
  description: string
  reversed?: boolean
  accentDot?: boolean
}

export function FeatureSection({
  label,
  title,
  description,
  reversed = false,
  accentDot = false,
}: FeatureSectionProps) {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.15 })

  return (
    <div ref={ref} className="py-16 md:py-24">
      <div
        className={cn(
          'max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-center',
          reversed && 'md:[direction:rtl]',
        )}
      >
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: ease.vercel }}
          className="md:[direction:ltr]"
        >
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary">
            {accentDot && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]" />
            )}
            {label}
          </p>
          <h2 className="font-brand text-3xl md:text-4xl font-light tracking-[-0.02em] text-text-primary mt-4">
            {title}
          </h2>
          <p className="text-base md:text-lg text-text-secondary mt-4 leading-relaxed max-w-md">
            {description}
          </p>
        </motion.div>

        {/* Image placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, delay: 0.1, ease: ease.vercel }}
          className="md:[direction:ltr]"
        >
          <div className="rounded-xl border border-border-default overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="bg-app-surface aspect-[16/10] flex items-center justify-center">
              <p className="text-sm text-text-secondary">Screenshot coming soon</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
