/**
 * Fix 3 — Persona-aware PaywallOverlay copy across Pipeline / SkipTracing / MailCampaigns.
 *
 * Parameterized matrix:
 *   wholesale   + /pipeline      → "wholesale deal in one pipeline"
 *   wholesale   + /skip-tracing  → "lifeblood of every wholesale business"
 *   beginner    + /skip-tracing  → generic fallback FEATURE_LABELS.skip_tracing.description
 *   agent       + /pipeline      → generic fallback FEATURE_LABELS.pipeline.description
 *
 * Generic strings mirror src/types/index.ts FEATURE_LABELS — update here if
 * FEATURE_LABELS changes.
 */

import { expect, test, type Page } from '@playwright/test'
import { seedPersona, testUserEmail, type OnboardingPersona } from './helpers'

interface Case {
  persona: OnboardingPersona
  route: string
  expectedText: RegExp
  screenshotSlug: string
}

const CASES: Case[] = [
  {
    persona: 'wholesale',
    route: '/pipeline',
    expectedText: /wholesale deal in one pipeline/i,
    screenshotSlug: 'wholesale-pipeline',
  },
  {
    persona: 'wholesale',
    route: '/skip-tracing',
    expectedText: /lifeblood of every wholesale business/i,
    screenshotSlug: 'wholesale-skip-tracing',
  },
  {
    persona: 'beginner',
    route: '/skip-tracing',
    expectedText: /Find property owner contact information/i,
    screenshotSlug: 'beginner-skip-tracing',
  },
  {
    persona: 'agent',
    route: '/pipeline',
    expectedText: /Organize deals across pipeline stages/i,
    screenshotSlug: 'agent-pipeline',
  },
]

async function waitForPaywallDialog(page: Page) {
  const dialog = page.getByRole('dialog', { name: /Upgrade required/i })
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  return dialog
}

test.describe('Fix 3: persona-aware PaywallOverlay copy', () => {
  for (const c of CASES) {
    test(`${c.persona} on ${c.route} shows expected copy`, async ({ page }) => {
      await seedPersona(testUserEmail(), c.persona, true)
      await page.goto(c.route)

      const dialog = await waitForPaywallDialog(page)
      await expect(dialog.getByText(c.expectedText).first()).toBeVisible({
        timeout: 15_000,
      })

      await page.screenshot({
        path: `test-results/paywall-${c.screenshotSlug}.png`,
        fullPage: true,
      })
    })
  }
})
