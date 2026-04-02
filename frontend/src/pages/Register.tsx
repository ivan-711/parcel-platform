import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useShake } from '@/lib/motion'
import { useRegister } from '@/hooks/useAuth'

type Role = 'wholesaler' | 'investor' | 'agent'

interface RegisterForm {
  name: string
  email: string
  password: string
  role: Role | null
}

interface RoleOption {
  value: Role
  label: string
  icon: string
  description: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'wholesaler',
    label: 'Wholesaler',
    icon: '\uD83C\uDFF7\uFE0F',
    description: 'Find and assign contracts',
  },
  {
    value: 'investor',
    label: 'Investor',
    icon: '\uD83D\uDCC8',
    description: 'Analyze and acquire properties',
  },
  {
    value: 'agent',
    label: 'Agent',
    icon: '\uD83E\uDD1D',
    description: 'Represent buyers and sellers',
  },
]

/** Full-screen registration page with role selection cards. */
export default function Register() {
  const register = useRegister()
  const { triggerShake, shakeProps } = useShake()
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    role: null,
  })
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    if (register.error) triggerShake()
  }, [register.error, triggerShake])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.role) {
      setRoleError('Please select a role to continue.')
      triggerShake()
      return
    }
    setRoleError(null)
    register.mutate({ name: form.name, email: form.email, password: form.password, role: form.role })
  }

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
          <p className="text-sm text-text-secondary">Create your account</p>
          <p className="text-xs text-[#8B7AFF] font-medium">Start your 7-day free Pro trial</p>
        </div>

        <motion.div {...shakeProps}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-text-secondary text-xs">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-app-recessed border border-border-default text-text-primary placeholder:text-text-disabled focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-text-secondary text-xs">
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
              className="bg-app-recessed border border-border-default text-text-primary placeholder:text-text-disabled focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-text-secondary text-xs">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-app-recessed border border-border-default text-text-primary placeholder:text-text-disabled focus:border-[#8B7AFF]/50 focus:ring-[#8B7AFF]/20"
            />
            <p className="text-[11px] text-text-secondary">Must be at least 8 characters</p>
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">I am a...</Label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((option) => {
                const selected = form.role === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setForm({ ...form, role: option.value }); setRoleError(null) }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors',
                      selected
                        ? 'border-[#8B7AFF]/40 bg-[#8B7AFF]/10 text-text-primary'
                        : 'border-border-default hover:border-border-strong text-text-secondary'
                    )}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-text-secondary leading-tight">
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
            {roleError && <p className="text-[#D4766A] text-xs">{roleError}</p>}
          </div>

          {/* Inline API error */}
          {register.error && (
            <p className="text-[#D4766A] text-xs">{register.error.message}</p>
          )}

          <Button
            type="submit"
            disabled={register.isPending}
            className="w-full bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent font-medium hover:opacity-90"
          >
            {register.isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        </motion.div>

        <p className="text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-[#8B7AFF] hover:text-[#A89FFF] transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
