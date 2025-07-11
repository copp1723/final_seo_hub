import { useState } from 'react'
import { useToast } from './use-toast'

interface AnalyticsData {
  overview: {
    dates: string[]
    metrics: {
      sessions?: number[]
      totalUsers?: number[]
      eventCount?: number[]
    }
  }
  topPages: Array<{
    page: string
    sessions: number
    eventCount: number
  }>
  trafficSources: Array<{
    source: string
    sessions: number
  }>
  metadata: {
    propertyId: string
    propertyName: string
    dateRange: {
      startDate: string
      endDate: string
    }
  }
}

interface UseAnalyticsOptions {
  startDate: string
  endDate: string
  metrics?: string[]
  dimensions?: string[]
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAnalytics = async (options: UseAnalyticsOptions) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ga4/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setData(result.data)
      
      if (result.cached) {
        toast('Data loaded from cache', 'info', {
          description: 'Showing cached data from the last 5 minutes'
        })
      }

      return result.data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data'
      setError(errorMessage)
      toast('Error loading analytics', 'error', {
        description: errorMessage
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refresh = async (options: UseAnalyticsOptions) => {
    toast('Refreshing data...', 'info', {
      description: 'Fetching latest analytics from Google Analytics'
    })
    return fetchAnalytics(options)
  }

  return {
    data,
    loading,
    error,
    fetchAnalytics,
    refresh
  }
}