import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Transaction, TransactionType, CompanyDetails } from '@/types/finance'
import { DEFAULT_COMPANY_DETAILS } from '@/lib/defaultCompany'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export function useFinanceData() {
  const [records, setRecords] = useState<Transaction[]>([])
  const [customCats, setCustomCats] = useState<{ income: string[]; expense: string[] }>({
    income: [],
    expense: []
  })
  const [company, setCompany] = useState<CompanyDetails>(DEFAULT_COMPANY_DETAILS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'unconfigured'>('idle')

  // Derive distinct list of categories from custom list + existing transaction records
  const categories = useMemo(() => {
    const incSet = new Set<string>(customCats.income)
    const expSet = new Set<string>(customCats.expense)

    records.forEach(r => {
      if (r.type === 'income' && r.category) incSet.add(r.category)
      if (r.type === 'expense' && r.category) expSet.add(r.category)
    })

    return {
      income: Array.from(incSet).sort((a, b) => a.localeCompare(b)),
      expense: Array.from(expSet).sort((a, b) => a.localeCompare(b)),
      all: Array.from(new Set([...incSet, ...expSet])).sort((a, b) => a.localeCompare(b))
    }
  }, [records, customCats])

  // Fetch all live data directly from Supabase
  const fetchFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSyncStatus('unconfigured')
      setIsLoading(false)
      return
    }

    const supabase = getSupabase()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    setIsSyncing(true)
    setSyncStatus('syncing')
    try {
      // 1. Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })

      if (txError) throw txError
      setRecords(txData || [])

      // 2. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')

      if (!catError && catData) {
        const inc = catData.filter(c => c.type === 'income').map(c => c.name)
        const exp = catData.filter(c => c.type === 'expense').map(c => c.name)
        setCustomCats({
          income: Array.from(new Set(inc)).sort(),
          expense: Array.from(new Set(exp)).sort()
        })
      }

      // 3. Fetch company settings
      const { data: compData, error: compError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (!compError && compData) {
        setCompany({
          name: compData.name || DEFAULT_COMPANY_DETAILS.name,
          address: compData.address || '',
          phone: compData.phone || '',
          email: compData.email || '',
          gstin: compData.gstin || '',
          logo: compData.logo || DEFAULT_COMPANY_DETAILS.logo
        })
      }

      setSyncStatus('synced')
    } catch (err: any) {
      console.error('Supabase fetch error:', err)
      setSyncStatus('error')
    } finally {
      setIsSyncing(false)
      setIsLoading(false)
    }
  }, [])

  // Initial load directly from Supabase
  useEffect(() => {
    fetchFromSupabase()
  }, [fetchFromSupabase])

  // Realtime Supabase Subscription for multi-device sync
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    const channel = supabase
      .channel('finance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Transaction
            setRecords(prev => {
              if (prev.some(r => r.id === newRow.id)) return prev
              return [newRow, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as Transaction
            setRecords(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r))
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as { id: string }
            setRecords(prev => prev.filter(r => r.id !== deletedRow.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          // Re-fetch categories on change
          supabase.from('categories').select('*').then(({ data }) => {
            if (data) {
              setCustomCats({
                income: data.filter(c => c.type === 'income').map(c => c.name),
                expense: data.filter(c => c.type === 'expense').map(c => c.name)
              })
            }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_settings' },
        (payload) => {
          if (payload.new) {
            const comp = payload.new as any
            setCompany({
              name: comp.name || DEFAULT_COMPANY_DETAILS.name,
              address: comp.address || '',
              phone: comp.phone || '',
              email: comp.email || '',
              gstin: comp.gstin || '',
              logo: comp.logo || DEFAULT_COMPANY_DETAILS.logo
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Push local data or re-sync
  const pushToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase is not configured yet. Add your anon key in Settings.')
      return false
    }

    const supabase = getSupabase()
    if (!supabase) return false

    setIsSyncing(true)
    setSyncStatus('syncing')
    try {
      // 1. Upsert transactions in chunks of 100
      const chunkSize = 100
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize).map(r => ({
          id: r.id,
          type: r.type,
          category: r.category,
          amount: r.amount,
          date: r.date,
          note: r.note || ''
        }))
        const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' })
        if (error) throw error
      }

      // 2. Upsert categories
      const allIncome = categories.income.map(name => ({ type: 'income', name }))
      const allExpense = categories.expense.map(name => ({ type: 'expense', name }))
      const catList = [...allIncome, ...allExpense]
      if (catList.length > 0) {
        await supabase.from('categories').upsert(catList, { onConflict: 'type,name' })
      }

      // 3. Upsert company
      await supabase.from('company_settings').upsert({
        id: 'default',
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        gstin: company.gstin,
        logo: company.logo
      })

      setSyncStatus('synced')
      toast.success('Successfully synced with Supabase Cloud!')
      return true
    } catch (err: any) {
      console.error('Supabase push error:', err)
      setSyncStatus('error')
      toast.error('Sync failed: ' + (err.message || 'Unknown error'))
      return false
    } finally {
      setIsSyncing(false)
    }
  }, [records, categories, company])

  // Add or Update single transaction directly in Supabase
  const addOrUpdateTransaction = useCallback(async (tx: Omit<Transaction, 'id'> & { id?: string }) => {
    const id = tx.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const record: Transaction = {
      ...tx,
      id,
      amount: Number(tx.amount) || 0
    }

    // Optimistic local update
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = record
        return next
      }
      return [record, ...prev]
    })

    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase.from('transactions').upsert([record])
      if (error) {
        console.error('Cloud save failed:', error)
        toast.error('Failed to save to cloud: ' + error.message)
        return null
      }
    }

    toast.success(tx.id ? 'Entry updated' : 'Entry saved')
    return record
  }, [])

  // Delete transaction directly in Supabase
  const deleteTransaction = useCallback(async (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) {
        console.error('Cloud delete failed:', error)
        toast.error('Failed to delete from cloud: ' + error.message)
        return
      }
    }
    toast.success('Entry deleted')
  }, [])

  // Save batch daily transactions directly in Supabase
  const saveDailyTransactions = useCallback(async (date: string, entries: { type: TransactionType; category: string; amount: number }[]) => {
    const newRecords: Transaction[] = entries.map((e, idx) => ({
      id: `daily-${date}-${idx}-${Date.now()}`,
      type: e.type,
      category: e.category,
      amount: e.amount,
      date,
      note: 'Daily entry'
    }))

    // Optimistic update
    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== date)
      return [...newRecords, ...filtered]
    })

    const supabase = getSupabase()
    if (supabase) {
      // Delete existing records for that date then insert new
      await supabase.from('transactions').delete().eq('date', date)
      if (newRecords.length > 0) {
        const { error } = await supabase.from('transactions').insert(newRecords)
        if (error) {
          toast.error('Failed to save daily entries to cloud: ' + error.message)
          return
        }
      }
    }

    toast.success(`Daily entries saved for ${date}`)
  }, [])

  // Add category directly in Supabase
  const addCategory = useCallback(async (type: TransactionType, name: string) => {
    const clean = name.trim()
    if (!clean) return false
    const existing = categories[type]
    if (existing.some(c => c.toLowerCase() === clean.toLowerCase())) {
      toast.error('Category already exists')
      return false
    }

    setCustomCats(prev => ({
      ...prev,
      [type]: [...prev[type], clean]
    }))

    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase.from('categories').insert([{ type, name: clean }])
      if (error) {
        console.error('Category cloud save failed:', error)
      }
    }

    toast.success('Category added')
    return true
  }, [categories])

  // Rename category directly in Supabase
  const renameCategory = useCallback(async (type: TransactionType, oldName: string, newName: string) => {
    const clean = newName.trim()
    if (!clean) {
      toast.error('Category name cannot be empty')
      return false
    }
    if (clean.toLowerCase() === oldName.toLowerCase()) return true
    if (categories[type].some(c => c.toLowerCase() === clean.toLowerCase())) {
      toast.error('That category name already exists')
      return false
    }

    // Rename in transactions
    setRecords(prev => prev.map(r => (r.type === type && r.category === oldName ? { ...r, category: clean } : r)))

    // Rename in customCats
    setCustomCats(prev => ({
      ...prev,
      [type]: prev[type].map(c => (c === oldName ? clean : c))
    }))

    const supabase = getSupabase()
    if (supabase) {
      await supabase.from('transactions').update({ category: clean }).match({ type, category: oldName })
      await supabase.from('categories').update({ name: clean }).match({ type, name: oldName })
    }

    toast.success('Category renamed; matching entries updated')
    return true
  }, [categories])

  // Update company profile directly in Supabase
  const updateCompanyDetails = useCallback(async (details: Partial<CompanyDetails>) => {
    const updated = { ...company, ...details }
    setCompany(updated)
    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase.from('company_settings').upsert({ id: 'default', ...updated })
      if (error) {
        toast.error('Failed to update company details: ' + error.message)
        return
      }
    }
    toast.success('Company details saved to cloud')
  }, [company])

  return {
    records,
    categories,
    company,
    isLoading,
    isSyncing,
    syncStatus,
    fetchFromSupabase,
    pushToSupabase,
    addOrUpdateTransaction,
    deleteTransaction,
    saveDailyTransactions,
    addCategory,
    renameCategory,
    updateCompanyDetails,
  }
}
