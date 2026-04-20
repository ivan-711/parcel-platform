/**
 * Regression test — Pipeline page routes 402 FEATURE_GATED to PaywallOverlay,
 * not the generic "Failed to load pipeline" error screen.
 *
 * Background: commit 9277f37 shipped persona-matched paywall copy for
 * Pipeline, but on hard refresh the pipeline useQuery errored before the
 * FeatureGate could render, so free-tier users saw PipelineError instead.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import { useOnboardingStore } from '@/stores/onboardingStore'

// jsdom doesn't implement Element.scrollTo — MobilePipeline uses it in an
// effect during the transient loading render (before the 402 settles).
if (typeof Element !== 'undefined' && !(Element.prototype as any).scrollTo) {
  (Element.prototype as any).scrollTo = () => {}
}

// Mock Clerk — PipelinePage gates on useAuth(); AppShell uses useClerk().
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn() }),
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({ user: null, isLoaded: true, isSignedIn: true }),
  useSession: () => ({ session: null, isLoaded: true }),
  UserButton: () => null,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
}))

// Mock the pipeline API call — make it throw a 402 FEATURE_GATED ApiError.
// api.pipeline.list is what PipelinePage calls.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: {
      ...actual.api,
      pipeline: {
        list: vi.fn(() =>
          Promise.reject(
            new actual.ApiError('Upgrade required', 402, 'FEATURE_GATED'),
          ),
        ),
        updateStage: vi.fn(),
        remove: vi.fn(),
      },
    },
  }
})

import PipelinePage from '@/pages/Pipeline'

function renderPipeline() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pipeline']}>
        <PipelinePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PipelinePage 402 → PaywallOverlay', () => {
  beforeEach(() => {
    ;(window as any).posthog = { capture: vi.fn() }
    // Free-tier wholesale user — matches the bug scenario
    useAuthStore.setState({
      user: {
        id: 'user-001',
        name: 'Wholesale Test',
        email: 'wholesale@test.com',
        role: 'wholesaler',
        plan_tier: 'free',
        trial_ends_at: null,
        created_at: new Date().toISOString(),
      },
      isAuthenticated: true,
    })
    useOnboardingStore.setState({ persona: 'wholesale', fetched: true })
    // Mirror the side effect api.ts:request() performs on a real 402 —
    // the mock throws ApiError directly, skipping that code path.
    useBillingStore.getState().setPaywallError({
      feature: 'pipeline',
      code: 'FEATURE_GATED',
    })
  })

  afterEach(() => {
    delete (window as any).posthog
    useAuthStore.setState({ user: null, isAuthenticated: false })
    useOnboardingStore.getState().reset()
    useBillingStore.getState().clearPaywallError()
    vi.restoreAllMocks()
  })

  it('renders PaywallOverlay with wholesale-matched copy on 402, not PipelineError', async () => {
    renderPipeline()

    // Wait for the paywall dialog (role=dialog, aria-label "Upgrade required: Deal Pipeline")
    const dialog = await screen.findByRole(
      'dialog',
      { name: /Upgrade required.*Deal Pipeline/i },
      { timeout: 3000 },
    )
    expect(dialog).toBeInTheDocument()

    // Persona-matched wholesale copy
    expect(
      screen.getByText(/wholesale deal in one pipeline/i),
    ).toBeInTheDocument()

    // The generic PipelineError string must NOT appear
    expect(screen.queryByText('Failed to load pipeline')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Try again$/i })).toBeNull()
  })

  it('fires paywall_overlay_rendered with error_status=402', async () => {
    renderPipeline()

    await screen.findByRole(
      'dialog',
      { name: /Upgrade required.*Deal Pipeline/i },
      { timeout: 3000 },
    )

    const capture = (window as any).posthog.capture as ReturnType<typeof vi.fn>
    const rendered = capture.mock.calls.find(
      (call: unknown[]) => call[0] === 'paywall_overlay_rendered',
    )
    expect(rendered).toBeTruthy()
    expect(rendered?.[1]).toMatchObject({
      feature: 'pipeline',
      persona: 'wholesale',
      copy_variant: 'persona',
      error_status: 402,
    })
  })

  it('ApiError type guard correctly identifies 402 FEATURE_GATED', () => {
    const err = new ApiError('Upgrade required', 402, 'FEATURE_GATED')
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(402)
    expect(err.code).toBe('FEATURE_GATED')
  })

  it('renders a height-matching spacer to prevent paywall layout shift', async () => {
    // Regression guard for the layout-shift fix (2026-04-20). Without this
    // spacer, FeatureGate's container collapses from ~100vh (loading, with
    // the kanban) to ~200px (error, header-only), causing PaywallOverlay
    // to visibly jump upward mid-render. jsdom doesn't compute layout, so
    // we can't assert pixel heights — but we can assert the structural
    // element that stabilizes the container is present with the matching
    // height token.
    //
    // Uses findByTestId (not getByTestId) because the spacer only exists
    // in the post-402 error-branch render; the paywall dialog itself
    // renders earlier (during isLoading, from FeatureGate's plan_tier
    // check) so findByRole(dialog) resolves before the error branch does.
    renderPipeline()
    const spacer = await screen.findByTestId(
      'pipeline-paywall-spacer',
      {},
      { timeout: 3000 },
    )
    expect(spacer).toBeInTheDocument()
    expect(spacer).toHaveAttribute('aria-hidden', 'true')
    expect(spacer.className).toMatch(/min-h-\[calc\(100vh-180px\)\]/)
  })
})
