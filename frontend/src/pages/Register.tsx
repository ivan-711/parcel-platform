import { SignUp } from '@clerk/clerk-react'
import { motion } from 'framer-motion'

/**
 * Full-screen registration page — wraps Clerk's SignUp component with Parcel branding.
 *
 * Sprint 5 will add a TOS acceptance checkbox below the Clerk form.
 * The wrapper structure is kept minimal to make that addition straightforward.
 */
export default function Register() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4 py-12">
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
        {/* Clerk SignUp form */}
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

        {/* Trial badge */}
        <p className="text-xs text-[#8B7AFF] font-medium text-center mt-4">
          Start your 7-day free Carbon trial
        </p>
      </motion.div>
    </div>
  )
}
