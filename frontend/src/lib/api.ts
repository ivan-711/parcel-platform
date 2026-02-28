/** API client — all backend calls go through this module. Never use fetch directly in components. */

import type { AuthResponse, User } from '@/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('parcel_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem('parcel_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((error as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  health: {
    check: () => request<{ status: string }>('/health'),
  },
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string, role: string) =>
      request<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      }),
    logout: () =>
      request<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),
    me: () => request<User>('/api/v1/auth/me'),
  },
}
