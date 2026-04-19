import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QuotaExceededModal } from '@/components/billing/QuotaExceededModal'
import { useBillingStore } from '@/stores/billingStore'
import { useAuthStore } from '@/stores/authStore'

describe('quota_exceeded_shown event', () => {
  const mockCapture = vi.fn()

  beforeEach(() => {
    ;(window as any).posthog = { capture: mockCapture }
    useAuthStore.setState({
      user: {
        id: 'user-001',
        name: 'Test',
        email: 'test@test.com',
        role: 'investor' as const,
        plan_tier: 'free' as const,
        trial_ends_at: null,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    delete (window as any).posthog
    useBillingStore.setState({ paywallError: null })
    useAuthStore.setState({ user: null, isAuthenticated: false })
    mockCapture.mockClear()
  })

  it('fires with correct payload when modal renders', () => {
    useBillingStore.setState({
      paywallError: {
        code: 'QUOTA_EXCEEDED',
        metric: 'analyses_per_month',
        current: 3,
        limit: 3,
        current_tier: 'free',
      },
    })

    render(
      <MemoryRouter>
        <QuotaExceededModal />
      </MemoryRouter>,
    )

    expect(mockCapture).toHaveBeenCalledWith(
      'quota_exceeded_shown',
      expect.objectContaining({
        metric: 'analyses_per_month',
        current: 3,
        limit: 3,
        current_tier: 'free',
        days_since_signup: expect.any(Number),
      }),
    )
  })
})
