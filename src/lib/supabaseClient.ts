import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL_KEY = 'syed_finance_supabase_url'
export const SUPABASE_KEY_KEY = 'syed_finance_supabase_anon_key'

let cachedClient: SupabaseClient | null = null
let lastConfigUrl = ''
let lastConfigKey = ''

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

  const localUrl = localStorage.getItem(SUPABASE_URL_KEY) || ''
  const localKey = localStorage.getItem(SUPABASE_KEY_KEY) || ''

  const url = (localUrl || envUrl).trim()
  const key = (localKey || envKey).trim()

  return { url, key }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials()
  return Boolean(url && key && url.startsWith('http'))
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials()
  if (!url || !key) return null

  if (cachedClient && lastConfigUrl === url && lastConfigKey === key) {
    return cachedClient
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
    lastConfigUrl = url
    lastConfigKey = key
    return cachedClient
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err)
    return null
  }
}

export function saveSupabaseCredentials(url: string, key: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim())
  localStorage.setItem(SUPABASE_KEY_KEY, key.trim())
  cachedClient = null
}
