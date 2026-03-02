/** FinalCTA — full-width call-to-action section with ambient radial glow. */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FinalCTA() {
  return (
    <section className="py-24 px-6 border-t border-border-subtle relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mx-auto">
            <Zap size={18} className="text-accent-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight tracking-tight">
            Your next deal is waiting.
          </h2>
          <p className="text-text-secondary text-base max-w-sm mx-auto leading-relaxed">
            Join investors who use Parcel to find and close more profitable deals.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link to="/register">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white h-12 px-8 text-sm font-semibold cursor-pointer transition-colors duration-150">
              Get Started Free
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-text-muted flex items-center gap-1.5">
            <Shield size={11} className="text-text-disabled" />
            No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  )
}
