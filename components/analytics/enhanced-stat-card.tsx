'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedStatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: any
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'emerald' | 'rose'
  loading?: boolean
  trend?: {
    value: number
    isPositive: boolean
    period?: string
  }
  error?: string | null
  className?: string
}

export function EnhancedStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  loading = false,
  trend,
  error,
  className
}: EnhancedStatCardProps) {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500/10 via-blue-600/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconText: 'text-white',
      accent: 'text-blue-600',
      border: 'border-blue-200/50',
      glow: 'shadow-blue-500/10'
    },
    green: {
      gradient: 'from-emerald-500/10 via-emerald-600/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconText: 'text-white',
      accent: 'text-emerald-600',
      border: 'border-emerald-200/50',
      glow: 'shadow-emerald-500/10'
    },
    orange: {
      gradient: 'from-orange-500/10 via-orange-600/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      iconText: 'text-white',
      accent: 'text-orange-600',
      border: 'border-orange-200/50',
      glow: 'shadow-orange-500/10'
    },
    purple: {
      gradient: 'from-violet-500/10 via-violet-600/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
      iconText: 'text-white',
      accent: 'text-violet-600',
      border: 'border-violet-200/50',
      glow: 'shadow-violet-500/10'
    },
    emerald: {
      gradient: 'from-emerald-500/10 via-emerald-600/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconText: 'text-white',
      accent: 'text-emerald-600',
      border: 'border-emerald-200/50',
      glow: 'shadow-emerald-500/10'
    },
    rose: {
      gradient: 'from-rose-500/10 via-rose-600/5 to-transparent',
      iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
      iconText: 'text-white',
      accent: 'text-rose-600',
      border: 'border-rose-200/50',
      glow: 'shadow-rose-500/10'
    }
  }

  const colors = colorClasses[color]

  if (error) {
    return (
      <Card className={cn(
        "relative overflow-hidden border-red-200/50 bg-gradient-to-br from-red-50/50 to-white",
        "hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300",
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">{title}</h3>
            <div className="p-2 rounded-xl bg-red-100">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">Error</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "relative overflow-hidden group transition-all duration-300 hover:shadow-xl",
      colors.border,
      colors.glow,
      "bg-gradient-to-br from-white via-white to-slate-50/30",
      "hover:-translate-y-1 hover:scale-[1.02]",
      className
    )}>
      {/* Background gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-80 transition-opacity duration-300",
        colors.gradient
      )} />
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>

      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
            {title}
          </h3>
          <div className={cn(
            "p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl",
            colors.iconBg
          )}>
            {loading ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Icon className={cn("h-4 w-4", colors.iconText)} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <p className={cn(
              "text-2xl font-bold transition-colors duration-300",
              loading ? "text-slate-400" : colors.accent
            )}>
              {loading ? '...' : (typeof value === 'number' ? value.toLocaleString() : value)}
            </p>
            
            {trend && !loading && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300",
                trend.isPositive 
                  ? "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200" 
                  : "bg-red-100 text-red-700 group-hover:bg-red-200"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors">
              {subtitle}
            </p>
            {trend?.period && !loading && (
              <p className="text-xs text-slate-400">
                vs {trend.period}
              </p>
            )}
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
