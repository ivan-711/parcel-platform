import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Playwright E2E config — local dev only.
 *
 * Requires a running backend at http://localhost:8000 (with ENVIRONMENT=development
 * or ENVIRONMENT=test so /api/testing/* endpoints are registered) and a running
 * frontend dev server at http://localhost:5173.
 *
 * Authentication uses Clerk's official @clerk/testing package with storageState:
 * the "setup" project signs in once in global.setup.ts and saves the authenticated
 * Playwright storage to playwright/.clerk/user.json. All other tests load that
 * storage state and reuse the session.
 */

const STORAGE_STATE = path.join(__dirname, 'playwright/.clerk/user.json')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: 'test-results',
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
      testIgnore: /global\.setup\.ts/,
    },
  ],
})
