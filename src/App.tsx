import React, { useState } from 'react'
import type { Transaction, DateFilterConfig } from '@/types/finance'
import { useFinanceData } from '@/hooks/useFinanceData'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { DateFilterControls } from '@/components/common/DateFilterControls'
import { OverviewView } from '@/components/overview/OverviewView'
import { DailyEntryView } from '@/components/daily/DailyEntryView'
import { TransactionsView } from '@/components/transactions/TransactionsView'
import { CategoriesView } from '@/components/categories/CategoriesView'
import { ReportsView } from '@/components/reports/ReportsView'
import { CompanyDetailsView } from '@/components/company/CompanyDetailsView'
import { SettingsView } from '@/components/settings/SettingsView'
import { EntryModal } from '@/components/modals/EntryModal'
import { LoginView } from '@/components/auth/LoginView'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { startKeepAliveTimer, stopKeepAliveTimer } from '@/lib/supabaseKeepAlive'

export function App() {
  // Start keep-alive heartbeats on app mount
  React.useEffect(() => {
    startKeepAliveTimer()
    return () => stopKeepAliveTimer()
  }, [])

  const {
    records,
    categories,
    company,
    isLoading: isDataLoading,
    isSyncing,
    syncStatus,
    pushToSupabase,
    fetchFromSupabase,
    addOrUpdateTransaction,
    deleteTransaction,
    saveDailyTransactions,
    addCategory,
    renameCategory,
    updateCompanyDetails,
  } = useFinanceData()

  const {
    user,
    isAuthenticated,
    isAdmin,
    isLoading: isAuthLoading,
    login,
    adminCreateUser,
    fetchUsersList,
    logout
  } = useAuth()

  const [currentPage, setCurrentPage] = useState<string>('overview')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Transaction | null>(null)

  // Dynamic Date Filter: Defaults to current month of today's date
  const [dateFilter, setDateFilter] = useState<DateFilterConfig>(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const daysInMonth = new Date(y, today.getMonth() + 1, 0).getDate()
    const currentMonth = `${y}-${m}`
    return {
      mode: 'month',
      month: currentMonth,
      startDate: `${currentMonth}-01`,
      endDate: `${currentMonth}-${String(daysInMonth).padStart(2, '0')}`,
    }
  })

  const handleEditEntry = (entry: Transaction) => {
    setEditingEntry(entry)
    setIsAddModalOpen(true)
  }

  const handleOpenAddModal = () => {
    setEditingEntry(null)
    setIsAddModalOpen(true)
  }

  // Loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading session...</span>
        </div>
      </div>
    )
  }

  // If unauthenticated, show Administrator Login only
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors closeButton />
        <LoginView onLogin={login} />
      </>
    )
  }

  const showDateFilter = ['overview', 'transactions', 'categories', 'reports'].includes(currentPage)

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <Toaster position="top-right" richColors closeButton />

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        recordCount={records.length}
        syncStatus={syncStatus}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        user={user}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar
          currentPage={currentPage}
          onOpenAddModal={handleOpenAddModal}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          isMobileNavOpen={isMobileNavOpen}
          dateFilterControls={
            showDateFilter ? (
              <DateFilterControls filter={dateFilter} onChange={setDateFilter} />
            ) : undefined
          }
        />

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-safe">
          {isDataLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Fetching records from Supabase...</span>
            </div>
          ) : (
            <>
              {currentPage === 'overview' && (
                <OverviewView
                  records={records}
                  filter={dateFilter}
                  onNavigate={setCurrentPage}
                  onEditEntry={handleEditEntry}
                  onDeleteEntry={deleteTransaction}
                />
              )}

              {currentPage === 'daily' && (
                <DailyEntryView
                  records={records}
                  categories={categories}
                  onSaveDaily={saveDailyTransactions}
                  onAddCategory={addCategory}
                />
              )}

              {currentPage === 'transactions' && (
                <TransactionsView
                  records={records}
                  filter={dateFilter}
                  onEditEntry={handleEditEntry}
                  onDeleteEntry={deleteTransaction}
                />
              )}

              {currentPage === 'categories' && (
                <CategoriesView
                  records={records}
                  filter={dateFilter}
                  categories={categories}
                  onAddCategory={addCategory}
                  onRenameCategory={renameCategory}
                />
              )}

              {currentPage === 'reports' && (
                <ReportsView
                  records={records}
                  filter={dateFilter}
                  company={company}
                  categories={categories}
                />
              )}

              {currentPage === 'company' && (
                <CompanyDetailsView
                  company={company}
                  onSave={updateCompanyDetails}
                />
              )}

              {currentPage === 'settings' && (
                <SettingsView
                  onPushToCloud={pushToSupabase}
                  onFetchFromCloud={fetchFromSupabase}
                  syncStatus={syncStatus}
                  isSyncing={isSyncing}
                  recordCount={records.length}
                  isAdmin={isAdmin}
                  onAdminCreateUser={adminCreateUser}
                  onFetchUsers={fetchUsersList}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Add / Edit Transaction Modal */}
      <EntryModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={addOrUpdateTransaction}
        categories={categories}
        initialEntry={editingEntry}
      />
    </div>
  )
}

export default App
