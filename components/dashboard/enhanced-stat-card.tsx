'use client'

import { TrendingUp, AlertCircle, Loader2, WifiOff, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number | null
  subtitle: string
  icon: any
  trend?: { value: number; positive: boolean }
  color?: "blue" | "green" | "purple" | "orange" | "red"
  loading?: boolean
  error?: string | null
  stale?: boolean // Indicates data is from previous dealership
  lastUpdated?: Date
  connectionRequired?: boolean
  connected?: boolean
}

export function EnhancedStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  loading = false,
  error = null,
  stale = false,
  lastUpdated,
  connectionRequired = false,
  connected = true
}: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100',
    green: 'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100',
    purple: 'text-violet-600 bg-gradient-to-br from-violet-50 to-violet-100',
    orange: 'text-orange-600 bg-gradient-to-br from-orange-50 to-orange-100',
    red: 'text-red-600 bg-gradient-to-br from-red-50 to-red-100'
  }

  const getDisplayValue = () => {
    if (error) return 'Error'
    if (!connected && connectionRequired) return 'N/A'
    if (loading) return null
    if (value === null || value === undefined) return '—'
    return typeof value === 'number' ? value.toLocaleString() : value
  }

  const getValueColor = () => {
    if (error) return 'text-red-600'
    if (!connected && connectionRequired) return 'text-slate-400'
    if (stale) return 'text-yellow-600'
    return 'text-slate-900'
  }

  const getSubtitle = () => {
    if (error) return error
    if (!connected && connectionRequired) return 'Connection required'
    if (stale) return 'Previous dealership data'
    return subtitle
  }

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  return (
    <Card className={cn(
      "hover-lift transition-all duration-300",
      stale && "ring-2 ring-yellow-200 bg-yellow-50/30",
      error && "ring-2 ring-red-200 bg-red-50/30"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Title with status indicators */}
            <div className="flex items-center gap-2 mb-2">
              <p className="text-caption text-slate-500">{title}</p>
              {stale && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600">Stale</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600">Error</span>
                </div>
              )}
              {!connected && connectionRequired && (
                <div className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500">Disconnected</span>
                </div>
              )}
            </div>

            {/* Value */}
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <p className={cn("text-3xl font-bold mt-2", getValueColor())}>
                  {getDisplayValue()}
                </p>
                <p className="text-body-sm mt-1 text-slate-600">
                  {getSubtitle()}
                </p>
              </>
            )}

            {/* Trend indicator */}
            {trend && !loading && !error && (
              <div className={cn(
                "flex items-center text-xs font-medium mt-2 px-2 py-1 rounded-full",
                trend.positive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
              )}>
                <TrendingUp className={cn(
                  "h-3 w-3 mr-1",
                  trend.positive ? '' : 'rotate-180'
                )} />
                {Math.abs(trend.value)}%
              </div>
            )}

            {/* Last updated */}
            {lastUpdated && !loading && (
              <div className="flex items-center gap-1 mt-2">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400">
                  {formatLastUpdated(lastUpdated)}
                </span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div className={cn(
            "p-4 rounded-2xl ml-4 shadow-sm transition-all duration-300",
            loading ? "animate-pulse bg-slate-100" : colorClasses[color],
            stale && "opacity-60",
            error && "opacity-50"
          )}>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <Icon className="h-6 w-6" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}