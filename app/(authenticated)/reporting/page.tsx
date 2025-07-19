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
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [gaError, setGaError] = useState<string | null>(null)
  const [scError, setScError] = useState<string | null>(null)
  const [gaData, setGaData] = useState<AnalyticsData | null>(null)
  const [scData, setScData] = useState<SearchConsoleData | null>(null)
  const [selectedRange, setSelectedRange] = useState('30days')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Property selector states
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([])
  const [searchConsoleSites, setSearchConsoleSites] = useState<SearchConsoleSite[]>([])
  const [currentGA4Property, setCurrentGA4Property] = useState<string>('')
  const [currentSearchConsoleSite, setCurrentSearchConsoleSite] = useState<string>('')
  const [loadingProperties, setLoadingProperties] = useState(false)
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
    const cacheKey = getCacheKey('ga4', selectedRange, currentGA4Property)

    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log('Using cached GA4 data')
      return cachedData
    }

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
      throw new Error(error.error || 'Failed to fetch GA4 data')
    }

    const result = await response.json()

    // Transform GA4 API response to match our AnalyticsData interface
    const transformedData = transformGA4Response(result.data, dateRange)

    // Cache the result
    setCachedData(cacheKey, transformedData)

    return transformedData
  }

  const fetchSearchConsoleData = async (dateRange: { startDate: string; endDate: string }): Promise<SearchConsoleData> => {
    const cacheKey = getCacheKey('sc', selectedRange, currentSearchConsoleSite)

    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log('Using cached Search Console data')
      return cachedData
    }

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
      throw new Error(error.error || 'Failed to fetch Search Console data')
    }

    const result = await response.json()

    // Transform Search Console API response to match our SearchConsoleData interface
    const transformedData = transformSearchConsoleResponse(result.data, dateRange)

    // Cache the result
    setCachedData(cacheKey, transformedData)

    return transformedData
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
        propertyId: currentGA4Property,
        propertyName: ga4Properties.find(p => p.propertyId === currentGA4Property)?.propertyName || '',
        dateRange
      }
    }
  }

  const transformSearchConsoleResponse = (apiData: any, dateRange: { startDate: string; endDate: string }): SearchConsoleData => {
    // Extract data from Search Console response
    const overview = apiData.overview || {}
    const topQueries = apiData.topQueries || []
    const topPages = apiData.topPages || []
    const performanceByDate = apiData.performanceByDate || []

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
      performanceByDate: performanceByDate.map((item: any) => ({
        date: item.keys?.[0] || item.date || '',
        clicks: item.clicks || 0,
        impressions: item.impressions || 0,
        ctr: item.ctr || 0,
        position: item.position || 0
      })),
      metadata: {
        siteUrl: currentSearchConsoleSite,
        siteName: searchConsoleSites.find(s => s.siteUrl === currentSearchConsoleSite)?.siteName || '',
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

  // Fetch available properties and sites
  const fetchProperties = async () => {
    setLoadingProperties(true)
    try {
      // Fetch real GA4 properties and Search Console sites in parallel
      const [ga4Props, scSites] = await Promise.all([
        fetchGA4Properties(),
        fetchSearchConsoleSites()
      ])

      setGa4Properties(ga4Props)
      setCurrentGA4Property(ga4Props[0]?.propertyId || '')

      setSearchConsoleSites(scSites)
      setCurrentSearchConsoleSite(scSites[0]?.siteUrl || '')

    } catch (error) {
      console.error('Failed to fetch properties:', error)
      // Set empty arrays on error
      setGa4Properties([])
      setSearchConsoleSites([])
    } finally {
      setLoadingProperties(false)
    }
  }

  // Update GA4 property (mock version)
  const updateGA4Property = async (propertyId: string) => {
    setSavingGA4(true)
    try {
      // Clear GA4 cache when property changes
      clearRelatedCache('ga4')

      const property = ga4Properties.find(p => p.propertyId === propertyId)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800))

      setCurrentGA4Property(propertyId)
      toast('GA4 property updated successfully', 'success')

      // Auto-sync Search Console site based on GA4 property name
      if (property?.propertyName && isSearchConsoleAutoSynced) {
        // Simple matching logic - find site with similar domain/name
        let matchingSite = null
        const propertyName = property.propertyName.toLowerCase()

        // Try to match by domain or dealership name
        matchingSite = searchConsoleSites.find(site => {
          const siteDomain = new URL(site.siteUrl).hostname.toLowerCase()
          const siteName = site.siteName.toLowerCase()

          // Check if property name contains keywords that match the site
          return propertyName.includes(siteDomain.replace('www.', '').split('.')[0]) ||
                 siteName.includes(propertyName.split(' ')[0]) ||
                 propertyName.includes(siteName.split(' ')[0])
        })

        if (matchingSite && matchingSite.siteUrl !== currentSearchConsoleSite) {
          // Auto-update Search Console site
          await updateSearchConsoleSite(matchingSite.siteUrl)
          toast('Search Console site automatically matched to GA4 property', 'info')
        }
      }

      // Refresh analytics data
      fetchAllData()
    } catch (error) {
      toast('Failed to update GA4 property', 'error')
    } finally {
      setSavingGA4(false)
    }
  }

  // Update Search Console site (mock version)
  const updateSearchConsoleSite = async (siteUrl: string) => {
    setSavingSC(true)
    try {
      // Clear Search Console cache when site changes
      clearRelatedCache('sc')

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600))

      setCurrentSearchConsoleSite(siteUrl)
      toast('Search Console site updated successfully', 'success')

      // Refresh analytics data
      fetchAllData()
    } catch (error) {
      toast('Failed to update Search Console site', 'error')
    } finally {
      setSavingSC(false)
    }
  }

  // Generate realistic mock analytics data
  const generateMockAnalyticsData = (dateRange: {startDate: string, endDate: string}) => {
    // Generate realistic dates array
    const dates = []
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(format(d, 'yyyy-MM-dd'))
    }
    
    // Generate realistic daily metrics for a car dealership
    const dailySessions = dates.map(() => Math.floor(Math.random() * 50) + 25) // 25-75 sessions/day
    const dailyUsers = dailySessions.map(sessions => Math.floor(sessions * 0.85)) // ~85% unique users
    const dailyPageviews = dailySessions.map(sessions => Math.floor(sessions * 2.3)) // ~2.3 pages per session
    const dailyOrganicSessions = dailySessions.map(sessions => Math.floor(sessions * 0.45)) // ~45% organic
    
    // GA4 Mock Data
    const mockGA4Data: AnalyticsData = {
      overview: {
        dates,
        metrics: {
          sessions: dailySessions,
          totalUsers: dailyUsers,
          eventCount: dailyPageviews,
          organicSessions: dailyOrganicSessions // Add organic sessions
        }
      },
      topPages: [
        { page: '/new-vehicles', sessions: 245, eventCount: 578 },
        { page: '/used-vehicles', sessions: 189, eventCount: 423 },
        { page: '/service', sessions: 156, eventCount: 312 },
        { page: '/parts', sessions: 134, eventCount: 267 },
        { page: '/financing', sessions: 98, eventCount: 201 },
        { page: '/contact', sessions: 87, eventCount: 174 },
        { page: '/about', sessions: 65, eventCount: 130 }
      ],
      trafficSources: [
        { source: 'google', sessions: 423 },
        { source: 'direct', sessions: 298 },
        { source: 'facebook', sessions: 145 },
        { source: 'bing', sessions: 89 },
        { source: 'referral', sessions: 67 }
      ],
      metadata: {
        propertyId: currentGA4Property,
        propertyName: mockGA4Properties.find(p => p.propertyId === currentGA4Property)?.propertyName || '',
        dateRange
      }
    }
    
    // Search Console Mock Data - Realistic for car dealership
    const mockSCData: SearchConsoleData = {
      overview: {
        clicks: 1247, // Total clicks
        impressions: 34582, // Total impressions
        ctr: 0.036, // 3.6% CTR (realistic for automotive)
        position: 12.8 // Average position
      },
      topQueries: [
        { query: 'used cars near me', clicks: 145, impressions: 4523, ctr: 0.032, position: 8.2 },
        { query: 'ford dealership sarcoxie', clicks: 89, impressions: 1876, ctr: 0.047, position: 3.1 },
        { query: 'jay hatfield ford', clicks: 78, impressions: 1234, ctr: 0.063, position: 2.4 },
        { query: 'ford service sarcoxie missouri', clicks: 67, impressions: 2109, ctr: 0.032, position: 7.8 },
        { query: 'new ford trucks', clicks: 54, impressions: 3456, ctr: 0.016, position: 18.2 },
        { query: 'ford f-150 for sale', clicks: 49, impressions: 2876, ctr: 0.017, position: 15.6 },
        { query: 'car financing missouri', clicks: 43, impressions: 1987, ctr: 0.022, position: 11.3 },
        { query: 'ford parts sarcoxie', clicks: 38, impressions: 1456, ctr: 0.026, position: 9.8 },
        { query: 'oil change sarcoxie', clicks: 35, impressions: 1678, ctr: 0.021, position: 13.5 },
        { query: 'ford escape for sale', clicks: 32, impressions: 2345, ctr: 0.014, position: 19.7 }
      ],
      topPages: [
        { page: '/new-vehicles/ford-f-150', clicks: 234, impressions: 5678, ctr: 0.041, position: 8.9 },
        { page: '/used-vehicles', clicks: 189, impressions: 4532, ctr: 0.042, position: 9.1 },
        { page: '/service', clicks: 156, impressions: 3987, ctr: 0.039, position: 10.3 },
        { page: '/new-vehicles', clicks: 145, impressions: 4123, ctr: 0.035, position: 11.2 },
        { page: '/financing', clicks: 98, impressions: 2876, ctr: 0.034, position: 12.8 },
        { page: '/contact', clicks: 87, impressions: 2145, ctr: 0.041, position: 8.7 }
      ],
      performanceByDate: {
        dates,
        metrics: {
          clicks: dates.map(() => Math.floor(Math.random() * 30) + 20), // 20-50 clicks/day
          impressions: dates.map(() => Math.floor(Math.random() * 800) + 600), // 600-1400 impressions/day
          ctr: dates.map(() => (Math.random() * 0.03) + 0.025), // 2.5-5.5% CTR
          position: dates.map(() => (Math.random() * 8) + 8) // Position 8-16
        }
      },
      top10AveragePosition: {
        position: 8.7 // Good average position for top 10 queries
      },
      metadata: {
        siteUrl: currentSearchConsoleSite,
        dateRange
      }
    }
    
    return { mockGA4Data, mockSCData }
  }

  // Fetch both GA4 and Search Console data (mock version)
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
        // Fallback to mock data for GA4
        const { mockGA4Data } = generateMockAnalyticsData(dateRange)
        setGaData(mockGA4Data)
      }

      // Handle Search Console results
      if (scResult.status === 'fulfilled') {
        setScData(scResult.value)
        setScError(null)
      } else {
        console.error('Search Console fetch failed:', scResult.reason)
        setScError(scResult.reason?.message || 'Failed to load Search Console data')
        // Fallback to mock data for Search Console
        const { mockSCData } = generateMockAnalyticsData(dateRange)
        setScData(mockSCData)
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

      // Fallback to mock data on complete failure
      const dateRange = DATE_RANGES.find(r => r.value === selectedRange)?.getDates()
      if (dateRange) {
        const { mockGA4Data, mockSCData } = generateMockAnalyticsData(dateRange)
        setGaData(mockGA4Data)
        setScData(mockSCData)
      }
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
    fetchProperties()
  }, [selectedRange])

  // Auto-sync Search Console when properties are loaded
  useEffect(() => {
    if (isSearchConsoleAutoSynced && ga4Properties.length > 0 && searchConsoleSites.length > 0 && currentGA4Property) {
      const property = ga4Properties.find(p => p.propertyId === currentGA4Property)
      if (property?.propertyName) {
        // Smart matching logic based on domain/name similarity
        let matchingSite = null
        const propertyName = property.propertyName.toLowerCase()

        matchingSite = searchConsoleSites.find(site => {
          const siteDomain = new URL(site.siteUrl).hostname.toLowerCase()
          const siteName = site.siteName.toLowerCase()

          // Check if property name contains keywords that match the site
          return propertyName.includes(siteDomain.replace('www.', '').split('.')[0]) ||
                 siteName.includes(propertyName.split(' ')[0]) ||
                 propertyName.includes(siteName.split(' ')[0])
        })

        if (matchingSite && matchingSite.siteUrl !== currentSearchConsoleSite) {
          // Auto-update Search Console site
          updateSearchConsoleSite(matchingSite.siteUrl)
        }
      }
    }
  }, [currentGA4Property, isSearchConsoleAutoSynced, ga4Properties, searchConsoleSites])

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

        {/* Property Selectors */}
        <div className="mb-6 p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Data Sources</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/settings', '_blank')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GA4 Property Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <label className="text-sm font-medium text-gray-700">GA4 Property</label>
              </div>
              <Select 
                value={currentGA4Property} 
                onValueChange={updateGA4Property}
                disabled={loadingProperties || savingGA4}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingProperties ? "Loading..." : "Select GA4 property"} />
                </SelectTrigger>
                <SelectContent>
                  {ga4Properties.map((property) => (
                    <SelectItem key={property.propertyId} value={property.propertyId}>
                      <div className="flex flex-col">
                        <span className="font-medium">{property.propertyName}</span>
                        <span className="text-xs text-gray-500">
                          {property.accountName} • ID: {property.propertyId}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingGA4 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating property..
                </div>
              )}
            </div>

            {/* Search Console Site Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-green-500" />
                  <label className="text-sm font-medium text-gray-700">Search Console Site</label>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="auto-sync-switch" className="text-xs text-gray-500">Auto-sync</label>
                  <Switch
                    id="auto-sync-switch"
                    checked={isSearchConsoleAutoSynced}
                    onCheckedChange={(checked) => setIsSearchConsoleAutoSynced(checked)}
                  />
                </div>
              </div>
              <Select 
                value={currentSearchConsoleSite} 
                onValueChange={updateSearchConsoleSite}
                disabled={loadingProperties || savingSC || isSearchConsoleAutoSynced}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    loadingProperties ? "Loading..." : 
                    isSearchConsoleAutoSynced ? "Auto-synced with GA4 property" :
                    "Select Search Console site"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {searchConsoleSites.filter(site => site.canUseApi).map((site) => (
                    <SelectItem key={site.siteUrl} value={site.siteUrl}>
                      <div className="flex flex-col">
                        <span className="font-medium">{site.siteName}</span>
                        <span className="text-xs text-gray-500">
                          {site.siteUrl} • {site.hasFullAccess ? 'Full Access' : 'Restricted'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingSC && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating site..
                </div>
              )}
              {isSearchConsoleAutoSynced && (
                <p className="text-xs text-gray-500">
                  Search Console site is automatically matched to the selected GA4 property
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
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
