/** Spring-animated number display using Framer Motion. */

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface AnimatedNumberProps {
  value: number
  formatter?: (n: number) => string
  className?: string
}

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) =>
    formatter ? formatter(current) : Math.round(current).toLocaleString()
  )

  useEffect(() => { spring.set(value) }, [spring, value])

  return <motion.span className={className}>{display}</motion.span>
}
