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
        return 'Cloud & Sync'
      default:
        return 'Overview'
    }
  }

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={onToggleMobileNav}
        >
          {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Syed Global Group PVT LTD
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {getPageTitle(currentPage)}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {dateFilterControls}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
          onClick={toggleTheme}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button size="sm" className="h-8 text-xs gap-1.5 shadow-xs" onClick={onOpenAddModal}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Entry</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  )
}
