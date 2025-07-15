import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const variants = {
      default: 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-600/25 hover:shadow-md hover:shadow-blue-600/30 hover:from-blue-600 hover:to-blue-700 border border-blue-600/20',
      primary: 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-600/25 hover:shadow-md hover:shadow-blue-600/30 hover:from-blue-600 hover:to-blue-700 border border-blue-600/20',
      secondary: 'bg-gradient-to-b from-white to-gray-50 text-gray-700 shadow-sm border border-gray-200/80 hover:shadow-md hover:from-gray-50 hover:to-gray-100 hover:border-gray-300/80',
      ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50/80',
      outline: 'border border-gray-200/80 bg-white/80 text-gray-700 shadow-sm hover:bg-gray-50/80 hover:border-gray-300/80 hover:shadow-md backdrop-blur-sm',
      destructive: 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm shadow-red-600/25 hover:shadow-md hover:shadow-red-600/30 hover:from-red-600 hover:to-red-700 border border-red-600/20'
    }
    
    const sizes = {
      sm: 'px-3 py-2 text-sm h-8',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-6 py-3 text-sm h-12'
    }
    
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-in-out',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled}
        { ...props}
      />
    )
  }
)

Button.displayName = 'Button'
