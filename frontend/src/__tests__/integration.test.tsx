/** Integration tests for full page components (NotFound, Login, Register). */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotFound from '@/pages/NotFound'

/** Mock the useAuth hooks so Login and Register pages render without a real API. */
vi.mock('@/hooks/useAuth', () => ({
  useLogin: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useRegister: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}))

/** Create a fresh QueryClient for each render. */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

/** Wrapper with both Router and QueryClient providers. */
function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NotFound page', () => {
  it('renders 404 text with a link to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()

    const homeLink = screen.getByRole('link', { name: /go home/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})

describe('Login page', () => {
  it('renders email field, password field, and submit button', async () => {
    const Login = (await import('@/pages/Login')).default

    render(
      <TestProviders>
        <Login />
      </TestProviders>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})

describe('Register page', () => {
  it('renders name, email, password fields and role selection buttons', async () => {
    const Register = (await import('@/pages/Register')).default

    render(
      <TestProviders>
        <Register />
      </TestProviders>
    )

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()

    // Role selection cards
    expect(screen.getByText('Wholesaler')).toBeInTheDocument()
    expect(screen.getByText('Investor')).toBeInTheDocument()
    expect(screen.getByText('Agent')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })
})
