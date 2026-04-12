/** Spring-animated number display using Framer Motion. */

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/motion'

interface AnimatedNumberProps {
  value: number
  formatter?: (n: number) => string
  className?: string
}

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const spring = useSpring(prefersReducedMotion ? value : 0, prefersReducedMotion ? { duration: 0 } : { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) =>
    formatter ? formatter(current) : Math.round(current).toLocaleString()
  )

  useEffect(() => { spring.set(value) }, [spring, value])

  return <motion.span className={cn('tabular-nums', className)}>{display}</motion.span>
}
