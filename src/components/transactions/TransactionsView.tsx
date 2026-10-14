import React, { useState, useMemo } from 'react'
import type { Transaction, DateFilterConfig } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/utils'
import {
  Download,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'

interface TransactionsViewProps {
  records: Transaction[]
  filter: DateFilterConfig
  categories?: { income: string[]; expense: string[]; all: string[] }
  onEditEntry: (entry: Transaction) => void
  onDeleteEntry: (id: string) => void
}

type SortField = 'date' | 'amount' | 'category'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE = 25

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  records,
  filter,
  categories,
  onEditEntry,
  onDeleteEntry,
}) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Sort states
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination state
  const [page, setPage] = useState(0)

  // Filter records within date range
  const periodRecords = useMemo(() => {
    return records.filter((r) => r.date >= filter.startDate && r.date <= filter.endDate)
  }, [records, filter.startDate, filter.endDate])

  // Get unique category list
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    if (categories?.all) {
      categories.all.forEach((c) => set.add(c))
    }
    periodRecords.forEach((r) => set.add(r.category))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categories, periodRecords])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (typeFilter !== 'all') count++
    if (categoryFilter !== 'all') count++
    if (searchTerm.trim() !== '') count++
    if (minAmount.trim() !== '') count++
    if (maxAmount.trim() !== '') count++
    return count
  }, [typeFilter, categoryFilter, searchTerm, minAmount, maxAmount])

  const handleResetFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setPage(0)
  }

  // Handle header sort toggle
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder(field === 'amount' ? 'desc' : field === 'date' ? 'desc' : 'asc')
    }
    setPage(0)
  }

  // Sort preset handler
  const currentSortKey = `${sortField}-${sortOrder}`
  const handleSortSelectChange = (value: string | null) => {
    if (!value) return
    const [field, order] = value.split('-') as [SortField, SortOrder]
    setSortField(field)
    setSortOrder(order)
    setPage(0)
  }

  // Filter and sort transactions
  const filtered = useMemo(() => {
    const min = minAmount !== '' ? Number(minAmount) : null
    const max = maxAmount !== '' ? Number(maxAmount) : null

    return periodRecords
      .filter((r) => {
        // Type filter
        if (typeFilter !== 'all' && r.type !== typeFilter) return false

        // Category filter
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false

        // Search term (category or note)
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase()
          const inCat = r.category.toLowerCase().includes(query)
          const inNote = r.note ? r.note.toLowerCase().includes(query) : false
          if (!inCat && !inNote) return false
        }

        // Amount range filter
        if (min !== null && !isNaN(min) && r.amount < min) return false
        if (max !== null && !isNaN(max) && r.amount > max) return false

        return true
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortField === 'date') {
          cmp = a.date.localeCompare(b.date)
        } else if (sortField === 'amount') {
          cmp = Number(a.amount) - Number(b.amount)
        } else if (sortField === 'category') {
          cmp = a.category.localeCompare(b.category)
        }
        return sortOrder === 'asc' ? cmp : -cmp
      })
  }, [periodRecords, typeFilter, categoryFilter, searchTerm, minAmount, maxAmount, sortField, sortOrder])

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

  // Render header sort icon
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">All Transactions</h2>
          <p className="text-xs text-muted-foreground">
            Review, edit, search, and manage individual financial entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold">
            {filtered.length} entries ({filter.startDate} to {filter.endDate})
          </Badge>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="p-4 sm:p-5 space-y-4 pb-3">
          {/* Main Filter & Sort Controls Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search category or note..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(0)
                }}
                className="h-8 pl-8 pr-7 text-xs w-full"
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

            {/* Quick Filters & Sorting Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter (shadcn Select) */}
              <div className="w-[125px]">
                <Select
                  value={typeFilter}
                  onValueChange={(val) => {
                    if (val) {
                      setTypeFilter(val as 'all' | 'income' | 'expense')
                      setPage(0)
                    }
                  }}
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

              {/* Category Filter (shadcn Select) */}
              <div className="w-[150px]">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    if (val) {
                      setCategoryFilter(val)
                      setPage(0)
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Preset (shadcn Select) */}
              <div className="w-[170px]">
                <Select value={currentSortKey} onValueChange={handleSortSelectChange}>
                  <SelectTrigger className="w-full h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="amount-desc">Amount (Highest First)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Lowest First)</SelectItem>
                    <SelectItem value="category-asc">Category (A to Z)</SelectItem>
                    <SelectItem value="category-desc">Category (Z to A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filter Toggle Button */}
              <Button
                variant={showAdvancedFilters || minAmount || maxAmount ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Amount Range</span>
                {(minAmount || maxAmount) && (
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                )}
              </Button>

              {/* Reset Filters Button */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={handleResetFilters}
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4">
                    {activeFilterCount}
                  </Badge>
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters Expandable Row (Min / Max Amount) */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
              <span className="font-semibold text-muted-foreground">Amount Filter:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Min ₹</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value)
                    setPage(0)
                  }}
                  className="h-7 w-24 text-xs bg-background"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Max ₹</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="No limit"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value)
                    setPage(0)
                  }}
                  className="h-7 w-28 text-xs bg-background"
                />
              </div>
              {(minAmount || maxAmount) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMinAmount('')
                    setMaxAmount('')
                  }}
                >
                  Clear Amount
                </Button>
              )}
            </div>
          )}

          {/* Active Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground font-medium mr-1">Active filters:</span>
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter('all')} className="hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('all')} className="hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              {minAmount && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                  Min: ₹{minAmount}
                  <button onClick={() => setMinAmount('')} className="hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              {maxAmount && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                  Max: ₹{maxAmount}
                  <button onClick={() => setMaxAmount('')} className="hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b font-medium text-muted-foreground select-none">
                <tr>
                  <th className="p-3">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 font-semibold text-foreground/80 hover:text-foreground cursor-pointer"
                      onClick={() => handleSortToggle('category')}
                    >
                      Category / Source
                      {renderSortIndicator('category')}
                    </button>
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground">Type</th>
                  <th className="p-3">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 font-semibold text-foreground/80 hover:text-foreground cursor-pointer"
                      onClick={() => handleSortToggle('date')}
                    >
                      Date
                      {renderSortIndicator('date')}
                    </button>
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground">Note</th>
                  <th className="p-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center justify-end gap-1.5 font-semibold text-foreground/80 hover:text-foreground cursor-pointer ml-auto"
                      onClick={() => handleSortToggle('amount')}
                    >
                      Amount
                      {renderSortIndicator('amount')}
                    </button>
                  </th>
                  <th className="p-3 text-right font-semibold text-muted-foreground">Actions</th>
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
                        row.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {row.type === 'income' ? '+' : '-'} {formatINR(row.amount)}
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => onEditEntry(row)}
                        title="Edit Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 cursor-pointer"
                        onClick={() => {
                          if (confirm(`Delete ${row.category} entry for ${formatINR(row.amount)}?`)) {
                            onDeleteEntry(row.id)
                          }
                        }}
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {currentPageRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground space-y-2">
                      <p className="font-medium">No matching transactions found.</p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1 mt-1"
                          onClick={handleResetFilters}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear all filters
                        </Button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-xs text-muted-foreground">
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
                Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
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
