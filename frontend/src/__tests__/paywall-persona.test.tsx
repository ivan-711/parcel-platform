/** Persona-aware PaywallOverlay copy + paywall_copy_persona_matched event tests. */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaywallOverlay } from '@/components/billing/PaywallOverlay'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useAuthStore } from '@/stores/authStore'

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const wholesaleSkipTraceCopy = /Skip tracing unlocks direct contact info/

describe('PaywallOverlay persona-aware copy', () => {
  const mockCapture = vi.fn()

  beforeEach(() => {
    ;(window as any).posthog = { capture: mockCapture }
    useAuthStore.setState({
      user: {
        id: 'user-001',
        name: 'Test',
        email: 'test@test.com',
        role: 'wholesaler',
        plan_tier: 'free',
        trial_ends_at: null,
        created_at: new Date().toISOString(),
      },
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    delete (window as any).posthog
    useAuthStore.setState({ user: null, isAuthenticated: false })
    useOnboardingStore.getState().reset()
    mockCapture.mockClear()
  })

  it('renders wholesale-specific copy on Skip Tracing paywall when persona is wholesale', () => {
    useOnboardingStore.setState({ persona: 'wholesale', fetched: true })

    renderWithProviders(<PaywallOverlay feature="skip_tracing" />)

    expect(screen.getByText(wholesaleSkipTraceCopy)).toBeInTheDocument()
    expect(
      mockCapture.mock.calls.some(
        ([event, payload]) =>
          event === 'paywall_copy_persona_matched' &&
          payload?.feature === 'skip_tracing' &&
          payload?.persona === 'wholesale' &&
          payload?.copy_variant === 'persona',
      ),
    ).toBe(true)
  })

  it('falls back to generic FEATURE_LABELS copy when persona has no override', () => {
    // Beginner persona has no override for skip_tracing → should fall back.
    useOnboardingStore.setState({ persona: 'beginner', fetched: true })

    renderWithProviders(<PaywallOverlay feature="skip_tracing" />)

    expect(
      screen.getByText('Find property owner contact information'),
    ).toBeInTheDocument()
    expect(
      mockCapture.mock.calls.some(
        ([event, payload]) =>
          event === 'paywall_copy_persona_matched' &&
          payload?.feature === 'skip_tracing' &&
          payload?.persona === 'beginner' &&
          payload?.copy_variant === 'generic',
      ),
    ).toBe(true)
  })

  it('falls back to generic copy when persona is null', () => {
    useOnboardingStore.setState({ persona: null, fetched: true })

    renderWithProviders(<PaywallOverlay feature="pipeline" />)

    expect(
      screen.getByText('Organize deals across pipeline stages'),
    ).toBeInTheDocument()
  })
})
