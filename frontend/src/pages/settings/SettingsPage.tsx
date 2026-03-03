import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

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

/** Settings page — profile editing and password change. */
export default function SettingsPage() {
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
        <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 p-6 flex items-start gap-3 max-w-lg">
          <AlertCircle size={20} className="text-accent-danger shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Failed to load settings</p>
            <p className="text-xs text-text-secondary">Something went wrong. Please try again.</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['me'] })}
              className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
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
        <div className="max-w-[600px] space-y-8">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Settings">
      <motion.div
        className="max-w-[600px] space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Section */}
        <motion.div variants={itemVariants}>
          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#F1F5F9] mb-4">Profile</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={user?.role ?? ''}
                  readOnly
                  className="opacity-50 cursor-not-allowed"
                />
              </div>

              {profileMsg && (
                <p className={profileMsg.type === 'success' ? 'text-accent-success text-sm' : 'text-accent-danger text-sm'}>
                  {profileMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Change Password Section */}
        <motion.div variants={itemVariants}>
          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#F1F5F9] mb-4">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (confirmError) setConfirmError('')
                  }}
                  required
                />
                {confirmError && (
                  <p className="text-accent-danger text-sm">{confirmError}</p>
                )}
              </div>

              {passwordMsg && (
                <p className={passwordMsg.type === 'success' ? 'text-accent-success text-sm' : 'text-accent-danger text-sm'}>
                  {passwordMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordMutation.isPending ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div variants={itemVariants}>
          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#F1F5F9] mb-4">Notifications</h2>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Email Notifications</p>
                <p className="text-xs text-text-muted mt-0.5">Get notified when your document analysis is complete</p>
                <p className="text-xs text-text-muted mt-1">We&apos;ll send you an email when AI finishes analyzing your uploaded documents.</p>
              </div>
              <Switch
                checked={notifPrefs?.email_notifications ?? false}
                onCheckedChange={(checked) => notifMutation.mutate({ email_notifications: checked })}
                disabled={notifMutation.isPending}
              />
            </div>
            {notifSaved && (
              <p className="flex items-center gap-1 text-accent-success text-sm mt-3">
                <Check size={14} />
                Saved
              </p>
            )}
            {notifError && (
              <p className="text-accent-danger text-sm mt-3">Failed to save</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  )
}
