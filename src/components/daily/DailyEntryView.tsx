import React, { useState, useMemo, useEffect } from 'react'
import type { Transaction, TransactionType } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
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
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Save,
  Calendar,
  Search,
  X,
  Filter,
} from 'lucide-react'

interface DailyEntryViewProps {
  records: Transaction[]
  categories: { income: string[]; expense: string[]; all: string[] }
  onSaveDaily: (date: string, entries: { type: TransactionType; category: string; amount: number }[]) => void
  onAddCategory: (type: TransactionType, name: string) => Promise<boolean> | boolean
}

export const DailyEntryView: React.FC<DailyEntryViewProps> = ({
  records,
  categories,
  onSaveDaily,
  onAddCategory,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10)
  })

  // State of inputs for this date: key is `${type}-${category}`
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  // Category search and sort
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('default')
  const [onlyEntered, setOnlyEntered] = useState(false)

  // When date or records change, pre-populate amounts
  useEffect(() => {
    const dayRows = records.filter((r) => r.date === selectedDate)
    const map: Record<string, string> = {}
    dayRows.forEach((r) => {
      const key = `${r.type}-${r.category}`
      const existing = Number(map[key] || 0)
      map[key] = String(existing + Number(r.amount || 0))
    })
    setAmounts(map)
  }, [selectedDate, records])

  const handleAmountChange = (type: TransactionType, category: string, val: string) => {
    setAmounts((prev) => ({
      ...prev,
      [`${type}-${category}`]: val,
    }))
  }

  // Calculate totals
  const totalIncome = useMemo(() => {
    return categories.income.reduce((sum, cat) => {
      const val = Number(amounts[`income-${cat}`] || 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
  }, [categories.income, amounts])

  const totalExpense = useMemo(() => {
    return categories.expense.reduce((sum, cat) => {
      const val = Number(amounts[`expense-${cat}`] || 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
  }, [categories.expense, amounts])

  // Count entered
  const enteredIncomeCount = useMemo(() => {
    return categories.income.filter((c) => Number(amounts[`income-${c}`] || 0) > 0).length
  }, [categories.income, amounts])

  const enteredExpenseCount = useMemo(() => {
    return categories.expense.filter((c) => Number(amounts[`expense-${c}`] || 0) > 0).length
  }, [categories.expense, amounts])

  // Process category lists with filter and sort
  const processCategories = (list: string[], type: TransactionType) => {
    let result = [...list]

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter((c) => c.toLowerCase().includes(q))
    }

    // Only entered filter
    if (onlyEntered) {
      result = result.filter((c) => Number(amounts[`${type}-${c}`] || 0) > 0)
    }

    // Sort
    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.localeCompare(b))
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.localeCompare(a))
    } else if (sortBy === 'has-value') {
      result.sort((a, b) => {
        const valA = Number(amounts[`${type}-${a}`] || 0)
        const valB = Number(amounts[`${type}-${b}`] || 0)
        return valB - valA
      })
    }

    return result
  }

  const filteredIncomeCategories = useMemo(
    () => processCategories(categories.income, 'income'),
    [categories.income, searchTerm, onlyEntered, sortBy, amounts]
  )

  const filteredExpenseCategories = useMemo(
    () => processCategories(categories.expense, 'expense'),
    [categories.expense, searchTerm, onlyEntered, sortBy, amounts]
  )

  const handleSave = () => {
    const entries: { type: TransactionType; category: string; amount: number }[] = []

    // Income
    categories.income.forEach((cat) => {
      const num = Number(amounts[`income-${cat}`] || 0)
      if (num > 0) entries.push({ type: 'income', category: cat, amount: num })
    })

    // Expense
    categories.expense.forEach((cat) => {
      const num = Number(amounts[`expense-${cat}`] || 0)
      if (num > 0) entries.push({ type: 'expense', category: cat, amount: num })
    })

    onSaveDaily(selectedDate, entries)
  }

  const promptAddCategory = async (type: TransactionType) => {
    const name = window.prompt(type === 'income' ? 'Enter new income source:' : 'Enter new expense category:')
    if (name?.trim()) {
      await onAddCategory(type, name.trim())
    }
  }

  return (
    <div className="space-y-6">
      {/* Header / Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Daily Entry</h2>
          <p className="text-xs text-muted-foreground">
            Enter today's income and expenses directly. Fast batch-entry by date.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border shadow-xs">
          <Calendar className="w-4 h-4 text-muted-foreground ml-1" />
          <span className="text-xs font-semibold text-muted-foreground">Entry Date:</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 w-36 text-xs bg-background"
          />
        </div>
      </div>

      {/* Category Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-card shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search category to enter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs w-full bg-background"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Toggle only entered */}
          <Button
            variant={onlyEntered ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setOnlyEntered((prev) => !prev)}
          >
            <Filter className="w-3 h-3" />
            {onlyEntered ? 'Showing Entered' : 'Filter: All'}
          </Button>

          {/* Sort Categories */}
          <div className="w-[170px]">
            <Select value={sortBy} onValueChange={(val) => val && setSortBy(val)}>
              <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="Sort categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Order</SelectItem>
                <SelectItem value="has-value">Entered Values First</SelectItem>
                <SelectItem value="name-asc">Alphabetical (A-Z)</SelectItem>
                <SelectItem value="name-desc">Alphabetical (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Two Columns: Income & Expense */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Sources Panel */}
        <Card className="border-border/60 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <CardTitle className="text-sm font-semibold">Income Sources</CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {enteredIncomeCount} of {categories.income.length} entered
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => promptAddCategory('income')}
            >
              <Plus className="w-3 h-3" />
              Add Source
            </Button>
          </CardHeader>

          <CardContent className="p-4 flex-1 space-y-3 max-h-[500px] overflow-y-auto">
            {filteredIncomeCategories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <label
                  title={cat}
                  className="text-xs font-medium text-foreground truncate max-w-[180px] sm:max-w-[220px]"
                >
                  {cat}
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amounts[`income-${cat}`] || ''}
                    onChange={(e) => handleAmountChange('income', cat, e.target.value)}
                    className="h-8 w-28 text-right text-xs bg-background font-semibold"
                  />
                </div>
              </div>
            ))}
            {filteredIncomeCategories.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {searchTerm || onlyEntered
                  ? 'No income categories match your filter.'
                  : 'No income categories added yet. Click "+ Add Source" to create one.'}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t p-4 bg-muted/10">
            <span className="text-xs font-semibold text-muted-foreground">Income Total</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(totalIncome)}
            </span>
          </CardFooter>
        </Card>

        {/* Expense Categories Panel */}
        <Card className="border-border/60 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <CardTitle className="text-sm font-semibold">Expense Categories</CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {enteredExpenseCount} of {categories.expense.length} entered
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => promptAddCategory('expense')}
            >
              <Plus className="w-3 h-3" />
              Add Category
            </Button>
          </CardHeader>

          <CardContent className="p-4 flex-1 space-y-3 max-h-[500px] overflow-y-auto">
            {filteredExpenseCategories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <label
                  title={cat}
                  className="text-xs font-medium text-foreground truncate max-w-[180px] sm:max-w-[220px]"
                >
                  {cat}
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amounts[`expense-${cat}`] || ''}
                    onChange={(e) => handleAmountChange('expense', cat, e.target.value)}
                    className="h-8 w-28 text-right text-xs bg-background font-semibold"
                  />
                </div>
              </div>
            ))}
            {filteredExpenseCategories.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {searchTerm || onlyEntered
                  ? 'No expense categories match your filter.'
                  : 'No expense categories added yet. Click "+ Add Category" to create one.'}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t p-4 bg-muted/10">
            <span className="text-xs font-semibold text-muted-foreground">Expense Total</span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400">
              {formatINR(totalExpense)}
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* Save Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
        <span className="text-xs text-muted-foreground">
          Amounts entered for {selectedDate} are saved directly to your Supabase database.
        </span>
        <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
          <Save className="w-4 h-4" />
          Save Daily Entries
        </Button>
      </div>
    </div>
  )
}
