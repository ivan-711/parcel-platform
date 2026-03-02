/** Hero — landing page hero section with headline, CTAs, and the interactive demo card. */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { DemoCard } from './demo-card'

export function Hero() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState(false)

  async function handleDemoLogin() {
    setDemoLoading(true)
    setDemoError(false)
    try {
      const { user, access_token } = await api.auth.login('demo@parcel.app', 'Demo1234!')
      setAuth(user, access_token)
      navigate('/dashboard')
    } catch {
      setDemoError(true)
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="blob-1 absolute rounded-full blur-[130px]"
          style={{ background: '#6366F1', opacity: 0.22, width: 560, height: 560, top: '0%', left: '5%' }}
        />
        <div
          className="blob-2 absolute rounded-full blur-[110px]"
          style={{ background: '#8B5CF6', opacity: 0.16, width: 420, height: 420, top: '30%', right: '5%' }}
        />
        <div
          className="blob-3 absolute rounded-full blur-[100px]"
          style={{ background: '#6366F1', opacity: 0.12, width: 340, height: 340, bottom: '10%', left: '42%' }}
        />
      </div>

      {/* Vignette — bottom fade into next section */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-app-bg to-transparent pointer-events-none z-10" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center space-y-8 py-20">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/8 text-accent-primary text-xs font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          Built for real estate professionals
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-1"
        >
          <h1
            className="font-bold text-text-primary leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(48px, 7vw, 80px)' }}
          >
            Close More Deals.
          </h1>
          <h1
            className="font-bold leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(48px, 7vw, 80px)', color: '#6366F1' }}
          >
            Know Every Number.
          </h1>
        </motion.div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base text-text-secondary max-w-md leading-relaxed"
        >
          Analyze any deal in seconds. Track your pipeline. Process documents with AI.
          Everything a real estate professional needs — in one platform.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <Link to="/register">
            <Button className="bg-accent-primary hover:bg-accent-hover text-white h-11 px-6 text-sm font-semibold cursor-pointer transition-colors duration-150">
              Get Started Free
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="h-11 px-6 text-sm text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong rounded-lg transition-colors duration-150 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {demoLoading ? 'Loading...' : 'View demo'}
          </button>
        </motion.div>

        {demoError && (
          <p className="text-xs text-red-400 mt-2">Demo unavailable — try again shortly</p>
        )}

        {/* Interactive demo card */}
        <DemoCard />
      </div>
    </section>
  )
}
