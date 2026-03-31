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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[480px] bg-white border border-gray-200 rounded-xl p-8 space-y-6 shadow-xs"
      >
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-lime-700 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white font-mono">P</span>
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">Parcel</p>
          <AnimatePresence mode="wait">
            {pageState === 'success' ? (
              <motion.p
                key="success-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-500"
              >
                Password updated
              </motion.p>
            ) : pageState === 'error' ? (
              <motion.p
                key="error-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-500"
              >
                Unable to reset password
              </motion.p>
            ) : (
              <motion.p
                key="form-subtitle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-500"
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
                <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-sky-600" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-gray-900">
                    Password reset successfully
                  </p>
                  <p className="text-xs text-gray-400">
                    Redirecting you to sign in...
                  </p>
                </div>
              </div>

              <Link to="/login" className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle size={22} className="text-red-500" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-gray-900">
                    Invalid or expired reset link
                  </p>
                  <p className="text-xs text-gray-400 max-w-[280px]">
                    This link may have expired or already been used. Request a new reset link and try again.
                  </p>
                </div>
              </div>

              <Link to="/forgot-password" className="block">
                <Button
                  type="button"
                  className="w-full bg-lime-700 hover:bg-lime-800 text-white font-medium"
                >
                  Request new reset link
                </Button>
              </Link>

              <p className="text-center text-xs text-gray-400">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-lime-700 hover:text-lime-800 transition-colors"
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
                  <Label htmlFor="new-password" className="text-gray-700 text-xs">
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
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-lime-500 focus:ring-lime-500/20"
                  />
                  <p className="text-[11px] text-gray-400">Must be at least 8 characters</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-gray-700 text-xs">
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
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-lime-500 focus:ring-lime-500/20"
                  />
                </div>

                {/* Validation error */}
                {validationError && (
                  <p className="text-red-500 text-xs">{validationError}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-lime-700 hover:bg-lime-800 text-white font-medium"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
              </motion.div>

              {/* Footer link */}
              <p className="text-center text-xs text-gray-400 mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-lime-700 hover:text-lime-800 transition-colors"
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
