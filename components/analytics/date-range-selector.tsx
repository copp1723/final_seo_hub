import { Select } from '@/components/ui/select'
import { Calendar } from 'lucide-react'

export interface DateRange {
  label: string
  value: string
  startDate: string
  endDate: string
}

interface DateRangeSelectorProps {
  value: string
  onChange: (value: string) => void
  ranges: DateRange[]
  className?: string
}

export function DateRangeSelector({ value, onChange, ranges, className = '' }: DateRangeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className="w-48"
      >
        {ranges.map(range => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </Select>
    </div>
  )
}