/** Zustand onboarding store — tracks persona selection and sample data state. */

import { create } from 'zustand'
import { api } from '@/lib/api'
import type { OnboardingPersona } from '@/types'

interface OnboardingState {
  completed: boolean
  persona: OnboardingPersona | null
  hasSampleData: boolean
  hasRealData: boolean
  realPropertyCount: number
  loading: boolean
  fetched: boolean

  fetchStatus: () => Promise<void>
  setPersona: (persona: OnboardingPersona, opts?: { notify_agent_features?: boolean }) => Promise<void>
  clearSampleData: () => Promise<void>
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  completed: false,
  persona: null,
  hasSampleData: false,
  hasRealData: false,
  realPropertyCount: 0,
  loading: false,
  fetched: false,

  fetchStatus: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const status = await api.onboarding.status()
      set({
        completed: status.completed,
        persona: status.persona,
        hasSampleData: status.has_sample_data,
        hasRealData: status.has_real_data,
        realPropertyCount: status.real_property_count,
        fetched: true,
      })
    } catch {
      // On 401 (session expired), clearAuth() sets isAuthenticated=false,
      // which stops the useOnboardingStatus retry loop in App.tsx.
      // Leave fetched=false so ProtectedRoute doesn't redirect to
      // /onboarding before the auth redirect to /login can fire.
    } finally {
      set({ loading: false })
    }
  },

  setPersona: async (persona: OnboardingPersona, opts?: { notify_agent_features?: boolean }) => {
    set({ loading: true })
    try {
      await api.onboarding.setPersona(persona, opts)
      set({
        completed: true,
        persona,
        hasSampleData: true,
        loading: false,
      })
    } catch {
      set({ loading: false })
      throw new Error('Failed to save persona')
    }
  },

  clearSampleData: async () => {
    try {
      await api.onboarding.clearSampleData()
      set({ hasSampleData: false })
    } catch {
      // non-critical
    }
  },

  reset: () => {
    set({
      completed: false,
      persona: null,
      hasSampleData: false,
      hasRealData: false,
      realPropertyCount: 0,
      loading: false,
      fetched: false,
    })
  },
}))
