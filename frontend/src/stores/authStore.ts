/** Zustand auth store — hydrates synchronously from localStorage on init. */

import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: localStorage.getItem('parcel_token'),
  user: JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null,
  isAuthenticated: localStorage.getItem('parcel_token') !== null,

  setAuth: (user: User, token: string) => {
    localStorage.setItem('parcel_token', token)
    localStorage.setItem('parcel_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('parcel_token')
    localStorage.removeItem('parcel_user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
