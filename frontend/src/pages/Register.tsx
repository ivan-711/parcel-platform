import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SignUp } from '@clerk/clerk-react'
import { motion } from 'framer-motion'

/**
 * Full-screen registration page — requires TOS acceptance before showing Clerk SignUp.
 */
export default function Register() {
  // Clerk OAuth/SSO callbacks return to /register with either:
  //   - hash fragment: #/sso-callback (hash routing mode)
  //   - query params: __clerk_status, __clerk_db_jwt, __clerk_ticket, __clerk_created_session
  // Bypass TOS gate so <SignUp> can process the callback and complete the flow.
  const isClerkCallback = window.location.hash.includes('sso-callback')
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
        <div className="w-[480px] h-[480px] rounded-full bg-[#8B7AFF]/[0.06] blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-[440px]"
      >
        {!proceeded ? (
          /* TOS acceptance gate — shown before Clerk SignUp */
          <div className="bg-app-surface border border-border-strong rounded-xl p-8 space-y-6">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-[#8B7AFF] flex items-center justify-center">
                  <span className="text-[11px] font-bold text-text-primary font-mono">P</span>
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary tracking-tight">Parcel</p>
              <p className="text-sm text-text-secondary">Create your account</p>
              <p className="text-xs text-[#8B7AFF] font-medium">Start your 7-day free Carbon trial</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => { setTosAccepted(e.target.checked); setTosError(false) }}
                  className="mt-0.5 h-4 w-4 rounded border-border-default text-[#8B7AFF] focus:ring-[#8B7AFF]/30 bg-app-recessed"
                />
                <span className="text-xs text-text-secondary leading-relaxed">
                  I agree to Parcel's{' '}
                  <Link to="/terms" className="text-[#8B7AFF] hover:text-[#A89FFF] underline underline-offset-2" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-[#8B7AFF] hover:text-[#A89FFF] underline underline-offset-2" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {tosError && (
                <p className="text-[#D4766A] text-xs">
                  You must accept the Terms of Service and Privacy Policy to create an account.
                </p>
              )}

              <button
                onClick={handleProceed}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent hover:opacity-90 transition-opacity cursor-pointer"
              >
                Continue to Sign Up
              </button>
            </div>

            <p className="text-center text-xs text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-[#8B7AFF] hover:text-[#A89FFF] transition-colors">
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
                  formButtonPrimary: 'bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent hover:opacity-90',
                  footerActionLink: 'text-[#8B7AFF] hover:text-[#A89FFF]',
                  identityPreviewEditButton: 'text-[#8B7AFF]',
                },
              }}
            />
            <p className="text-xs text-[#8B7AFF] font-medium text-center mt-4">
              Start your 7-day free Carbon trial
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
