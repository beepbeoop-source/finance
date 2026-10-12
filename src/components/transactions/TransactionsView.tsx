import React, { useState, useMemo } from 'react'
import type { Transaction, DateFilterConfig } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatINR } from '@/lib/utils'
import { Download, Edit2, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface TransactionsViewProps {
  records: Transaction[]
  filter: DateFilterConfig
  onEditEntry: (entry: Transaction) => void
  onDeleteEntry: (id: string) => void
}

const PAGE_SIZE = 25

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  records,
  filter,
  onEditEntry,
  onDeleteEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [page, setPage] = useState(0)

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => r.date >= filter.startDate && r.date <= filter.endDate)
  }, [records, filter.startDate, filter.endDate])

  // Search & type filter
  const filtered = useMemo(() => {
    return periodRecords
      .filter((r) => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false
        if (
          searchTerm &&
          !r.category.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(r.note && r.note.toLowerCase().includes(searchTerm.toLowerCase()))
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [periodRecords, typeFilter, searchTerm])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const currentPageRecords = useMemo(() => {
    const start = page * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount (INR)', 'Note'],
      ...filtered.map((r) => [r.date, r.type, r.category, r.amount, r.note || '']),
    ]
    const csvContent =
      '\ufeff' +
      rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `syed-finance-transactions-${filter.startDate}-to-${filter.endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">All Transactions</h2>
          <p className="text-xs text-muted-foreground">
            Review, edit, search, and manage individual financial entries.
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-muted rounded-md text-muted-foreground self-start sm:self-auto">
          {filtered.length} entries ({filter.startDate} to {filter.endDate})
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search category or note..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(0)
                }}
                className="h-8 pl-8 w-44 sm:w-60 text-xs"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any)
                setPage(0)
              }}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 self-start sm:self-auto" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                <tr>
                  <th className="p-3">Category / Source</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Note</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentPageRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-foreground">
                      {row.category}
                    </td>
                    <td className="p-3">
                      <Badge variant={row.type === 'income' ? 'success' : 'expense'}>
                        {row.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{row.date}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                      {row.note || '—'}
                    </td>
                    <td
                      className={`p-3 text-right font-bold whitespace-nowrap ${
                        row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {row.type === 'income' ? '+' : '-'} {formatINR(row.amount)}
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
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
                {currentPageRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>
              Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1} to{' '}
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
