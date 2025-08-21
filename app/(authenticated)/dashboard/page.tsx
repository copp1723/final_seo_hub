'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useDealership } from '@/app/context/DealershipContext'
import { redirect } from 'next/navigation'

// Force dynamic rendering - don't pre-render this page
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  RefreshCw,
  Loader2,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

import ErrorBoundary from '@/components/error-boundary'
import { DealershipSelector } from '@/components/layout/dealership-selector'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

// Type definitions
interface DashboardData {
  packageProgress?: {
    packageType: string
    pages: { used: number; limit: number; percentage: number }
    blogs: { used: number; limit: number; percentage: number }
    gbpPosts: { used: number; limit: number; percentage: number }
    improvements: { used: number; limit: number; percentage: number }
    totalTasks: { completed: number; total: number }
  }
}

interface AnalyticsData {
  ga4Data?: {
    sessions: number
    users: number
    pageviews: number
  }
  searchConsoleData?: {
    clicks: number
    impressions: number
    ctr: number
    topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  }
  metadata?: {
    hasGA4Connection: boolean
    hasSearchConsoleConnection: boolean
    connectionStatus?: {
      ga4: {
        connected: boolean
        hasData: boolean
        propertyName: string | null
      }
      searchConsole: {
        connected: boolean
        hasData: boolean
        siteName: string | null
      }
    }
  }
}

// Enhanced StatCard component with gradient styling
const StatCard = ({ title, value, subtitle, loading = false, gradient = 'blue' }: {
  title: string
  value: string | number
  subtitle: string
  loading?: boolean
  gradient?: 'blue' | 'emerald' | 'brand' | 'orange' | 'indigo'
}) => {
  const gradientClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-100',
    emerald: 'bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-100',
    brand: 'bg-gradient-to-br from-brand-light/30 to-brand-light/50 border-brand-medium/30',
    orange: 'bg-gradient-to-br from-orange-50 to-amber-50/50 border-orange-100',
    indigo: 'bg-gradient-to-br from-indigo-50 to-blue-50/50 border-indigo-100'
  }

  const textClasses = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    brand: 'text-brand-dark',
    orange: 'text-orange-700',
    indigo: 'text-indigo-700'
  }

  return (
    <div className={`p-4 rounded-lg border ${gradientClasses[gradient]}`}>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ) : (
        <>
          <div className={`text-2xl font-medium mb-1 ${textClasses[gradient]}`}>
            {value}
          </div>
          <div className="text-sm text-slate-700">{title}</div>
          <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
        </>
      )}
    </div>
  )
}

// Simple ProgressBar component
const ProgressBar = ({ label, used, limit }: {
  label: string
  used: number
  limit: number
}) => {
  const percentage = Math.min((used / limit) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-600">{used} / {limit}</span>
          <Badge variant="outline" className="text-xs px-1 py-0">
            {Math.round(percentage)}%
          </Badge>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all bg-gradient-brand"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { currentDealership, isSwitching } = useDealership()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [rankingsData, setRankingsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [previousDealershipId, setPreviousDealershipId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30days')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // Clear data when dealership changes
  useEffect(() => {
    const currentId = currentDealership?.id || null
    if (previousDealershipId !== null && previousDealershipId !== currentId) {
      console.log('Dealership changed, clearing data:', { from: previousDealershipId, to: currentId })
      setAnalyticsData(null)
      setRankingsData(null)
      setDashboardData(null)
    }
    setPreviousDealershipId(currentId)
  }, [currentDealership?.id, previousDealershipId])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user || isSwitching) return

    const dealershipId = currentDealership?.id
    if (!dealershipId) {
      console.log('No dealership selected, skipping dashboard data fetch')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('dealershipId', dealershipId)

      const response = await fetch(`/api/dashboard?${params}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, currentDealership?.id, isSwitching])

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user || isSwitching) return

    const dealershipId = currentDealership?.id
    if (!dealershipId) {
      console.log('No dealership selected, skipping analytics data fetch')
      setAnalyticsLoading(false)
      return
    }

    try {
      setAnalyticsLoading(true)

      const params = new URLSearchParams({
        dateRange,
        dealershipId
      })

      const response = await fetch(`/api/dashboard/analytics?${params}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Analytics data received:', result.data) // Debug log
        setAnalyticsData(result.data)
      } else {
        console.error('Analytics API error:', response.status, response.statusText)
        setAnalyticsData(null)
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setAnalyticsData(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [user, currentDealership?.id, dateRange, isSwitching])

  // Fetch rankings data
  const fetchRankingsData = useCallback(async () => {
    if (!user || isSwitching) return

    const dealershipId = currentDealership?.id
    if (!dealershipId) {
      console.log('No dealership selected, skipping rankings data fetch')
      setRankingsLoading(false)
      return
    }

    try {
      setRankingsLoading(true)

      const params = new URLSearchParams()
      params.append('dealershipId', dealershipId)

      const response = await fetch(`/api/dashboard/rankings?${params}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Rankings data received:', data) // Debug log
        setRankingsData(data)
      } else {
        console.error('Rankings API error:', response.status, response.statusText)
        setRankingsData(null)
      }
    } catch (error) {
      console.error('Error fetching rankings data:', error)
      setRankingsData(null)
    } finally {
      setRankingsLoading(false)
    }
  }, [user, currentDealership?.id, isSwitching])

  // Load data on component mount and when dependencies change
  useEffect(() => {
    if (user) {
      fetchDashboardData()
      fetchAnalyticsData()
      fetchRankingsData()
      setLastDataUpdate(new Date())
    }
  }, [user, currentDealership?.id, fetchDashboardData, fetchAnalyticsData, fetchRankingsData])

  // Auto-refresh logic for traffic metrics (conservative 5-minute interval)
  useEffect(() => {
    if (!autoRefreshEnabled || !user) return

    const refreshInterval = setInterval(async () => {
      console.log('Auto-refreshing traffic metrics...')
      try {
        // Only refresh analytics and rankings data, not dashboard data
        await fetchAnalyticsData()
        await fetchRankingsData()
        setLastDataUpdate(new Date())
      } catch (error) {
        console.error('Auto-refresh error:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(refreshInterval)
  }, [autoRefreshEnabled, user, fetchAnalyticsData, fetchRankingsData])

  // Enhanced manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true)
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchAnalyticsData(),
        fetchRankingsData()
      ])
      setLastDataUpdate(new Date())
    } catch (error) {
      console.error('Manual refresh error:', error)
    } finally {
      setIsManualRefreshing(false)
    }
  }, [fetchDashboardData, fetchAnalyticsData, fetchRankingsData])

  // Redirect if not authenticated
  if (!isLoading && !user) {
    redirect('/login')
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show dealership switching state
  if (isSwitching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Switching dealership...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we load the new dealership data</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-white to-blue-50/30 rounded-lg border border-slate-200 p-8 mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-100/50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-700" />
                  </div>
                  <h1 className="text-2xl font-semibold text-slate-900">GSEO HUB</h1>
                </div>
                <p className="text-slate-600 text-base">
                  Welcome back! Here's what's happening with your SEO.
                </p>
                {analyticsData && (
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${analyticsData.ga4Data ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-slate-500">GA4 {analyticsData.ga4Data ? 'Connected' : 'Not Connected'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${analyticsData.searchConsoleData ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-slate-500">Search Console {analyticsData.searchConsoleData ? 'Connected' : 'Not Connected'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 lg:mt-0 flex items-center gap-3">
                <DealershipSelector />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40 bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="thisMonth">This month</SelectItem>
                    <SelectItem value="thisYear">This year</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Auto-refresh toggle */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefreshEnabled}
                    onCheckedChange={setAutoRefreshEnabled}
                  />
                  <Label htmlFor="auto-refresh" className="text-xs text-slate-600 cursor-pointer">
                    Auto-refresh
                    {autoRefreshEnabled && (
                      <span className="ml-1 text-green-600">(5min)</span>
                    )}
                  </Label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={loading || analyticsLoading || rankingsLoading || isManualRefreshing}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(loading || analyticsLoading || rankingsLoading || isManualRefreshing) ? 'animate-spin' : ''}`} />
                  {isManualRefreshing ? 'Updating...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>

          {/* Data Freshness Indicator */}
          {lastDataUpdate && (
            <div className="mb-4 flex items-center justify-between bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <span className="text-sm text-slate-600">
                  Last updated: {lastDataUpdate.toLocaleTimeString()}
                  {autoRefreshEnabled && (
                    <span className="ml-2 text-xs text-green-600 font-medium">Auto-refresh enabled</span>
                  )}
                </span>
              </div>
              {(analyticsLoading || rankingsLoading || isManualRefreshing) && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Updating data...</span>
                </div>
              )}
            </div>
          )}

          {/* Connection Status Alert */}
          {analyticsData?.metadata?.connectionStatus && (
            !analyticsData.metadata.connectionStatus.ga4.connected ||
            !analyticsData.metadata.connectionStatus.searchConsole.connected
          ) && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800 mb-1">
                    Analytics Setup Required
                  </h3>
                  <div className="text-sm text-amber-700 space-y-1">
                    {!analyticsData.metadata.connectionStatus.ga4.connected && (
                      <p>• Google Analytics 4 is not connected for this dealership</p>
                    )}
                    {!analyticsData.metadata.connectionStatus.searchConsole.connected && (
                      <p>• Google Search Console is not connected for this dealership</p>
                    )}
                    <p className="mt-2 text-xs">
                      Connect these services in Settings to see real analytics data for this dealership.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  Traffic Metrics
                  {analyticsData?.metadata?.connectionStatus?.ga4.connected === false && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">GA4 Not Connected</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData?.metadata?.connectionStatus?.ga4.connected === false ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-sm">Google Analytics 4 not connected</div>
                    <div className="text-xs mt-1">Connect GA4 in Settings to see traffic data</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <StatCard
                      title="Sessions"
                      value={analyticsData?.ga4Data?.sessions?.toLocaleString() ?? '-'}
                      subtitle={dateRange === '7days' ? 'Last 7 days' : dateRange === '30days' ? 'Last 30 days' : dateRange === '90days' ? 'Last 90 days' : dateRange === 'thisMonth' ? 'This month' : dateRange === 'thisYear' ? 'This year' : 'Selected period'}
                      loading={analyticsLoading}
                      gradient="emerald"
                    />
                    <StatCard
                      title="Users"
                      value={analyticsData?.ga4Data?.users?.toLocaleString() ?? '-'}
                      subtitle={dateRange === '7days' ? 'Last 7 days' : dateRange === '30days' ? 'Last 30 days' : dateRange === '90days' ? 'Last 90 days' : dateRange === 'thisMonth' ? 'This month' : dateRange === 'thisYear' ? 'This year' : 'Selected period'}
                      loading={analyticsLoading}
                      gradient="brand"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  Search Performance
                  {analyticsData?.metadata?.connectionStatus?.searchConsole.connected === false && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Search Console Not Connected</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData?.metadata?.connectionStatus?.searchConsole.connected === false ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-sm">Google Search Console not connected</div>
                    <div className="text-xs mt-1">Connect Search Console in Settings to see search data</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <StatCard
                      title="Clicks"
                      value={analyticsData?.searchConsoleData?.clicks?.toLocaleString() ?? '-'}
                      subtitle={dateRange === '7days' ? 'Last 7 days' : dateRange === '30days' ? 'Last 30 days' : dateRange === '90days' ? 'Last 90 days' : dateRange === 'thisMonth' ? 'This month' : dateRange === 'thisYear' ? 'This year' : 'Selected period'}
                      loading={analyticsLoading}
                      gradient="brand"
                    />
                    <StatCard
                      title="Impressions"
                      value={analyticsData?.searchConsoleData?.impressions?.toLocaleString() ?? '-'}
                      subtitle={dateRange === '7days' ? 'Last 7 days' : dateRange === '30days' ? 'Last 30 days' : dateRange === '90days' ? 'Last 90 days' : dateRange === 'thisMonth' ? 'This month' : dateRange === 'thisYear' ? 'This year' : 'Selected period'}
                      loading={analyticsLoading}
                      gradient="emerald"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Avg. Ranking"
              value={typeof rankingsData?.data?.data?.data?.averagePosition === 'number' ? rankingsData.data.data.data.averagePosition.toFixed(0) : '-'}
              subtitle="Average search position"
              loading={rankingsLoading}
              gradient="brand"
            />
            <StatCard
              title="CTR"
              value={analyticsData?.searchConsoleData?.ctr ? `${(analyticsData.searchConsoleData.ctr * 100).toFixed(1)}%` : '-'}
              subtitle="Click-through rate"
              loading={analyticsLoading}
              gradient="emerald"
            />
            <StatCard
              title="Pages/Session"
              value={analyticsData?.ga4Data?.pageviews && analyticsData?.ga4Data?.sessions ?
                (analyticsData.ga4Data.pageviews / analyticsData.ga4Data.sessions).toFixed(1) : '-'}
              subtitle="Content depth"
              loading={analyticsLoading}
              gradient="brand"
            />
          </div>

          {/* Keyword Rankings Section */}
          <Card className="mb-8 border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Keyword Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats Grid */}
                {rankingsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="text-center p-3 bg-gray-50 rounded-lg animate-pulse">
                        <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100">
                      <div className="text-xl font-bold text-emerald-700">{typeof rankingsData?.data?.data?.data?.top10Count === 'number' ? rankingsData.data.data.data.top10Count : '-'}</div>
                      <div className="text-xs text-gray-500">Top 10 Rankings</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-700">{typeof rankingsData?.data?.data?.data?.top20Count === 'number' ? rankingsData.data.data.data.top20Count : '-'}</div>
                      <div className="text-xs text-gray-500">Top 20 Rankings</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-brand-light/30 to-brand-light/50 rounded-lg border border-brand-medium/30">
                      <div className="text-xl font-bold text-brand-dark">{typeof rankingsData?.data?.data?.data?.averagePosition === 'number' ? rankingsData.data.data.data.averagePosition.toFixed(0) : '-'}</div>
                      <div className="text-xs text-gray-500">Avg Position</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-lg border border-orange-100">
                      <div className="text-xl font-bold text-orange-700">{typeof rankingsData?.data?.data?.data?.totalKeywords === 'number' ? rankingsData.data.data.data.totalKeywords : '-'}</div>
                      <div className="text-xs text-gray-500">Total Keywords</div>
                    </div>
                  </div>
                )}

                {/* Keywords List */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Top Performing Keywords</h4>
                  <div className="space-y-1">
                    {analyticsData?.metadata?.connectionStatus?.searchConsole.connected === false ? (
                      <div className="text-center py-4 text-slate-500">
                        <div className="text-sm">Search Console not connected</div>
                        <div className="text-xs mt-1">Connect Search Console in Settings to see keyword data</div>
                      </div>
                    ) : analyticsData?.searchConsoleData?.topQueries && analyticsData.searchConsoleData.topQueries.length > 0 ? (
                      analyticsData.searchConsoleData.topQueries
                        .slice(0, 3)
                        .map((query, index) => {
                          const colors = [
                            'from-green-50 to-emerald-50/50 border-green-100 bg-green-100 text-green-800',
                            'from-blue-50 to-sky-50/50 border-blue-100 bg-blue-100 text-blue-800',
                            'from-brand-light/30 to-brand-light/50 border-brand-medium/30 bg-brand-light text-brand-dark'
                          ]
                          const colorClass = colors[index % 3]
                          const [bgClass, badgeClass] = colorClass.split(' bg-')

                          return (
                            <div key={query.query} className={`flex justify-between items-center p-2 bg-gradient-to-r ${bgClass} rounded text-sm border`}>
                              <span className="font-medium truncate flex-1 mr-2">{query.query}</span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge variant="secondary" className={`bg-${badgeClass} text-xs px-1 py-0`}>
                                  Position {Math.round(query.position)}
                                </Badge>
                                <span className="text-gray-500 text-xs">{query.clicks} clicks</span>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <div className="text-sm">No keyword data available</div>
                        <div className="text-xs mt-1">Keyword data will appear here once available</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package Progress */}
            <div>
              <Card className="border border-slate-200/60 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      Package Progress
                    </span>
                    <Badge variant="outline" className="text-xs border-slate-300">
                      {dashboardData?.packageProgress?.packageType || 'SILVER'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.packageProgress ? (
                      <>
                        <ProgressBar
                          label="Pages Created"
                          used={dashboardData.packageProgress.pages.used}
                          limit={dashboardData.packageProgress.pages.limit}
                        />
                        <ProgressBar
                          label="Blog Posts"
                          used={dashboardData.packageProgress.blogs.used}
                          limit={dashboardData.packageProgress.blogs.limit}
                        />
                        <ProgressBar
                          label="GBP Posts"
                          used={dashboardData.packageProgress.gbpPosts.used}
                          limit={dashboardData.packageProgress.gbpPosts.limit}
                        />
                        <ProgressBar
                          label="SEO Changes"
                          used={dashboardData.packageProgress.improvements.used}
                          limit={dashboardData.packageProgress.improvements.limit}
                        />
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <div className="text-sm">Package information not available</div>
                        <div className="text-xs mt-1">Please ensure your dealership has an active package</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Activity Feed - Real-time updates */}
            <div>
              <ActivityFeed
                dealershipId={currentDealership?.id}
                limit={15}
                autoRefresh={true}
                refreshInterval={60}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}