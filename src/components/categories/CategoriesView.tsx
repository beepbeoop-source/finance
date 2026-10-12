import React, { useState, useMemo } from 'react'
import type { Transaction, TransactionType, DateFilterConfig } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatINR } from '@/lib/utils'
import { TrendingUp, TrendingDown, Plus, Edit2, Check, X, Settings2 } from 'lucide-react'

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

  // Editing state: { type, oldName, currentVal }
  const [editing, setEditing] = useState<{ type: TransactionType; oldName: string; currentVal: string } | null>(null)

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => r.date >= filter.startDate && r.date <= filter.endDate)
  }, [records, filter.startDate, filter.endDate])

  // Ranked totals by category
  const incomeRanking = useMemo(() => {
    const map = new Map<string, number>()
    periodRecords
      .filter((r) => r.type === 'income')
      .forEach((r) => map.set(r.category, (map.get(r.category) || 0) + Number(r.amount || 0)))
    const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const max = list[0]?.[1] || 1
    return { list, max }
  }, [periodRecords])

  const expenseRanking = useMemo(() => {
    const map = new Map<string, number>()
    periodRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => map.set(r.category, (map.get(r.category) || 0) + Number(r.amount || 0)))
    const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const max = list[0]?.[1] || 1
    return { list, max }
  }, [periodRecords])

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
            className="text-xs"
            onClick={() => setActiveTab('breakdown')}
          >
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Sources Panel */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Income Sources
                </CardTitle>
                <p className="text-xs text-muted-foreground">Ranked by recorded amount</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
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
                  No income recorded for this period.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Categories Panel */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  Expense Categories
                </CardTitle>
                <p className="text-xs text-muted-foreground">Ranked by recorded amount</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
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
                  No expenses recorded for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Manage Categories Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manage Income */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Income Sources</CardTitle>
              <p className="text-xs text-muted-foreground">Add or rename income categories</p>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="New income source name..."
                  value={newIncome}
                  onChange={(e) => setNewIncome(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdd('income')}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
              {categories.income.map((cat) => {
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
            </CardContent>
          </Card>

          {/* Manage Expense */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Expense Categories</CardTitle>
              <p className="text-xs text-muted-foreground">Add or rename expense categories</p>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="New expense category name..."
                  value={newExpense}
                  onChange={(e) => setNewExpense(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdd('expense')}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
              {categories.expense.map((cat) => {
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
