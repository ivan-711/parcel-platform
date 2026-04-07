/** Auth hooks — Clerk handles login/register. Only logout needs a local hook. */

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '@/stores/authStore'
import { setClerkToken } from '@/lib/api'

export function useLogout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()
  const { signOut } = useClerk()

  return {
    mutate: async () => {
      try {
        await signOut()
      } catch {
        // Sign out from Clerk failed — clear local state anyway
      }
      setClerkToken(null)
      clearAuth()
      queryClient.clear()
      navigate('/login')
    },
    isPending: false,
  }
}
