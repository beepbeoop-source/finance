import React, { useState, useMemo } from 'react'
import type { Transaction, TransactionType, DateFilterConfig } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Check,
  X,
  Settings2,
  Search,
  Layers,
} from 'lucide-react'

interface CategoriesViewProps {
  records: Transaction[]
  filter: DateFilterConfig
  categories: { income: string[]; expense: string[]; all: string[] }
  onAddCategory: (type: TransactionType, name: string) => Promise<boolean> | boolean
  onRenameCategory: (type: TransactionType, oldName: string, newName: string) => Promise<boolean> | boolean | void
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  records,
  filter,
  categories,
  onAddCategory,
  onRenameCategory,
}) => {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'manage'>('breakdown')
  const [newIncome, setNewIncome] = useState('')
  const [newExpense, setNewExpense] = useState('')

  // Search & Sort for Breakdown tab
  const [breakdownSearch, setBreakdownSearch] = useState('')
  const [breakdownSort, setBreakdownSort] = useState<string>('amount-desc')

  // Search & Sort for Manage tab
  const [manageSearch, setManageSearch] = useState('')
  const [manageSort, setManageSort] = useState<string>('default')

  // Editing state: { type, oldName, currentVal }
  const [editing, setEditing] = useState<{ type: TransactionType; oldName: string; currentVal: string } | null>(null)

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => r.date >= filter.startDate && r.date <= filter.endDate)
  }, [records, filter.startDate, filter.endDate])

  // Helper sort function
  const sortRanking = (list: [string, number][], sortKey: string) => {
    const copy = [...list]
    if (sortKey === 'amount-asc') {
      copy.sort((a, b) => a[1] - b[1])
    } else if (sortKey === 'name-asc') {
      copy.sort((a, b) => a[0].localeCompare(b[0]))
    } else if (sortKey === 'name-desc') {
      copy.sort((a, b) => b[0].localeCompare(a[0]))
    } else {
      // amount-desc
      copy.sort((a, b) => b[1] - a[1])
    }
    return copy
  }

  // Ranked totals by category
  const incomeRanking = useMemo(() => {
    const map = new Map<string, number>()
    periodRecords
      .filter((r) => r.type === 'income')
      .forEach((r) => map.set(r.category, (map.get(r.category) || 0) + Number(r.amount || 0)))

    let list = Array.from(map.entries())
    if (breakdownSearch.trim()) {
      const q = breakdownSearch.toLowerCase()
      list = list.filter(([cat]) => cat.toLowerCase().includes(q))
    }
    const max = Math.max(1, ...Array.from(map.values()))
    return { list: sortRanking(list, breakdownSort), max }
  }, [periodRecords, breakdownSearch, breakdownSort])

  const expenseRanking = useMemo(() => {
    const map = new Map<string, number>()
    periodRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => map.set(r.category, (map.get(r.category) || 0) + Number(r.amount || 0)))

    let list = Array.from(map.entries())
    if (breakdownSearch.trim()) {
      const q = breakdownSearch.toLowerCase()
      list = list.filter(([cat]) => cat.toLowerCase().includes(q))
    }
    const max = Math.max(1, ...Array.from(map.values()))
    return { list: sortRanking(list, breakdownSort), max }
  }, [periodRecords, breakdownSearch, breakdownSort])

  // Filtered and sorted category lists for Manage tab
  const managedIncomeCategories = useMemo(() => {
    let list = [...categories.income]
    if (manageSearch.trim()) {
      const q = manageSearch.toLowerCase()
      list = list.filter((c) => c.toLowerCase().includes(q))
    }
    if (manageSort === 'name-asc') {
      list.sort((a, b) => a.localeCompare(b))
    } else if (manageSort === 'name-desc') {
      list.sort((a, b) => b.localeCompare(a))
    }
    return list
  }, [categories.income, manageSearch, manageSort])

  const managedExpenseCategories = useMemo(() => {
    let list = [...categories.expense]
    if (manageSearch.trim()) {
      const q = manageSearch.toLowerCase()
      list = list.filter((c) => c.toLowerCase().includes(q))
    }
    if (manageSort === 'name-asc') {
      list.sort((a, b) => a.localeCompare(b))
    } else if (manageSort === 'name-desc') {
      list.sort((a, b) => b.localeCompare(a))
    }
    return list
  }, [categories.expense, manageSearch, manageSort])

  const handleAdd = async (type: TransactionType) => {
    const val = type === 'income' ? newIncome : newExpense
    const success = await onAddCategory(type, val)
    if (success) {
      if (type === 'income') setNewIncome('')
      else setNewExpense('')
    }
  }

  const handleSaveRename = async () => {
    if (!editing) return
    await onRenameCategory(editing.type, editing.oldName, editing.currentVal)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {activeTab === 'breakdown' ? 'Category Breakdown' : 'Manage Categories'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeTab === 'breakdown'
              ? 'Income sources and expense categories for the selected period.'
              : 'Add, rename, or adjust categories. Renaming automatically updates all matching records in Supabase.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'breakdown' ? 'default' : 'outline'}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setActiveTab('breakdown')}
          >
            <Layers className="w-3.5 h-3.5" />
            Breakdown View
          </Button>
          <Button
            variant={activeTab === 'manage' ? 'default' : 'outline'}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setActiveTab('manage')}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Manage Categories
          </Button>
        </div>
      </div>

      {activeTab === 'breakdown' ? (
        <div className="space-y-4">
          {/* Filter & Sorting Toolbar for Breakdown */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-card">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search category name..."
                value={breakdownSearch}
                onChange={(e) => setBreakdownSearch(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs w-full bg-background"
              />
              {breakdownSearch && (
                <button
                  type="button"
                  onClick={() => setBreakdownSearch('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Sort breakdown:</span>
              <div className="w-[180px]">
                <Select value={breakdownSort} onValueChange={(val) => val && setBreakdownSort(val)}>
                  <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Sort breakdown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount-desc">Amount: Highest First</SelectItem>
                    <SelectItem value="amount-asc">Amount: Lowest First</SelectItem>
                    <SelectItem value="name-asc">Alphabetical (A to Z)</SelectItem>
                    <SelectItem value="name-desc">Alphabetical (Z to A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Sources Panel */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Income Sources
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Ranked by recorded amount</p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {incomeRanking.list.length} categories
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-4">
                {incomeRanking.list.map(([name, amount]) => {
                  const pct = Math.max(3, (amount / incomeRanking.max) * 100)
                  return (
                    <div key={name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatINR(amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {incomeRanking.list.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    {breakdownSearch ? `No income categories match "${breakdownSearch}"` : 'No income recorded for this period.'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories Panel */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    Expense Categories
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Ranked by recorded amount</p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {expenseRanking.list.length} categories
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-4">
                {expenseRanking.list.map(([name, amount]) => {
                  const pct = Math.max(3, (amount / expenseRanking.max) * 100)
                  return (
                    <div key={name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {formatINR(amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {expenseRanking.list.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    {breakdownSearch ? `No expense categories match "${breakdownSearch}"` : 'No expenses recorded for this period.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Manage Categories Tab */
        <div className="space-y-4">
          {/* Search & Sort Bar for Manage tab */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-card">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search categories to manage..."
                value={manageSearch}
                onChange={(e) => setManageSearch(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs w-full bg-background"
              />
              {manageSearch && (
                <button
                  type="button"
                  onClick={() => setManageSearch('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Sort list:</span>
              <div className="w-[170px]">
                <Select value={manageSort} onValueChange={(val) => val && setManageSort(val)}>
                  <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Order</SelectItem>
                    <SelectItem value="name-asc">Alphabetical (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Alphabetical (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manage Income */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Income Sources</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {managedIncomeCategories.length} of {categories.income.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Add or rename income categories</p>
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="New income source name..."
                    value={newIncome}
                    onChange={(e) => setNewIncome(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdd('income')}>
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                {managedIncomeCategories.map((cat) => {
                  const isEditing = editing?.type === 'income' && editing?.oldName === cat
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            value={editing.currentVal}
                            onChange={(e) => setEditing({ ...editing, currentVal: e.target.value })}
                            className="h-7 text-xs flex-1"
                            autoFocus
                          />
                          <Button
                            variant="default"
                            size="icon"
                            className="h-7 w-7 text-xs"
                            onClick={handleSaveRename}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-xs"
                            onClick={() => setEditing(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-foreground">{cat}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditing({ type: 'income', oldName: cat, currentVal: cat })}
                          >
                            <Edit2 className="w-3 h-3" />
                            Rename
                          </Button>
                        </>
                      )}
                    </div>
                  )
                })}
                {managedIncomeCategories.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    {manageSearch ? `No categories match "${manageSearch}"` : 'No categories configured.'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manage Expense */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Expense Categories</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {managedExpenseCategories.length} of {categories.expense.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Add or rename expense categories</p>
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="New expense category name..."
                    value={newExpense}
                    onChange={(e) => setNewExpense(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdd('expense')}>
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                {managedExpenseCategories.map((cat) => {
                  const isEditing = editing?.type === 'expense' && editing?.oldName === cat
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            value={editing.currentVal}
                            onChange={(e) => setEditing({ ...editing, currentVal: e.target.value })}
                            className="h-7 text-xs flex-1"
                            autoFocus
                          />
                          <Button
                            variant="default"
                            size="icon"
                            className="h-7 w-7 text-xs"
                            onClick={handleSaveRename}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-xs"
                            onClick={() => setEditing(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-foreground">{cat}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditing({ type: 'expense', oldName: cat, currentVal: cat })}
                          >
                            <Edit2 className="w-3 h-3" />
                            Rename
                          </Button>
                        </>
                      )}
                    </div>
                  )
                })}
                {managedExpenseCategories.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    {manageSearch ? `No categories match "${manageSearch}"` : 'No categories configured.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
