import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, BarChart3, MessageSquare, FileText, GitBranch } from 'lucide-react'

const FEATURES = [
  { icon: Sparkles, label: 'Unlimited deal analyses' },
  { icon: MessageSquare, label: 'AI Deal Chat' },
  { icon: FileText, label: 'PDF reports & document AI' },
  { icon: GitBranch, label: 'Deal pipeline & portfolio' },
  { icon: BarChart3, label: 'Deal comparison & offer letters' },
]

export function SuccessOverlay() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const show = searchParams.get('billing') === 'success'

  // Invalidate billing + user queries on mount
  useEffect(() => {
    if (!show) return
    queryClient.invalidateQueries({ queryKey: ['billing'] })
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
  }, [show, queryClient])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        prev.delete('billing')
        return prev
      })
    }, 10_000)
    return () => clearTimeout(timer)
  }, [show, setSearchParams])

  // Simple confetti effect
  useEffect(() => {
    if (!show) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const colors = ['#8B7AFF', '#A89FFF', '#7CCBA5', '#D4A867', '#F0EDE8', '#6B5AD6', '#D4766A']
    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rotation: number; rv: number }[] = []

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.3,
      })
    }

    let raf: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        p.x += p.vx
        p.vy += 0.25
        p.y += p.vy
        p.rotation += p.rv
        if (p.y < canvas.height + 20) alive = true

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
    }
  }, [show])

  const dismiss = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('billing')
      return prev
    })
  }, [setSearchParams])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0B0A]/80 backdrop-blur-xl backdrop-saturate-150"
          onClick={dismiss}
        >
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative z-10 w-full max-w-md bg-app-surface rounded-xl border border-border-default shadow-2xl p-8 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated checkmark */}
            <div className="mx-auto w-16 h-16 rounded-full bg-[#6DBEA3]/15 flex items-center justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Check size={32} className="text-[#6DBEA3]" strokeWidth={3} />
              </motion.div>
            </div>

            <h2 className="text-2xl font-bold text-text-primary text-center">
              Welcome to Parcel!
            </h2>
            <p className="text-base text-text-secondary text-center mt-2 mb-6">
              Your subscription is active. You have full access to all features.
            </p>

            {/* Feature list */}
            <ul className="space-y-3 mb-8">
              {FEATURES.map(({ label }) => (
                <li key={label} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#8B7AFF]/15 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-[#8B7AFF]" />
                  </div>
                  <span className="text-sm text-text-secondary">{label}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                dismiss()
                navigate('/analyze')
              }}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] hover:brightness-110 text-accent-text-on-accent text-sm font-medium transition-all cursor-pointer"
            >
              Start Analyzing Deals
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
