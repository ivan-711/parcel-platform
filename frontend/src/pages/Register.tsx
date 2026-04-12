import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SignUp } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * Full-screen registration page — requires TOS acceptance before showing Clerk SignUp.
 */
export default function Register() {
  // Clerk OAuth/SSO callbacks return to /register with params in the hash fragment:
  //   - #/sso-callback (hash routing mode)
  //   - #/?sign_up_fallback_redirect_url=... (Google OAuth redirect)
  //   - #/?__clerk_status=... (Clerk internal state)
  // Bypass TOS gate so <SignUp> can process the callback and complete the flow.
  const isClerkCallback = window.location.hash.includes('sso-callback')
    || window.location.hash.includes('fallback_redirect_url')
    || window.location.hash.includes('__clerk')
    || window.location.search.includes('__clerk')

  const [tosAccepted, setTosAccepted] = useState(false)
  const [tosError, setTosError] = useState(false)
  const [proceeded, setProceeded] = useState(isClerkCallback)

  const handleProceed = () => {
    if (!tosAccepted) {
      setTosError(true)
      return
    }
    setProceeded(true)
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4 py-12">
      <Helmet>
        <title>Sign Up — Parcel</title>
        <meta name="description" content="Create your Parcel account and start your 7-day free Carbon trial." />
      </Helmet>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[480px] h-[480px] rounded-full bg-violet-400/[0.06] blur-[120px]" />
      </div>
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-[440px]"
      >
        {!proceeded ? (
          /* TOS acceptance gate — shown before Clerk SignUp */
          <div className="bg-app-surface border border-border-strong rounded-xl p-8 space-y-6">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-violet-400 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-text-primary font-mono">P</span>
                </div>
              </div>
              <p className="text-2xl font-brand font-light text-text-primary tracking-tight">Parcel</p>
              <p className="text-sm text-text-secondary">Create your account</p>
              <p className="text-xs text-violet-400 font-medium">Start your 7-day free Carbon trial</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => { setTosAccepted(e.target.checked); setTosError(false) }}
                  className="mt-0.5 h-4 w-4 rounded border-border-default text-violet-400 focus:ring-violet-400/30 bg-app-recessed"
                />
                <span className="text-xs text-text-secondary leading-relaxed">
                  I agree to Parcel's{' '}
                  <Link to="/terms" className="text-violet-400 hover:text-violet-300 underline underline-offset-2" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {tosError && (
                <p className="text-error text-xs">
                  You must accept the Terms of Service and Privacy Policy to create an account.
                </p>
              )}

              <button
                onClick={handleProceed}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-400 to-violet-600 text-accent-text-on-accent hover:opacity-90 transition-opacity cursor-pointer"
              >
                Continue to Sign Up
              </button>
            </div>

            <p className="text-center text-xs text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          /* Clerk SignUp form — shown after TOS accepted */
          <>
            <SignUp
              routing="hash"
              fallbackRedirectUrl="/onboarding"
              signInUrl="/login"
              appearance={{
                elements: {
                  rootBox: 'mx-auto w-full',
                  card: 'bg-app-surface border border-border-strong shadow-none w-full',
                  headerTitle: 'text-text-primary',
                  headerSubtitle: 'text-text-secondary',
                  formFieldLabel: 'text-text-secondary',
                  formFieldInput: 'bg-app-recessed border-border-default text-text-primary placeholder:text-text-disabled',
                  formButtonPrimary: 'bg-gradient-to-r from-violet-400 to-violet-600 text-accent-text-on-accent hover:opacity-90',
                  footerActionLink: 'text-violet-400 hover:text-violet-300',
                  identityPreviewEditButton: 'text-violet-400',
                },
              }}
            />
            <p className="text-xs text-violet-400 font-medium text-center mt-4">
              Start your 7-day free Carbon trial
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
