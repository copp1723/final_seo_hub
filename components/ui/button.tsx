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
      default: 'bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:from-violet-600 hover:via-violet-700 hover:to-violet-800 border border-violet-500/20 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]',
      primary: 'bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:from-violet-600 hover:via-violet-700 hover:to-violet-800 border border-violet-500/20 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]',
      secondary: 'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-700 shadow-md border border-slate-200/80 hover:shadow-lg hover:from-slate-100 hover:via-slate-50 hover:to-slate-200 hover:border-slate-300/80 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm',
      ghost: 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95',
      outline: 'border border-slate-300/80 bg-white/90 text-slate-700 shadow-md hover:bg-slate-50/90 hover:border-slate-400/80 hover:shadow-lg backdrop-blur-sm hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]',
      destructive: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:via-red-700 hover:to-red-800 border border-red-500/20 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]'
    }
    
    const sizes = {
      sm: 'px-4 py-2 text-sm h-9',
      md: 'px-5 py-2.5 text-sm h-11',
      lg: 'px-6 py-3 text-base h-12'
    }
    
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 ease-out relative overflow-hidden',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100 disabled:hover:translate-y-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2',
          'before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300',
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
