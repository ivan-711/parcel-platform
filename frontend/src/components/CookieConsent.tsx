import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'parcel_cookie_consent'

type Consent = 'all' | 'essential'

function getStoredConsent(): Consent | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (val === 'all' || val === 'essential') return val
    return null
  } catch {
    return null
  }
}

function applyConsent(choice: Consent) {
  localStorage.setItem(STORAGE_KEY, choice)
  if (choice === 'essential') {
    // Disable PostHog analytics tracking
    try { ;(window as any).posthog?.opt_out_capturing?.() } catch { /* ignore */ }
  } else {
    // Ensure PostHog is capturing (opt back in if previously opted out)
    try { ;(window as any).posthog?.opt_in_capturing?.() } catch { /* ignore */ }
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = getStoredConsent()
    if (!stored) {
      setVisible(true)
    } else {
      // Apply stored preference on load
      applyConsent(stored)
    }
  }, [])

  const handleAccept = () => {
    applyConsent('all')
    setVisible(false)
  }

  const handleEssential = () => {
    applyConsent('essential')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4"
        >
          <div className="max-w-2xl mx-auto bg-app-surface border border-border-strong rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-xs text-text-secondary leading-relaxed flex-1">
              Parcel uses cookies to keep you signed in, secure your account, and understand product usage.{' '}
              <Link to="/privacy" className="text-[#8B7AFF] hover:text-[#A89FFF] underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEssential}
                className="px-3 py-1.5 text-xs text-text-secondary border border-border-default rounded-lg hover:border-border-strong hover:text-text-primary transition-colors cursor-pointer"
              >
                Essential only
              </button>
              <button
                onClick={handleAccept}
                className="px-3 py-1.5 text-xs text-white bg-[#8B7AFF] rounded-lg hover:bg-[#7B6AEF] transition-colors cursor-pointer"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
