import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

/** Full-screen forgot password page — sends a reset link to the provided email address. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.auth.forgotPassword(email)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[480px] h-[480px] rounded-full bg-[#8B7AFF]/[0.06] blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-[400px] bg-app-surface border border-border-strong rounded-xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-[#8B7AFF] flex items-center justify-center">
              <span className="text-[11px] font-bold text-text-primary font-mono">P</span>
            </div>
          </div>
          <p className="text-2xl font-semibold text-text-primary tracking-tight">Parcel</p>
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.p
                key="success-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-text-secondary"
              >
                Check your inbox
              </motion.p>
            ) : (
              <motion.p
                key="default-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-text-secondary"
              >
                Reset your password
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            /* Success state */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-[#6DBEA3]/15 flex items-center justify-center">
                  <Mail size={22} className="text-[#6DBEA3]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-text-primary">
                    Check your email for a reset link
                  </p>
                  <p className="text-xs text-text-secondary max-w-[280px]">
                    We sent a password reset link to{' '}
                    <span className="text-text-secondary font-medium">{email}</span>.
                    If you don&apos;t see it, check your spam folder.
                  </p>
                </div>
              </div>

              <Link to="/login" className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border-default text-text-secondary hover:text-text-primary hover:bg-layer-2"
                >
                  <ArrowLeft size={14} className="mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </motion.div>
          ) : (
            /* Form state */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <p className="text-xs text-text-secondary text-center mb-4">
                Enter your email and we&apos;ll send you a reset link
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-text-secondary text-xs">
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    className="bg-app-recessed border border-border-default text-text-primary placeholder:text-text-disabled focus:border-[#8B7AFF]/50 focus:ring-2 focus:ring-[#8B7AFF]/40 focus:ring-offset-2 focus:ring-offset-app-bg"
                  />
                </div>

                {/* Inline error */}
                {error && (
                  <p className="text-[#D4766A] text-xs">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent font-medium hover:opacity-90"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              {/* Footer link */}
              <p className="text-center text-xs text-text-secondary mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
                >
                  <ArrowLeft size={12} />
                  Back to sign in
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
