/** Zustand billing store — manages paywall error state triggered by 402 responses. */

import { create } from 'zustand'

interface PaywallError {
  feature?: string
  code?: string
  upgrade_url?: string
  metric?: string
  current?: number
  limit?: number
  current_tier?: string
}

interface BillingState {
  paywallError: PaywallError | null
  setPaywallError: (error: PaywallError) => void
  clearPaywallError: () => void
}

export const useBillingStore = create<BillingState>()((set) => ({
  paywallError: null,

  setPaywallError: (error: PaywallError) => {
    set({ paywallError: error })
  },

  clearPaywallError: () => {
    set({ paywallError: null })
  },
}))
