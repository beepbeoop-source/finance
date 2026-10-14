import React from 'react'
import {
  LayoutDashboard,
  CalendarCheck,
  Receipt,
  FileSpreadsheet,
  Building2,
  Tags,
  Users,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UserProfile } from '@/types/auth'

interface SidebarProps {
  currentPage: string
  onSelectPage: (page: string) => void
  recordCount: number
  syncStatus: string
  isMobileOpen: boolean
  onCloseMobile: () => void
  user: UserProfile | null
  onLogout: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  recordCount,
  syncStatus,
  isMobileOpen,
  onCloseMobile,
  user,
  onLogout,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'daily', label: 'Daily Entry', icon: CalendarCheck },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'company', label: 'Company Details', icon: Building2 },
    { id: 'settings', label: user?.role === 'admin' ? 'Settings & Users' : 'Settings', icon: Users },
  ]

  const handleNavClick = (id: string) => {
    onSelectPage(id)
    onCloseMobile()
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-sm">
            S
          </div>
          <div>
            <div className="text-xs font-black tracking-wider text-foreground uppercase">
              SYED GLOBAL
            </div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Finance Suite
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
              Workspace
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Footer info box & User profile */}
        <div className="p-4 border-t space-y-3">
          {user && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {user.displayName[0]?.toUpperCase() || 'U'}
                </div>
                <div className="truncate text-left">
                  <div className="text-xs font-semibold truncate leading-tight">
                    {user.displayName}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {user.role === 'admin' ? (
                      <>
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                        Administrator
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-2.5 h-2.5 text-blue-500" />
                        Staff Member
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                title="Log out"
                onClick={onLogout}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">Cloud Sync</span>
              {syncStatus === 'synced' ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Live
                </span>
              ) : syncStatus === 'unconfigured' ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                  <AlertCircle className="w-3 h-3" /> Local
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium capitalize">
                  {syncStatus}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>{recordCount} total entries</strong> in cloud database.
            </p>
          </div>

          <div className="text-[10px] text-center text-muted-foreground">
            Syed Global Finance · v1.0.0
          </div>
        </div>
      </aside>
    </>
  )
}
