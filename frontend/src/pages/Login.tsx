import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/hooks/useAuth'

interface LoginForm {
  email: string
  password: string
}

/** Full-screen login page — no AppShell. Submits credentials and redirects to dashboard on success. */
export default function Login() {
  const login = useLogin()
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    login.mutate({ email: form.email, password: form.password })
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

          {/* Inline error */}
          {login.error && (
            <p className="text-accent-danger text-xs">{login.error.message}</p>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-accent-primary hover:bg-accent-hover text-white font-medium"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
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
