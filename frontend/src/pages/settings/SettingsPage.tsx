import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
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
            <p className="text-sm font-medium text-[#F0EDE8]">Failed to load settings</p>
            <p className="text-xs text-[#A09D98]">Something went wrong. Please try again.</p>
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
      <div className="hidden md:inline-flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.04] mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
              activeTab === tab.id
                ? 'text-[#F0EDE8] bg-white/[0.08] shadow-sm'
                : 'text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]'
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
                ? 'bg-white/[0.08] text-[#F0EDE8]'
                : 'text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]'
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
              <div className="bg-[#1A1916] border border-white/[0.08] rounded-xl p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-[#F0EDE8] mb-4">Profile</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#22211D] border border-white/[0.08] flex items-center justify-center text-[#8B7AFF] text-lg font-semibold">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F0EDE8]">{user?.name ?? 'User'}</p>
                    <p className="text-xs text-[#A09D98]">{user?.email ?? ''}</p>
                  </div>
                </div>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-[#A09D98]">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56] focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-[#A09D98]">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] placeholder:text-[#5C5A56] focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-[#A09D98]">Role</Label>
                    <Input
                      id="role"
                      value={user?.role ?? ''}
                      readOnly
                      className="bg-[#131210] border border-white/[0.04] text-[#5C5A56] cursor-not-allowed"
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
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Change Password Section */}
            <motion.div variants={itemVariants}>
              <div className="bg-[#1A1916] border border-white/[0.08] rounded-xl p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-[#F0EDE8] mb-4">Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password" className="text-sm font-medium text-[#A09D98]">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium text-[#A09D98]">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-[#A09D98]">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (confirmError) setConfirmError('')
                      }}
                      required
                      className="bg-[#131210] border border-white/[0.06] text-[#F0EDE8] focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20"
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
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-[#1A1916] border border-white/[0.08] rounded-xl p-6 shadow-xs">
              <h2 className="text-sm font-semibold text-[#F0EDE8] mb-4">Notifications</h2>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#F0EDE8]">Email Notifications</p>
                  <p className="text-xs text-[#A09D98] mt-0.5">Get notified when your document analysis is complete</p>
                  <p className="text-xs text-[#A09D98] mt-1">We&apos;ll send you an email when AI finishes analyzing your uploaded documents.</p>
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
