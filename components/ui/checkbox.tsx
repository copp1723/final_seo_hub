'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  id,
  ...props
}: CheckboxProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      id={id}
      className={cn(
        'h-4 w-4 rounded border border-gray-300 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'bg-blue-600 border-blue-600 text-white',
        disabled && 'bg-gray-100',
        className
      )}
      {...props}
    >
      {checked && (
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      )}
    </button>
  )
}