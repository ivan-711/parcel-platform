/**
 * Fix 2 — Agent persona acknowledgment modal + notify_agent_features persistence.
 *
 * Seeds the test user with persona=null + onboarding NOT complete, navigates
 * to /onboarding, selects the agent card, continues, verifies the modal and
 * the "Continue as investor" flow, then confirms the backend stored
 * notify_agent_features=true.
 */

import { expect, test } from '@playwright/test'
import { getUserState, seedPersona, testUserEmail } from './helpers'

test.describe('Fix 2: agent persona acknowledgment modal', () => {
  test.beforeEach(async () => {
    // Reset onboarding state — persona cleared, onboarding_completed_at null
    await seedPersona(testUserEmail(), null, false)
    const state = await getUserState(testUserEmail())
    expect(state.onboarding_persona).toBeNull()
    expect(state.onboarding_completed_at).toBeNull()
  })

  test('agent persona opens modal, opts in, and persists flag', async ({
    page,
  }) => {
    await page.goto('/onboarding')

    // Select the agent card — match by its label text
    const agentCard = page.getByText(/I'?m an agent serving investors/i).first()
    await expect(agentCard).toBeVisible({ timeout: 15_000 })
    await agentCard.click()

    // Continue — top-level continue button (not the modal one yet)
    const continueBtn = page.getByRole('button', { name: /^Continue$/ })
    await continueBtn.click()

    // Modal assertions
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(
      dialog.getByText(/built for investors/i).first(),
    ).toBeVisible()

    // Notify checkbox
    const notifyCheckbox = dialog
      .getByRole('checkbox', { name: /Notify me.*ready for agents/i })
      .or(dialog.locator('input[type="checkbox"]').first())
    await notifyCheckbox.check()
    await expect(notifyCheckbox).toBeChecked()

    // Continue as investor
    const continueAsInvestor = dialog.getByRole('button', {
      name: /Continue as investor/i,
    })
    await continueAsInvestor.click()

    // Wait for navigation away from /onboarding (to /today or wherever)
    await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'), {
      timeout: 30_000,
    })

    // Verify backend persistence
    const state = await getUserState(testUserEmail())
    expect(state.onboarding_persona).toBe('agent')
    expect(state.notify_agent_features).toBe(true)
    expect(state.onboarding_completed_at).not.toBeNull()

    await page.screenshot({
      path: 'test-results/agent-acknowledgment.png',
      fullPage: true,
    })
  })
})
