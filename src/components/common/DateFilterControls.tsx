import React from 'react'
import type { DateFilterConfig } from '@/types/finance'
import { Input } from '@/components/ui/input'

interface DateFilterControlsProps {
  filter: DateFilterConfig
  onChange: (filter: DateFilterConfig) => void
}

export const DateFilterControls: React.FC<DateFilterControlsProps> = ({ filter, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-card p-1 rounded-lg border shadow-xs text-sm">
      <select
        value={filter.mode}
        onChange={(e) => {
          const mode = e.target.value as 'month' | 'range'
          onChange({ ...filter, mode })
        }}
        className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        aria-label="Date filter mode"
      >
        <option value="month">Monthly</option>
        <option value="range">Custom range</option>
      </select>

      {filter.mode === 'month' ? (
        <Input
          type="month"
          value={filter.month}
          onChange={(e) => {
            const month = e.target.value
            if (!month) return
            const [y, m] = month.split('-').map(Number)
            const daysInMonth = new Date(y, m, 0).getDate()
            onChange({
              ...filter,
              month,
              startDate: `${month}-01`,
              endDate: `${month}-${String(daysInMonth).padStart(2, '0')}`
            })
          }}
          className="h-8 w-36 text-xs bg-background"
          aria-label="Filter month"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filter.startDate}
            onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
            className="h-8 w-32 text-xs bg-background"
            aria-label="Start date"
          />
          <span className="text-xs text-muted-foreground font-medium">to</span>
          <Input
            type="date"
            value={filter.endDate}
            onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
            className="h-8 w-32 text-xs bg-background"
            aria-label="End date"
          />
        </div>
      )}
    </div>
  )
}
