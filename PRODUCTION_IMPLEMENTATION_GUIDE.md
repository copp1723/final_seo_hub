# 🚀 Complete Production Implementation Guide

## Table of Contents
1. [Demo Data Architecture](#demo-data-architecture)
2. [API Endpoint Structure](#api-endpoint-structure)
3. [UI Components Implementation](#ui-components-implementation)
4. [Data Flow & State Management](#data-flow--state-management)
5. [Production Migration Steps](#production-migration-steps)
6. [Database Schema Requirements](#database-schema-requirements)
7. [Authentication & Authorization](#authentication--authorization)
8. [Performance Optimization](#performance-optimization)

---

## Demo Data Architecture

### Core Demo Data Module (`/lib/demo-data.ts`)

The demo system is built around a centralized data module that provides realistic, consistent data for all analytics features.

#### **Data Structure Overview**

```typescript
// Core dealership configurations
const DEMO_DEALERSHIPS = [
  {
    id: 'demo-dealer-001',
    name: 'Premier Auto Dealership',
    package: 'GOLD',
    website: 'https://premier-auto-demo.com'
  },
  // ... additional dealerships
]
```

#### **Key Functions Implemented**

1. **`getDemoGA4Analytics(startDate, endDate, dealershipId)`**
   - Generates realistic GA4 traffic data
   - Package-based traffic multipliers
   - Weekend traffic patterns (30% lower)
   - Deterministic random generation for SSR compatibility

2. **`getDemoSearchConsoleData(startDate, endDate, dealershipId)`**
   - Search performance metrics
   - Automotive-specific keywords
   - Realistic CTR and position data
   - Query and page performance breakdowns

3. **`getDemoStats(dealershipId)`** & **`getDemoAnalytics(dealershipId)`**
   - Dashboard summary metrics
   - Package-specific progress tracking
   - Task completion statistics

#### **Production Implementation Notes**

**Replace demo functions with real API calls:**

```typescript
// Instead of: getDemoGA4Analytics()
// Implement: fetchRealGA4Analytics()
export const fetchRealGA4Analytics = async (startDate: string, endDate: string, dealershipId: string) => {
  // Connect to actual GA4 API
  const ga4Service = new GA4Service(userId)
  await ga4Service.initialize()
  
  const batchRequests = [
    {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'eventCount' }],
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    },
    // ... additional requests for top pages, traffic sources
  ]
  
  const reports = await ga4Service.batchRunReports(propertyId, batchRequests)
  return processGA4Reports(reports)
}
```

---

## API Endpoint Structure

### GA4 Analytics Endpoint (`/app/api/ga4/analytics/route.ts`)

#### **Demo Mode Integration**

```typescript
export async function POST(request: NextRequest) {
  // ... authentication & validation
  
  const { startDate, endDate, metrics, dimensions } = validationResult.data

  // Demo mode check
  if (features.demoMode) {
    logger.info('🎭 Returning demo GA4 analytics data', {
      userId: session.user.id,
      dateRange: { startDate, endDate }
    })

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    return NextResponse.json(getDemoGA4Analytics(startDate, endDate, user?.dealershipId || undefined))
  }

  // Production GA4 API calls here...
}
```

#### **Production Implementation**

**For production, remove demo mode check and implement:**

```typescript
// 1. Validate GA4 connection
const ga4Connection = await prisma.ga4_connections.findFirst({
  where: {
    users: { agencyId: user.agencyId }
  }
})

// 2. Initialize GA4 service
const ga4Service = new GA4Service(session.user.id)
await ga4Service.initialize()

// 3. Execute batch requests
const reports = await ga4Service.batchRunReports(ga4Connection.propertyId, batchRequests)

// 4. Process and return data
const processedData = {
  overview: processOverviewReport(reports[0]),
  topPages: processTopPagesReport(reports[1]),
  trafficSources: processTrafficSourcesReport(reports[2]),
  metadata: {
    propertyId: ga4Connection.propertyId,
    propertyName: ga4Connection.propertyName,
    dateRange: { startDate, endDate }
  }
}
```

### Search Console Endpoint (`/app/api/search-console/performance/route.ts`)

#### **Demo Mode Integration**

```typescript
// Check if demo mode is enabled
if (features.demoMode) {
  logger.info('🎭 Returning demo Search Console data', {
    userId: session.user.id,
    dateRange: { startDate, endDate }
  })

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { dealershipId: true }
  })

  return NextResponse.json(getDemoSearchConsoleData(startDate, endDate, user?.dealershipId || undefined))
}
```

#### **Production Implementation**

```typescript
// 1. Validate Search Console connection
const searchConsoleConnection = await prisma.search_console_connections.findFirst({
  where: { userId: session.user.id }
})

// 2. Initialize Search Console service
const searchConsoleService = await getSearchConsoleService(session.user.id)

// 3. Execute Search Console API requests
const performanceData = await searchConsoleService.searchanalytics.query({
  siteUrl: searchConsoleConnection.siteUrl,
  requestBody: {
    startDate,
    endDate,
    dimensions: ['date', 'query', 'page'],
    searchType: 'web',
    rowLimit: 1000
  }
})

// 4. Process and return structured data
```

---

## UI Components Implementation

### Analytics Dashboard (`/app/(authenticated)/reporting/page.tsx`)

#### **Core Architecture**

The reporting page uses a tabbed interface with the following structure:

```typescript
// Tab configuration
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
  <TabsList className="inline-flex w-auto">
    <TabsTrigger value="overview">GA4 Overview</TabsTrigger>
    <TabsTrigger value="traffic">GA4 Traffic Analytics</TabsTrigger>
    <TabsTrigger value="searchconsole">Search Console Performance</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-6">
    <OverviewTab gaData={gaData} scData={scData} ... />
  </TabsContent>
  
  <TabsContent value="traffic" className="space-y-6">
    <TrafficTab gaData={gaData} ... />
  </TabsContent>
  
  <TabsContent value="searchconsole" className="space-y-6">
    <SearchTab scData={scData} ... />
  </TabsContent>
</Tabs>
```

#### **Data Fetching Pattern**

```typescript
// Real data fetching functions
const fetchGA4Data = async (dateRange: { startDate: string; endDate: string }): Promise<AnalyticsData> => {
  // Check cache first
  const cacheKey = getCacheKey('ga4', selectedRange, '')
  const cachedData = getCachedData(cacheKey)
  if (cachedData) return cachedData

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

    const result = await response.json()
    const transformedData = transformGA4Response(result.data, dateRange)
    
    // Cache the result
    setCachedData(cacheKey, transformedData)
    return transformedData
  } catch (error) {
    // Handle errors appropriately
    throw error
  }
}
```

#### **Data Transformation Functions**

**Critical for production - these transform API responses to UI-compatible format:**

```typescript
const transformGA4Response = (apiData: any, dateRange: { startDate: string; endDate: string }): AnalyticsData => {
  const overview = apiData.overview || {}
  const topPages = apiData.topPages || []
  const trafficSources = apiData.trafficSources || []

  // Handle both response formats (demo returns metrics nested, real API might not)
  const metrics = overview.metrics || {}
  
  // Generate date array for the range or use provided dates
  const dates = overview.dates || generateDateArray(dateRange.startDate, dateRange.endDate)

  return {
    overview: {
      dates,
      metrics: {
        sessions: metrics.sessions || overview.sessions || dates.map(() => 0),
        totalUsers: metrics.totalUsers || overview.totalUsers || dates.map(() => 0),
        eventCount: metrics.eventCount || overview.eventCount || dates.map(() => 0),
        organicSessions: metrics.organicSessions || overview.organicSessions || dates.map(() => 0)
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
    metadata: apiData.metadata || {
      propertyId: '',
      propertyName: 'Current Dealership',
      dateRange
    }
  }
}
```

### Overview Tab Component (`/app/(authenticated)/reporting/components/OverviewTab.tsx`)

#### **Metric Cards Layout**

```typescript
{/* Combined Metrics Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* GA4 Metrics */}
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
      <Activity className="h-4 w-4 text-blue-500" />
    </CardHeader>
    <CardContent>
      {gaError ? (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-gray-500">No GA4 connected</span>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold">{gaMetrics.sessions.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All traffic sources</p>
        </>
      )}
    </CardContent>
  </Card>
  
  {/* Similar pattern for other metrics */}
</div>
```

#### **Chart Implementation**

```typescript
// Chart configuration for consistent styling
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
```

---

## Data Flow & State Management

### State Management Architecture

#### **Component State Structure**

```typescript
// Core data states
const [gaData, setGaData] = useState<AnalyticsData | null>(null)
const [scData, setScData] = useState<SearchConsoleData | null>(null)
const [gaError, setGaError] = useState<string | null>(null)
const [scError, setScError] = useState<string | null>(null)

// UI states
const [loading, setLoading] = useState(false)
const [isRefreshing, setIsRefreshing] = useState(false)
const [selectedRange, setSelectedRange] = useState('30days')
const [activeTab, setActiveTab] = useState('overview')
```

#### **Data Fetching Flow**

```typescript
// Triggered by dealership or date range changes
useEffect(() => {
  if (selectedDealership) {
    clearRelatedCache('all')
    fetchAllData()
  }
}, [selectedDealership])

useEffect(() => {
  clearRelatedCache('all')
  fetchAllData()
}, [selectedRange])

// Main data fetching function
const fetchAllData = async (showLoadingToast = false) => {
  try {
    setLoading(true)
    setGaError(null)
    setScError(null)

    const dateRange = DATE_RANGES.find(r => r.value === selectedRange)?.getDates()
    if (!dateRange) return

    // Execute both requests in parallel
    const [ga4Result, scResult] = await Promise.allSettled([
      fetchGA4Data(dateRange),
      fetchSearchConsoleData(dateRange)
    ])

    // Handle results
    if (ga4Result.status === 'fulfilled') {
      setGaData(ga4Result.value)
      setGaError(null)
    } else {
      setGaError(ga4Result.reason?.message || 'Failed to load GA4 data')
    }

    if (scResult.status === 'fulfilled') {
      setScData(scResult.value)
      setScError(null)
    } else {
      setScError(scResult.reason?.message || 'Failed to load Search Console data')
    }
  } catch (err) {
    // Handle errors
  } finally {
    setLoading(false)
    setIsRefreshing(false)
  }
}
```

### Caching Strategy

#### **Client-Side Caching Implementation**

```typescript
// Cache configuration
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
```

---

## Production Migration Steps

### Step 1: Environment Configuration

#### **Feature Flags Setup**

```typescript
// /app/lib/features.ts
export const features = {
  demoMode: process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  // Add other feature flags as needed
}
```

**Production Environment Variables:**
```bash
# Set these in production .env
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false

# GA4 Configuration
GA4_CLIENT_ID=your_ga4_client_id
GA4_CLIENT_SECRET=your_ga4_client_secret
GA4_REDIRECT_URI=your_redirect_uri

# Search Console Configuration
SEARCH_CONSOLE_CLIENT_ID=your_sc_client_id
SEARCH_CONSOLE_CLIENT_SECRET=your_sc_client_secret
```

### Step 2: API Integration

#### **GA4 Service Implementation**

**Create production GA4 service (`/lib/google/ga4Service.ts`):**

```typescript
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export class GA4Service {
  private analytics: any
  private auth: any
  
  constructor(private userId: string) {}

  async initialize() {
    // Get user's GA4 connection
    const connection = await prisma.ga4_connections.findFirst({
      where: { userId: this.userId }
    })

    if (!connection) {
      throw new Error('No GA4 connection found')
    }

    // Initialize OAuth2 client
    this.auth = new google.auth.OAuth2(
      process.env.GA4_CLIENT_ID,
      process.env.GA4_CLIENT_SECRET,
      process.env.GA4_REDIRECT_URI
    )

    this.auth.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    })

    this.analytics = google.analyticsdata({ version: 'v1beta', auth: this.auth })
  }

  async batchRunReports(propertyId: string, requests: any[]) {
    const batchRequests = requests.map(request => ({
      ...request,
      property: `properties/${propertyId}`
    }))

    const response = await this.analytics.properties.batchRunReports({
      property: `properties/${propertyId}`,
      requestBody: {
        requests: batchRequests
      }
    })

    return response.data.reports
  }
}
```

#### **Search Console Service Implementation**

```typescript
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function getSearchConsoleService(userId: string) {
  const connection = await prisma.search_console_connections.findFirst({
    where: { userId }
  })

  if (!connection) {
    throw new Error('No Search Console connection found')
  }

  const auth = new google.auth.OAuth2(
    process.env.SEARCH_CONSOLE_CLIENT_ID,
    process.env.SEARCH_CONSOLE_CLIENT_SECRET,
    process.env.SEARCH_CONSOLE_REDIRECT_URI
  )

  auth.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken
  })

  return google.webmasters({ version: 'v3', auth })
}
```

### Step 3: Database Schema Updates

#### **Required Tables for Production**

```sql
-- GA4 Connections
CREATE TABLE ga4_connections (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  dealershipId TEXT,
  accessToken TEXT NOT NULL,
  refreshToken TEXT,
  expiresAt TIMESTAMP,
  propertyId TEXT,
  propertyName TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (dealershipId) REFERENCES dealerships(id) ON DELETE CASCADE
);

-- Search Console Connections
CREATE TABLE search_console_connections (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  dealershipId TEXT,
  accessToken TEXT NOT NULL,
  refreshToken TEXT,
  expiresAt TIMESTAMP,
  siteUrl TEXT NOT NULL,
  siteName TEXT,
  permissionLevel TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (dealershipId) REFERENCES dealerships(id) ON DELETE CASCADE
);

-- Analytics Cache (Optional - for performance)
CREATE TABLE analytics_cache (
  id TEXT PRIMARY KEY,
  cacheKey TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 4: Authentication Flow

#### **OAuth Setup for GA4**

```typescript
// /app/api/ga4/auth/connect/route.ts
export async function GET(request: NextRequest) {
  const session = await SimpleAuth.getSessionFromRequest(request)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GA4_CLIENT_ID,
    process.env.GA4_CLIENT_SECRET,
    process.env.GA4_REDIRECT_URI
  )

  const scopes = [
    'https://www.googleapis.com/auth/analytics.readonly'
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: session.user.id // Pass user ID for callback
  })

  return NextResponse.redirect(authUrl)
}
```

#### **OAuth Callback Handler**

```typescript
// /app/api/ga4/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // User ID
  
  if (!code || !state) {
    return NextResponse.redirect('/settings?error=oauth_failed')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GA4_CLIENT_ID,
    process.env.GA4_CLIENT_SECRET,
    process.env.GA4_REDIRECT_URI
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    
    // Save tokens to database
    await prisma.ga4_connections.upsert({
      where: { userId: state },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updatedAt: new Date()
      },
      create: {
        id: generateId(),
        userId: state,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    })

    return NextResponse.redirect('/settings?success=ga4_connected')
  } catch (error) {
    console.error('GA4 OAuth callback error:', error)
    return NextResponse.redirect('/settings?error=oauth_failed')
  }
}
```

### Step 5: Data Processing Functions

#### **GA4 Report Processing**

```typescript
// Helper functions to process GA4 report data
function processOverviewReport(report: any) {
  if (!report?.rows) return { dates: [], metrics: {} }

  const dates: string[] = []
  const metricsData: Record<string, number[]> = {}

  // Initialize metrics arrays
  if (report.metricHeaders) {
    report.metricHeaders.forEach((header: any) => {
      metricsData[header.name] = []
    })
  }

  // Process rows
  report.rows.forEach((row: any) => {
    // Get date
    if (row.dimensionValues?.[0]?.value) {
      dates.push(row.dimensionValues[0].value)
    }

    // Get metric values
    if (row.metricValues) {
      row.metricValues.forEach((metric: any, index: number) => {
        const metricName = report.metricHeaders[index].name
        metricsData[metricName].push(parseInt(metric.value) || 0)
      })
    }
  })

  return { dates, metrics: metricsData }
}

function processTopPagesReport(report: any) {
  if (!report?.rows) return []

  return report.rows.map((row: any) => ({
    page: row.dimensionValues?.[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value) || 0,
    eventCount: parseInt(row.metricValues?.[1]?.value) || 0
  }))
}

function processTrafficSourcesReport(report: any) {
  if (!report?.rows) return []

  return report.rows.map((row: any) => ({
    source: row.dimensionValues?.[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value) || 0
  }))
}
```

#### **Search Console Data Processing**

```typescript
function processSearchConsoleData(rawData: any) {
  const { rows = [] } = rawData

  // Group by date for overview chart
  const dateMap = new Map()
  const queryMap = new Map()
  const pageMap = new Map()

  rows.forEach((row: any) => {
    const date = row.keys[0]
    const query = row.keys[1] 
    const page = row.keys[2]

    // Aggregate by date
    if (!dateMap.has(date)) {
      dateMap.set(date, { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 })
    }
    const dateData = dateMap.get(date)
    dateData.clicks += row.clicks
    dateData.impressions += row.impressions
    dateData.ctr += row.ctr
    dateData.position += row.position
    dateData.count += 1

    // Top queries
    if (!queryMap.has(query)) {
      queryMap.set(query, { clicks: 0, impressions: 0, ctr: 0, position: 0 })
    }
    const queryData = queryMap.get(query)
    queryData.clicks += row.clicks
    queryData.impressions += row.impressions
    queryData.ctr = row.ctr // Use individual CTR
    queryData.position = row.position

    // Top pages
    if (!pageMap.has(page)) {
      pageMap.set(page, { clicks: 0, impressions: 0, ctr: 0, position: 0 })
    }
    const pageData = pageMap.get(page)
    pageData.clicks += row.clicks
    pageData.impressions += row.impressions
    pageData.ctr = row.ctr
    pageData.position = row.position
  })

  // Process dates data
  const dates = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      clicks: data.clicks,
      impressions: data.impressions,
      ctr: data.ctr / data.count,
      position: data.position / data.count
    }))

  // Process top queries
  const queries = Array.from(queryMap.entries())
    .map(([query, data]) => ({ query, ...data }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  // Process top pages
  const pages = Array.from(pageMap.entries())
    .map(([page, data]) => ({ page, ...data }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  // Calculate summary
  const summary = {
    totalClicks: queries.reduce((sum, q) => sum + q.clicks, 0),
    totalImpressions: queries.reduce((sum, q) => sum + q.impressions, 0),
    averageCtr: queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length,
    averagePosition: queries.reduce((sum, q) => sum + q.position, 0) / queries.length
  }

  return {
    dates,
    queries,
    pages,
    summary
  }
}
```

---

## Performance Optimization

### Client-Side Caching Strategy

#### **Implementation Details**

```typescript
// Cache TTL: 5 minutes for real-time feeling with performance benefits
const CACHE_TTL = 5 * 60 * 1000

// Cache key generation
const getCacheKey = (type: 'ga4' | 'sc', range: string, dealershipId?: string) => {
  return `analytics_${type}_${range}_${dealershipId || 'default'}_${new Date().toDateString()}`
}

// Smart cache clearing
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
```

### Server-Side Optimization

#### **Database Query Optimization**

```typescript
// Efficient connection queries with proper indexing
const ga4Connection = await prisma.ga4_connections.findFirst({
  where: {
    users: {
      agencyId: user.agencyId
    }
  }
})

// Create indexes for performance
// CREATE INDEX idx_ga4_connections_user_agency ON ga4_connections(userId, dealershipId);
// CREATE INDEX idx_sc_connections_user_site ON search_console_connections(userId, siteUrl);
```

#### **API Response Caching**

```typescript
// Server-side cache implementation
const cache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(userId: string, params: any): string {
  return `${userId}-${JSON.stringify(params)}`
}

// In API handler
const cacheKey = getCacheKey(session.user.id, { startDate, endDate, metrics, dimensions })
const cachedData = cache.get(cacheKey)

if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
  return NextResponse.json({ data: cachedData.data, cached: true })
}

// ... fetch fresh data ...

// Cache the processed data
cache.set(cacheKey, { data: processedData, timestamp: Date.now() })

// Clean up old cache entries
if (cache.size > 100) {
  const sortedEntries = Array.from(cache.entries())
   .sort((a, b) => a[1].timestamp - b[1].timestamp)
  
  // Remove oldest 50 entries
  for (let i = 0; i < 50; i++) {
    cache.delete(sortedEntries[i][0])
  }
}
```

---

## Authentication & Authorization

### User Context Management

#### **Dealership Selection Context**

```typescript
// /app/context/SelectedDealershipContext.tsx
const SelectedDealershipContext = createContext<{
  selectedDealership: any | null
  setSelectedDealership: (dealership: any) => void
}>({
  selectedDealership: null,
  setSelectedDealership: () => {}
})

export function SelectedDealershipProvider({ children }: { children: React.ReactNode }) {
  const [selectedDealership, setSelectedDealership] = useState<any | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedDealership')
    if (saved) {
      setSelectedDealership(JSON.parse(saved))
    }
  }, [])

  // Save to localStorage on change
  const handleSetDealership = (dealership: any) => {
    setSelectedDealership(dealership)
    if (dealership) {
      localStorage.setItem('selectedDealership', JSON.stringify(dealership))
    } else {
      localStorage.removeItem('selectedDealership')
    }
  }

  return (
    <SelectedDealershipContext.Provider value={{
      selectedDealership,
      setSelectedDealership: handleSetDealership
    }}>
      {children}
    </SelectedDealershipContext.Provider>
  )
}
```

### Permission Checks

#### **API Authorization Pattern**

```typescript
// In each API route
export async function POST(request: NextRequest) {
  const session = await SimpleAuth.getSessionFromRequest(request)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check user permissions for specific dealership
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      dealershipId: true,
      agencyId: true,
      role: true
    }
  })

  // Role-based access control
  if (user.role === 'DEALERSHIP_ADMIN' && user.dealershipId !== requestedDealershipId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Agency admins can access all dealerships in their agency
  if (user.role === 'AGENCY_ADMIN') {
    const dealership = await prisma.dealerships.findFirst({
      where: {
        id: requestedDealershipId,
        agencyId: user.agencyId
      }
    })
    
    if (!dealership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Continue with API logic...
}
```

---

## Testing & Validation

### API Testing Script

Create comprehensive test scripts to validate your production implementation:

```typescript
// /scripts/test-production-analytics.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testProductionAnalytics() {
  console.log('🧪 Testing Production Analytics Implementation...\n')

  // Test GA4 connections
  const ga4Connections = await prisma.ga4_connections.findMany({
    take: 5,
    select: {
      id: true,
      userId: true,
      propertyId: true,
      propertyName: true,
      createdAt: true
    }
  })

  console.log('📊 GA4 Connections:', ga4Connections.length)
  ga4Connections.forEach(conn => {
    console.log(`   - ${conn.propertyName} (${conn.propertyId})`)
  })

  // Test Search Console connections
  const scConnections = await prisma.search_console_connections.findMany({
    take: 5,
    select: {
      id: true,
      userId: true,
      siteUrl: true,
      siteName: true,
      createdAt: true
    }
  })

  console.log('\n🔍 Search Console Connections:', scConnections.length)
  scConnections.forEach(conn => {
    console.log(`   - ${conn.siteName} (${conn.siteUrl})`)
  })

  // Test API endpoints
  console.log('\n🌐 Testing API Endpoints...')
  
  // Test GA4 endpoint
  try {
    const ga4Response = await fetch('http://localhost:3000/api/ga4/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TEST_TOKEN'
      },
      body: JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        metrics: ['sessions', 'totalUsers', 'eventCount']
      })
    })
    
    console.log('   ✅ GA4 API:', ga4Response.status === 200 ? 'Working' : 'Failed')
  } catch (error) {
    console.log('   ❌ GA4 API: Error -', error.message)
  }

  // Test Search Console endpoint
  try {
    const scResponse = await fetch('http://localhost:3000/api/search-console/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TEST_TOKEN'
      },
      body: JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dimensions: ['date', 'query']
      })
    })
    
    console.log('   ✅ Search Console API:', scResponse.status === 200 ? 'Working' : 'Failed')
  } catch (error) {
    console.log('   ❌ Search Console API: Error -', error.message)
  }

  console.log('\n🎉 Production analytics test complete!')
}

testProductionAnalytics().catch(console.error)
```

---

## Migration Checklist

### Pre-Migration

- [ ] Set up Google Cloud Console projects
- [ ] Configure OAuth2 credentials for GA4 and Search Console
- [ ] Set up production environment variables
- [ ] Create database migration scripts
- [ ] Test OAuth flows in staging environment

### Migration Steps

- [ ] Deploy database schema changes
- [ ] Update environment variables to disable demo mode
- [ ] Deploy API endpoint changes
- [ ] Test GA4 authentication flow
- [ ] Test Search Console authentication flow
- [ ] Verify data fetching and processing
- [ ] Test UI components with real data
- [ ] Set up monitoring and error tracking

### Post-Migration

- [ ] Monitor API performance and errors
- [ ] Set up alerts for authentication failures
- [ ] Implement data backup strategies
- [ ] Document troubleshooting procedures
- [ ] Train team on new analytics features

---

## Troubleshooting Guide

### Common Issues & Solutions

#### **Authentication Errors**

```
Error: "Insufficient permissions for Google Analytics"
Solution: Check OAuth scopes and property access permissions
```

#### **Data Processing Errors**

```
Error: "Invalid metric or dimension requested"
Solution: Verify GA4 API schema compatibility and update metric names
```

#### **Performance Issues**

```
Issue: Slow dashboard loading
Solution: Implement proper caching strategy and optimize database queries
```

#### **Hydration Mismatches**

```
Issue: Server/client rendering differences
Solution: Use deterministic data generation and proper client-side mounting checks
```

---

This documentation provides the complete blueprint for implementing the exact same analytics system in production. Each section includes the precise code, configurations, and patterns needed to replicate the demo functionality with real data integration.