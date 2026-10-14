import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Moon, Sun, Menu, X } from 'lucide-react'

interface NavbarProps {
  currentPage: string
  onOpenAddModal: () => void
  onToggleMobileNav: () => void
  isMobileNavOpen: boolean
  dateFilterControls?: React.ReactNode
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onOpenAddModal,
  onToggleMobileNav,
  isMobileNavOpen,
  dateFilterControls,
}) => {
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains('dark')
  })

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    }
  }

  const getPageTitle = (p: string) => {
    switch (p) {
      case 'overview':
        return 'Overview'
      case 'daily':
        return 'Daily Entry'
      case 'transactions':
        return 'Transactions'
      case 'categories':
        return 'Categories'
      case 'reports':
        return 'Reports'
      case 'company':
        return 'Company Details'
      case 'settings':
        return 'Settings & Users'
      default:
        return 'Overview'
    }
  }

  return (
    <header className="no-print sticky top-0 z-30 flex flex-col border-b bg-card/95 px-3 sm:px-6 backdrop-blur-md pt-safe shadow-xs">
      {/* Main Top Bar */}
      <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onToggleMobileNav}
            aria-label="Toggle navigation menu"
          >
            {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary truncate leading-tight">
              Syed Global Group PVT LTD
            </div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-foreground truncate leading-tight">
              {getPageTitle(currentPage)}
            </h1>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
          {dateFilterControls}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button size="sm" className="h-8 text-xs gap-1.5 shadow-xs shrink-0" onClick={onOpenAddModal}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Entry</span>
          </Button>
        </div>

        {/* Mobile Controls Right Side */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold gap-1 shrink-0"
            onClick={onOpenAddModal}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Mobile Sub-bar for Date Controls */}
      {dateFilterControls && (
        <div className="flex sm:hidden items-center justify-between pb-2.5 pt-0.5 overflow-x-auto">
          {dateFilterControls}
        </div>
      )}
    </header>
  )
}
