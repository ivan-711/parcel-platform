/** Auth mutation hooks — wraps api.auth calls with React Query and Zustand store updates. */

import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login(email, password),
    onSuccess: ({ user }) => {
      setAuth(user)
      navigate('/dashboard')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
      role,
    }: {
      name: string
      email: string
      password: string
      role: string
    }) => api.auth.register(name, email, password, role),
    onSuccess: ({ user }) => {
      setAuth(user)
      navigate('/dashboard')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      clearAuth()
      navigate('/login')
    },
    onError: () => {
      clearAuth()
      navigate('/login')
    },
  })
}
