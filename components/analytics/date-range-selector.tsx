import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from 'lucide-react'

export interface DateRangeOption {
  value: string
  label: string
  getDates: () => { startDate: Date; endDate: Date }
}

interface DateRangeSelectorProps {
  value: string
  onChange: (value: string) => void
  ranges: DateRangeOption[]
  className?: string
}

export function DateRangeSelector({ value, onChange, ranges, className = '' }: DateRangeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          {ranges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}