import { useState, useEffect, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { UserProfile, UserRole } from '@/types/auth'
import { toast } from 'sonner'

const SESSION_KEY = 'syed_finance_active_user'

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  const persistProfile = useCallback((userProfile: UserProfile | null) => {
    setProfile(userProfile)
    try {
      if (userProfile) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile))
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    } catch (e) {
      console.error('Failed to persist profile:', e)
    }
  }, [])

  // Build user profile from Supabase Auth & user_profiles table
  const fetchProfile = useCallback(async (userId: string, email?: string): Promise<UserProfile | null> => {
    const supabase = getSupabase()
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        return {
          id: data.id,
          email: data.email || email || '',
          username: data.username || (email ? email.split('@')[0] : 'user'),
          displayName: data.display_name || 'Staff User',
          role: (data.role as UserRole) || 'staff',
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      }

      // Fallback
      return {
        id: userId,
        email: email || '',
        username: email ? email.split('@')[0] : 'admin',
        displayName: 'Administrator',
        role: 'admin',
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }, [])

  // Initialize Auth state listener
  useEffect(() => {
    let isMounted = true

    async function initSession() {
      if (!isSupabaseConfigured()) {
        setIsLoading(false)
        return
      }

      const supabase = getSupabase()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isMounted) {
          const prof = await fetchProfile(session.user.id, session.user.email)
          persistProfile(prof)
        }
      } catch (err) {
        console.error('Auth session error:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initSession()

    // Listen to Supabase auth events
    const supabase = getSupabase()
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          const prof = await fetchProfile(session.user.id, session.user.email)
          persistProfile(prof)
        } else if (event === 'SIGNED_OUT') {
          persistProfile(null)
        }
      })

      return () => {
        isMounted = false
        subscription.unsubscribe()
      }
    }

    return () => {
      isMounted = false
    }
  }, [fetchProfile, persistProfile])

  // Sign In function
  const login = async (emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured yet.',
      }
    }

    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, error: 'Failed to initialize Supabase client.' }
    }

    try {
      setIsLoading(true)
      const clean = emailOrUsername.trim()
      const email = clean.includes('@') ? clean : `${clean}@syedglobal.com`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        const prof = await fetchProfile(data.user.id, data.user.email)
        persistProfile(prof)
        toast.success(`Welcome back, ${prof?.displayName || 'User'}!`)
        return { success: true }
      }

      return { success: false, error: 'No user data received.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' }
    } finally {
      setIsLoading(false)
    }
  }

  // 1. Admin Create User (admin or staff)
  const adminCreateUser = async (
    username: string,
    password: string,
    displayName: string,
    role: UserRole = 'staff'
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Database is not connected.' }

    try {
      const { data, error } = await supabase.rpc('admin_create_app_user', {
        p_username: username.trim(),
        p_password: password,
        p_name: displayName.trim(),
        p_role: role
      })

      if (error) return { success: false, error: error.message }
      if (data && !data.success) return { success: false, error: data.error || 'Failed to create user' }

      toast.success(`User @${username} (${role}) created successfully!`)
      return { success: true }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Failed to create user'
      return { success: false, error: msg }
    }
  }

  // 2. Admin Change User's Password
  const adminChangePassword = async (
    targetUserId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Database is not configured' }

    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: targetUserId,
        p_new_password: newPassword
      })

      if (rpcErr) return { success: false, error: rpcErr.message }
      if (data && !data.success) return { success: false, error: data.error || 'Failed to update password' }

      toast.success('Password updated successfully')
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password'
      return { success: false, error: msg }
    }
  }

  // 3. Admin Delete User
  const adminDeleteUser = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Database is not configured' }

    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_delete_app_user', {
        p_user_id: targetUserId
      })

      if (rpcErr) return { success: false, error: rpcErr.message }
      if (data && !data.success) return { success: false, error: data.error || 'Failed to delete user' }

      toast.success('User account removed')
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user'
      return { success: false, error: msg }
    }
  }

  // 4. Admin Update User Role
  const adminUpdateUserRole = async (targetUserId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Database is not configured' }

    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_update_user_role', {
        p_user_id: targetUserId,
        p_new_role: newRole
      })

      if (rpcErr) return { success: false, error: rpcErr.message }
      if (data && !data.success) return { success: false, error: data.error || 'Failed to update role' }

      toast.success(`Role updated to ${newRole}`)
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role'
      return { success: false, error: msg }
    }
  }

  // 5. Change My Own Password
  const changeMyPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Database is not configured' }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) return { success: false, error: error.message }
      toast.success('Your password has been changed')
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password'
      return { success: false, error: msg }
    }
  }

  // 6. Fetch list of app users (Admin only)
  const fetchUsersList = async (): Promise<UserProfile[]> => {
    const supabase = getSupabase()
    if (!supabase) return []

    try {
      const { data, error } = await supabase.rpc('app_list_users')
      if (!error && data && Array.isArray(data)) {
        return data.map((r: any) => ({
          id: r.id,
          email: r.email,
          username: r.username,
          displayName: r.display_name || r.username,
          role: (r.role as UserRole) || 'staff',
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }))
      }

      const { data: directData } = await supabase.from('user_profiles').select('*')
      if (directData) {
        return directData.map((r: any) => ({
          id: r.id,
          email: r.email,
          username: r.username,
          displayName: r.display_name || r.username,
          role: (r.role as UserRole) || 'staff',
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }))
      }
      return []
    } catch {
      return []
    }
  }

  // Logout function
  const logout = async () => {
    const supabase = getSupabase()
    if (supabase) {
      await supabase.auth.signOut().catch(() => {})
    }
    persistProfile(null)
    toast.info('Logged out')
  }

  return {
    user: profile,
    profile,
    isLoading,
    isAuthenticated: Boolean(profile),
    isAdmin: profile?.role === 'admin',
    login,
    adminCreateUser,
    adminChangePassword,
    adminDeleteUser,
    adminUpdateUserRole,
    changeMyPassword,
    fetchUsersList,
    logout,
  }
}
