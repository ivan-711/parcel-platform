/** Component tests for KPICard, StrategyBadge, and SkeletonCard. */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'

/**
 * Mock useCountUp so KPICard renders with the final target value immediately
 * instead of going through requestAnimationFrame animation.
 */
vi.mock('@/hooks/useCountUp', () => ({
  useCountUp: (target: number) => target,
}))

/** Lazy-import KPICard after the mock is set up so it picks up the mocked hook. */
async function importKPICard() {
  const mod = await import('@/components/ui/KPICard')
  return mod.KPICard
}

describe('KPICard', () => {
  let KPICard: Awaited<ReturnType<typeof importKPICard>>

  beforeEach(async () => {
    KPICard = await importKPICard()
  })

  it('renders label and formatted percent value', () => {
    render(<KPICard label="Cap Rate" value={8.4} format="percent" />)

    expect(screen.getByText('Cap Rate')).toBeInTheDocument()
    expect(screen.getByText('8.4%')).toBeInTheDocument()
  })

  it('shows positive delta with up arrow', () => {
    render(<KPICard label="Cash Flow" value={1200} format="currency" delta={2.5} />)

    const deltaEl = screen.getByText((content) => content.includes('2.5'))
    expect(deltaEl).toBeInTheDocument()
    expect(deltaEl.textContent).toContain('\u2191')
  })

  it('shows negative delta with down arrow', () => {
    render(<KPICard label="NOI" value={500} format="currency" delta={-1.3} />)

    const deltaEl = screen.getByText((content) => content.includes('1.3'))
    expect(deltaEl).toBeInTheDocument()
    expect(deltaEl.textContent).toContain('\u2193')
    expect(deltaEl.className).toContain('text-loss')
  })

  it('renders SkeletonCard when loading is true', () => {
    const { container } = render(
      <KPICard label="Test" value={100} format="number" loading />
    )

    expect(screen.queryByText('Test')).not.toBeInTheDocument()
    const shimmerElements = container.querySelectorAll('.animate-shimmer')
    expect(shimmerElements.length).toBeGreaterThan(0)
  })
})

describe('StrategyBadge', () => {
  it('renders the correct label for each strategy', () => {
    const strategies = [
      { key: 'wholesale' as const, label: 'Wholesale' },
      { key: 'creative_finance' as const, label: 'Creative Finance' },
      { key: 'brrrr' as const, label: 'BRRRR' },
      { key: 'buy_and_hold' as const, label: 'Buy & Hold' },
      { key: 'flip' as const, label: 'Flip' },
    ]

    for (const { key, label } of strategies) {
      const { unmount } = render(<StrategyBadge strategy={key} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('SkeletonCard', () => {
  it('renders the correct number of skeleton lines based on lines prop', () => {
    const { container } = render(<SkeletonCard lines={5} />)

    // 1 header skeleton + 5 line skeletons = 6 shimmer elements
    const shimmerElements = container.querySelectorAll('.animate-shimmer')
    expect(shimmerElements).toHaveLength(6)
  })

  it('defaults to 3 lines when no lines prop is provided', () => {
    const { container } = render(<SkeletonCard />)

    // 1 header skeleton + 3 line skeletons = 4 shimmer elements
    const shimmerElements = container.querySelectorAll('.animate-shimmer')
    expect(shimmerElements).toHaveLength(4)
  })
})
