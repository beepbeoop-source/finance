export type UserRole = 'admin' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  username: string
  displayName: string
  role: UserRole
  createdAt?: string
  updatedAt?: string
}

export interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}
