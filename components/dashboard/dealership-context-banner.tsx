'use client'

import { useState, useEffect } from 'react'
import { Building2, Calendar, AlertTriangle, CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DealershipContextBannerProps {
  dealershipName: string
  dealershipId: string
  isLoading: boolean
  isSwitching: boolean
  lastDataUpdate?: Date
  hasStaleData?: boolean
  onRefresh?: () => void
  className?: string
}

export function DealershipContextBanner({
  dealershipName,
  dealershipId,
  isLoading,
  isSwitching,
  lastDataUpdate,
  hasStaleData = false,
  onRefresh,
  className
}: DealershipContextBannerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Handle transition state for smooth UX
  useEffect(() => {
    if (isSwitching) {
      setIsTransitioning(true)
    } else {
      // Delay clearing transition to allow for smooth animation
      const timer = setTimeout(() => setIsTransitioning(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isSwitching])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getStatusIcon = () => {
    if (isLoading || isSwitching || isTransitioning) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (hasStaleData) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    return <CheckCircle className="h-4 w-4 text-emerald-500" />
  }

  const getStatusText = () => {
    if (isSwitching) return 'Switching dealership...'
    if (isLoading) return 'Loading data...'
    if (hasStaleData) return 'Data needs refresh'
    return 'Data up to date'
  }

  const getBannerStyle = () => {
    if (isSwitching || isTransitioning) {
      return 'bg-blue-50/80 border-blue-200/80 animate-pulse'
    }
    if (hasStaleData) {
      return 'bg-yellow-50/80 border-yellow-200/80'
    }
    return 'bg-emerald-50/80 border-emerald-200/80'
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm transition-all duration-500",
      getBannerStyle(),
      className
    )}>
      {/* Left side - Dealership info */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
          isSwitching ? "border-blue-300 bg-blue-100" :
          hasStaleData ? "border-yellow-300 bg-yellow-100" :
          "border-emerald-300 bg-emerald-100"
        )}>
          <Building2 className={cn(
            "h-5 w-5",
            isSwitching ? "text-blue-600" :
            hasStaleData ? "text-yellow-600" :
            "text-emerald-600"
          )} />
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate max-w-[200px]">
              {dealershipName}
            </h3>
            <Badge variant="outline" className="text-xs">
              ID: {dealershipId.slice(-8)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {getStatusIcon()}
            <span className="text-sm text-slate-600">
              {getStatusText()}
            </span>
            {lastDataUpdate && !isLoading && (
              <>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {formatDate(lastDataUpdate)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {hasStaleData && onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isLoading || isSwitching}
            variant="outline"
            size="sm"
            className="hover-lift"
          >
            <Loader2 className={cn(
              "h-4 w-4 mr-2",
              isLoading && "animate-spin"
            )} />
            Refresh Data
          </Button>
        )}
        
        {(isSwitching || isTransitioning) && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-lg">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              Updating...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}