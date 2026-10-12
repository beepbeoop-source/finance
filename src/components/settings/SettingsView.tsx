import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CloudUpload, RefreshCw, AlertCircle, Database, CheckCircle2 } from 'lucide-react'

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
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Cloud & Database Sync</h2>
        <p className="text-xs text-muted-foreground">
          Manage live database synchronization, cloud backups, and data imports for the Syed Global Group finance workspace.
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
    </div>
  )
}
