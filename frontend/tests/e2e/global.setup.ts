import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const authFile = path.join(__dirname, '..', '..', 'playwright/.clerk/user.json')

setup('authenticate with Clerk', async ({ page }) => {
  const required = [
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'E2E_CLERK_USER_USERNAME',
    'E2E_CLERK_USER_PASSWORD',
  ]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}.\n` +
        'Create frontend/.env.test with these values. ' +
        'See frontend/tests/e2e/README.md for details.',
    )
  }

  await clerkSetup()

  const username = process.env.E2E_CLERK_USER_USERNAME!
  const password = process.env.E2E_CLERK_USER_PASSWORD!

  await page.goto('/')

  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: username,
      password,
    },
  })

  await page.goto('/today')
  await page.context().storageState({ path: authFile })
})
