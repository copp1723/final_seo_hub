'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity,
  Users,
  Eye,
  Search,
  MousePointerClick,
  Percent,
  Hash,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  loading: () => <Loader2 className="h-6 w-6 animate-spin" />,
  ssr: false
})
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  loading: () => <Loader2 className="h-6 w-6 animate-spin" />,
  ssr: false
})

interface OverviewTabProps {
  gaData: any
  scData: any
  gaError: string | null
  scError: string | null
  gaMetrics: {
    sessions: number
    users: number
    pageviews: number
  }
  chartOptions: any
}

export default function OverviewTab({ 
  gaData, 
  scData, 
  gaError, 
  scError, 
  gaMetrics,
  chartOptions 
}: OverviewTabProps) {
  // Calculate organic traffic percentage
  const organicPercentage = gaMetrics.sessions > 0 && scData?.overview?.clicks
    ? Math.round((scData.overview.clicks / gaMetrics.sessions) * 100)
    : 0

  return (
    <>
      {/* Combined Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* GA4 Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{gaMetrics.sessions.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">All traffic sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{gaMetrics.users.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Visitors to your site</p>
          </CardContent>
        </Card>

        {/* Search Console Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Organic Sessions</CardTitle>
            <MousePointerClick className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {scData?.overview?.clicks?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {organicPercentage > 0 ? `${organicPercentage}% of total sessions` : 'From organic search'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg.CTR</CardTitle>
            <Percent className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {scData?.overview?.ctr ? `${(scData.overview.ctr * 100).toFixed(1)}%` : '0%'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Click-through rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Combined Traffic Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {gaError && scError ? (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p>Unable to load analytics data</p>
              <p className="text-sm mt-2">Please connect your accounts in settings</p>
            </div>
          ) : (
            <div className="h-80">
              <Line 
                data={{
                  labels: gaData?.overview.dates || scData?.performanceByDate.dates || [],
                  datasets: [
                    ...(gaData ? [{
                      label: 'Total Sessions',
                      data: gaData.overview.metrics.sessions || [],
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true,
                      tension: 0.4,
                      yAxisID: 'y'
                    }] : []),
                    ...(scData ? [{
                      label: 'Organic Sessions',
                      data: scData.performanceByDate.metrics.clicks || [],
                      borderColor: 'rgb(168, 85, 247)',
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      fill: true,
                      tension: 0.4,
                      yAxisID: 'y'
                    }] : []),
                    ...(scData ? [{
                      label: 'Impressions (÷100)',
                      data: scData.performanceByDate.metrics.impressions.map((v: number) => v / 100) || [],
                      borderColor: 'rgb(251, 146, 60)',
                      backgroundColor: 'rgba(251, 146, 60, 0.1)',
                      fill: false,
                      tension: 0.4,
                      borderDash: [5, 5],
                      yAxisID: 'y'
                    }] : [])
                  ]
                }} 
                options={chartOptions} 
              />
            </div>
          )}
          </CardContent>
      </Card>

      {/* Year-over-Year Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Year-over-Year Performance</CardTitle>
          <p className="text-sm text-gray-600">
            Comparing current month vs same month last year (Search Console data preferred)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar
              data={{
                labels: ['June 2024', 'June 2025'],
                datasets: [
                  {
                    label: 'Sessions',
                    data: [1250, 1580], // Example data - replace with actual year-over-year data
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                  },
                  {
                    label: 'Users',
                    data: [980, 1220], // Example data
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                  },
                  {
                    label: 'Impressions (÷100)',
                    data: [456, 678], // Example data (divided by 100 for scale)
                    backgroundColor: 'rgba(251, 146, 60, 0.8)',
                    borderColor: 'rgb(251, 146, 60)',
                    borderWidth: 1
                  },
                  {
                    label: 'CTR (%)',
                    data: [2.8, 3.4], // Example data
                    backgroundColor: 'rgba(168, 85, 247, 0.8)',
                    borderColor: 'rgb(168, 85, 247)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{ ...chartOptions,
                plugins: { ...chartOptions.plugins,
                  tooltip: {
                    mode: 'index' as const,
                    intersect: false,
                    callbacks: {
                      afterLabel: function(context: any) {
                        // Calculate percentage change between years
                        const currentValue = context.parsed.y
                        const dataset = context.dataset.data
                        if (context.dataIndex === 1 && dataset[0] > 0) {
                          const previousValue = dataset[0]
                          const percentChange = ((currentValue - previousValue) / previousValue * 100)
                          const percentChangeStr = percentChange.toFixed(1)
                          return `Change: ${percentChange > 0 ? '+' : ''}${percentChangeStr}%`
                        }
                        return ''
                      }
                    }
                  }
                },
                scales: { ...chartOptions.scales,
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    grid: {
                      drawOnChartArea: false
                    },
                    title: {
                      display: true,
                      text: 'CTR (%)'
                    }
                  }
                }
              }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Note:</strong> This chart compares the same month across different years using Search Console data for accuracy.Impressions are scaled down (÷100) for better visualization alongside other metrics</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-700">Most Visited Pages</h4>
                <div className="space-y-2">
                  {gaData?.topPages?.slice(0, 3).map((page: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-xs">
                        {page.page}
                      </span>
                      <Badge variant="default">{page.sessions} sessions</Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2 text-gray-700">Top Search Landing Pages</h4>
                <div className="space-y-2">
                  {scData?.topPages?.slice(0, 3).map((page: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-xs">
                        {page.page.replace(/^https?:\/\/[^\/]+/, '')}
                      </span>
                      <Badge variant="info">{page.clicks} clicks</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-700">Top Search Queries</h4>
                <div className="space-y-2">
                  {scData?.topQueries?.slice(0, 5).map((query: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-xs">
                        {query.query}
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="default">{query.clicks} clicks</Badge>
                        <Badge variant="info">
                          #{query.position.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {scData?.top10AveragePosition?.position && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Top 10 Avg Position</span>
                      <Badge variant="success">
                        #{scData.top10AveragePosition.position.toFixed(1)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {scData.top10AveragePosition.count} top performing queries
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
