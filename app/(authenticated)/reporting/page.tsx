'use client'

import { useState, useEffect } from 'react'

// Disable SSR for this component to avoid hydration issues
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react'
import { useDealership } from '@/app/context/DealershipContext'
import { toast } from 'sonner'
import { DealershipSelector } from '@/components/layout/dealership-selector'

interface AnalyticsData {
  ga4Data?: {
    sessions: number
    users: number
    pageviews: number
    bounceRate?: number
    newUsers?: number
    returningUsers?: number
    averageSessionDuration?: number
    engagementRate?: number
    trafficSources?: Array<{ source: string; sessions: number }>
    cities?: Array<{ city: string; sessions: number }>
    devices?: Array<{ device: string; sessions: number }>
    hourlyData?: Array<{ hour: number; sessions: number }>
  }
  searchConsoleData?: {
    clicks: number
    impressions: number
    ctr: number
    position: number
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

export default function ReportingPage() {
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30days')
  const [previousDealershipId, setPreviousDealershipId] = useState<string | null>(null)

  const { currentDealership } = useDealership()

  // Clear data when dealership changes
  useEffect(() => {
    const currentId = currentDealership?.id || null
    if (previousDealershipId !== null && previousDealershipId !== currentId) {
      console.log('Reporting: Dealership changed, clearing data:', { from: previousDealershipId, to: currentId })
      setAnalyticsData(null)
    }
    setPreviousDealershipId(currentId)
  }, [currentDealership?.id, previousDealershipId])

  // Fetch analytics data
  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      setDataLoading(true)

      const dealershipId = currentDealership?.id || localStorage.getItem('selectedDealershipId')
      const params = new URLSearchParams({
        dateRange,
        ...(dealershipId && { dealershipId }),
        ...(forceRefresh && { clearCache: 'true' })
      })

      const response = await fetch(`/api/dashboard/analytics?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const result = await response.json()
      console.log('🔍 [REPORTING DEBUG] Full API response:', JSON.stringify(result, null, 2))
      console.log('🔍 [REPORTING DEBUG] Search Console data:', JSON.stringify(result.data?.searchConsoleData, null, 2))
      console.log('🔍 [REPORTING DEBUG] Top queries:', result.data?.searchConsoleData?.topQueries)
      console.log('🔍 [REPORTING DEBUG] Current dealership:', currentDealership?.name, currentDealership?.id)
      setAnalyticsData(result.data)
    } catch (error) {
      console.error('Analytics fetch error:', error)
      toast.error("Failed to load analytics data")
      setAnalyticsData(null)
    } finally {
      setDataLoading(false)
    }
  }

  // Load data on component mount and when dependencies change
  useEffect(() => {
    fetchAnalyticsData()
  }, [currentDealership?.id, dateRange])

  const handleRefresh = () => {
    setLoading(true)
    fetchAnalyticsData(true).finally(() => {
      setLoading(false)
      toast.success("Analytics insights refreshed")
    })
  }

  const handleExport = async () => {
    try {
      const dealershipId = currentDealership?.id || localStorage.getItem('selectedDealershipId')
      const params = new URLSearchParams({
        dateRange,
        ...(dealershipId && { dealershipId })
      })

      const response = await fetch(`/api/reporting/export-csv?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export insights')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `seo-insights-${dateRange}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("SEO insights exported successfully")
    } catch (error) {
      console.error('Export error:', error)
      toast.error("Failed to export insights")
    }
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                  Analytics Setup Required for {currentDealership?.name || 'This Dealership'}
                </h3>
                <div className="text-sm text-amber-700 space-y-1">
                  {!analyticsData.metadata.connectionStatus.ga4.connected && (
                    <p>• Google Analytics 4 is not connected - user behavior, traffic, and geographic data will not be available</p>
                  )}
                  {!analyticsData.metadata.connectionStatus.searchConsole.connected && (
                    <p>• Google Search Console is not connected - keyword performance and search insights will not be available</p>
                  )}
                  <p className="mt-2 text-xs">
                    Connect these services in Settings to see comprehensive analytics data for this dealership.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-white to-blue-50/30 rounded-lg border border-slate-200 p-8 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100/50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-700" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900">SEO Analytics</h1>
              </div>
              <p className="text-slate-600 text-base">
                Performance insights and actionable data analysis
              </p>
              {analyticsData?.metadata && (
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analyticsData.metadata.connectionStatus?.ga4.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-slate-500">GA4 {analyticsData.metadata.connectionStatus?.ga4.connected ? 'Connected' : 'Not Connected'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analyticsData.metadata.connectionStatus?.searchConsole.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-slate-500">Search Console {analyticsData.metadata.connectionStatus?.searchConsole.connected ? 'Connected' : 'Not Connected'}</span>
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
              <Button variant="outline" size="sm" onClick={handleRefresh} className="border-slate-300 hover:bg-slate-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* User Behavior Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">User Behavior</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100">
                  <div className="text-2xl font-medium text-emerald-700 mb-1">
                    {analyticsData?.ga4Data?.newUsers && analyticsData?.ga4Data?.users ?
                      `${Math.round((analyticsData.ga4Data.newUsers / analyticsData.ga4Data.users) * 100)}% / ${Math.round(((analyticsData.ga4Data.users - analyticsData.ga4Data.newUsers) / analyticsData.ga4Data.users) * 100)}%` :
                      (analyticsData?.ga4Data?.users ? 'N/A' : '-')}
                  </div>
                  <div className="text-sm text-slate-700">New vs Returning</div>
                  <div className="text-xs text-slate-500 mt-1">User acquisition</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100">
                  <div className="text-2xl font-medium text-blue-700 mb-1">
                    {analyticsData?.ga4Data?.averageSessionDuration ?
                      `${Math.floor(analyticsData.ga4Data.averageSessionDuration / 60)}:${String(Math.floor(analyticsData.ga4Data.averageSessionDuration % 60)).padStart(2, '0')}` :
                      (analyticsData?.ga4Data?.sessions ? 'N/A' : '-')}
                  </div>
                  <div className="text-sm text-slate-700">Avg. Session</div>
                  <div className="text-xs text-slate-500 mt-1">Minutes per visit</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-lg border border-purple-100">
                  <div className="text-2xl font-medium text-purple-700 mb-1">
                    {analyticsData?.ga4Data?.pageviews && analyticsData?.ga4Data?.sessions ?
                      (analyticsData.ga4Data.pageviews / analyticsData.ga4Data.sessions).toFixed(1) :
                      (analyticsData?.ga4Data?.sessions ? 'N/A' : '-')}
                  </div>
                  <div className="text-sm text-slate-700">Pages/Session</div>
                  <div className="text-xs text-slate-500 mt-1">Content depth</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-lg border border-orange-100">
                  <div className="text-2xl font-medium text-orange-700 mb-1">
                    {analyticsData?.ga4Data?.engagementRate ?
                      `${Math.round(analyticsData.ga4Data.engagementRate * 100)}%` :
                      (analyticsData?.ga4Data?.sessions ? 'N/A' : '-')}
                  </div>
                  <div className="text-sm text-slate-700">Engagement Rate</div>
                  <div className="text-xs text-slate-500 mt-1">Quality visits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.ga4Data?.trafficSources && analyticsData.ga4Data.trafficSources.length > 0 ? (
                  analyticsData.ga4Data.trafficSources.slice(0, 4).map((source, index) => {
                    const totalSessions = analyticsData.ga4Data?.sessions || 1
                    const percentage = Math.round((source.sessions / totalSessions) * 100)

                    // Map channel groups to display names and colors
                    const channelConfig = {
                      'Organic Search': { name: 'Organic Search', desc: 'SEO performance', color: 'green' },
                      'Direct': { name: 'Direct', desc: 'Brand recognition', color: 'sky' },
                      'Social': { name: 'Social Media', desc: 'Social engagement', color: 'pink' },
                      'Referral': { name: 'Referral', desc: 'External links', color: 'amber' },
                      'Paid Search': { name: 'Paid Search', desc: 'Google Ads', color: 'purple' },
                      'Email': { name: 'Email', desc: 'Email campaigns', color: 'indigo' },
                      'Display': { name: 'Display', desc: 'Banner ads', color: 'orange' }
                    }

                    const config = channelConfig[source.source as keyof typeof channelConfig] || {
                      name: source.source,
                      desc: 'Traffic source',
                      color: 'slate'
                    }

                    const colorClasses = {
                      green: 'from-green-50 to-emerald-50/50 border-green-100 text-green-700',
                      sky: 'from-sky-50 to-blue-50/50 border-sky-100 text-sky-700',
                      pink: 'from-pink-50 to-rose-50/50 border-pink-100 text-pink-700',
                      amber: 'from-amber-50 to-yellow-50/50 border-amber-100 text-amber-700',
                      purple: 'from-purple-50 to-violet-50/50 border-purple-100 text-purple-700',
                      indigo: 'from-indigo-50 to-blue-50/50 border-indigo-100 text-indigo-700',
                      orange: 'from-orange-50 to-red-50/50 border-orange-100 text-orange-700',
                      slate: 'from-slate-50 to-gray-50/50 border-slate-100 text-slate-700'
                    }

                    return (
                      <div key={source.source} className={`flex justify-between items-center p-4 bg-gradient-to-r ${colorClasses[config.color as keyof typeof colorClasses]} rounded-lg border`}>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{config.name}</div>
                          <div className="text-xs text-slate-500">{config.desc}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-medium ${colorClasses[config.color as keyof typeof colorClasses].split(' ').pop()}`}>
                            {percentage}%
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            ({source.sessions.toLocaleString()} sessions)
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-sm">No traffic source data available</div>
                    <div className="text-xs mt-1">Connect Google Analytics to see traffic sources</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic & Device Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">Geographic Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Top Cities</h4>
                  <div className="space-y-3">
                    {analyticsData?.ga4Data?.cities && analyticsData.ga4Data.cities.length > 0 ? (
                      analyticsData.ga4Data.cities.slice(0, 5).map((city, index) => {
                        const totalSessions = analyticsData.ga4Data?.sessions || 1
                        const percentage = Math.round((city.sessions / totalSessions) * 100)

                        return (
                          <div key={city.city} className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                            <span className="text-sm font-medium text-slate-900">{city.city}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                                  style={{width: `${Math.min(percentage, 100)}%`}}
                                ></div>
                              </div>
                              <span className="text-sm text-slate-600 w-8 text-right">{percentage}%</span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <div className="text-sm">No geographic data available</div>
                        <div className="text-xs mt-1">Connect Google Analytics to see city data</div>
                      </div>
                    )}
                  </div>
                </div>


              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">User Journey Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-4">User Behavior Insights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-slate-900">Bounce Rate</div>
                          <div className="text-xs text-slate-500">Single-page sessions</div>
                        </div>
                        <div className="text-lg font-medium text-blue-700">
                          {analyticsData?.ga4Data?.bounceRate ?
                            `${Math.round(analyticsData.ga4Data.bounceRate * 100)}%` :
                            (analyticsData?.ga4Data?.sessions ? 'N/A' : '-')}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-slate-900">Return Visitors</div>
                          <div className="text-xs text-slate-500">Repeat engagement</div>
                        </div>
                        <div className="text-lg font-medium text-emerald-700">
                          {analyticsData?.ga4Data?.newUsers && analyticsData?.ga4Data?.users ?
                            `${Math.round(((analyticsData.ga4Data.users - analyticsData.ga4Data.newUsers) / analyticsData.ga4Data.users) * 100)}%` :
                            (analyticsData?.ga4Data?.users ? 'N/A' : '-')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Device Usage</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {analyticsData?.ga4Data?.devices && analyticsData.ga4Data.devices.length > 0 ? (
                      analyticsData.ga4Data.devices.slice(0, 3).map((device, index) => {
                        const totalSessions = analyticsData.ga4Data?.sessions || 1
                        const percentage = Math.round((device.sessions / totalSessions) * 100)

                        const colorClasses = [
                          'from-violet-50 to-purple-50/50 border-violet-100 text-violet-700',
                          'from-fuchsia-50 to-pink-50/50 border-fuchsia-100 text-fuchsia-700',
                          'from-rose-50 to-pink-50/50 border-rose-100 text-rose-700'
                        ]

                        return (
                          <div key={device.device} className={`text-center p-4 bg-gradient-to-br ${colorClasses[index % 3]} rounded-lg border`}>
                            <div className={`text-xl font-medium ${colorClasses[index % 3].split(' ').pop()}`}>{percentage}%</div>
                            <div className="text-xs text-slate-500 mt-1">{device.device}</div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="col-span-3 text-center py-4 text-slate-500">
                        <div className="text-sm">No device data available</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEO Insights & Opportunities */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">SEO Insights & Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">High Opportunity Keywords</h4>
                  <div className="space-y-3">
                    {analyticsData?.searchConsoleData?.topQueries && analyticsData.searchConsoleData.topQueries.length > 0 ? (
                      (() => {
                        const opportunities = analyticsData.searchConsoleData.topQueries
                          .filter(query => query.position > 10 && query.impressions > 100)
                          .slice(0, 3);
                        const boxes = [];
                        
                        // Add actual opportunity boxes
                        opportunities.forEach(query => {
                          boxes.push(
                            <div key={query.query} className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100 border-l-4 border-l-emerald-500">
                              <p className="text-sm font-medium text-slate-900">{query.query}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                Position {Math.round(query.position)} • {query.impressions.toLocaleString()} impressions, {query.clicks} clicks
                              </p>
                            </div>
                          );
                        });
                        
                        // Add placeholder boxes to make it 3 total
                        while (boxes.length < 3) {
                          boxes.push(
                            <div key={`placeholder-opp-${boxes.length}`} className="p-4 rounded-lg border border-slate-100 bg-slate-50/30">
                              <div className="h-4 bg-slate-100 rounded animate-pulse mb-2"></div>
                              <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4"></div>
                            </div>
                          );
                        }
                        
                        return boxes;
                      })()
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <div className="text-sm">No keyword opportunity data available</div>
                        <div className="text-xs mt-1">Connect Search Console to see keyword insights</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Top Performing Keywords</h4>
                  <div className="space-y-3">
                    {analyticsData?.searchConsoleData?.topQueries && analyticsData.searchConsoleData.topQueries.length > 0 ? (
                      (() => {
                        const topPerforming = analyticsData.searchConsoleData.topQueries
                          .filter(query => query.position <= 5)
                          .slice(0, 3);
                        const boxes = [];
                        
                        // Add actual top performing boxes
                        topPerforming.forEach(query => {
                          boxes.push(
                            <div key={query.query} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100 border-l-4 border-l-blue-500">
                              <p className="text-sm font-medium text-slate-900">{query.query}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                Position {Math.round(query.position)} • {query.clicks} clicks, {(query.ctr * 100).toFixed(1)}% CTR
                              </p>
                            </div>
                          );
                        });
                        
                        // Add placeholder boxes to make it 3 total
                        while (boxes.length < 3) {
                          boxes.push(
                            <div key={`placeholder-top-${boxes.length}`} className="p-4 rounded-lg border border-slate-100 bg-slate-50/30">
                              <div className="h-4 bg-slate-100 rounded animate-pulse mb-2"></div>
                              <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4"></div>
                            </div>
                          );
                        }
                        
                        return boxes;
                      })()
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <div className="text-sm">No top performing keywords available</div>
                        <div className="text-xs mt-1">Connect Search Console to see keyword performance</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Needs Attention</h4>
                  <div className="space-y-3">
                    {analyticsData?.searchConsoleData?.topQueries && analyticsData.searchConsoleData.topQueries.length > 0 ? (
                      (() => {
                        const needsAttention = analyticsData.searchConsoleData.topQueries
                          .filter(query => query.ctr < 0.02 && query.impressions > 50)
                          .slice(0, 3);
                        const boxes = [];
                        
                        // Add actual needs attention boxes
                        needsAttention.forEach(query => {
                          boxes.push(
                            <div key={query.query} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-lg border border-amber-100 border-l-4 border-l-amber-500">
                              <p className="text-sm font-medium text-slate-900">{query.query}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                Position {Math.round(query.position)} • Low CTR ({(query.ctr * 100).toFixed(1)}%), {query.impressions.toLocaleString()} impressions
                              </p>
                            </div>
                          );
                        });
                        
                        // Add placeholder boxes to make it 3 total
                        while (boxes.length < 3) {
                          boxes.push(
                            <div key={`placeholder-attention-${boxes.length}`} className="p-4 rounded-lg border border-slate-100 bg-slate-50/30">
                              <div className="h-4 bg-slate-100 rounded animate-pulse mb-2"></div>
                              <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4"></div>
                            </div>
                          );
                        }
                        
                        return boxes;
                      })()
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <div className="text-sm">No attention-needed keywords identified</div>
                        <div className="text-xs mt-1">Connect Search Console to see improvement opportunities</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}