'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataSyncIndicatorProps {
  isLoading: boolean
  hasGA4Data: boolean
  hasSearchConsoleData: boolean
  hasGA4Connection: boolean
  hasSearchConsoleConnection: boolean
  dealershipName?: string
  onRefresh?: () => void
  className?: string
}

interface DataSource {
  name: string
  connected: boolean
  hasData: boolean
  icon: typeof CheckCircle
  color: string
}

export function DataSyncIndicator({
  isLoading,
  hasGA4Data,
  hasSearchConsoleData,
  hasGA4Connection,
  hasSearchConsoleConnection,
  dealershipName,
  onRefresh,
  className
}: DataSyncIndicatorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const dataSources: DataSource[] = [
    {
      name: 'GA4',
      connected: hasGA4Connection,
      hasData: hasGA4Data,
      icon: hasGA4Connection ? CheckCircle : WifiOff,
      color: hasGA4Connection && hasGA4Data ? 'text-emerald-500' : hasGA4Connection ? 'text-yellow-500' : 'text-red-500'
    },
    {
      name: 'Search Console',
      connected: hasSearchConsoleConnection,
      hasData: hasSearchConsoleData,
      icon: hasSearchConsoleConnection ? CheckCircle : WifiOff,
      color: hasSearchConsoleConnection && hasSearchConsoleData ? 'text-emerald-500' : hasSearchConsoleConnection ? 'text-yellow-500' : 'text-red-500'
    }
  ]

  const allDataLoaded = hasGA4Data && hasSearchConsoleData
  const partialData = (hasGA4Data && !hasSearchConsoleData) || (!hasGA4Data && hasSearchConsoleData)
  const noData = !hasGA4Data && !hasSearchConsoleData

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing && !isLoading) {
      setIsRefreshing(true)
      await onRefresh()
      setTimeout(() => setIsRefreshing(false), 1000) // Minimum refresh animation time
    }
  }

  const getStatusMessage = () => {
    if (isLoading) return 'Loading data...'
    if (allDataLoaded) return 'All data synchronized'
    if (partialData) return 'Partial data available'
    if (noData) return 'No data available'
    return 'Ready'
  }

  const getStatusColor = () => {
    if (isLoading) return 'text-blue-600'
    if (allDataLoaded) return 'text-emerald-600'
    if (partialData) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
      isLoading ? "bg-blue-50/60 border-blue-200/60" :
      allDataLoaded ? "bg-emerald-50/60 border-emerald-200/60" :
      partialData ? "bg-yellow-50/60 border-yellow-200/60" :
      "bg-red-50/60 border-red-200/60",
      className
    )}>
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {isLoading || isRefreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : allDataLoaded ? (
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        ) : partialData ? (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Status Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", getStatusColor())}>
            {getStatusMessage()}
          </span>
          {dealershipName && (
            <span className="text-xs text-slate-500 truncate">
              • {dealershipName}
            </span>
          )}
        </div>
        
        {/* Data Sources */}
        <div className="flex items-center gap-3 mt-1">
          {dataSources.map((source) => {
            const Icon = source.icon
            return (
              <div key={source.name} className="flex items-center gap-1">
                <Icon className={cn("h-3 w-3", source.color)} />
                <span className="text-xs text-slate-600">{source.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className={cn(
            "flex-shrink-0 p-1.5 rounded-lg transition-all duration-200",
            "hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            (isLoading || isRefreshing) && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn(
            "h-3.5 w-3.5 text-slate-600",
            (isLoading || isRefreshing) && "animate-spin"
          )} />
        </button>
      )}
    </div>
  )
}