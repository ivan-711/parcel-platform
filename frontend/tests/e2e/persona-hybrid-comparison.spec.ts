/**
 * Fix 1 — Hybrid persona lands on StrategyComparison view.
 *
 * Seeds the authenticated test user with persona=hybrid (onboarding complete),
 * navigates to /analyze, enters a known sample address, waits for the results
 * page, and asserts the hybrid info banner + StrategyComparison render.
 */

import { expect, test } from '@playwright/test'
import { getUserState, seedPersona, testUserEmail } from './helpers'

const HYBRID_BANNER_TEXT = /multiple strategies/i

test.describe('Fix 1: hybrid persona StrategyComparison', () => {
  test.beforeEach(async () => {
    await seedPersona(testUserEmail(), 'hybrid', true)
    const state = await getUserState(testUserEmail())
    expect(state.onboarding_persona).toBe('hybrid')
  })

  test('hybrid user lands on strategy comparison after analysis', async ({
    page,
  }) => {
    await page.goto('/analyze')

    // Address input — find by placeholder/role/text; fall back to first visible text input
    const addressInput = page
      .getByPlaceholder(/address|property|search/i)
      .or(page.getByRole('textbox').first())
    await addressInput.fill('613 N 14th St, Sheboygan, WI')

    // Submit — match any visible analyze/start/run button
    const analyzeButton = page
      .getByRole('button', { name: /analyze|start|run/i })
      .first()
    await analyzeButton.click()

    // SSE analysis can take 10–30s. Wait for the results URL + hybrid banner.
    await page.waitForURL(/\/analyze\/(results|deal)\//, { timeout: 60_000 })

    const banner = page.getByText(HYBRID_BANNER_TEXT).first()
    await expect(banner).toBeVisible({ timeout: 30_000 })

    const compareSection = page.getByText(/Compare Strategies/i).first()
    await expect(compareSection).toBeVisible({ timeout: 30_000 })

    await page.screenshot({
      path: 'test-results/hybrid-comparison.png',
      fullPage: true,
    })
  })
})
