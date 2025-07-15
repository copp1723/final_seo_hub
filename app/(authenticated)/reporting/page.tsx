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

  // Fetch available properties and sites
  const fetchProperties = async () => {
    setLoadingProperties(true)
    try {
      // Fetch GA4 properties
      const ga4Response = await fetch('/api/ga4/list-properties')
      if (ga4Response.ok) {
        const ga4Data = await ga4Response.json()
        setGa4Properties(ga4Data.properties || [])
        setCurrentGA4Property(ga4Data.currentPropertyId || '')
      }

      // Fetch Search Console sites
      const scResponse = await fetch('/api/search-console/list-sites')
      if (scResponse.ok) {
        const scData = await scResponse.json()
        setSearchConsoleSites(scData.sites || [])
        setCurrentSearchConsoleSite(scData.currentSiteUrl || '')
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    } finally {
      setLoadingProperties(false)
    }
  }

  // Update GA4 property
  const updateGA4Property = async (propertyId: string) => {
    setSavingGA4(true)
    try {
      const property = ga4Properties.find(p => p.propertyId === propertyId)
      const response = await fetch('/api/ga4/set-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          propertyName: property?.propertyName || `Property ${propertyId}`
        })
      })
      
      if (response.ok) {
        setCurrentGA4Property(propertyId)
        toast('GA4 property updated successfully', 'success')
        
        // Auto-sync Search Console site based on GA4 property name
        if (property?.propertyName) {
          // Extract domain from property name (e.g., "AcuraColumbus.com - GA4" -> "acuracolumbus.com")
          const domainMatch = property.propertyName.match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2}/i)
          
          if (domainMatch) {
            const domain = domainMatch[0].toLowerCase()
            
            // Find matching Search Console site
            const matchingSite = searchConsoleSites.find(site => {
              const siteUrl = site.siteUrl.toLowerCase()
              // Check if the site URL contains the domain
              return siteUrl.includes(domain) || 
                     siteUrl.includes(`www.${domain}`) ||
                     siteUrl === `https://${domain}/` ||
                     siteUrl === `https://www.${domain}/` ||
                     siteUrl === `http://${domain}/` ||
                     siteUrl === `http://www.${domain}/`
            })
            
            if (matchingSite && matchingSite.siteUrl !== currentSearchConsoleSite) {
              // Auto-update Search Console site
              await updateSearchConsoleSite(matchingSite.siteUrl)
              toast('Search Console site automatically matched to GA4 property', 'info')
            } else if (!matchingSite) {
              toast('No matching Search Console site found for this GA4 property', 'info')
            }
          }
        }
        
        // Refresh analytics data
        fetchAllData()
      } else {
        const error = await response.json()
        toast('Failed to update GA4 property', 'error', { description: error.error })
      }
    } catch (error) {
      toast('Failed to update GA4 property', 'error')
    } finally {
      setSavingGA4(false)
    }
  }

  // Update Search Console site
  const updateSearchConsoleSite = async (siteUrl: string) => {
    setSavingSC(true)
    try {
      const response = await fetch('/api/search-console/primary-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl })
      })
      
      if (response.ok) {
        setCurrentSearchConsoleSite(siteUrl)
        toast('Search Console site updated successfully', 'success')
        // Refresh analytics data
        fetchAllData()
      } else {
        const error = await response.json()
        toast('Failed to update Search Console site', 'error', { description: error.error })
      }
    } catch (error) {
      toast('Failed to update Search Console site', 'error')
    } finally {
      setSavingSC(false)
    }
  }

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
    fetchProperties()
  }, [selectedRange])

  // Auto-sync Search Console when properties are loaded
  useEffect(() => {
    if (isSearchConsoleAutoSynced && ga4Properties.length > 0 && searchConsoleSites.length > 0 && currentGA4Property) {
      const property = ga4Properties.find(p => p.propertyId === currentGA4Property)
      if (property?.propertyName) {
        // Extract domain from property name
        const domainMatch = property.propertyName.match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2}/i)
        
        if (domainMatch) {
          const domain = domainMatch[0].toLowerCase()
          
          // Find matching Search Console site
          const matchingSite = searchConsoleSites.find(site => {
            const siteUrl = site.siteUrl.toLowerCase()
            return siteUrl.includes(domain) || 
                   siteUrl.includes(`www.${domain}`) ||
                   siteUrl === `https://${domain}/` ||
                   siteUrl === `https://www.${domain}/` ||
                   siteUrl === `http://${domain}/` ||
                   siteUrl === `http://www.${domain}/`
          })
          
          if (matchingSite && matchingSite.siteUrl !== currentSearchConsoleSite) {
            // Auto-update Search Console site
            updateSearchConsoleSite(matchingSite.siteUrl)
          }
        }
      }
    }
  }, [ga4Properties, searchConsoleSites, currentGA4Property, isSearchConsoleAutoSynced])

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
