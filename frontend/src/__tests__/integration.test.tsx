/** Integration tests for full page components (NotFound). */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from '@/pages/NotFound'

// Login and Register are now Clerk components — they require ClerkProvider
// and cannot be meaningfully unit-tested without a Clerk test environment.
// Those flows are covered by E2E tests instead.

describe('NotFound page', () => {
  it('renders 404 text with a link to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()

    const homeLink = screen.getByRole('link', { name: /back to dashboard/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
