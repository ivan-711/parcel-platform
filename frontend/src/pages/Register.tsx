import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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
    icon: '🏷️',
    description: 'Find and assign contracts',
  },
  {
    value: 'investor',
    label: 'Investor',
    icon: '📈',
    description: 'Analyze and acquire properties',
  },
  {
    value: 'agent',
    label: 'Agent',
    icon: '🤝',
    description: 'Represent buyers and sellers',
  },
]

/** Full-screen registration page with role selection cards. */
export default function Register() {
  const register = useRegister()
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    role: null,
  })
  const [roleError, setRoleError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.role) {
      setRoleError('Please select a role to continue.')
      return
    }
    setRoleError(null)
    register.mutate({ name: form.name, email: form.email, password: form.password, role: form.role })
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[480px] bg-app-surface border border-border-subtle rounded-xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="space-y-1 text-center">
          <p className="text-2xl font-semibold text-accent-primary tracking-tight">Parcel</p>
          <p className="text-sm text-text-secondary">Create your account</p>
        </div>

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
              className="bg-app-elevated border-border-default text-text-primary placeholder:text-text-disabled focus:border-accent-primary"
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
              className="bg-app-elevated border-border-default text-text-primary placeholder:text-text-disabled focus:border-accent-primary"
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
              className="bg-app-elevated border-border-default text-text-primary placeholder:text-text-disabled focus:border-accent-primary"
            />
            <p className="text-[11px] text-text-muted">Must be at least 8 characters</p>
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
                        ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                        : 'border-border-subtle hover:border-border-default text-text-secondary'
                    )}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-text-muted leading-tight">
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
            {roleError && <p className="text-accent-danger text-xs">{roleError}</p>}
          </div>

          {/* Inline API error */}
          {register.error && (
            <p className="text-accent-danger text-xs">{register.error.message}</p>
          )}

          <Button
            type="submit"
            disabled={register.isPending}
            className="w-full bg-accent-primary hover:bg-accent-hover text-white font-medium"
          >
            {register.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-xs text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-primary hover:text-accent-hover transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
