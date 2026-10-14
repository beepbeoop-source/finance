import React, { useState, useMemo } from 'react'
import type { Transaction, DateFilterConfig, CompanyDetails } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/utils'
import { Printer } from 'lucide-react'

interface ReportsViewProps {
  records: Transaction[]
  filter: DateFilterConfig
  company: CompanyDetails
  categories: { income: string[]; expense: string[]; all: string[] }
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  records,
  filter,
  company,
  categories,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [reportSort, setReportSort] = useState<string>('amount-desc')

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => r.date >= filter.startDate && r.date <= filter.endDate)
  }, [records, filter.startDate, filter.endDate])

  // Filter by type & category
  const filtered = useMemo(() => {
    return periodRecords.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false
      return true
    })
  }, [periodRecords, typeFilter, selectedCategory])

  const sortItems = (items: [string, number][], sortKey: string) => {
    const copy = [...items]
    if (sortKey === 'amount-asc') copy.sort((a, b) => a[1] - b[1])
    else if (sortKey === 'name-asc') copy.sort((a, b) => a[0].localeCompare(b[0]))
    else if (sortKey === 'name-desc') copy.sort((a, b) => b[0].localeCompare(a[0]))
    else copy.sort((a, b) => b[1] - a[1]) // amount-desc
    return copy
  }

  // Breakdown tables
  const incomeList = useMemo(() => {
    const incMap = new Map<string, number>()
    filtered
      .filter((r) => r.type === 'income')
      .forEach((r) => incMap.set(r.category, (incMap.get(r.category) || 0) + Number(r.amount || 0)))
    const list = sortItems(Array.from(incMap.entries()), reportSort)
    const total = list.reduce((sum, item) => sum + item[1], 0)
    return { list, total }
  }, [filtered, reportSort])

  const expenseList = useMemo(() => {
    const expMap = new Map<string, number>()
    filtered
      .filter((r) => r.type === 'expense')
      .forEach((r) => expMap.set(r.category, (expMap.get(r.category) || 0) + Number(r.amount || 0)))
    const list = sortItems(Array.from(expMap.entries()), reportSort)
    const total = list.reduce((sum, item) => sum + item[1], 0)
    return { list, total }
  }, [filtered, reportSort])

  const netBalance = incomeList.total - expenseList.total

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Financial Report</h2>
          <p className="text-xs text-muted-foreground">
            Printable income and expense statements formatted with your business branding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Select */}
          <div className="w-[125px]">
            <Select
              value={typeFilter}
              onValueChange={(val) => val && setTypeFilter(val as 'all' | 'income' | 'expense')}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="expense">Expense Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter Select */}
          <div className="w-[150px]">
            <Select
              value={selectedCategory}
              onValueChange={(val) => val && setSelectedCategory(val)}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.all.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Select */}
          <div className="w-[160px]">
            <Select
              value={reportSort}
              onValueChange={(val) => val && setReportSort(val)}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="Sort summary" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount-desc">Amount: High-Low</SelectItem>
                <SelectItem value="amount-asc">Amount: Low-High</SelectItem>
                <SelectItem value="name-asc">Alphabetical (A-Z)</SelectItem>
                <SelectItem value="name-desc">Alphabetical (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <Card className="border-border/60 bg-card p-6 sm:p-10 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header / Brand */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-6 gap-4">
          <div className="flex items-center gap-4">
            {company.logo && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex items-center justify-center p-1 bg-white border">
                <img src={company.logo} alt="Company logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
                {company.name || 'Syed Global Group PVT LTD'}
              </h1>
              {company.address && <div className="text-xs text-muted-foreground mt-0.5">{company.address}</div>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                {company.phone && <span>Phone: {company.phone}</span>}
                {company.email && <span>Email: {company.email}</span>}
                {company.gstin && <span>GSTIN: {company.gstin}</span>}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial Statement</div>
            <div className="text-sm font-semibold mt-1">
              Period: {filter.startDate} to {filter.endDate}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-3 gap-4 my-6 p-4 rounded-xl bg-muted/30 border text-center">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Income</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(incomeList.total)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Expenses</div>
            <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatINR(expenseList.total)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Net Balance</div>
            <div
              className={`text-lg sm:text-xl font-bold mt-1 ${
                netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(netBalance)}
            </div>
          </div>
        </div>

        {/* Breakdown Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Income Table */}
          {(typeFilter === 'all' || typeFilter === 'income') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Income Summary
                </h3>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(incomeList.total)}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">Source</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {incomeList.list.map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="py-2 font-medium">{cat}</td>
                      <td className="py-2 text-right font-semibold">{formatINR(amt)}</td>
                    </tr>
                  ))}
                  {incomeList.list.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground">
                        No income for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t font-bold">
                    <td className="py-2.5">Total Income</td>
                    <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                      {formatINR(incomeList.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Expense Table */}
          {(typeFilter === 'all' || typeFilter === 'expense') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Expense Summary
                </h3>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(expenseList.total)}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">Category</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenseList.list.map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="py-2 font-medium">{cat}</td>
                      <td className="py-2 text-right font-semibold">{formatINR(amt)}</td>
                    </tr>
                  ))}
                  {expenseList.list.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground">
                        No expenses for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t font-bold">
                    <td className="py-2.5">Total Expenses</td>
                    <td className="py-2.5 text-right text-rose-600 dark:text-rose-400">
                      {formatINR(expenseList.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer / Signatures */}
        <div className="mt-16 pt-8 border-t flex justify-between items-end text-xs text-muted-foreground">
          <div>
            <div className="h-8 border-b border-muted w-40 mb-1"></div>
            <div>Prepared by Accounts</div>
          </div>
          <div className="text-right">
            <div className="h-8 border-b border-muted w-40 mb-1 ml-auto"></div>
            <div>Authorized Signatory</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
