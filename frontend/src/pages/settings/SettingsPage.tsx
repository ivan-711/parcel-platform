import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, AlertCircle, Monitor, Moon, Sun } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { getTheme, setTheme, type Theme } from '@/lib/theme'
import { BillingSettings } from './BillingSettings'
import { SuccessOverlay } from '@/components/billing/SuccessOverlay'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing' },
] as const

type TabId = (typeof tabs)[number]['id']

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
]

function AppearanceSection() {
  const [current, setCurrent] = useState<Theme>(getTheme)

  function handleChange(theme: Theme) {
    setCurrent(theme)
    setTheme(theme)
  }

  return (
    <div className="bg-app-surface border border-border-strong rounded-xl p-6 shadow-xs">
      <h2 className="text-sm font-semibold text-text-primary mb-1">Appearance</h2>
      <p className="text-sm text-text-secondary mb-4">Choose your preferred theme</p>
      <div className="inline-flex gap-1 p-1 bg-layer-1 rounded-lg border border-border-subtle">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleChange(value)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
              current === value
                ? 'text-text-primary bg-layer-4 shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-layer-2'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Settings page — profile editing, password change, and notification preferences with tabbed layout. */
export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) || 'profile'
  const [activeTab, setActiveTab] = useState<TabId>(
    tabs.some((t) => t.id === initialTab) ? initialTab : 'profile'
  )
  const { data: user, isLoading, isError: profileError } = useQuery({
    queryKey: ['me'],
    queryFn: api.auth.me,
  })

  // Profile form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmError, setConfirmError] = useState('')

  // Notification preferences
  const queryClient = useQueryClient()

  const { data: notifPrefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: api.notifications.get,
  })

  const [notifSaved, setNotifSaved] = useState(false)
  const [notifError, setNotifError] = useState(false)

  const notifMutation = useMutation({
    mutationFn: api.notifications.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    },
    onError: () => {
      setNotifError(true)
      setTimeout(() => setNotifError(false), 2000)
    },
  })

  // Handle ?billing=success / ?billing=canceled (Stripe redirect)
  useEffect(() => {
    const billingParam = searchParams.get('billing')
    if (billingParam === 'success') {
      toast.success('Welcome to Pro! Your subscription is active.')
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['session-check'] })
      setSearchParams({}, { replace: true })
    } else if (billingParam === 'canceled') {
      toast('Checkout canceled — no charges were made.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const profileMutation = useMutation({
    mutationFn: () => api.auth.updateMe({ name, email }),
    onSuccess: (updated) => {
      setProfileMsg({ type: 'success', text: 'Profile updated' })
      setTimeout(() => setProfileMsg(null), 3000)

      // Sync authStore so sidebar reflects new name
      const existingUser = useAuthStore.getState().user
      if (existingUser) {
        useAuthStore.getState().setAuth(
          { ...existingUser, name: updated.name, email: updated.email }
        )
      }

      // Sync the query cache so the form shows fresh data
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => {
      setProfileMsg({ type: 'error', text: err.message })
      setTimeout(() => setProfileMsg(null), 3000)
    },
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.auth.updateMe({ current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg({ type: 'success', text: 'Password updated' })
      setTimeout(() => setPasswordMsg(null), 3000)
    },
    onError: (err: Error) => {
      setPasswordMsg({ type: 'error', text: err.message })
      setTimeout(() => setPasswordMsg(null), 3000)
    },
  })

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    profileMutation.mutate()
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    setConfirmError('')

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    passwordMutation.mutate()
  }

  if (profileError) {
    return (
      <AppShell title="Settings">
        <div className="rounded-xl border border-[#D4766A]/20 bg-[#D4766A]/5 p-6 flex items-start gap-3 max-w-lg">
          <AlertCircle size={20} className="text-[#D4766A] shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Failed to load settings</p>
            <p className="text-xs text-text-secondary">Something went wrong. Please try again.</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['me'] })}
              className="text-xs font-medium text-[#8B7AFF] hover:text-[#A89FFF] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (isLoading) {
    return (
      <AppShell title="Settings">
        <div className="max-w-[640px] mx-auto space-y-8">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Settings">
      {/* Desktop pill tabs — hidden below md */}
      <div className="hidden md:inline-flex gap-1 p-1 bg-layer-1 rounded-lg border border-border-subtle mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
              activeTab === tab.id
                ? 'text-text-primary bg-layer-4 shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-layer-2'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile pill tabs — visible < md */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:hidden scrollbar-none mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-layer-4 text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-layer-2'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        className="max-w-[640px] mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={activeTab}
      >
        {activeTab === 'profile' && (
          <>
            {/* Profile Section */}
            <motion.div variants={itemVariants}>
              <div className="bg-app-surface border border-border-strong rounded-xl p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-app-elevated border border-border-strong flex items-center justify-center text-[#8B7AFF] text-lg font-semibold">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{user?.name ?? 'User'}</p>
                    <p className="text-xs text-text-secondary">{user?.email ?? ''}</p>
                  </div>
                </div>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-text-secondary">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-app-recessed border border-border-default text-text-primary placeholder:text-text-disabled focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-text-secondary">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-app-recessed border border-border-default text-text-primary placeholder:text-text-disabled focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-text-secondary">Role</Label>
                    <Input
                      id="role"
                      value={user?.role ?? ''}
                      readOnly
                      className="bg-app-recessed border border-border-subtle text-text-disabled cursor-not-allowed"
                    />
                  </div>

                  {profileMsg && (
                    <p className={profileMsg.type === 'success' ? 'text-[#6DBEA3] text-sm' : 'text-[#D4766A] text-sm'}>
                      {profileMsg.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={profileMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Appearance Section */}
            <motion.div variants={itemVariants}>
              <AppearanceSection />
            </motion.div>

            {/* Change Password Section */}
            <motion.div variants={itemVariants}>
              <div className="bg-app-surface border border-border-strong rounded-xl p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-text-primary mb-4">Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password" className="text-sm font-medium text-text-secondary">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="bg-app-recessed border border-border-default text-text-primary focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium text-text-secondary">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-app-recessed border border-border-default text-text-primary focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-text-secondary">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (confirmError) setConfirmError('')
                      }}
                      required
                      className="bg-app-recessed border border-border-default text-text-primary focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                    {confirmError && (
                      <p className="text-[#D4766A] text-sm">{confirmError}</p>
                    )}
                  </div>

                  {passwordMsg && (
                    <p className={passwordMsg.type === 'success' ? 'text-[#6DBEA3] text-sm' : 'text-[#D4766A] text-sm'}>
                      {passwordMsg.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={passwordMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-accent-text-on-accent text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordMutation.isPending ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}

        {activeTab === 'notifications' && (
          <motion.div variants={itemVariants}>
            <div className="bg-app-surface border border-border-strong rounded-xl p-6 shadow-xs">
              <h2 className="text-sm font-semibold text-text-primary mb-4">Notifications</h2>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Email Notifications</p>
                  <p className="text-xs text-text-secondary mt-0.5">Get notified when your document analysis is complete</p>
                  <p className="text-xs text-text-secondary mt-1">We&apos;ll send you an email when AI finishes analyzing your uploaded documents.</p>
                </div>
                <Switch
                  checked={notifPrefs?.email_notifications ?? false}
                  onCheckedChange={(checked) => notifMutation.mutate({ email_notifications: checked })}
                  disabled={notifMutation.isPending}
                />
              </div>
              {notifSaved && (
                <p className="flex items-center gap-1 text-[#6DBEA3] text-sm mt-3">
                  <Check size={14} />
                  Saved
                </p>
              )}
              {notifError && (
                <p className="text-[#D4766A] text-sm mt-3">Failed to save</p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'billing' && <BillingSettings />}
      </motion.div>

      <SuccessOverlay />
    </AppShell>
  )
}
