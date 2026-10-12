import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export interface PingLog {
  timestamp: string
  success: boolean
  latencyMs: number
  message: string
}

const PING_LOGS_KEY = 'finance_supabase_ping_logs'
const MAX_LOGS = 15

export function getPingLogs(): PingLog[] {
  try {
    const saved = localStorage.getItem(PING_LOGS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // fallback
  }
  return []
}

function appendPingLog(log: PingLog): void {
  try {
    const logs = [log, ...getPingLogs()].slice(0, MAX_LOGS)
    localStorage.setItem(PING_LOGS_KEY, JSON.stringify(logs))
  } catch {
    // ignore
  }
}

/**
 * Execute a single keep-alive ping against Supabase
 */
export async function executeKeepAlivePing(): Promise<PingLog> {
  const client = getSupabase()
  const timestamp = new Date().toISOString()

  if (!client || !isSupabaseConfigured()) {
    const log: PingLog = {
      timestamp,
      success: false,
      latencyMs: 0,
      message: 'Supabase is not configured'
    }
    appendPingLog(log)
    return log
  }

  const start = performance.now()
  try {
    const { error } = await client.from('keep_alive_pings').upsert(
      {
        id: 'primary_heartbeat',
        last_ping: timestamp,
        client_info: 'finance_web_app'
      },
      { onConflict: 'id' }
    )

    const latencyMs = Math.round(performance.now() - start)

    if (error) {
      const log: PingLog = {
        timestamp,
        success: false,
        latencyMs,
        message: `Heartbeat query failed: ${error.message}`
      }
      appendPingLog(log)
      return log
    }

    const log: PingLog = {
      timestamp,
      success: true,
      latencyMs,
      message: `Heartbeat acknowledged (${latencyMs}ms)`
    }
    appendPingLog(log)
    return log
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start)
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    const log: PingLog = {
      timestamp,
      success: false,
      latencyMs,
      message: `Ping exception: ${errorMsg}`
    }
    appendPingLog(log)
    return log
  }
}

let keepAliveIntervalId: number | null = null

/**
 * Start periodic keep-alive pings (every 10 minutes when app is active)
 */
export function startKeepAliveTimer(): void {
  if (keepAliveIntervalId !== null) return

  // Run initial heartbeat immediately
  executeKeepAlivePing().catch(() => {})

  // Ping every 10 minutes (600,000ms)
  keepAliveIntervalId = window.setInterval(() => {
    executeKeepAlivePing().catch(() => {})
  }, 10 * 60 * 1000)
}

export function stopKeepAliveTimer(): void {
  if (keepAliveIntervalId !== null) {
    clearInterval(keepAliveIntervalId)
    keepAliveIntervalId = null
  }
}
