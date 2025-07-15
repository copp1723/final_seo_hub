'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity,
  Users,
  Eye,
  TrendingUp,
  Globe,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
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

interface TrafficTabProps {
  gaData: any
  gaError: string | null
  gaMetrics: {
    sessions: number
    users: number
    pageviews: number
  }
  chartOptions: any
}

export default function TrafficTab({ gaData, gaError, gaMetrics, chartOptions }: TrafficTabProps) {
  // Safely format dates with validation
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid'
    return format(date, 'MMM d')
  }

  const trafficChartData = {
    labels: gaData?.overview.dates?.map((date: string) => formatDate(date)).filter((label: string) => label !== 'Invalid') || [],
    datasets: [
      {
        label: 'Sessions',
        data: gaData?.overview.metrics.sessions || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Users',
        data: gaData?.overview.metrics.totalUsers || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const topPagesChartData = {
    labels: gaData?.topPages.slice(0, 5).map((p: any) => 
      p.page.length > 30 ? p.page.substring(0, 30) + '...' : p.page
    ) || [],
    datasets: [{
      label: 'Sessions',
      data: gaData?.topPages.slice(0, 5).map((p: any) => p.sessions) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  }

  if (gaError) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to load analytics</h3>
        <p className="text-gray-600 mb-4">{gaError}</p>
        {gaError.includes('not connected') && (
          <button 
            onClick={() => window.location.href = '/settings'}
            className="text-blue-600 hover:underline"
          >
            Connect Google Analytics
          </button>
        )}
        </Card>
    )
  }

  return (
    <>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{gaMetrics.sessions.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {gaData?.metadata.dateRange.startDate} - {gaData?.metadata.dateRange.endDate}
            </p>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{gaMetrics.pageviews.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total page views</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={trafficChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar 
                data={topPagesChartData} 
                options={{ ...chartOptions,
                  indexAxis: 'y' as const,
                  plugins: { ...chartOptions.plugins,
                    legend: { display: false }
                  }
                }} 
              />
            </div>
            <div className="mt-4 space-y-2">
              {gaData?.topPages.slice(5).map((page: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate max-w-xs">{page.page}</span>
                  <Badge variant="default">{page.sessions} sessions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gaData?.trafficSources.map((source: any, index: number) => {
                const percentage = Math.round((source.sessions / gaMetrics.sessions) * 100)
                return (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{source.source}</span>
                      <span className="text-sm text-gray-600">
                        {source.sessions.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
