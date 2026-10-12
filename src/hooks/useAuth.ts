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
          username: data.username || (email ? email.split('@')[0] : 'admin'),
          displayName: data.display_name || 'Admin',
          role: (data.role as UserRole) || 'admin',
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      }

      // Fallback if profile row is not yet created in public.user_profiles
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
        error: 'Supabase URL and Anon Key are not configured yet. Configure them in Cloud Settings first.',
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
        toast.success(`Welcome back, ${prof?.displayName || 'Admin'}!`)
        return { success: true }
      }

      return { success: false, error: 'No user data received.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' }
    } finally {
      setIsLoading(false)
    }
  }

  // Sign Up / Register first admin function
  const signUpAdmin = async (emailOrUsername: string, password: string, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase URL and Anon Key are not configured yet.',
      }
    }

    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Supabase not initialized' }

    try {
      setIsLoading(true)
      const clean = emailOrUsername.trim()
      const email = clean.includes('@') ? clean : `${clean}@syedglobal.com`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || clean.split('@')[0],
            role: 'admin',
          }
        }
      })

      if (error) return { success: false, error: error.message }

      if (data.user) {
        // Upsert into user_profiles
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email,
          username: clean.split('@')[0],
          display_name: displayName || clean.split('@')[0],
          role: 'admin'
        })

        const prof = await fetchProfile(data.user.id, email)
        persistProfile(prof)
        toast.success('Admin account created and logged in!')
        return { success: true }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed' }
    } finally {
      setIsLoading(false)
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
    signUpAdmin,
    logout,
  }
}
