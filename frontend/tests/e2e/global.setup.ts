import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const authFile = path.join(__dirname, '..', '..', 'playwright/.clerk/user.json')

setup('authenticate with Clerk', async ({ page }) => {
  await clerkSetup()

  const username = process.env.E2E_CLERK_USER_USERNAME
  const password = process.env.E2E_CLERK_USER_PASSWORD

  if (!username || !password) {
    throw new Error(
      'Missing E2E_CLERK_USER_USERNAME or E2E_CLERK_USER_PASSWORD. ' +
        'See tests/e2e/README.md for setup.',
    )
  }

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
