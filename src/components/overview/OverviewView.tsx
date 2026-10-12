import React, { useMemo } from 'react'
import type { Transaction, DateFilterConfig } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatINR } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, Layers, ArrowRight, Download, Edit2, Trash2 } from 'lucide-react'

interface OverviewViewProps {
  records: Transaction[]
  filter: DateFilterConfig
  onNavigate: (page: string) => void
  onEditEntry: (entry: Transaction) => void
  onDeleteEntry: (id: string) => void
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  records,
  filter,
  onNavigate,
  onEditEntry,
  onDeleteEntry,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'income' | 'expense'>('all')

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => r.date >= filter.startDate && r.date <= filter.endDate)
  }, [records, filter.startDate, filter.endDate])

  // Stats
  const { totalIncome, totalExpense, netBalance, entryCount } = useMemo(() => {
    let inc = 0
    let exp = 0
    periodRecords.forEach((r) => {
      if (r.type === 'income') inc += Number(r.amount) || 0
      if (r.type === 'expense') exp += Number(r.amount) || 0
    })
    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: inc - exp,
      entryCount: periodRecords.length,
    }
  }, [periodRecords])

  // Top Expense Categories
  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, number>()
    periodRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => map.set(r.category, (map.get(r.category) || 0) + Number(r.amount || 0)))

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const max = sorted[0]?.[1] || 1
    return { list: sorted.slice(0, 5), max }
  }, [periodRecords])

  // Daily Bins for Chart
  const chartData = useMemo(() => {
    const isDaily = (new Date(filter.endDate).getTime() - new Date(filter.startDate).getTime()) / 86400000 < 32
    const bins: { key: string; label: string; income: number; expense: number }[] = []

    if (isDaily) {
      const cur = new Date(filter.startDate + 'T00:00:00')
      const end = new Date(filter.endDate + 'T00:00:00')
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10)
        bins.push({
          key,
          label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          income: 0,
          expense: 0,
        })
        cur.setDate(cur.getDate() + 1)
      }
    } else {
      const cur = new Date(filter.startDate.slice(0, 7) + '-01T00:00:00')
      const end = new Date(filter.endDate.slice(0, 7) + '-01T00:00:00')
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 7)
        bins.push({
          key,
          label: cur.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          income: 0,
          expense: 0,
        })
        cur.setMonth(cur.getMonth() + 1)
      }
    }

    const binMap = new Map(bins.map((b) => [b.key, b]))
    periodRecords.forEach((r) => {
      const k = isDaily ? r.date : r.date.slice(0, 7)
      const b = binMap.get(k)
      if (b) {
        if (r.type === 'income') b.income += Number(r.amount) || 0
        if (r.type === 'expense') b.expense += Number(r.amount) || 0
      }
    })

    const maxVal = Math.max(1, ...bins.flatMap((b) => [b.income, b.expense]))
    return { bins, maxVal }
  }, [periodRecords, filter.startDate, filter.endDate])

  // Filtered recent transactions
  const filteredTransactions = useMemo(() => {
    return periodRecords
      .filter((r) => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false
        if (searchTerm && !r.category.toLowerCase().includes(searchTerm.toLowerCase())) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [periodRecords, typeFilter, searchTerm])

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount (INR)', 'Note'],
      ...filteredTransactions.map((r) => [r.date, r.type, r.category, r.amount, r.note || '']),
    ]
    const csvContent =
      '\ufeff' +
      rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `syed-finance-overview-${filter.startDate}-to-${filter.endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Company Finances</h2>
          <p className="text-xs text-muted-foreground">Track every rupee coming in and going out.</p>
        </div>
        <div className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-muted rounded-md text-muted-foreground self-start sm:self-auto">
          Period: {filter.startDate} to {filter.endDate}
        </div>
      </div>

      {/* 4 Stat Cards: Responsive 2-column mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-muted-foreground">
              <span className="truncate">Total Income</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1.5 sm:mt-2 text-emerald-600 dark:text-emerald-400 truncate">
              {formatINR(totalIncome)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">For period</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-muted-foreground">
              <span className="truncate">Total Expenses</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1.5 sm:mt-2 text-rose-600 dark:text-rose-400 truncate">
              {formatINR(totalExpense)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">For period</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-muted-foreground">
              <span className="truncate">Net Balance</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div
              className={`text-lg sm:text-2xl font-bold mt-1.5 sm:mt-2 truncate ${
                netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(netBalance)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">Income - Expense</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-muted-foreground">
              <span className="truncate">Entries</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1.5 sm:mt-2 truncate">{entryCount}</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">Recorded</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Cash Flow Chart */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Daily Cash Flow</CardTitle>
              <p className="text-xs text-muted-foreground">Income and expenses by day</p>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Expense
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="h-52 sm:h-56 w-full flex items-end gap-1 sm:gap-2 pt-6 overflow-x-auto pb-2">
              {chartData.bins.map((bin) => {
                const incHeight = (bin.income / chartData.maxVal) * 100
                const expHeight = (bin.expense / chartData.maxVal) * 100

                return (
                  <div key={bin.key} className="flex-1 min-w-[24px] max-w-[42px] flex flex-col items-center h-full justify-end group relative shrink-0">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-popover text-popover-foreground border text-[10px] p-1.5 rounded shadow pointer-events-none whitespace-nowrap">
                      <div className="font-bold">{bin.label}</div>
                      <div className="text-emerald-500">In: {formatINR(bin.income)}</div>
                      <div className="text-rose-500">Out: {formatINR(bin.expense)}</div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-36 sm:h-44 border-b border-muted">
                      {/* Income Bar */}
                      <div
                        style={{ height: `${Math.max(incHeight > 0 ? 3 : 0, incHeight)}%` }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all"
                      />
                      {/* Expense Bar */}
                      <div
                        style={{ height: `${Math.max(expHeight > 0 ? 3 : 0, expHeight)}%` }}
                        className="w-full bg-rose-500 hover:bg-rose-600 rounded-t transition-all"
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-full text-center">
                      {bin.label.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Expense Categories */}
        <Card className="border-border/60 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Top Expenses</CardTitle>
              <p className="text-xs text-muted-foreground">Where the money is going</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 px-2"
              onClick={() => onNavigate('categories')}
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 flex-1 flex flex-col justify-between">
            {topExpenseCategories.list.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No expense entries for this period.
              </div>
            ) : (
              <div className="space-y-3.5">
                {topExpenseCategories.list.map(([name, amount]) => {
                  const pct = Math.max(3, (amount / topExpenseCategories.max) * 100)
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[160px]">{name}</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                          {formatINR(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t">
              Tip: Click any category to drill down in Categories tab.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold">Recent Transactions</CardTitle>
            <p className="text-xs text-muted-foreground">Latest entries for the selected period</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-32 sm:w-48 text-xs"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                <tr>
                  <th className="p-2.5 sm:p-3">Category</th>
                  <th className="p-2.5 sm:p-3">Type</th>
                  <th className="p-2.5 sm:p-3">Date</th>
                  <th className="p-2.5 sm:p-3 text-right">Amount</th>
                  <th className="p-2.5 sm:p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.slice(0, 8).map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 sm:p-3 font-medium">
                      <div className="truncate max-w-[130px] sm:max-w-none">{row.category}</div>
                      {row.note && <div className="text-[10px] text-muted-foreground truncate max-w-[130px] sm:max-w-none">{row.note}</div>}
                    </td>
                    <td className="p-2.5 sm:p-3">
                      <Badge variant={row.type === 'income' ? 'success' : 'expense'} className="text-[10px] px-1.5 py-0">
                        {row.type}
                      </Badge>
                    </td>
                    <td className="p-2.5 sm:p-3 text-muted-foreground whitespace-nowrap">{row.date}</td>
                    <td
                      className={`p-2.5 sm:p-3 text-right font-semibold whitespace-nowrap ${
                        row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {row.type === 'income' ? '+' : '-'} {formatINR(row.amount)}
                    </td>
                    <td className="p-2.5 sm:p-3 text-right space-x-0.5 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onEditEntry(row)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:text-rose-700"
                        onClick={() => {
                          if (confirm(`Delete ${row.category} entry for ${formatINR(row.amount)}?`)) {
                            onDeleteEntry(row.id)
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No transactions found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>
              Showing {Math.min(8, filteredTransactions.length)} of {filteredTransactions.length}
            </span>
            <Button
              variant="link"
              size="sm"
              className="text-xs h-auto p-0"
              onClick={() => onNavigate('transactions')}
            >
              See all →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
