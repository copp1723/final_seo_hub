'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity,
  FileText, 
  CheckCircle, 
  PenTool, 
  MapPin, 
  TrendingUp,
  Package,
  Award,
  RefreshCw,
  Bell,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  icon: string
  color: string
  metadata?: any
}

interface ActivityFeedProps {
  dealershipId?: string | null
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number // in seconds
}

const iconMap: Record<string, any> = {
  'FileText': FileText,
  'CheckCircle': CheckCircle,
  'PenTool': PenTool,
  'MapPin': MapPin,
  'TrendingUp': TrendingUp,
  'Package': Package,
  'Award': Award,
  'Activity': Activity,
  'Bell': Bell,
  'Clock': Clock,
  'AlertCircle': AlertCircle
}

const colorClasses: Record<string, string> = {
  'blue': 'text-blue-500 bg-blue-50 border-blue-200',
  'green': 'text-green-500 bg-green-50 border-green-200',
  'purple': 'text-brand-dark bg-brand-light/30 border-brand-medium/30',
  'indigo': 'text-brand-dark bg-brand-light/30 border-brand-medium/30',
  'orange': 'text-orange-500 bg-orange-50 border-orange-200',
  'emerald': 'text-emerald-500 bg-emerald-50 border-emerald-200',
  'amber': 'text-amber-500 bg-amber-50 border-amber-200',
  'yellow': 'text-yellow-500 bg-yellow-50 border-yellow-200',
  'gray': 'text-gray-500 bg-gray-50 border-gray-200'
}

export function ActivityFeed({ 
  dealershipId, 
  limit = 10, 
  autoRefresh = true,
  refreshInterval = 30 
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const [newActivitiesCount, setNewActivitiesCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch activities from the API
  const fetchActivities = useCallback(async (since?: string) => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      })
      
      if (dealershipId) {
        params.append('dealershipId', dealershipId)
      }
      
      if (since) {
        params.append('since', since)
      }

      const response = await fetch(`/api/dashboard/activity-feed?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }

      const data = await response.json()
      
      if (data.success) {
        return data
      } else {
        throw new Error(data.error || 'Failed to fetch activities')
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
      throw err
    }
  }, [dealershipId, limit])

  // Clear activities when dealership changes
  useEffect(() => {
    setActivities([])
    setNewActivitiesCount(0)
    setLastTimestamp(null)
    setError(null)
  }, [dealershipId])

  // Initial load
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const data = await fetchActivities()
        setActivities(data.activities || [])
        setLastTimestamp(data.latestTimestamp)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities')
      } finally {
        setLoading(false)
      }
    }

    if (dealershipId) {
      loadActivities()
    } else {
      setLoading(false)
    }
  }, [fetchActivities, dealershipId])

  // Auto-refresh for new activities
  useEffect(() => {
    if (!autoRefresh || !lastTimestamp) return

    const interval = setInterval(async () => {
      try {
        const data = await fetchActivities(lastTimestamp)
        
        if (data.activities && data.activities.length > 0) {
          // New activities found
          setNewActivitiesCount(prev => prev + data.activities.length)
          
          // Don't auto-update the feed, just show notification
          // User can click to load new activities
        }
      } catch (err) {
        console.error('Error checking for new activities:', err)
      }
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, lastTimestamp, refreshInterval, fetchActivities])

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    setNewActivitiesCount(0)
    
    try {
      const data = await fetchActivities()
      setActivities(data.activities || [])
      setLastTimestamp(data.latestTimestamp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh activities')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get the appropriate icon component
  const getIcon = (iconName: string, color: string) => {
    const IconComponent = iconMap[iconName] || Activity
    const colorClass = colorClasses[color]?.split(' ')[0] || 'text-gray-500'
    return <IconComponent className={`h-5 w-5 ${colorClass}`} />
  }

  // Format the activity item for display
  const formatActivity = (activity: ActivityItem) => {
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
    const bgColorClass = colorClasses[activity.color]?.split(' ')[1] || 'bg-gray-50'
    const borderColorClass = colorClasses[activity.color]?.split(' ')[2] || 'border-gray-200'
    
    return (
      <div 
        key={activity.id} 
        className={`flex items-start space-x-3 p-3 rounded-lg ${bgColorClass} border ${borderColorClass} transition-all hover:shadow-sm`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(activity.icon, activity.color)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {activity.title}
              </p>
              {activity.description && (
                <p className="text-sm text-gray-600 mt-0.5 truncate">
                  {activity.description}
                </p>
              )}
              {activity.metadata?.priority && (
                <Badge 
                  variant="outline" 
                  className="mt-1 text-xs"
                >
                  {activity.metadata.priority}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
              {timeAgo}
            </span>
          </div>
          {activity.metadata?.contentUrl && (
            <a 
              href={activity.metadata.contentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
            >
              View content →
            </a>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="border border-slate-200/60 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading activities...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-slate-200/60 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200/60 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Live Activity Feed
            {autoRefresh && (
              <Badge variant="outline" className="ml-2 text-xs">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {newActivitiesCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="text-xs"
              >
                <Bell className="h-3 w-3 mr-1" />
                {newActivitiesCount} new
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Activities will appear here as they happen</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {activities.map(formatActivity)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityFeed