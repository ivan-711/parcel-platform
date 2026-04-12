import { SignIn } from '@clerk/clerk-react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'

/** Full-screen login page — wraps Clerk's SignIn component with Parcel branding. */
export default function Login() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      <Helmet>
        <title>Sign In — Parcel</title>
        <meta name="description" content="Sign in to your Parcel account to analyze real estate deals." />
      </Helmet>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[480px] h-[480px] rounded-full bg-violet-400/[0.06] blur-[120px]" />
      </div>
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative"
      >
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/today"
          signUpUrl="/register"
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-app-surface border border-border-strong shadow-none',
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
      </motion.div>
    </div>
  )
}
