import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CloudUpload, RefreshCw, Database, CheckCircle2, UserPlus, Users, Shield } from 'lucide-react'
import type { UserProfile, UserRole } from '@/types/auth'
import { toast } from 'sonner'

interface SettingsViewProps {
  onPushToCloud: () => Promise<boolean>
  onFetchFromCloud: () => Promise<void>
  syncStatus: string
  isSyncing: boolean
  recordCount: number
  isAdmin: boolean
  onAdminCreateUser?: (username: string, pass: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  onFetchUsers?: () => Promise<UserProfile[]>
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onPushToCloud,
  onFetchFromCloud,
  syncStatus,
  isSyncing,
  recordCount,
  isAdmin,
  onAdminCreateUser,
  onFetchUsers,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('admin')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const loadUsers = async () => {
    if (onFetchUsers) {
      const list = await onFetchUsers()
      setUsers(list)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onAdminCreateUser) return

    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error('Please fill in username and password')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsCreatingUser(true)
    try {
      const res = await onAdminCreateUser(newUsername, newPassword, newDisplayName, newRole)
      if (res.success) {
        setNewUsername('')
        setNewPassword('')
        setNewDisplayName('')
        loadUsers()
      } else {
        toast.error(res.error || 'Failed to create user')
      }
    } finally {
      setIsCreatingUser(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Cloud & Admin Management</h2>
        <p className="text-xs text-muted-foreground">
          Manage live database synchronization, cloud backups, and authorized administrator accounts.
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
              Your application connects automatically to your cloud database for real-time transactions, category updates, company branding, and S3-compatible image asset storage.
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

      {/* Admin User Management (Only visible to verified Administrators) */}
      {isAdmin && (
        <Card className="border-border/60">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Authorized User Accounts
              </CardTitle>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                <Shield className="w-3 h-3" /> Admin Protected
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Create User Form */}
            <form onSubmit={handleCreateUser} className="p-4 rounded-xl border bg-muted/20 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Add New Authorized User
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="create-username">Username or Email</Label>
                  <Input
                    id="create-username"
                    placeholder="e.g. accounts_manager"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-password">Initial Password</Label>
                  <Input
                    id="create-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-name">Full Name</Label>
                  <Input
                    id="create-name"
                    placeholder="e.g. Accounts Lead"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-role">Access Role</Label>
                  <select
                    id="create-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" className="gap-1.5" disabled={isCreatingUser}>
                  <UserPlus className="w-3.5 h-3.5" />
                  {isCreatingUser ? 'Creating User...' : 'Create User Account'}
                </Button>
              </div>
            </form>

            {/* Existing Users List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Existing App Users ({users.length})
              </div>
              <div className="rounded-lg border divide-y text-xs">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                    <div>
                      <div className="font-semibold text-foreground">{u.displayName}</div>
                      <div className="text-[11px] text-muted-foreground">@{u.username} • {u.email}</div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {u.role}
                    </span>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground text-xs">
                    No users loaded yet.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
