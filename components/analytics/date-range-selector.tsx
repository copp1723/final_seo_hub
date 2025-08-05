'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, CalendarDays, Clock, ChevronDown, Sparkles } from 'lucide-react'
import { format, subDays, subWeeks, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import { cn } from '@/lib/utils'

export interface DateRange {
  label: string
  value: string
  startDate: string
  endDate: string
  description?: string
  icon?: React.ReactNode
}

interface DateRangeSelectorProps {
  value: string
  onChange: (value: string) => void
  ranges?: DateRange[]
  className?: string
  showCustomRange?: boolean
  onCustomRangeChange?: (startDate: string, endDate: string) => void
}

// Enhanced preset ranges with more options
const DEFAULT_RANGES: DateRange[] = [
  {
    label: 'Last 7 days',
    value: '7days',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Recent week performance',
    icon: <Clock className="h-3 w-3" />
  },
  {
    label: 'Last 14 days',
    value: '14days',
    startDate: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Two weeks of data',
    icon: <Clock className="h-3 w-3" />
  },
  {
    label: 'Last 30 days',
    value: '30days',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Monthly overview',
    icon: <CalendarDays className="h-3 w-3" />
  },
  {
    label: 'Last 60 days',
    value: '60days',
    startDate: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Two month trend',
    icon: <CalendarDays className="h-3 w-3" />
  },
  {
    label: 'Last 90 days',
    value: '90days',
    startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Quarterly analysis',
    icon: <CalendarDays className="h-3 w-3" />
  },
  {
    label: 'This week',
    value: 'thisweek',
    startDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Current week so far',
    icon: <Calendar className="h-3 w-3" />
  },
  {
    label: 'This month',
    value: 'thismonth',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Current month progress',
    icon: <Calendar className="h-3 w-3" />
  },
  {
    label: 'Last 6 months',
    value: '6months',
    startDate: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Half-year overview',
    icon: <Sparkles className="h-3 w-3" />
  },
  {
    label: 'Last year',
    value: '1year',
    startDate: format(subYears(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: 'Annual comparison',
    icon: <Sparkles className="h-3 w-3" />
  }
]

export function DateRangeSelector({
  value,
  onChange,
  ranges = DEFAULT_RANGES,
  className = '',
  showCustomRange = true,
  onCustomRangeChange
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const selectedRange = ranges.find(range => range.value === value)

  const handleCustomApply = () => {
    if (customStart && customEnd && onCustomRangeChange) {
      onCustomRangeChange(customStart, customEnd)
      setShowCustom(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Date Range</span>
        </div>

        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-64 bg-white/90 backdrop-blur-sm border-slate-200/80 hover:border-slate-300/80 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all duration-200">
            <SelectValue placeholder="Select date range">
              <div className="flex items-center gap-2">
                {selectedRange?.icon}
                <span>{selectedRange?.label || 'Select range'}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-80 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xl">
            {ranges.map(range => (
              <SelectItem
                key={range.value}
                value={range.value}
                className="hover:bg-slate-50/80 focus:bg-violet-50/80 cursor-pointer transition-colors duration-150"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {range.icon}
                    <span className="font-medium">{range.label}</span>
                  </div>
                  {range.description && (
                    <span className="text-xs text-slate-500 ml-2">{range.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
            {showCustomRange && (
              <SelectItem
                value="custom"
                onSelect={() => setShowCustom(true)}
                className="hover:bg-slate-50/80 focus:bg-violet-50/80 cursor-pointer transition-colors duration-150"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3 w-3" />
                  <span className="font-medium">Custom Range</span>
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {selectedRange && (
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-500 bg-slate-50/80 px-2 py-1 rounded-md">
            <span>{format(new Date(selectedRange.startDate), 'MMM d')}</span>
            <span>-</span>
            <span>{format(new Date(selectedRange.endDate), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>

      {/* Custom Date Range Modal */}
      {showCustom && (
        <Card className="absolute top-full left-0 mt-2 z-50 w-80 shadow-xl border-slate-200/80">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarDays className="h-4 w-4" />
              Custom Date Range
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="flex-1"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCustom(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
