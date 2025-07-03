'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  AreaChart, 
  BarChart,
  Activity,
  Users,
  Eye,
  Calendar,
  RefreshCw,
  TrendingUp,
  Globe,
  AlertCircle
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Lazy load charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { 
  loading: () => <Loader2 className="h-6 w-6 animate-spin" />,
  ssr: false 
})
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { 
  loading: () => <Loader2 className="h-6 w-6 animate-spin" />,
  ssr: false 
})

// Lazy load Chart.js registration
if (typeof window !== 'undefined') {
  import('chart.js').then(({ Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler }) => {
    Chart.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      Filler
    )
  })
}

// Date range options
const DATE_RANGES = [
  { label: 'Last 7 days', value: '7days', getDates: () => ({ 
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })},
  { label: 'Last 30 days', value: '30days', getDates: () => ({ 
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })},
  { label: 'This month', value: 'thisMonth', getDates: () => ({ 
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })},
  { label: 'Last 3 months', value: '3months', getDates: () => ({ 
    startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })},
  { label: 'This year', value: 'thisYear', getDates: () => ({ 
    startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })}
]

interface AnalyticsData {
  overview: {
    dates: string[]
    metrics: {
      sessions?: number[]
      users?: number[]
      pageviews?: number[]
    }
  }
  topPages: Array<{
    page: string
    sessions: number
    pageviews: number
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

export default function ReportingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [selectedRange, setSelectedRange] = useState('30days')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Fetch analytics data
  const fetchAnalytics = async (showLoadingToast = false) => {
    try {
      setLoading(true)
      setError(null)
      
      if (showLoadingToast) {
        toast('Refreshing data...', 'info', {
          description: 'Fetching latest analytics from Google Analytics'
        })
      }

      const dateRange = DATE_RANGES.find(r => r.value === selectedRange)?.getDates()
      if (!dateRange) return

      const response = await fetch('/api/ga4/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dateRange)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setData(result.data)
      
      if (result.cached && showLoadingToast) {
        toast('Data loaded from cache', 'info', {
          description: 'Showing cached data from the last 5 minutes'
        })
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data'
      setError(errorMessage)
      toast('Error loading analytics', 'error', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Initial load and when date range changes
  useEffect(() => {
    fetchAnalytics()
  }, [selectedRange])

  // Calculate summary metrics
  const calculateMetrics = () => {
    if (!data?.overview.metrics) return { sessions: 0, users: 0, pageviews: 0 }
    
    const sum = (arr: number[] = []) => arr.reduce((a, b) => a + b, 0)
    
    return {
      sessions: sum(data.overview.metrics.sessions),
      users: sum(data.overview.metrics.users),
      pageviews: sum(data.overview.metrics.pageviews)
    }
  }

  const metrics = calculateMetrics()

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  }

  const trafficChartData = {
    labels: data?.overview.dates.map(date => format(new Date(date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Sessions',
        data: data?.overview.metrics.sessions || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Users',
        data: data?.overview.metrics.users || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const topPagesChartData = {
    labels: data?.topPages.slice(0, 5).map(p => 
      p.page.length > 30 ? p.page.substring(0, 30) + '...' : p.page
    ) || [],
    datasets: [{
      label: 'Sessions',
      data: data?.topPages.slice(0, 5).map(p => p.sessions) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-2 text-gray-600">
                {data?.metadata.propertyName 
                  ? `Viewing data for ${data.metadata.propertyName}`
                  : 'Connect Google Analytics to view your site metrics'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
                            <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsRefreshing(true)
                  fetchAnalytics(true)
                }}
                disabled={isRefreshing || loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load analytics</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {error.includes('not connected') && (
              <Button onClick={() => window.location.href = '/settings'}>
                Connect Google Analytics
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.sessions.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data?.metadata.dateRange.startDate} - {data?.metadata.dateRange.endDate}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Unique Users</CardTitle>
                  <Users className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.users.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Visitors to your site</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Page Views</CardTitle>
                  <Eye className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.pageviews.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total page views</p>
                </CardContent>
              </Card>
            </div>

            {/* Traffic Trends Chart */}
            <Card className="mb-8">
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
                      options={{
                        ...chartOptions,
                        indexAxis: 'y' as const,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: { display: false }
                        }
                      }} 
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {data?.topPages.slice(5).map((page, index) => (
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
                    {data?.trafficSources.map((source, index) => {
                      const percentage = Math.round((source.sessions / metrics.sessions) * 100)
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
        )}
      </div>
    </div>
  )
}