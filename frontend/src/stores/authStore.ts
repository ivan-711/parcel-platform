/** Zustand auth store — tracks user info for UI display. JWT lives in httpOnly cookie only. */

import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null,
  isAuthenticated: localStorage.getItem('parcel_user') !== null,

  setAuth: (user: User) => {
    localStorage.setItem('parcel_user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('parcel_user')
    set({ user: null, isAuthenticated: false })
  },
}))
