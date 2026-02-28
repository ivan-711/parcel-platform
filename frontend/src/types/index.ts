/** Shared TypeScript types — single source of truth derived from API contracts. */

export interface User {
  id: string
  name: string
  email: string
  role: 'wholesaler' | 'investor' | 'agent'
  team_id?: string | null
  created_at: string
}

export interface AuthResponse {
  user: User
  access_token: string
}
