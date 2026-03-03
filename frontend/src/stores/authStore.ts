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
    return JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null
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
