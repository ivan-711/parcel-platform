/** Hero — landing page hero section with headline, CTAs, and the interactive demo card. */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { DemoCard } from './demo-card'
import { TrustBadges } from './trust-badges'
import { CursorSpotlight } from './cursor-spotlight'

export function Hero() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState(false)

  async function handleDemoLogin() {
    setDemoLoading(true)
    setDemoError(false)
    try {
      const { user } = await api.auth.login('demo@parcel.app', 'Demo1234!')
      setAuth(user)
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
          backgroundImage: 'radial-gradient(circle, rgba(132,204,22,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="blob-1 absolute rounded-full blur-[130px]"
          style={{ background: '#84CC16', opacity: 0.10, width: 560, height: 560, top: '0%', left: '5%' }}
        />
        <div
          className="blob-2 absolute rounded-full blur-[110px]"
          style={{ background: '#A3E635', opacity: 0.08, width: 420, height: 420, top: '30%', right: '5%' }}
        />
        <div
          className="blob-3 absolute rounded-full blur-[100px]"
          style={{ background: '#84CC16', opacity: 0.06, width: 340, height: 340, bottom: '10%', left: '42%' }}
        />
      </div>

      {/* Cursor spotlight — follows mouse on pointer devices */}
      <CursorSpotlight />

      {/* Vignette — bottom fade into next section */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#F9FAFB] to-transparent pointer-events-none z-10" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center space-y-8 py-20">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime-300 bg-lime-50 text-lime-800 text-xs font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
          Built for wholesalers, investors, and agents
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-1"
        >
          <h1
            className="font-bold text-gray-900 leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(48px, 7vw, 80px)' }}
          >
            Close More Deals.
          </h1>
          <h1
            className="font-bold leading-[0.95] tracking-tight text-lime-700"
            style={{ fontSize: 'clamp(48px, 7vw, 80px)' }}
          >
            Know Every Number.
          </h1>
        </motion.div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base text-gray-500 max-w-md leading-relaxed"
        >
          Five strategies. One analysis. Run wholesale, BRRRR, creative finance, buy-and-hold, and flip numbers side by side — then track every deal from lead to close.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <Link to="/register" className="focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none rounded-lg">
            <Button className="bg-lime-700 hover:bg-lime-800 text-white h-11 px-6 text-sm font-semibold cursor-pointer transition-colors duration-150">
              Get Started Free
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </Link>
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="h-11 px-6 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors duration-150 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
          >
            {demoLoading ? 'Loading...' : 'View demo'}
          </button>
        </motion.div>

        {demoError && (
          <p className="text-xs text-red-500 mt-2">Demo unavailable — try again shortly</p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
        >
          <TrustBadges />
        </motion.div>

        {/* Interactive demo card */}
        <DemoCard />
      </div>
    </section>
  )
}
