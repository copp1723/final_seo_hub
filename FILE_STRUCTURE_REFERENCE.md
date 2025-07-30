# 📁 Complete File Structure & Component Reference

## Project File Organization

```
final_seo_hub/
├── app/
│   ├── (authenticated)/
│   │   └── reporting/
│   │       ├── page.tsx                 ← Main analytics dashboard
│   │       └── components/
│   │           ├── OverviewTab.tsx      ← Combined GA4 + SC metrics
│   │           ├── TrafficTab.tsx       ← GA4-focused analytics
│   │           └── SearchTab.tsx        ← Search Console focused
│   │
│   ├── api/
│   │   ├── ga4/
│   │   │   ├── analytics/
│   │   │   │   └── route.ts             ← GA4 data endpoint
│   │   │   ├── auth/
│   │   │   │   ├── connect/
│   │   │   │   │   └── route.ts         ← Initiate GA4 OAuth
│   │   │   │   └── callback/
│   │   │   │       └── route.ts         ← Handle OAuth callback
│   │   │   ├── properties/
│   │   │   │   └── route.ts             ← List GA4 properties
│   │   │   └── status/
│   │   │       └── route.ts             ← Check GA4 connection
│   │   │
│   │   ├── search-console/
│   │   │   ├── performance/
│   │   │   │   └── route.ts             ← Search Console data endpoint
│   │   │   ├── auth/
│   │   │   │   ├── connect/
│   │   │   │   │   └── route.ts         ← Initiate SC OAuth
│   │   │   │   └── callback/
│   │   │   │       └── route.ts         ← Handle SC OAuth callback
│   │   │   └── sites/
│   │   │       └── route.ts             ← List SC sites
│   │   │
│   │   └── demo/
│   │       ├── dealerships/
│   │       │   └── route.ts             ← Demo dealership data
│   │       ├── requests/
│   │       │   └── route.ts             ← Demo request data
│   │       └── seo-recommendations/
│   │           └── route.ts             ← Demo SEO data
│   │
│   ├── context/
│   │   └── SelectedDealershipContext.tsx ← Dealership selection state
│   │
│   └── lib/
│       └── features.ts                   ← Feature flags (demo mode)
│
├── lib/
│   ├── demo-data.ts                     ← Demo data generation functions
│   ├── google/
│   │   ├── ga4Service.ts                ← GA4 API service wrapper
│   │   └── searchConsoleService.ts      ← Search Console API wrapper
│   ├── auth-simple.ts                   ← Authentication utilities
│   ├── prisma.ts                        ← Database client
│   └── logger.ts                        ← Logging utilities
│
├── components/
│   ├── ui/
│   │   ├── tabs.tsx                     ← Radix UI tabs component
│   │   ├── card.tsx                     ← Card component
│   │   ├── button.tsx                   ← Button component
│   │   └── select.tsx                   ← Select dropdown component
│   │
│   ├── layout/
│   │   └── dealership-selector.tsx      ← Dealership dropdown
│   │
│   └── demo/
│       └── demo-mode-banner.tsx         ← Demo mode indicator
│
├── scripts/
│   ├── setup-comprehensive-demo.ts      ← Demo data population script
│   ├── test-demo-features.ts           ← Demo validation script
│   ├── test-analytics-demo.ts          ← Analytics data testing
│   └── run-demo-setup.sh              ← Demo setup automation
│
├── prisma/
│   ├── schema.prisma                    ← Database schema
│   └── migrations/
│       ├── 20250103_add_seoworks_mapping/
│       └── 20250108_fix_seoworks_mapping/
│
└── Documentation/
    ├── PRODUCTION_IMPLEMENTATION_GUIDE.md ← Complete production guide
    ├── ARCHITECTURE_DIAGRAM.md           ← System architecture
    ├── GA4_SEARCH_CONSOLE_FIXED.md      ← Analytics implementation
    └── DEMO_SETUP_COMPLETE.md           ← Demo setup documentation
```

---

## Core Component Breakdown

### 1. Main Analytics Dashboard (`/app/(authenticated)/reporting/page.tsx`)

**Purpose**: Primary analytics interface with tabbed layout
**Key Features**:
- Date range selection
- Dealership filtering
- Parallel data fetching
- Client-side caching
- Error handling

**Critical Functions**:
```typescript
// Data fetching
const fetchGA4Data = async (dateRange) => { ... }
const fetchSearchConsoleData = async (dateRange) => { ... }
const fetchAllData = async () => { ... }

// Data transformation
const transformGA4Response = (apiData, dateRange) => { ... }
const transformSearchConsoleResponse = (apiData, dateRange) => { ... }

// Metric calculations
const calculateGaMetrics = () => { ... }

// Caching utilities
const getCacheKey = (type, range, property) => { ... }
const getCachedData = (key) => { ... }
const setCachedData = (key, data) => { ... }
```

**State Management**:
```typescript
// Data states
const [gaData, setGaData] = useState<AnalyticsData | null>(null)
const [scData, setScData] = useState<SearchConsoleData | null>(null)
const [gaError, setGaError] = useState<string | null>(null)
const [scError, setScError] = useState<string | null>(null)

// UI states
const [loading, setLoading] = useState(false)
const [selectedRange, setSelectedRange] = useState('30days')
const [activeTab, setActiveTab] = useState('overview')
```

### 2. Overview Tab (`/app/(authenticated)/reporting/components/OverviewTab.tsx`)

**Purpose**: Combined GA4 and Search Console metrics view
**Layout**: 4-column metric cards + combined chart

**Metric Cards**:
- Total Sessions (GA4)
- Unique Users (GA4)  
- Organic Sessions (Search Console)
- Average CTR (Search Console)

**Chart Configuration**:
- Line chart with multiple datasets
- Sessions, Organic Sessions, Impressions (scaled)
- Responsive design with legend

### 3. Traffic Tab (`/app/(authenticated)/reporting/components/TrafficTab.tsx`)

**Purpose**: GA4-focused traffic analytics
**Layout**: 3-column metrics + traffic trends + top pages + traffic sources

**Components**:
- Traffic trends line chart (Sessions + Users)
- Top pages bar chart
- Traffic sources bar chart
- Error state handling

### 4. Search Tab (`/app/(authenticated)/reporting/components/SearchTab.tsx`)

**Purpose**: Search Console performance analysis
**Layout**: 4-column metrics + performance chart + data tables

**Components**:
- Performance line chart (Clicks, Impressions, Position)
- Top queries data table
- Top pages data table
- Summary statistics

---

## API Endpoint Details

### GA4 Analytics Endpoint (`/app/api/ga4/analytics/route.ts`)

**Endpoint**: `POST /api/ga4/analytics`

**Request Body**:
```typescript
{
  startDate: string     // YYYY-MM-DD format
  endDate: string       // YYYY-MM-DD format  
  metrics: string[]     // ['sessions', 'totalUsers', 'eventCount']
  dimensions?: string[] // ['date']
}
```

**Response Structure**:
```typescript
{
  data: {
    overview: {
      dates: string[]
      metrics: {
        sessions: number[]
        totalUsers: number[]
        eventCount: number[]
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
      dateRange: { startDate: string, endDate: string }
    }
  }
  cached: boolean
}
```

**Key Functions**:
```typescript
// Demo mode check
if (features.demoMode) {
  return NextResponse.json(getDemoGA4Analytics(startDate, endDate, dealershipId))
}

// Production authentication
const session = await SimpleAuth.getSessionFromRequest(request)
const user = await prisma.users.findUnique({ where: { id: session.user.id } })

// GA4 service initialization
const ga4Service = new GA4Service(session.user.id)
await ga4Service.initialize()

// Batch API requests
const reports = await ga4Service.batchRunReports(propertyId, batchRequests)

// Data processing
const processedData = {
  overview: processOverviewReport(reports[0]),
  topPages: processTopPagesReport(reports[1]),
  trafficSources: processTrafficSourcesReport(reports[2])
}
```

### Search Console Endpoint (`/app/api/search-console/performance/route.ts`)

**Endpoint**: `POST /api/search-console/performance`

**Request Body**:
```typescript
{
  startDate: string
  endDate: string  
  dimensions: string[]    // ['date', 'query', 'page']
  searchType: string      // 'web'
  rowLimit: number        // 1000
}
```

**Response Structure**:
```typescript
{
  data: {
    queries: Array<{
      query: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
    pages: Array<{
      page: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
    dates: Array<{
      date: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
    summary: {
      totalClicks: number
      totalImpressions: number
      averageCtr: number
      averagePosition: number
    }
  }
  metadata: {
    siteUrl: string
    dateRange: { startDate: string, endDate: string }
  }
  cached: boolean
}
```

---

## Demo Data Implementation (`/lib/demo-data.ts`)

### Core Functions

**1. `getDemoGA4Analytics(startDate, endDate, dealershipId)`**
```typescript
// Purpose: Generate realistic GA4 traffic data
// Returns: Structured analytics data with:
//   - Daily sessions/users/events arrays
//   - Top pages with sessions/events
//   - Traffic sources with session counts
//   - Metadata with property info

// Key Features:
// - Package-based traffic multipliers (SILVER/GOLD/PLATINUM)
// - Weekend traffic reduction (30% lower)
// - Deterministic random generation (seeded for SSR compatibility)
// - Realistic automotive traffic patterns
```

**2. `getDemoSearchConsoleData(startDate, endDate, dealershipId)`**
```typescript
// Purpose: Generate realistic Search Console performance data
// Returns: Structured search data with:
//   - Search queries with clicks/impressions/CTR/position
//   - Page performance data
//   - Daily performance arrays
//   - Summary statistics

// Key Features:
// - Automotive-specific search queries
// - Realistic CTR rates (5-6%)
// - Position rankings based on package tier
// - Query and page diversity
```

**3. Package-Based Data Scaling**
```typescript
// Traffic multipliers for realistic demo scaling
const trafficMultipliers = {
  SILVER: { base: 150, variance: 30 },      // ~4,650 sessions/month
  GOLD: { base: 400, variance: 80 },        // ~12,400 sessions/month  
  PLATINUM: { base: 800, variance: 150 }    // ~24,800 sessions/month
}

const searchMultipliers = {
  SILVER: { impressions: 800, clicks: 40, position: 8.5 },
  GOLD: { impressions: 2500, clicks: 150, position: 5.2 },
  PLATINUM: { impressions: 5000, clicks: 350, position: 3.1 }
}
```

### Deterministic Random Generation

**Problem**: `Math.random()` causes hydration mismatches between server/client rendering
**Solution**: Seeded random function for consistent values

```typescript
// Deterministic random function
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Usage in data generation
const seed = new Date(date).getTime() + dealershipOffset
const randomVariance = seededRandom(seed) * multiplier.variance - multiplier.variance / 2
```

---

## Database Schema Reference

### GA4 Connections Table
```sql
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

-- Indexes for performance
CREATE INDEX idx_ga4_connections_user ON ga4_connections(userId);
CREATE INDEX idx_ga4_connections_dealership ON ga4_connections(dealershipId);
CREATE INDEX idx_ga4_connections_property ON ga4_connections(propertyId);
```

### Search Console Connections Table
```sql
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

-- Indexes for performance
CREATE INDEX idx_sc_connections_user ON search_console_connections(userId);
CREATE INDEX idx_sc_connections_site ON search_console_connections(siteUrl);
```

### Analytics Cache Table (Optional)
```sql
CREATE TABLE analytics_cache (
  id TEXT PRIMARY KEY,
  cacheKey TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for cache lookups
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cacheKey);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expiresAt);
```

---

## Service Layer Implementation

### GA4Service (`/lib/google/ga4Service.ts`)

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

    // Set credentials
    this.auth.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    })

    // Initialize Analytics Data API
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

  // Token refresh handling
  async refreshTokenIfNeeded() {
    const connection = await prisma.ga4_connections.findFirst({
      where: { userId: this.userId }
    })

    if (connection && this.isTokenExpired(connection.expiresAt)) {
      const { credentials } = await this.auth.refreshAccessToken()
      
      await prisma.ga4_connections.update({
        where: { id: connection.id },
        data: {
          accessToken: credentials.access_token,
          expiresAt: new Date(credentials.expiry_date)
        }
      })
    }
  }

  private isTokenExpired(expiresAt: Date): boolean {
    return expiresAt && new Date() >= expiresAt
  }
}
```

### Search Console Service (`/lib/google/searchConsoleService.ts`)

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

  const webmasters = google.webmasters({ version: 'v3', auth })

  return {
    async getPerformanceData(siteUrl: string, params: any) {
      return await webmasters.searchanalytics.query({
        siteUrl,
        requestBody: params
      })
    },

    async getSites() {
      return await webmasters.sites.list()
    }
  }
}
```

---

## UI Component Library Usage

### Radix UI Components

**Tabs Implementation**:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
  <TabsList className="inline-flex w-auto">
    <TabsTrigger value="overview">GA4 Overview</TabsTrigger>
    <TabsTrigger value="traffic">GA4 Traffic Analytics</TabsTrigger>
    <TabsTrigger value="searchconsole">Search Console Performance</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-6">
    {/* Overview content */}
  </TabsContent>
</Tabs>
```

**Card Components**:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
```

### Chart.js Integration

**Chart Configuration**:
```typescript
import { Line, Bar } from 'react-chartjs-2'

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

// Usage
<Line data={chartData} options={chartOptions} />
```

---

## Environment Configuration

### Production Environment Variables

```bash
# Feature Flags
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com

# GA4 Configuration
GA4_CLIENT_ID=your-ga4-client-id
GA4_CLIENT_SECRET=your-ga4-client-secret
GA4_REDIRECT_URI=https://yourdomain.com/api/ga4/auth/callback

# Search Console Configuration
SEARCH_CONSOLE_CLIENT_ID=your-sc-client-id
SEARCH_CONSOLE_CLIENT_SECRET=your-sc-client-secret
SEARCH_CONSOLE_REDIRECT_URI=https://yourdomain.com/api/search-console/auth/callback

# Encryption
ENCRYPTION_KEY=32-character-encryption-key
GA4_TOKEN_ENCRYPTION_KEY=64-character-token-encryption-key
```

### Package Dependencies

**Core Dependencies**:
```json
{
  "dependencies": {
    "@prisma/client": "^5.x.x",
    "@radix-ui/react-tabs": "^1.x.x",
    "@radix-ui/react-select": "^2.x.x",
    "chart.js": "^4.x.x",
    "react-chartjs-2": "^5.x.x",
    "googleapis": "^126.x.x",
    "next": "^15.x.x",
    "react": "^18.x.x",
    "date-fns": "^2.x.x",
    "lucide-react": "^0.x.x"
  },
  "devDependencies": {
    "@types/node": "^20.x.x",
    "prisma": "^5.x.x",
    "typescript": "^5.x.x",
    "tsx": "^4.x.x"
  }
}
```

This comprehensive reference provides every file, function, and configuration needed to implement the exact same analytics system in production. Each component is documented with its purpose, structure, and implementation details.