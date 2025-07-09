'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertCircle,
  Search,
  MousePointerClick,
  Percent,
  Hash
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Import tab components
import OverviewTab from './components/OverviewTab'
import TrafficTab from './components/TrafficTab'
import SearchTab from './components/SearchTab'

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
      activeUsers?: number[]
      screenPageViews?: number[]
    }
  }
  topPages: Array<{
    page: string
    sessions: number
    screenPageViews: number
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

interface SearchConsoleData {
  overview: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  topQueries: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  topPages: Array<{
    page: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  performanceByDate: {
    dates: string[]
    metrics: {
      clicks: number[]
      impressions: number[]
      ctr: number[]
      position: number[]
    }
  }
  metadata: {
    siteUrl: string
    dateRange: {
      startDate: string
      endDate: string
    }
  }
}

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [gaError, setGaError] = useState<string | null>(null)
  const [scError, setScError] = useState<string | null>(null)
  const [gaData, setGaData] = useState<AnalyticsData | null>(null)
  const [scData, setScData] = useState<SearchConsoleData | null>(null)
  const [selectedRange, setSelectedRange] = useState('30days')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Fetch both GA4 and Search Console data
  const fetchAllData = async (showLoadingToast = false) => {
    try {
      setLoading(true)
      setGaError(null)
      setScError(null)
      
      if (showLoadingToast) {
        toast('Refreshing data...', 'info', {
          description: 'Fetching latest analytics from all sources'
        })
      }

      const dateRange = DATE_RANGES.find(r => r.value === selectedRange)?.getDates()
      if (!dateRange) return

      // Fetch GA4 data (required)
      const gaResponse = await fetch('/api/ga4/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dateRange)
      })

      const gaResult = await gaResponse.json()

      // Handle GA4 response
      if (!gaResponse.ok) {
        setGaError(gaResult.error || 'Failed to fetch analytics')
      } else {
        setGaData(gaResult.data)
      }

      // Try to fetch Search Console data (optional)
      try {
        const scResponse = await fetch('/api/search-console/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dateRange)
        })

        const scResult = await scResponse.json()

        // Handle Search Console response
        if (!scResponse.ok) {
          setScError(scResult.error || 'Search Console not connected')
        } else {
          setScData(scResult.data)
        }
      } catch (scErr) {
        // Search Console is optional - don't fail if it's not connected
        setScError('Search Console not connected')
        console.log('Search Console not available:', scErr)
      }

      // Show cache notification if GA4 is cached
      if (gaResult.cached && showLoadingToast) {
        toast('Data loaded from cache', 'info', {
          description: 'Showing cached data from the last 5 minutes'
        })
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
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
    fetchAllData()
  }, [selectedRange])

  // Calculate GA4 summary metrics
  const calculateGaMetrics = () => {
    if (!gaData?.overview.metrics) return { sessions: 0, users: 0, pageviews: 0 }
    
    const sum = (arr: number[] = []) => arr.reduce((a, b) => a + b, 0)
    
    return {
      sessions: sum(gaData.overview.metrics.sessions),
      users: sum(gaData.overview.metrics.activeUsers),
      pageviews: sum(gaData.overview.metrics.screenPageViews)
    }
  }

  const gaMetrics = calculateGaMetrics()

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

  if (loading && !gaData && !scData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Unified Analytics Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive insights from Google Analytics and Search Console
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
                  fetchAllData(true)
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

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-4">
            <TabsTrigger value="overview">GA4 Overview</TabsTrigger>
            <TabsTrigger value="traffic">GA4 Traffic Analytics</TabsTrigger>
            <TabsTrigger value="search">GA4 Search Performance</TabsTrigger>
            <TabsTrigger value="searchconsole">Search Console Performance</TabsTrigger>
          </TabsList>

          {/* GA4 Overview Tab - Combined Metrics */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab
              gaData={gaData}
              scData={scData}
              gaError={gaError}
              scError={scError}
              gaMetrics={gaMetrics}
              chartOptions={chartOptions}
            />
          </TabsContent>

          {/* GA4 Traffic Analytics Tab - GA4 Focused */}
          <TabsContent value="traffic" className="space-y-6">
            <TrafficTab
              gaData={gaData}
              gaError={gaError}
              gaMetrics={gaMetrics}
              chartOptions={chartOptions}
            />
          </TabsContent>

          {/* GA4 Search Performance Tab - GA4 Focused */}
          <TabsContent value="search" className="space-y-6">
            <TrafficTab
              gaData={gaData}
              gaError={gaError}
              gaMetrics={gaMetrics}
              chartOptions={chartOptions}
            />
          </TabsContent>

          {/* Search Console Performance Tab - Search Console Focused */}
          <TabsContent value="searchconsole" className="space-y-6">
            <SearchTab
              scData={scData}
              scError={scError}
              chartOptions={chartOptions}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}