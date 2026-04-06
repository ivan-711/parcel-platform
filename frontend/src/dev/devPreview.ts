/**
 * Dev Preview Mode bootstrap — synchronous entry point.
 * Tree-shaken in production when VITE_DEV_PREVIEW is not 'true'.
 */

import { useAuthStore } from '@/stores/authStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { installMockApi as _installMockApi } from './mockApi'
import { MOCK_USER } from './mockData'

export const isDevPreview = import.meta.env.VITE_DEV_PREVIEW === 'true'

export function installMockApi() {
  _installMockApi()
  useAuthStore.getState().setAuth(MOCK_USER)
  useOnboardingStore.setState({
    completed: true,
    persona: 'hybrid',
    fetched: true,
    hasSampleData: false,
    hasRealData: true,
    realPropertyCount: 5,
    loading: false,
  })
}
