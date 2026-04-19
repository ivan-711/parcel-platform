import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import {
  Repeat,
  Hammer,
  Home,
  FileText,
  RefreshCw,
  Layers,
  Briefcase,
  Compass,
  Loader2,
} from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboardingStore'
import type { OnboardingPersona } from '@/types'

const PERSONAS: { value: OnboardingPersona; label: string; description: string; icon: typeof Home }[] = [
  { value: 'beginner', label: "I'm just getting started", description: 'Explore your first investment with guidance', icon: Compass },
  { value: 'wholesale', label: 'I wholesale deals', description: 'Put properties under contract and assign to other investors', icon: Repeat },
  { value: 'flip', label: 'I flip houses', description: 'Buy, renovate, and resell for profit', icon: Hammer },
  { value: 'buy_and_hold', label: 'I buy and hold rentals', description: 'Buy rentals for long-term cash flow', icon: Home },
  { value: 'brrrr', label: 'I use BRRRR strategy', description: 'Buy, Rehab, Rent, Refinance, Repeat', icon: RefreshCw },
  { value: 'creative_finance', label: 'I use creative financing', description: 'Buy without traditional bank loans', icon: FileText },
  { value: 'hybrid', label: 'I use multiple strategies', description: 'Mix strategies depending on the deal', icon: Layers },
  { value: 'agent', label: "I'm an agent serving investors", description: 'Help your clients analyze investment deals', icon: Briefcase },
]

const staggerContainer = prefersReducedMotion
  ? { hidden: {}, visible: {} }
  : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.03 } } }

const staggerItem = prefersReducedMotion
  ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } } }

export default function OnboardingPage() {
  const [selected, setSelected] = useState<OnboardingPersona | null>(null)
  const { setPersona, loading } = useOnboardingStore()
  const navigate = useNavigate()
  const mountTime = useRef(Date.now())

  useEffect(() => {
    try {
      // PostHog page view
      const posthog = (window as any).posthog
      posthog?.capture?.('onboarding_page_viewed')
    } catch { /* ignore */ }
  }, [])

  const handleSelect = (persona: OnboardingPersona) => {
    if (loading) return
    setSelected(persona)
    try {
      const posthog = (window as any).posthog
      posthog?.capture?.('onboarding_card_selected', { persona })
    } catch { /* ignore */ }
  }

  const handleContinue = async () => {
    if (!selected || loading) return
    try {
      await setPersona(selected)
      try {
        const posthog = (window as any).posthog
        posthog?.capture?.('onboarding_completed', {
          persona: selected,
          time_on_page_ms: Date.now() - mountTime.current,
        })
      } catch { /* ignore */ }
      navigate('/today', { replace: true })
    } catch {
      // error handled in store
    }
  }

  const handleSkip = async () => {
    if (loading) return
    try {
      const posthog = (window as any).posthog
      posthog?.capture?.('onboarding_skipped')
    } catch { /* ignore */ }
    try {
      await setPersona('hybrid')
      navigate('/today', { replace: true })
    } catch {
      // still navigate — onboarding is non-blocking
      navigate('/today', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-text-primary/40 text-sm tracking-[0.2em] uppercase mb-10 font-brand font-light"
      >
        Parcel
      </motion.p>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="text-text-primary text-2xl sm:text-3xl font-brand font-light text-center mb-2"
      >
        What best describes you?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-text-secondary text-sm sm:text-base text-center mb-10"
      >
        This helps us personalize your experience
      </motion.p>

      {/* Persona Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl"
      >
        {PERSONAS.map(({ value, label, description, icon: Icon }) => {
          const isSelected = selected === value
          return (
            <motion.button
              key={value}
              variants={staggerItem}
              onClick={() => handleSelect(value)}
              disabled={loading}
              className={`
                flex items-start gap-3 px-4 py-4 rounded-xl text-left transition-all duration-200
                min-h-[52px]
                ${isSelected
                  ? 'bg-app-surface border border-violet-400 shadow-[0_0_16px_rgba(139,122,255,0.1)]'
                  : 'bg-app-recessed border border-border-default hover:border-violet-400/50'
                }
                ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon
                size={18}
                className={`mt-0.5 shrink-0 ${isSelected ? 'text-violet-400' : 'text-violet-400/60'}`}
              />
              <div className="min-w-0">
                <span className={`text-sm font-brand ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {label}
                </span>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{description}</p>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="mt-8 w-full max-w-xl"
      >
        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className={`
            w-full sm:w-auto sm:min-w-[200px] sm:mx-auto sm:block
            h-11 rounded-lg text-sm font-medium transition-all duration-200
            ${selected && !loading
              ? 'bg-violet-400 text-white hover:bg-violet-500 cursor-pointer'
              : 'bg-border-default text-text-muted cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Setting up...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </motion.div>

      {/* Helper text — hides once a persona is selected */}
      {!selected && (
        <p className="text-text-muted text-xs mt-3 text-center">
          Please select an option to continue
        </p>
      )}

      {/* Skip link */}
      <button
        onClick={handleSkip}
        disabled={loading}
        className="mt-4 text-text-muted text-xs hover:underline hover:text-text-secondary transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
