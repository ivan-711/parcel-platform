/**
 * Conditional Clerk provider — wraps children in ClerkProvider only when
 * VITE_CLERK_PUBLISHABLE_KEY is set. Otherwise renders children directly
 * (legacy JWT auth continues to work).
 */

import { ClerkProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

export const isClerkEnabled = Boolean(clerkPubKey)

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  if (!isClerkEnabled || !clerkPubKey) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      {children}
    </ClerkProvider>
  )
}
