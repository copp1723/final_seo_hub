'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { redirect } from 'next/navigation'
import { useSelectedDealership } from '@/app/context/SelectedDealershipContext'

// Force dynamic rendering - don't pre-render this page
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Activity as ActivityIcon,
  Loader2,
  Plus,
  BarChart,
  TrendingUp,
  Target,
  Calendar,
  Users,
  Zap,
  Star,
  RefreshCw
} from 'lucide-react'

import ErrorBoundary from '@/components/error-boundary'
import { useToast } from '@/hooks/use-toast'
import { RecentActivityTimeline } from '@/components/dashboard/RecentActivityTimeline'
import { DealershipSelector } from '@/components/layout/dealership-selector'

import type { 
  DashboardData, 
  DashboardAnalyticsData as AnalyticsData,
  Activity as ActivityType,
  PackageProgress,
  RequestData 
} from '@/types/api'

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = "blue",
  loading = false 
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  trend?: { value: number; positive: boolean }
  color?: "blue" | "green" | "purple" | "orange" | "red"
  loading?: boolean
}) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50",
    green: "from-emerald-500 to-emerald-600 text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50",
    purple: "from-violet-500 to-violet-600 text-violet-600 bg-gradient-to-br from-violet-50 to-violet-100/50",
    orange: "from-amber-500 to-amber-600 text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/50",
    red: "from-red-500 to-red-600 text-red-600 bg-gradient-to-br from-red-50 to-red-100/50"
  }

  return (
    <Card className="group relative overflow-hidden border border-gray-200/60 shadow-sm bg-white hover:shadow-lg hover:border-gray-300/60 transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
        <div className={`p-2.5 rounded-xl ${colorClasses[color].split(' ').slice(2).join(' ')} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-5 w-5 ${colorClasses[color].split(' ')[2]}`} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div>
            {loading ? (
              <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
            ) : (
              <div className="text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
            )}
            <p className="text-sm text-gray-600 mt-2 font-medium">{subtitle}</p>
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${trend.positive ? '' : 'rotate-180'}`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const ProgressBar = ({ 
  label, 
  used, 
  limit, 
  color = "blue" 
}: { 
  label: string
  used: number
  limit: number
  color?: "blue" | "green" | "purple" | "orange"
}) => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    purple: "bg-purple-500",
    orange: "bg-orange-500"
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{used} / {limit}</span>
          <Badge variant={percentage >= 80 ? "destructive" : percentage >= 60 ? "secondary" : "default"} className="text-xs">
            {Math.round(percentage)}%
          </Badge>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const { selectedDealership } = useSelectedDealership()

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch analytics data separately
  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.id || !mounted) return

    setAnalyticsLoading(true)
    try {
      // Determine selected dealership from context
      const currentDealershipId = selectedDealership
      // Build analytics-v2 endpoint with dateRange and optional dealershipId
      const endpoint = `/api/dashboard/analytics-v2?dateRange=30days${currentDealershipId ? `&dealershipId=${currentDealershipId}` : ''}`
      const response = await fetch(endpoint)

      if (response.ok) {
        const result = await response.json()
        setAnalyticsData(result.data)

        if (result.cached) {
          console.log('Using cached analytics data')
        }
      } else {
        console.error('Failed to fetch analytics data:', response.status)
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [user?.id, mounted, selectedDealership])
  
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || !mounted) return

    setLoading(true)
    setError(null)

    try {
      // Pass the dealershipId if available from context
      const currentDealershipId = selectedDealership
      const statsResponse = await fetch(`/api/dashboard/stats${currentDealershipId ? `?dealershipId=${currentDealershipId}` : ''}`);
      const recentActivityResponse = await fetch(`/api/dashboard/recent-activity${currentDealershipId ? `?dealershipId=${currentDealershipId}` : ''}`);

      if (!statsResponse.ok) {
        let errorBody = await statsResponse.text()
        try {
          const errorJson = JSON.parse(errorBody)
          errorBody = errorJson.error || errorBody
        } catch (e) {
          // not JSON
        }
        console.error(`[Dashboard] Failed to fetch stats: ${statsResponse.status} - ${errorBody}`)
        throw new Error(`Failed to fetch dashboard statistics: ${errorBody}`)
      }

      const statsData = await statsResponse.json()
      const activityData = await recentActivityResponse.json()

      setDashboardData(statsData.data)
      setRecentActivity(activityData.data || [])
    } catch (err: any) {
      console.error('[Dashboard] Error fetching data:', err)
      setError(err.message || 'An unexpected error occurred while fetching dashboard data.')
      toast('Error loading dashboard', 'error', {
        description: err.message,
        duration: 5000,
      })

      // Check emergency endpoint if main stats fail
      try {
        const emergencyResponse = await fetch('/api/dashboard/emergency')
        if (emergencyResponse.ok) {
          const emergencyData = await emergencyResponse.json()
          setDashboardData(emergencyData)
          setRecentActivity(emergencyData.recentActivity || [])
          setError(null)
          toast('Partial Dashboard Loaded', 'info', {
            description: 'Some data could not be loaded, but a basic dashboard is available.',
            duration: 5000,
          })
        }
      } catch (emergencyErr) {
        console.error('[Dashboard] Emergency endpoint also failed:', emergencyErr)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id, mounted, toast, selectedDealership])

  useEffect(() => {
    if (mounted && user?.id) {
      fetchDashboardData()
      fetchAnalyticsData()
    }
  }, [user?.id, mounted, fetchDashboardData, fetchAnalyticsData])

  // Removed event listener for dealershipChanged: context selection handles re-fetch

  // Handle authentication - moved after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    redirect('/auth/simple-signin')
  }

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !dashboardData) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h1>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button
                  onClick={() => {
                    setLoading(true)
                    setError(null)
                    fetchDashboardData()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'User'}</p>
              {analyticsData && (
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className={`flex items-center gap-1 ${analyticsData.metadata.hasGA4Connection ? 'text-green-600' : 'text-orange-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${analyticsData.metadata.hasGA4Connection ? 'bg-green-500' : 'bg-orange-500'}`} />
                    GA4 {analyticsData.metadata.hasGA4Connection ? 'Connected' : selectedDealership ? 'Not Configured' : 'Select Dealership'}
                  </span>
                  <span className={`flex items-center gap-1 ${analyticsData.metadata.hasSearchConsoleConnection ? 'text-green-600' : 'text-orange-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${analyticsData.metadata.hasSearchConsoleConnection ? 'bg-green-500' : 'bg-orange-500'}`} />
                    Search Console {analyticsData.metadata.hasSearchConsoleConnection ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Dealership Selector - Only on dashboard */}
              <DealershipSelector showOnAllPages={false} />
              
              <Button
                onClick={fetchAnalyticsData}
                disabled={analyticsLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Refresh Analytics
              </Button>
              <Link href="/requests/new">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Primary Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Core Business Metrics - Most Important */}
          <StatCard
            title="Active Requests"
            value={dashboardData?.activeRequests ?? '-'}
            subtitle="Currently in progress"
            icon={ActivityIcon}
            color="purple"
            loading={loading}
            trend={undefined}
          />
          <StatCard
            title="Total Requests"
            value={dashboardData?.totalRequests ?? '-'}
            subtitle="All time requests"
            icon={FileText}
            color="blue"
            loading={loading}
          />

          {/* Analytics Performance */}
          <StatCard
            title="GA4 Sessions"
            value={!selectedDealership ? '-' : analyticsData?.ga4Data?.sessions?.toLocaleString() || '-'}
            subtitle={!selectedDealership ? "Select dealership" : analyticsData?.metadata.hasGA4Connection ? "Last 30 days" : "No GA4 configured"}
            icon={BarChart}
            color="green"
            loading={analyticsLoading}
          />
          <StatCard
            title="SC Clicks"
            value={!selectedDealership ? '-' : analyticsData?.searchConsoleData?.clicks?.toLocaleString() || '-'}
            subtitle={!selectedDealership ? "Select dealership" : analyticsData?.metadata.hasSearchConsoleConnection ? "Last 30 days" : "No Search Console configured"}
            icon={TrendingUp}
            color="orange"
            loading={analyticsLoading}
          />
        </div>

        {/* Secondary Analytics Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <StatCard
            title="GA4 Users"
            value={analyticsData?.ga4Data?.users?.toLocaleString() || (analyticsData?.errors.ga4Error ? 'Error' : 'N/A')}
            subtitle={analyticsData?.metadata.hasGA4Connection ? "Last 30 days" : "Connect GA4"}
            icon={Users}
            color="purple"
            loading={analyticsLoading}
          />
          <StatCard
            title="SC Impressions"
            value={analyticsData?.searchConsoleData?.impressions?.toLocaleString() || (analyticsData?.errors.searchConsoleError ? 'Error' : 'N/A')}
            subtitle={analyticsData?.metadata.hasSearchConsoleConnection ? "Last 30 days" : "Connect Search Console"}
            icon={Star}
            color="blue"
            loading={analyticsLoading}
          />
          <StatCard
            title="Tasks Completed"
            value={dashboardData?.tasksCompletedThisMonth ?? '-'}
            subtitle={dashboardData?.tasksSubtitle ?? 'tasks completed this month'}
            icon={CheckCircle}
            color="green"
            loading={loading}
            trend={undefined}
          />

        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Package Progress */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-600" />
                  Package Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
                ) : dashboardData?.packageProgress ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {dashboardData.packageProgress.packageType || 'Current Package'}
                      </h3>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {dashboardData.packageProgress.totalTasks.completed} / {dashboardData.packageProgress.totalTasks.total} Complete
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <ProgressBar
                        label="Pages"
                        used={dashboardData.packageProgress.pages.used}
                        limit={dashboardData.packageProgress.pages.limit}
                        color="blue"
                      />
                      <ProgressBar
                        label="Blog Posts"
                        used={dashboardData.packageProgress.blogs.used}
                        limit={dashboardData.packageProgress.blogs.limit}
                        color="green"
                      />
                      <ProgressBar
                        label="GBP Posts"
                        used={dashboardData.packageProgress.gbpPosts.used}
                        limit={dashboardData.packageProgress.gbpPosts.limit}
                        color="purple"
                      />
                      <ProgressBar
                        label="Improvements"
                        used={dashboardData.packageProgress.improvements.used}
                        limit={dashboardData.packageProgress.improvements.limit}
                        color="orange"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active package found</p>
                    <Link href="/requests/new">
                      <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                        Start New Request
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
                ) : recentActivity.length > 0 ? (
                  <RecentActivityTimeline activities={recentActivity} />
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No recent activity</p>
                    <p className="text-sm text-gray-500">Activity will appear here as you use the platform</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/requests/new">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:bg-white hover:shadow-sm transition-all">
                    <Plus className="h-6 w-6 text-blue-600" />
                    <span className="font-medium">New Request</span>
                    <span className="text-xs text-gray-500">Start a new SEO project</span>
                  </Button>
                </Link>
                <Link href="/requests">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:bg-white hover:shadow-sm transition-all">
                    <FileText className="h-6 w-6 text-green-600" />
                    <span className="font-medium">View Requests</span>
                    <span className="text-xs text-gray-500">Check request status</span>
                  </Button>
                </Link>
                <Link href="/reporting">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:bg-white hover:shadow-sm transition-all">
                    <BarChart className="h-6 w-6 text-purple-600" />
                    <span className="font-medium">View Reports</span>
                    <span className="text-xs text-gray-500">Analytics & insights</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
