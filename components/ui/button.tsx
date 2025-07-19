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
      default: 'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-600/25 hover:shadow-xl hover:shadow-violet-600/30 hover:from-violet-600 hover:to-violet-700 border border-violet-600/20 hover:-translate-y-0.5',
      primary: 'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-600/25 hover:shadow-xl hover:shadow-violet-600/30 hover:from-violet-600 hover:to-violet-700 border border-violet-600/20 hover:-translate-y-0.5',
      secondary: 'bg-gradient-to-b from-white to-gray-50 text-gray-700 shadow-md border border-gray-200/80 hover:shadow-lg hover:from-gray-50 hover:to-gray-100 hover:border-gray-300/80 hover:-translate-y-0.5',
      ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/80 rounded-lg',
      outline: 'border border-gray-300/80 bg-white/90 text-gray-700 shadow-md hover:bg-gray-50/90 hover:border-gray-400/80 hover:shadow-lg backdrop-blur-sm hover:-translate-y-0.5',
      destructive: 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-600/30 hover:from-red-600 hover:to-red-700 border border-red-600/20 hover:-translate-y-0.5'
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
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 ease-out',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:ring-offset-2',
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
