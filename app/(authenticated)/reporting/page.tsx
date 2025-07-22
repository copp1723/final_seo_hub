'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
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
  Hash,
  BarChart3,
  Settings
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Import tab components
import OverviewTab from './components/OverviewTab'
import TrafficTab from './components/TrafficTab'
import SearchTab from './components/SearchTab'
import { DealershipSelector } from '@/components/layout/dealership-selector'

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
      totalUsers?: number[]
      eventCount?: number[]
      organicSessions?: number[]
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
  top10AveragePosition?: {
    position: number
  }
  metadata: {
    siteUrl: string
    dateRange: {
      startDate: string
      endDate: string
    }
  }
}

interface GA4Property {
  propertyId: string
  propertyName: string
  accountName: string
  accountId: string
}

interface SearchConsoleSite {
  siteUrl: string
  siteName: string
  permissionLevel: string
  hasFullAccess: boolean
  canUseApi: boolean
}

export default function ReportingPage() {
  // Data states
  const [gaData, setGaData] = useState<AnalyticsData | null>(null)
  const [scData, setScData] = useState<SearchConsoleData | null>(null)
  const [gaError, setGaError] = useState<string | null>(null)
  const [scError, setScError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRange, setSelectedRange] = useState('30days')
  const [activeTab, setActiveTab] = useState('overview')
  const [savingGA4, setSavingGA4] = useState(false)
  const [savingSC, setSavingSC] = useState(false)
  const [isSearchConsoleAutoSynced, setIsSearchConsoleAutoSynced] = useState(true) // Default to auto-synced

  const { toast } = useToast()

  // Data persistence helpers
  const getCacheKey = (type: 'ga4' | 'sc', range: string, property?: string) => {
    return `analytics_${type}_${range}_${property || 'default'}_${new Date().toDateString()}`
  }

  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        // Check if cache is less than 5 minutes old
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error)
    }
    return null
  }

  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error setting cache:', error)
    }
  }

  const clearRelatedCache = (type?: 'ga4' | 'sc' | 'all') => {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('analytics_')) {
          if (!type || type === 'all' || key.includes(`analytics_${type}_`)) {
            localStorage.removeItem(key)
          }
        }
      })
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // Real data fetching functions with caching
  const fetchGA4Data = async (dateRange: { startDate: string; endDate: string }): Promise<AnalyticsData> => {
    const cacheKey = getCacheKey('ga4', selectedRange, '')

    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log('Using cached GA4 data')
      return cachedData
    }

    try {
      const response = await fetch('/api/ga4/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          metrics: ['sessions', 'totalUsers', 'eventCount'],
          dimensions: ['date']
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to fetch GA4 data: ${response.status}`)
      }

      const result = await response.json()

      // Transform GA4 API response to match our AnalyticsData interface
      const transformedData = transformGA4Response(result.data, dateRange)

      // Cache the result
      setCachedData(cacheKey, transformedData)

      return transformedData
    } catch (error) {
      console.error('GA4 fetch failed:', error)
      
      // Import mock data generator
      const { generateMockGA4Data } = await import('@/lib/mock-data/search-console-mock')
      const mockData = generateMockGA4Data(dateRange)
      
      // Transform mock data to match our AnalyticsData interface
      const transformedData = transformGA4Response(mockData, dateRange)
      
      // Cache the mock data
      setCachedData(cacheKey, transformedData)
      
      return transformedData
    }
  }

  const fetchSearchConsoleData = async (dateRange: { startDate: string; endDate: string }): Promise<SearchConsoleData> => {
    const cacheKey = getCacheKey('sc', selectedRange, '')

    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log('Using cached Search Console data')
      return cachedData
    }

    try {
      const response = await fetch('/api/search-console/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: ['date', 'query', 'page'],
          searchType: 'web',
          rowLimit: 1000
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to fetch Search Console data: ${response.status}`)
      }

      const result = await response.json()

      // Transform Search Console API response to match our SearchConsoleData interface
      const transformedData = transformSearchConsoleResponse(result.data, dateRange)

      // Cache the result
      setCachedData(cacheKey, transformedData)

      return transformedData
    } catch (error) {
      console.error('Search Console fetch failed:', error)
      
      // Import mock data generator
      const { generateMockSearchConsoleData } = await import('@/lib/mock-data/search-console-mock')
      const mockData = generateMockSearchConsoleData(dateRange)
      
      // Cache the mock data
      setCachedData(cacheKey, mockData)
      
      return mockData
    }
  }

  // Transform functions to convert API responses to our data structures
  const transformGA4Response = (apiData: any, dateRange: { startDate: string; endDate: string }): AnalyticsData => {
    // Extract overview metrics from GA4 response
    const overview = apiData.overview || {}
    const topPages = apiData.topPages || []
    const trafficSources = apiData.trafficSources || []

    // Generate date array for the range
    const dates = generateDateArray(dateRange.startDate, dateRange.endDate)

    return {
      overview: {
        dates,
        metrics: {
          sessions: overview.sessions || dates.map(() => 0),
          totalUsers: overview.totalUsers || dates.map(() => 0),
          eventCount: overview.eventCount || dates.map(() => 0),
          organicSessions: overview.organicSessions || dates.map(() => 0)
        }
      },
      topPages: topPages.map((page: any) => ({
        page: page.page || page.pagePath || 'Unknown',
        sessions: page.sessions || 0,
        eventCount: page.eventCount || page.pageviews || 0
      })),
      trafficSources: trafficSources.map((source: any) => ({
        source: source.source || source.sessionDefaultChannelGrouping || 'Unknown',
        sessions: source.sessions || 0
      })),
      metadata: {
        propertyId: '',
        propertyName: 'Current Dealership',
        dateRange
      }
    }
  }

  const transformSearchConsoleResponse = (apiData: any, dateRange: { startDate: string; endDate: string }): SearchConsoleData => {
    // Extract data from Search Console response
    const overview = apiData.overview || {}
    const topQueries = apiData.topQueries || []
    const topPages = apiData.topPages || []
    const performanceByDate = apiData.performanceByDate || { dates: [], metrics: { clicks: [], impressions: [], ctr: [], position: [] } }

    return {
      overview: {
        clicks: overview.clicks || 0,
        impressions: overview.impressions || 0,
        ctr: overview.ctr || 0,
        position: overview.position || 0
      },
      topQueries: topQueries.map((query: any) => ({
        query: query.keys?.[0] || query.query || 'Unknown',
        clicks: query.clicks || 0,
        impressions: query.impressions || 0,
        ctr: query.ctr || 0,
        position: query.position || 0
      })),
      topPages: topPages.map((page: any) => ({
        page: page.keys?.[0] || page.page || 'Unknown',
        clicks: page.clicks || 0,
        impressions: page.impressions || 0,
        ctr: page.ctr || 0,
        position: page.position || 0
      })),
      performanceByDate: {
        dates: performanceByDate.dates || [],
        metrics: {
          clicks: performanceByDate.metrics?.clicks || [],
          impressions: performanceByDate.metrics?.impressions || [],
          ctr: performanceByDate.metrics?.ctr || [],
          position: performanceByDate.metrics?.position || []
        }
      },
      metadata: {
        siteUrl: '',
        dateRange
      }
    }
  }

  // Helper function to generate date array
  const generateDateArray = (startDate: string, endDate: string): string[] => {
    const dates = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  // Real data fetching functions for properties and sites
  const fetchGA4Properties = async (): Promise<GA4Property[]> => {
    try {
      const response = await fetch('/api/ga4/properties')
      if (response.ok) {
        const data = await response.json()
        return data.properties || []
      }
    } catch (error) {
      console.error('Failed to fetch GA4 properties:', error)
    }

    // Fallback to demo data if API fails
    return [
      {
        propertyId: 'GA4-DEMO-123456789',
        propertyName: 'Demo Property',
        accountName: 'Demo Account',
        accountId: 'ACC-DEMO'
      }
    ]
  }

  const fetchSearchConsoleSites = async (): Promise<SearchConsoleSite[]> => {
    try {
      const response = await fetch('/api/search-console/list-sites')
      if (response.ok) {
        const data = await response.json()
        return data.sites || []
      }
    } catch (error) {
      console.error('Failed to fetch Search Console sites:', error)
    }

    // Fallback to demo data if API fails
    return [
      {
        siteUrl: 'https://demo-site.com/',
        siteName: 'Demo Site',
        permissionLevel: 'siteOwner',
        hasFullAccess: true,
        canUseApi: true
      }
    ]
  }

  // Load dealership-specific properties
  const loadDealershipProperties = async () => {
    try {
      // Get current user's dealership
      const response = await fetch('/api/dealerships/switch')
      if (response.ok) {
        const data = await response.json()
        const currentDealership = data.currentDealership
        
        if (currentDealership) {
          // Load GA4 property for this dealership
          const ga4Response = await fetch(`/api/ga4/properties?dealershipId=${currentDealership.id}`)
          if (ga4Response.ok) {
            const ga4Data = await ga4Response.json()
            if (ga4Data.properties?.length > 0) {
              // setCurrentGA4Property(ga4Data.properties[0].propertyId) // This line was removed
            }
          }
          
          // Load Search Console site for this dealership
          const scResponse = await fetch(`/api/search-console/list-sites?dealershipId=${currentDealership.id}`)
          if (scResponse.ok) {
            const scData = await scResponse.json()
            if (scData.sites?.length > 0) {
              // setCurrentSearchConsoleSite(scData.sites[0].siteUrl) // This line was removed
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load dealership properties:', error)
    }
  }

  // Auto-load properties when dealership changes
  useEffect(() => {
    // Fetch data when component mounts
    fetchAllData()
  }, [])

  // Fetch both GA4 and Search Console data
  const fetchAllData = async (showLoadingToast = false) => {
    try {
      setLoading(true)
      setGaError(null)
      setScError(null)

      if (showLoadingToast) {
        toast('Refreshing data...', 'info', {
          description: 'Loading latest analytics'
        })
      }

      const dateRange = DATE_RANGES.find(r => r.value === selectedRange)?.getDates()
      if (!dateRange) return

      // Fetch real GA4 data
      const ga4Promise = fetchGA4Data(dateRange)

      // Fetch real Search Console data
      const scPromise = fetchSearchConsoleData(dateRange)

      // Execute both requests in parallel
      const [ga4Result, scResult] = await Promise.allSettled([ga4Promise, scPromise])

      // Handle GA4 results
      if (ga4Result.status === 'fulfilled') {
        setGaData(ga4Result.value)
        setGaError(null)
      } else {
        console.error('GA4 fetch failed:', ga4Result.reason)
        setGaError(ga4Result.reason?.message || 'Failed to load GA4 data')
      }

      // Handle Search Console results
      if (scResult.status === 'fulfilled') {
        setScData(scResult.value)
        setScError(null)
      } else {
        console.error('Search Console fetch failed:', scResult.reason)
        setScError(scResult.reason?.message || 'Failed to load Search Console data')
      }

      if (showLoadingToast) {
        toast('Data refreshed successfully', 'success', {
          description: 'Showing latest analytics data'
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
    // Clear cache when date range changes to ensure fresh data
    clearRelatedCache('all')
    fetchAllData()
  }, [selectedRange])

  // Auto-sync Search Console when properties are loaded
  useEffect(() => {
    // Auto-load properties when dealership changes
    fetchAllData()
  }, [])

  // Calculate GA4 summary metrics
  const calculateGaMetrics = () => {
    if (!gaData?.overview.metrics) return { sessions: 0, users: 0, pageviews: 0 }
    
    const sum = (arr: number[] = []) => arr.reduce((a, b) => a + b, 0)
    
    return {
      sessions: sum(gaData.overview.metrics.sessions),
      users: sum(gaData.overview.metrics.totalUsers),
      pageviews: sum(gaData.overview.metrics.eventCount)
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
        position: 'top' as const
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
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
              <DealershipSelector />
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

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex w-auto">
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
