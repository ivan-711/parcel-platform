import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useShake } from '@/lib/motion'
import { useLogin } from '@/hooks/useAuth'

interface LoginForm {
  email: string
  password: string
}

/** Full-screen login page — no AppShell. Submits credentials and redirects to dashboard on success. */
export default function Login() {
  const login = useLogin()
  const { triggerShake, shakeProps } = useShake()
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  })

  useEffect(() => {
    if (login.error) triggerShake()
  }, [login.error, triggerShake])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    login.mutate({ email: form.email, password: form.password })
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
          <p className="text-sm text-[#A09D98]">Sign in to your account</p>
        </div>

        {/* Form */}
        <motion.div {...shakeProps}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[#A09D98] text-xs">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56] focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[#A09D98] text-xs">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56] focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
            />
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Inline error */}
          {login.error && (
            <p className="text-[#D4766A] text-xs">{login.error.message}</p>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] font-medium hover:opacity-90"
          >
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        </motion.div>

        {/* Footer link */}
        <p className="text-center text-xs text-[#7A7872]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[#8B7AFF] hover:text-[#A89FFF] transition-colors">
            Get started
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
