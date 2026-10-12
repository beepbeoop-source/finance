import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CloudUpload, RefreshCw, Database, CheckCircle2, Activity, HeartPulse } from 'lucide-react'
import { executeKeepAlivePing, getPingLogs, type PingLog } from '@/lib/supabaseKeepAlive'
import { toast } from 'sonner'

interface SettingsViewProps {
  onPushToCloud: () => Promise<boolean>
  onFetchFromCloud: () => Promise<void>
  syncStatus: string
  isSyncing: boolean
  recordCount: number
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onPushToCloud,
  onFetchFromCloud,
  syncStatus,
  isSyncing,
  recordCount,
}) => {
  const [pingLogs, setPingLogs] = useState<PingLog[]>([])
  const [isPinging, setIsPinging] = useState(false)

  useEffect(() => {
    setPingLogs(getPingLogs())
  }, [])

  const handleManualPing = async () => {
    setIsPinging(true)
    try {
      const res = await executeKeepAlivePing()
      setPingLogs(getPingLogs())
      if (res.success) {
        toast.success(`Heartbeat ping succeeded (${res.latencyMs}ms)`)
      } else {
        toast.error(`Heartbeat failed: ${res.message}`)
      }
    } finally {
      setIsPinging(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Cloud & Database Sync</h2>
        <p className="text-xs text-muted-foreground">
          Manage live database synchronization, cloud backups, and project keep-alive heartbeats.
        </p>
      </div>

      {/* Cloud Synchronization Actions */}
      <Card className="border-border/60">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-primary" />
              Cloud Synchronization
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {syncStatus === 'synced' ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synced with Cloud
                </span>
              ) : (
                <span>Records in memory: <strong className="text-foreground">{recordCount}</strong></span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          <div className="p-4 rounded-xl border bg-muted/20 text-xs space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Connected Supabase Environment
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your application connects automatically to your centralized cloud database for real-time transactions, category updates, company branding, and S3-compatible image asset storage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <Button
              className="w-full sm:w-auto gap-2"
              disabled={isSyncing}
              onClick={onPushToCloud}
            >
              <CloudUpload className="w-4 h-4" />
              {isSyncing ? 'Syncing...' : 'Push All Data to Cloud'}
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              disabled={isSyncing}
              onClick={onFetchFromCloud}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Fetch Latest Cloud Records
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keep-Alive & Project Pause Prevention */}
      <Card className="border-border/60">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              Supabase Keep-Alive & Heartbeat
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={isPinging}
              onClick={handleManualPing}
            >
              <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-pulse text-rose-500' : ''}`} />
              {isPinging ? 'Pinging...' : 'Send Heartbeat Ping'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Supabase free-tier projects automatically pause after 7 days of inactivity. The in-app heartbeat runs periodic pings to keep the project warm and responsive.
          </p>

          <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-xs">
            <div className="font-semibold text-foreground">External Uptime Monitoring (Recommended)</div>
            <p className="text-muted-foreground leading-relaxed">
              You can set up a free monitor on <strong>UptimeRobot</strong> or <strong>Cron-Job.org</strong> that pings your Supabase endpoint every 24 hours:
            </p>
            <div className="p-2.5 rounded bg-background border font-mono text-[11px] text-primary break-all select-all">
              https://ejbiglcdrpgnmximfhjm.supabase.co/rest/v1/rpc/ping_heartbeat
            </div>
            <p className="text-[11px] text-muted-foreground">
              Method: <code>POST</code> (or <code>GET</code> query on <code>/rest/v1/keep_alive_pings?select=*</code>) with header <code>apikey: &lt;your-anon-key&gt;</code>.
            </p>
          </div>

          {/* Recent Ping Logs */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Heartbeat Logs
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border divide-y text-[11px]">
              {pingLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/30">
                  <span className="text-muted-foreground font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={log.success ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-medium'}>
                    {log.message}
                  </span>
                </div>
              ))}
              {pingLogs.length === 0 && (
                <div className="p-3 text-center text-muted-foreground">
                  No heartbeat logs recorded yet. Click "Send Heartbeat Ping" to test.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
