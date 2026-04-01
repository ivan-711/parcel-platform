import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useShake } from '@/lib/motion'
import { api } from '@/lib/api'

type PageState = 'form' | 'success' | 'error'

/** Full-screen password reset page — reads a token from the URL and lets the user set a new password. */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageState, setPageState] = useState<PageState>(token ? 'form' : 'error')
  const { triggerShake, shakeProps } = useShake()
  const [validationError, setValidationError] = useState<string | null>(null)

  const redirectToLogin = useCallback(() => {
    navigate('/login')
  }, [navigate])

  /* Auto-redirect to login 3 seconds after success */
  useEffect(() => {
    if (pageState !== 'success') return
    const timer = setTimeout(redirectToLogin, 3000)
    return () => clearTimeout(timer)
  }, [pageState, redirectToLogin])

  function validate(): string | null {
    if (password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError(null)

    const err = validate()
    if (err) {
      setValidationError(err)
      triggerShake()
      return
    }

    if (!token) {
      setPageState('error')
      return
    }

    setIsSubmitting(true)
    try {
      await api.auth.resetPassword(token, password)
      setPageState('success')
    } catch {
      setPageState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0B0A] flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[480px] h-[480px] rounded-full bg-[#8B7AFF]/[0.06] blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-[400px] bg-[#1A1916] border border-white/[0.08] rounded-xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-[#8B7AFF] flex items-center justify-center">
              <span className="text-[11px] font-bold text-[#F0EDE8] font-mono">P</span>
            </div>
          </div>
          <p className="text-2xl font-semibold text-[#F0EDE8] tracking-tight">Parcel</p>
          <AnimatePresence mode="wait">
            {pageState === 'success' ? (
              <motion.p
                key="success-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-[#A09D98]"
              >
                Password updated
              </motion.p>
            ) : pageState === 'error' ? (
              <motion.p
                key="error-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-[#A09D98]"
              >
                Unable to reset password
              </motion.p>
            ) : (
              <motion.p
                key="form-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-[#A09D98]"
              >
                Create new password
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {pageState === 'success' ? (
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
                  <CheckCircle2 size={22} className="text-[#6DBEA3]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-[#F0EDE8]">
                    Password reset successfully
                  </p>
                  <p className="text-xs text-[#7A7872]">
                    Redirecting you to sign in...
                  </p>
                </div>
              </div>

              <Link to="/login" className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
                >
                  <ArrowLeft size={14} className="mr-2" />
                  Go to sign in
                </Button>
              </Link>
            </motion.div>
          ) : pageState === 'error' ? (
            /* Error state */
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-[#D4766A]/10 flex items-center justify-center">
                  <AlertCircle size={22} className="text-[#D4766A]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-[#F0EDE8]">
                    Invalid or expired reset link
                  </p>
                  <p className="text-xs text-[#7A7872] max-w-[280px]">
                    This link may have expired or already been used. Request a new reset link and try again.
                  </p>
                </div>
              </div>

              <Link to="/forgot-password" className="block">
                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] font-medium hover:opacity-90"
                >
                  Request new reset link
                </Button>
              </Link>

              <p className="text-center text-xs text-[#7A7872]">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
                >
                  <ArrowLeft size={12} />
                  Back to sign in
                </Link>
              </p>
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
              <motion.div {...shakeProps}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-[#A09D98] text-xs">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setValidationError(null) }}
                    className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56] focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
                  />
                  <p className="text-[11px] text-[#7A7872]">Must be at least 8 characters</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-[#A09D98] text-xs">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(null) }}
                    className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56] focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
                  />
                </div>

                {/* Validation error */}
                {validationError && (
                  <p className="text-[#D4766A] text-xs">{validationError}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] font-medium hover:opacity-90"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
              </motion.div>

              {/* Footer link */}
              <p className="text-center text-xs text-[#7A7872] mt-6">
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
