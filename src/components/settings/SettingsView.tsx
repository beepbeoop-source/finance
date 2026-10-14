import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CloudUpload,
  RefreshCw,
  Database,
  CheckCircle2,
  UserPlus,
  Users,
  Shield,
  Key,
  Trash2,
  UserCheck,
  Building2,
  Lock,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
} from 'lucide-react'
import type { UserProfile, UserRole } from '@/types/auth'
import { ChangePasswordModal } from './ChangePasswordModal'
import { toast } from 'sonner'

interface SettingsViewProps {
  currentUserProfile: UserProfile | null
  isAdmin: boolean
  onPushToCloud: () => Promise<boolean>
  onFetchFromCloud: () => Promise<void>
  syncStatus: string
  isSyncing: boolean
  recordCount: number
  onAdminCreateUser?: (username: string, pass: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  onAdminChangePassword?: (targetUserId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  onAdminDeleteUser?: (targetUserId: string) => Promise<{ success: boolean; error?: string }>
  onAdminUpdateUserRole?: (targetUserId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>
  onChangeMyPassword?: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  onFetchUsers?: () => Promise<UserProfile[]>
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUserProfile,
  isAdmin,
  onPushToCloud,
  onFetchFromCloud,
  syncStatus,
  isSyncing,
  recordCount,
  onAdminCreateUser,
  onAdminChangePassword,
  onAdminDeleteUser,
  onAdminUpdateUserRole,
  onChangeMyPassword,
  onFetchUsers,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Create User Form state
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('staff')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  // Users filter & sort state
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'staff'>('all')
  const [userSortField, setUserSortField] = useState<'name' | 'role' | 'date'>('name')
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc')

  // Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [targetPasswordUser, setTargetPasswordUser] = useState<UserProfile | null>(null)

  // Handle header sort toggle
  const handleUserSortToggle = (field: 'name' | 'role' | 'date') => {
    if (userSortField === field) {
      setUserSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setUserSortField(field)
      setUserSortOrder(field === 'date' ? 'desc' : 'asc')
    }
  }

  // Filtered and sorted users
  const filteredUsers = React.useMemo(() => {
    return users
      .filter((u) => {
        if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false
        if (userSearch.trim()) {
          const q = userSearch.toLowerCase()
          const inName = u.displayName.toLowerCase().includes(q)
          const inUser = u.username.toLowerCase().includes(q)
          const inEmail = u.email ? u.email.toLowerCase().includes(q) : false
          if (!inName && !inUser && !inEmail) return false
        }
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        if (userSortField === 'name') {
          cmp = a.displayName.localeCompare(b.displayName)
        } else if (userSortField === 'role') {
          cmp = a.role.localeCompare(b.role)
        } else if (userSortField === 'date') {
          cmp = (a.createdAt || '').localeCompare(b.createdAt || '')
        }
        return userSortOrder === 'asc' ? cmp : -cmp
      })
  }, [users, userSearch, userRoleFilter, userSortField, userSortOrder])

  const loadUsers = async () => {
    if (!onFetchUsers) return
    setIsLoadingUsers(true)
    try {
      const list = await onFetchUsers()
      setUsers(list)
    } finally {
      setIsLoadingUsers(false)
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
      toast.error('Please fill in username and initial password')
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
        setNewRole('staff')
        await loadUsers()
      } else {
        toast.error(res.error || 'Failed to create user')
      }
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleOpenResetPassword = (user: UserProfile) => {
    setTargetPasswordUser(user)
    setIsPasswordModalOpen(true)
  }

  const handleOpenChangeMyPassword = () => {
    setTargetPasswordUser(null)
    setIsPasswordModalOpen(true)
  }

  const handleExecutePasswordChange = async (newPass: string, targetUserId?: string) => {
    if (targetUserId && onAdminChangePassword) {
      const res = await onAdminChangePassword(targetUserId, newPass)
      return res
    } else if (onChangeMyPassword) {
      const res = await onChangeMyPassword(newPass)
      return res
    }
    return { success: false, error: 'Password update handler not configured' }
  }

  const handleDeleteUser = async (user: UserProfile) => {
    if (!onAdminDeleteUser) return
    if (!window.confirm(`Are you sure you want to delete user "${user.displayName}" (@${user.username})?\n\nThis will permanently remove their login access.`)) {
      return
    }

    const res = await onAdminDeleteUser(user.id)
    if (res.success) {
      await loadUsers()
    } else {
      toast.error(res.error || 'Failed to delete user')
    }
  }

  const handleToggleRole = async (user: UserProfile) => {
    if (!onAdminUpdateUserRole) return
    const nextRole: UserRole = user.role === 'admin' ? 'staff' : 'admin'
    const confirmMsg = user.role === 'admin'
      ? `Change "${user.displayName}" (@${user.username}) from Admin to Staff Role?\n\nStaff can view and record financial entries but cannot manage user accounts.`
      : `Promote "${user.displayName}" (@${user.username}) to Administrator?\n\nThey will have full access including creating accounts and changing passwords.`

    if (!window.confirm(confirmMsg)) return

    const res = await onAdminUpdateUserRole(user.id, nextRole)
    if (res.success) {
      await loadUsers()
    } else {
      toast.error(res.error || 'Failed to update role')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Settings & Administration</h2>
          <p className="text-xs text-muted-foreground">
            Manage user roles, passwords, database synchronization, and system configuration.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 self-start sm:self-auto"
          onClick={handleOpenChangeMyPassword}
        >
          <Lock className="w-3.5 h-3.5" />
          Change My Password
        </Button>
      </div>

      {/* Admin User Management (Visible to Admins) */}
      {isAdmin ? (
        <Card className="border-border/60">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Staff & User Management
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only administrators can create staff or admin users and manage passwords.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={loadUsers}
                disabled={isLoadingUsers}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Create User Form */}
            <form onSubmit={handleCreateUser} className="p-4 rounded-xl border bg-muted/20 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                Add New Staff or Admin Account
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="create-username">Username or Email</Label>
                  <Input
                    id="create-username"
                    placeholder="e.g. staff_member"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-password">Initial Password</Label>
                  <Input
                    id="create-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-name">Full Name</Label>
                  <Input
                    id="create-name"
                    placeholder="e.g. Staff Full Name"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-role">Assigned Role</Label>
                  <Select
                    value={newRole}
                    onValueChange={(val) => val && setNewRole(val as UserRole)}
                  >
                    <SelectTrigger id="create-role" className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff (Standard Access)</SelectItem>
                      <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="h-8 text-xs gap-1.5" disabled={isCreatingUser}>
                  <UserPlus className="w-3.5 h-3.5" />
                  {isCreatingUser ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>

            {/* Existing Users Table with Search & Filtering */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span>App Users</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {filteredUsers.length} of {users.length}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Click role to toggle between Admin and Staff
                </span>
              </div>

              {/* User Search & Filtering Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name, username, email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-8 pl-8 pr-7 text-xs w-full bg-background"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch('')}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Role Filter Select */}
                <div className="w-[125px]">
                  <Select
                    value={userRoleFilter}
                    onValueChange={(val) => val && setUserRoleFilter(val as 'all' | 'admin' | 'staff')}
                  >
                    <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admins Only</SelectItem>
                      <SelectItem value="staff">Staff Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User Sort Select */}
                <div className="w-[155px]">
                  <Select
                    value={`${userSortField}-${userSortOrder}`}
                    onValueChange={(val) => {
                      if (val) {
                        const [f, o] = val.split('-') as ['name' | 'role' | 'date', 'asc' | 'desc']
                        setUserSortField(f)
                        setUserSortOrder(o)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="role-asc">Role (Admin First)</SelectItem>
                      <SelectItem value="role-desc">Role (Staff First)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(userSearch || userRoleFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setUserSearch('')
                      setUserRoleFilter('all')
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </Button>
                )}
              </div>

              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground select-none">
                    <tr>
                      <th className="p-3">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground cursor-pointer"
                          onClick={() => handleUserSortToggle('name')}
                        >
                          User
                          {userSortField === 'name' ? (
                            userSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                          )}
                        </button>
                      </th>
                      <th className="p-3">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground cursor-pointer"
                          onClick={() => handleUserSortToggle('role')}
                        >
                          Role
                          {userSortField === 'role' ? (
                            userSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                          )}
                        </button>
                      </th>
                      <th className="p-3">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground cursor-pointer"
                          onClick={() => handleUserSortToggle('date')}
                        >
                          Created
                          {userSortField === 'date' ? (
                            userSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                          )}
                        </button>
                      </th>
                      <th className="p-3 text-right font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((u) => {
                      const isSelf = currentUserProfile?.id === u.id
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {u.displayName}
                              {isSelf && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              @{u.username} • {u.email}
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => !isSelf && handleToggleRole(u)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot change your own role' : 'Click to change role'}
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                u.role === 'admin'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              } ${isSelf ? 'cursor-default opacity-80' : ''}`}
                            >
                              {u.role === 'admin' ? 'Administrator' : 'Staff'}
                            </button>
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 text-right space-x-1 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleOpenResetPassword(u)}
                              title="Reset Password"
                            >
                              <Key className="w-3 h-3" />
                              <span className="hidden sm:inline">Reset Password</span>
                            </Button>
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-500 hover:text-rose-700"
                                onClick={() => handleDeleteUser(u)}
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          {isLoadingUsers
                            ? 'Loading user accounts...'
                            : userSearch || userRoleFilter !== 'all'
                            ? 'No users match the search/filter criteria.'
                            : 'No user accounts found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Account Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>
              You are signed in as <strong>{currentUserProfile?.displayName}</strong> with a <strong>Staff</strong> role.
            </p>
            <p>
              Staff accounts can view financial summaries and record daily entries, but user management and password resets require an Administrator account.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cloud Synchronization Actions */}
      <Card className="border-border/60">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-primary" />
              Cloud Synchronization & Backup
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
              Connected Supabase Database
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your application syncs automatically with your centralized PostgreSQL database for real-time transactions, category updates, company branding, and S3-compatible image asset storage.
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

      {/* Password Reset Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        targetUser={targetPasswordUser}
        onChangePassword={handleExecutePasswordChange}
      />
    </div>
  )
}
