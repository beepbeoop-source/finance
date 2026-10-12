export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  category: string
  amount: number
  date: string // YYYY-MM-DD
  note?: string
  created_at?: string
  updated_at?: string
}

export interface CategoryItem {
  id?: string
  type: TransactionType
  name: string
  created_at?: string
}

export interface CompanyDetails {
  name: string
  address: string
  phone: string
  email: string
  gstin: string
  logo?: string
}

export interface DateFilterConfig {
  mode: 'month' | 'range'
  month: string // YYYY-MM
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}
