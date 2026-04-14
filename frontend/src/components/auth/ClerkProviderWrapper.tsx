/**
 * Conditional Clerk provider — wraps children in ClerkProvider only when
 * VITE_CLERK_PUBLISHABLE_KEY is set. Otherwise renders children directly
 * (legacy JWT auth continues to work).
 */

import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { type ReactNode, useSyncExternalStore } from 'react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

export const isClerkEnabled = Boolean(clerkPubKey)

// Subscribe to theme changes on <html> class list
function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
function getIsLight() {
  return document.documentElement.classList.contains('light')
}

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const isLight = useSyncExternalStore(subscribeToTheme, getIsLight)

  if (!isClerkEnabled || !clerkPubKey) {
    return <>{children}</>
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{ baseTheme: isLight ? undefined : dark }}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/today"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/login"
    >
      {children}
    </ClerkProvider>
  )
}
