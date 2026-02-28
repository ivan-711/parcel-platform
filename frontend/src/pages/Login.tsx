import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

/** Full-screen login page — no AppShell. Submits to console and redirects to dashboard. */
export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log('Login form data:', form)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] bg-app-surface border border-border-subtle rounded-xl p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1 text-center">
          <p className="text-2xl font-semibold text-accent-primary tracking-tight">Parcel</p>
          <p className="text-sm text-text-secondary">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-app-elevated border-border-default text-text-primary placeholder:text-text-disabled focus:border-accent-primary"
            />
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border-default bg-app-elevated accent-accent-primary"
              checked={form.rememberMe}
              onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
            />
            <span className="text-xs text-text-secondary">Remember me</span>
          </label>

          <Button
            type="submit"
            className="w-full bg-accent-primary hover:bg-accent-hover text-white font-medium"
          >
            Sign in
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-center text-xs text-text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-accent-primary hover:text-accent-hover transition-colors">
            Get started
          </Link>
        </p>
      </div>
    </div>
  )
}
