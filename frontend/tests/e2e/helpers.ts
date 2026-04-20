/**
 * Shared helpers for Playwright E2E tests.
 *
 * The backend test endpoints let us seed persona state without clicking
 * through Clerk signup + Parcel onboarding on every run.
 */

import { request, type APIRequestContext } from '@playwright/test'

const API_BASE = process.env.PLAYWRIGHT_API_BASE ?? 'http://localhost:8000'

export type OnboardingPersona =
  | 'wholesale'
  | 'flip'
  | 'buy_and_hold'
  | 'creative_finance'
  | 'brrrr'
  | 'hybrid'
  | 'agent'
  | 'beginner'

export interface UserState {
  user_id: string
  email: string
  onboarding_persona: OnboardingPersona | null
  onboarding_completed_at: string | null
  notify_agent_features: boolean
}

export function testUserEmail(): string {
  const email = process.env.E2E_CLERK_USER_USERNAME
  if (!email) {
    throw new Error(
      'E2E_CLERK_USER_USERNAME is required. See tests/e2e/README.md.',
    )
  }
  return email
}

async function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_BASE })
}

export async function seedPersona(
  email: string,
  persona: OnboardingPersona | null,
  skipOnboarding: boolean,
): Promise<void> {
  const ctx = await apiContext()
  const resp = await ctx.post('/api/testing/seed-persona', {
    data: { user_email: email, persona, skip_onboarding: skipOnboarding },
  })
  if (!resp.ok()) {
    throw new Error(
      `seedPersona failed: ${resp.status()} ${await resp.text()} — ` +
        'is the backend running at ' +
        API_BASE +
        ' with ENVIRONMENT=development, and does a user with email ' +
        email +
        ' exist?',
    )
  }
  await ctx.dispose()
}

export async function getUserState(email: string): Promise<UserState> {
  const ctx = await apiContext()
  const resp = await ctx.get(
    `/api/testing/user-state?email=${encodeURIComponent(email)}`,
  )
  if (!resp.ok()) {
    throw new Error(
      `getUserState failed: ${resp.status()} ${await resp.text()}`,
    )
  }
  const body = (await resp.json()) as UserState
  await ctx.dispose()
  return body
}
