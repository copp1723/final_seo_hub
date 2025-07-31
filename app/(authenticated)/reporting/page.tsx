'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointer, 
  Eye, 
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { useDealership } from '@/app/context/DealershipContext'
import { toast } from 'sonner'

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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : value}
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

  const ConnectionStatus = ({ service, connected, error }: {
    service: string
    connected: boolean
    error?: string
  }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${connected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {connected ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        </div>
        <div>
          <p className="font-medium">{service}</p>
          <p className="text-sm text-gray-500">
            {connected ? 'Connected' : error || 'Not connected'}
          </p>
        </div>
      </div>
      {!connected && (
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Connect
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Analytics & Reporting</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive analytics from Google Analytics 4 and Search Console
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
            <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>
              Connect your Google Analytics 4 and Search Console accounts to view comprehensive analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectionStatus
              service="Google Analytics 4"
              connected={analyticsData?.metadata?.hasGA4Connection || false}
              error={analyticsData?.errors?.ga4Error}
            />
            <ConnectionStatus
              service="Google Search Console"
              connected={analyticsData?.metadata?.hasSearchConsoleConnection || false}
              error={analyticsData?.errors?.searchConsoleError}
            />
          </CardContent>
        </Card>

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average CTR</span>
                      <Badge variant="secondary">
                        {analyticsData?.searchConsoleData?.ctr ? 
                          `${(analyticsData.searchConsoleData.ctr * 100).toFixed(2)}%` : 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Position</span>
                      <Badge variant="secondary">
                        {analyticsData?.searchConsoleData?.position?.toFixed(1) || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bounce Rate</span>
                      <Badge variant="secondary">
                        {analyticsData?.ga4Data?.bounceRate ? 
                          `${(analyticsData.ga4Data.bounceRate * 100).toFixed(1)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p><strong>Date Range:</strong> {analyticsData?.metadata?.dateRange || dateRange}</p>
                      <p><strong>Dealership:</strong> {currentDealership?.name || 'All Dealerships'}</p>
                      <p><strong>Last Updated:</strong> {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Traffic Analytics Tab */}
          <TabsContent value="traffic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Analytics 4 Data</CardTitle>
                <CardDescription>
                  Website traffic and user behavior metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData?.metadata?.hasGA4Connection ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {analyticsData?.ga4Data?.sessions?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-gray-600">Sessions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {analyticsData?.ga4Data?.users?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-gray-600">Users</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-400">
                        {analyticsData?.ga4Data?.eventCount?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-gray-600">Events</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Connect Google Analytics 4 to view traffic data</p>
                    <Button className="mt-4" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect GA4
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Performance Tab */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Search Console Data</CardTitle>
                <CardDescription>
                  Search performance and organic visibility metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData?.metadata?.hasSearchConsoleConnection ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {analyticsData?.searchConsoleData?.clicks?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-gray-600">Clicks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-400">
                        {analyticsData?.searchConsoleData?.impressions?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-gray-600">Impressions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {analyticsData?.searchConsoleData?.ctr ? 
                          `${(analyticsData.searchConsoleData.ctr * 100).toFixed(2)}%` : '0%'}
                      </p>
                      <p className="text-sm text-gray-600">CTR</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {analyticsData?.searchConsoleData?.position?.toFixed(1) || '0'}
                      </p>
                      <p className="text-sm text-gray-600">Avg Position</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Connect Google Search Console to view search performance</p>
                    <Button className="mt-4" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Search Console
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
