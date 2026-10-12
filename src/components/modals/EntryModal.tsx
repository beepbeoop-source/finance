import React, { useState, useEffect } from 'react'
import type { Transaction, TransactionType } from '@/types/finance'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tx: Omit<Transaction, 'id'> & { id?: string }) => void
  categories: { income: string[]; expense: string[]; all: string[] }
  initialEntry?: Transaction | null
}

export const EntryModal: React.FC<EntryModalProps> = ({
  open,
  onOpenChange,
  onSave,
  categories,
  initialEntry,
}) => {
  const [type, setType] = useState<TransactionType>('expense')
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    if (initialEntry) {
      setType(initialEntry.type)
      setDate(initialEntry.date)
      setCategory(initialEntry.category)
      setAmount(String(initialEntry.amount))
      setNote(initialEntry.note || '')
    } else {
      setType('expense')
      setDate(new Date().toISOString().slice(0, 10))
      setCategory('')
      setAmount('')
      setNote('')
    }
  }, [initialEntry, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category.trim() || !date || Number(amount) <= 0) return

    onSave({
      id: initialEntry?.id,
      type,
      date,
      category: category.trim(),
      amount: Number(amount),
      note: note.trim()
    })
    onOpenChange(false)
  }

  const categoryOptions = type === 'income' ? categories.income : categories.expense

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>{initialEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        <DialogDescription>
          Record income or an expense for the company.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Entry Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="income">Income (+)</option>
              <option value="expense">Expense (-)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Date
            </label>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Category / Source
          </label>
          <Input
            list="entry-category-list"
            required
            placeholder="e.g. Hotel Cash, Food, Salary..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="entry-category-list">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Amount (₹)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Note <span className="font-normal text-muted-foreground">(Optional)</span>
          </label>
          <Input
            maxLength={120}
            placeholder="Add a short note or invoice #"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            {initialEntry ? 'Save Changes' : 'Save Entry'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
