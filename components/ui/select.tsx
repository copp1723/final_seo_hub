import * as React from 'react'
import { cn } from '@/lib/utils'

// Simple Select implementation using native HTML select
const Select = ({ children, ...props }: React.PropsWithChildren<any>) => {
  return <>{children}</>
}

const SelectTrigger = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  // This is handled by the native select element
  return null
}

const SelectContent = ({ children }: React.PropsWithChildren) => {
  // For native select, options are rendered directly
  return <>{children}</>
}

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, children, ...props }, ref) => {
  return (
    <option ref={ref} className={cn(className)} {...props}>
      {children}
    </option>
  )
})
SelectItem.displayName = 'SelectItem'

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}