/**
 * Bridges Clerk session state to the app's authStore and API token cache.
 *
 * When Clerk has an active session:
 *   1. Gets the session token via getToken()
 *   2. Passes it to api.ts via setClerkToken()
 *   3. Fetches the full user profile from /api/v1/auth/me
 *   4. Syncs the user to authStore for UI consumption
 *
 * When the Clerk session ends, clears authStore.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { useAuth, useSession } from '@clerk/clerk-react'
import { useAuthStore } from '@/stores/authStore'
import { setClerkToken, setClerkTokenGetter, api } from '@/lib/api'

export function AuthSyncProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { session } = useSession()
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const syncedRef = useRef(false)

  // Store Clerk's getToken so api.ts can fetch tokens on-demand (avoids race conditions)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setClerkTokenGetter(getToken)
    } else {
      setClerkTokenGetter(null)
    }
    return () => setClerkTokenGetter(null)
  }, [isLoaded, isSignedIn, getToken])

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && session) {
      // Get the token and sync
      const syncSession = async () => {
        try {
          const token = await getToken()
          if (token) {
            setClerkToken(token)
            const user = await api.auth.me()
            setAuth(user)
            syncedRef.current = true
          }
        } catch {
          // Token fetch or /me call failed — don't crash, let retry on next render
        }
      }
      syncSession()
    } else if (!isSignedIn && syncedRef.current) {
      // User signed out
      setClerkToken(null)
      clearAuth()
      syncedRef.current = false
    }
  }, [isLoaded, isSignedIn, session, getToken, setAuth, clearAuth])

  // Refresh the token periodically (Clerk tokens are short-lived)
  useEffect(() => {
    if (!isSignedIn || !isLoaded) return

    const interval = setInterval(async () => {
      try {
        const token = await getToken()
        if (token) setClerkToken(token)
      } catch {
        // Token refresh failed — will be caught on next API call as 401
      }
    }, 50_000) // Refresh every ~50 seconds (Clerk tokens expire in 60s)

    return () => clearInterval(interval)
  }, [isSignedIn, isLoaded, getToken])

  return <>{children}</>
}
