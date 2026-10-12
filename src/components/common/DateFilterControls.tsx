import React from 'react'
import type { DateFilterConfig } from '@/types/finance'
import { Input } from '@/components/ui/input'

interface DateFilterControlsProps {
  filter: DateFilterConfig
  onChange: (filter: DateFilterConfig) => void
}

export const DateFilterControls: React.FC<DateFilterControlsProps> = ({ filter, onChange }) => {
  return (
    <div className="flex items-center gap-1.5 bg-card/95 p-1 rounded-lg border shadow-xs text-xs">
      <select
        value={filter.mode}
        onChange={(e) => {
          const mode = e.target.value as 'month' | 'range'
          onChange({ ...filter, mode })
        }}
        className="h-7 sm:h-8 rounded-md border border-input bg-background px-2 text-[11px] sm:text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        aria-label="Date filter mode"
      >
        <option value="month">Monthly</option>
        <option value="range">Range</option>
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
          className="h-7 sm:h-8 w-28 sm:w-36 text-[11px] sm:text-xs bg-background px-1.5 sm:px-3 font-medium"
          aria-label="Filter month"
        />
      ) : (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={filter.startDate}
            onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
            className="h-7 sm:h-8 w-24 sm:w-32 text-[10px] sm:text-xs bg-background px-1.5"
            aria-label="Start date"
          />
          <span className="text-[10px] text-muted-foreground font-medium">to</span>
          <Input
            type="date"
            value={filter.endDate}
            onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
            className="h-7 sm:h-8 w-24 sm:w-32 text-[10px] sm:text-xs bg-background px-1.5"
            aria-label="End date"
          />
        </div>
      )}
    </div>
  )
}
