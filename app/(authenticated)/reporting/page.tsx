'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Users,
  MousePointer,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { useDealership } from '@/app/context/DealershipContext'
import { toast } from 'sonner'
import { DealershipSelector } from '@/components/layout/dealership-selector'


interface AnalyticsData {
  ga4Data?: {
    sessions: number
    users: number
    eventCount: number
    bounceRate: number
  }
  searchConsoleData?: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  combinedMetrics?: {
    totalSessions: number
    totalUsers: number
    totalClicks: number
    totalImpressions: number
    avgCTR: number
    avgPosition: number
  }
  metadata?: {
    hasGA4Connection: boolean
    hasSearchConsoleConnection: boolean
    dateRange: string
  }
  errors?: {
    ga4Error?: string
    searchConsoleError?: string
  }
}

export default function ReportingPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30days')

  const { currentDealership } = useDealership()

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      const dealershipId = currentDealership?.id || localStorage.getItem('selectedDealershipId')
      const params = new URLSearchParams({
        dateRange,
        clearCache: 'true', // Force cache clear for dealership switching
        ...(dealershipId && { dealershipId })
      })

      const response = await fetch(`/api/dashboard/analytics?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`)
      }

      const result = await response.json()
      setAnalyticsData(result.data)
      
      if (result.cached) {
        toast.info("Showing cached data from the last 5 minutes")
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, currentDealership?.id])

  // Simple StatCard component
  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', loading = false }: {
    title: string
    value: string | number
    subtitle: string
    icon: any
    color?: 'blue' | 'green' | 'orange' | 'purple'
    loading?: boolean
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      orange: 'text-orange-600 bg-orange-50',
      purple: 'text-purple-600 bg-purple-50'
    }

    return (
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? '...' : (typeof value === 'number' ? value.toLocaleString() : value)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate sample trend data for charts
  const generateTrendData = () => {
    const days = parseInt(dateRange.replace('days', '')) || 30
    const data = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // Generate realistic sample data based on actual analytics data
      const baseSessions = analyticsData?.ga4Data?.sessions || 100
      const baseClicks = analyticsData?.searchConsoleData?.clicks || 50

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: Math.floor(baseSessions * (0.7 + Math.random() * 0.6) / days),
        clicks: Math.floor(baseClicks * (0.7 + Math.random() * 0.6) / days),
        impressions: Math.floor((analyticsData?.searchConsoleData?.impressions || 1000) * (0.7 + Math.random() * 0.6) / days)
      })
    }

    return data
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.05),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-200/50">
                <Activity className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Analytics & Reporting
                </h1>
                <p className="text-slate-600 mt-1">
                  Comprehensive insights from Google Analytics 4 and Search Console
                </p>
              </div>
            </div>

            {/* Enhanced Connection Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${analyticsData?.metadata?.hasGA4Connection ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-red-500 shadow-red-500/50 shadow-sm'}`} />
                <span className="text-xs font-medium text-slate-700">GA4</span>
                {analyticsData?.metadata?.hasGA4Connection && <CheckCircle className="h-3 w-3 text-emerald-500" />}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${analyticsData?.metadata?.hasSearchConsoleConnection ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-red-500 shadow-red-500/50 shadow-sm'}`} />
                <span className="text-xs font-medium text-slate-700">Search Console</span>
                {analyticsData?.metadata?.hasSearchConsoleConnection && <CheckCircle className="h-3 w-3 text-emerald-500" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const dealershipId = currentDealership?.id || localStorage.getItem('selectedDealershipId')
                  const params = new URLSearchParams({
                    dateRange,
                    ...(dealershipId && { dealershipId })
                  })
                  const res = await fetch(`/api/reporting/export-csv?${params}`, {
                    credentials: 'include',
                  })
                  if (!res.ok) throw new Error('Failed to export CSV')
                  const blob = await res.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'report.csv'
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  window.URL.revokeObjectURL(url)
                } catch (err) {
                  toast.error('Export failed')
                }
              }}
              disabled={loading}
            >
              Export CSV
            </Button>
            {/* Dealership Selector with error boundary */}
            <div className="flex-shrink-0">
              {(() => {
                try {
                  return <DealershipSelector showOnAllPages={true} />
                } catch (error) {
                  console.error('DealershipSelector error:', error)
                  return (
                    <div className="text-sm text-gray-500 px-2 py-1">
                      Dealership selector unavailable
                    </div>
                  )
                }
              })()}
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white/90 backdrop-blur-sm"
            >
              <option value="7days">Last 7 days</option>
              <option value="14days">Last 14 days</option>
              <option value="30days">Last 30 days</option>
              <option value="60days">Last 60 days</option>
              <option value="90days">Last 90 days</option>
              <option value="6months">Last 6 months</option>
              <option value="1year">Last year</option>
            </select>
            <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>



        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="traffic">Traffic Analytics</TabsTrigger>
            <TabsTrigger value="search">Search Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Sessions"
                value={analyticsData?.ga4Data?.sessions?.toLocaleString() || 'N/A'}
                subtitle="Google Analytics 4"
                icon={BarChart3}
                color="blue"
                loading={loading}
              />
              <StatCard
                title="Unique Users"
                value={analyticsData?.ga4Data?.users?.toLocaleString() || 'N/A'}
                subtitle="Google Analytics 4"
                icon={Users}
                color="green"
                loading={loading}
              />
              <StatCard
                title="Organic Clicks"
                value={analyticsData?.searchConsoleData?.clicks?.toLocaleString() || 'N/A'}
                subtitle="Search Console"
                icon={MousePointer}
                color="orange"
                loading={loading}
              />
              <StatCard
                title="Impressions"
                value={analyticsData?.searchConsoleData?.impressions?.toLocaleString() || 'N/A'}
                subtitle="Search Console"
                icon={Eye}
                color="purple"
                loading={loading}
              />
            </div>

            {/* Key Insights - Simple Snapshots */}
            {analyticsData && (analyticsData.ga4Data || analyticsData.searchConsoleData) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Performance Snapshot */}
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      Performance Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average CTR</span>
                      <span className="font-semibold text-emerald-600">
                        {analyticsData?.searchConsoleData?.ctr ?
                          `${(analyticsData.searchConsoleData.ctr * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Position</span>
                      <span className="font-semibold text-blue-600">
                        {analyticsData?.searchConsoleData?.position?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sessions/Day</span>
                      <span className="font-semibold text-purple-600">
                        {analyticsData?.ga4Data?.sessions ?
                          Math.round(analyticsData.ga4Data.sessions / (parseInt(dateRange.replace('days', '')) || 30)) : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Health Check */}
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      Health Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">GA4 Connected</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${analyticsData?.metadata?.hasGA4Connection ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">
                          {analyticsData?.metadata?.hasGA4Connection ? 'Active' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Search Console</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${analyticsData?.metadata?.hasSearchConsoleConnection ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">
                          {analyticsData?.metadata?.hasSearchConsoleConnection ? 'Active' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Data Quality</span>
                      <span className="text-sm font-medium text-emerald-600">
                        {(analyticsData?.metadata?.hasGA4Connection && analyticsData?.metadata?.hasSearchConsoleConnection) ? 'Complete' : 'Partial'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Context & Period */}
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      Report Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Period</span>
                      <span className="text-sm font-medium">
                        {dateRange === '7days' ? 'Last 7 days' :
                         dateRange === '14days' ? 'Last 14 days' :
                         dateRange === '30days' ? 'Last 30 days' :
                         dateRange === '60days' ? 'Last 60 days' :
                         dateRange === '90days' ? 'Last 90 days' :
                         dateRange === '6months' ? 'Last 6 months' :
                         dateRange === '1year' ? 'Last year' : dateRange}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Dealership</span>
                      <span className="text-sm font-medium">
                        {currentDealership?.name || 'All Dealerships'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Updated</span>
                      <span className="text-sm font-medium text-gray-500">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Simple Action Items */}
            {(!analyticsData?.metadata?.hasGA4Connection || !analyticsData?.metadata?.hasSearchConsoleConnection) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-amber-800 mb-2">Complete Your Setup</h3>
                      <div className="space-y-1 text-sm text-amber-700">
                        {!analyticsData?.metadata?.hasGA4Connection && (
                          <p>• Connect Google Analytics 4 for website traffic data</p>
                        )}
                        {!analyticsData?.metadata?.hasSearchConsoleConnection && (
                          <p>• Connect Search Console for search performance data</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="mt-3 text-amber-700 border-amber-300 hover:bg-amber-100">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Go to Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Traffic Analytics Tab */}
          <TabsContent value="traffic" className="space-y-6">
            {analyticsData?.metadata?.hasGA4Connection ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Website Traffic</CardTitle>
                    <CardDescription>Key visitor metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Sessions</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {analyticsData?.ga4Data?.sessions?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Unique Users</span>
                      <span className="text-lg font-semibold text-green-600">
                        {analyticsData?.ga4Data?.users?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily Average</span>
                      <span className="text-lg font-semibold text-purple-600">
                        {analyticsData?.ga4Data?.sessions ?
                          Math.round(analyticsData.ga4Data.sessions / (parseInt(dateRange.replace('days', '')) || 30)) : '0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">User Engagement</CardTitle>
                    <CardDescription>How visitors interact with your site</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Events</span>
                      <span className="text-lg font-semibold text-orange-600">
                        {analyticsData?.ga4Data?.eventCount?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Events per Session</span>
                      <span className="text-lg font-semibold text-indigo-600">
                        {(analyticsData?.ga4Data?.sessions && analyticsData?.ga4Data?.eventCount) ?
                          (analyticsData.ga4Data.eventCount / analyticsData.ga4Data.sessions).toFixed(1) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Data Quality</span>
                      <span className="text-sm font-medium text-emerald-600">
                        {analyticsData?.ga4Data?.sessions ? 'Good' : 'No Data'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Google Analytics 4</h3>
                  <p className="text-gray-600 mb-4">Get insights into your website traffic and user behavior</p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/settings'}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect GA4
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Search Performance Tab */}
          <TabsContent value="search" className="space-y-6">
            {analyticsData?.metadata?.hasSearchConsoleConnection ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Search Visibility</CardTitle>
                    <CardDescription>How often your site appears in search</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Impressions</span>
                      <span className="text-lg font-semibold text-purple-600">
                        {analyticsData?.searchConsoleData?.impressions?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Position</span>
                      <span className="text-lg font-semibold text-green-600">
                        {analyticsData?.searchConsoleData?.position?.toFixed(1) || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily Impressions</span>
                      <span className="text-lg font-semibold text-indigo-600">
                        {analyticsData?.searchConsoleData?.impressions ?
                          Math.round(analyticsData.searchConsoleData.impressions / (parseInt(dateRange.replace('days', '')) || 30)).toLocaleString() : '0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Click Performance</CardTitle>
                    <CardDescription>How users engage with your search results</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Clicks</span>
                      <span className="text-lg font-semibold text-orange-600">
                        {analyticsData?.searchConsoleData?.clicks?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Click-Through Rate</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {analyticsData?.searchConsoleData?.ctr ?
                          `${(analyticsData.searchConsoleData.ctr * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily Clicks</span>
                      <span className="text-lg font-semibold text-emerald-600">
                        {analyticsData?.searchConsoleData?.clicks ?
                          Math.round(analyticsData.searchConsoleData.clicks / (parseInt(dateRange.replace('days', '')) || 30)) : '0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Search Console</h3>
                  <p className="text-gray-600 mb-4">Track how your site performs in Google search results</p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/settings'}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Search Console
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
