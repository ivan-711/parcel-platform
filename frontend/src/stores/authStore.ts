/** Zustand auth store — tracks user info for UI display. JWT lives in httpOnly cookie only. */

import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User) => void
  clearAuth: () => void
}

function safeParseUser(): User | null {
  try {
    const raw = localStorage.getItem('parcel_user')
    if (!raw || raw === 'null') return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || !parsed.id) return null
    return {
      ...parsed,
      plan_tier: (parsed.plan_tier as string) ?? 'free',
      trial_ends_at: (parsed.trial_ends_at as string) ?? null,
      trial_active: (parsed.trial_active as boolean) ?? false,
    } as User
  } catch {
    localStorage.removeItem('parcel_user')
    return null
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: safeParseUser(),
  isAuthenticated: safeParseUser() !== null,

  setAuth: (user: User) => {
    localStorage.setItem('parcel_user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('parcel_user')
    set({ user: null, isAuthenticated: false })
  },
}))
