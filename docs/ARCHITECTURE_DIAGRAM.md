# 🏗️ Analytics System Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Layer                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   Overview Tab  │  │  Traffic Tab    │  │ Search Console  │                 │
│  │                 │  │                 │  │      Tab        │                 │
│  │ • Total Sessions│  │ • Traffic Trends│  │ • Search Queries│                 │
│  │ • Unique Users  │  │ • Top Pages     │  │ • Page Rankings │                 │
│  │ • Organic Data  │  │ • Traffic Srcs  │  │ • CTR & Position│                 │
│  │ • Combined Chart│  │ • GA4 Charts    │  │ • SC Charts     │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         State Management                                    │ │
│  │                                                                             │ │
│  │  • gaData: AnalyticsData                                                   │ │
│  │  • scData: SearchConsoleData                                               │ │
│  │  • selectedDealership: Context                                             │ │
│  │  • selectedRange: '7days' | '30days' | '3months'                          │ │
│  │  • loading, error states                                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                               API Layer                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐              ┌─────────────────────┐                  │
│  │   /api/ga4/analytics│              │/api/search-console/ │                  │
│  │                     │              │    performance      │                  │
│  │ POST: {             │              │                     │                  │
│  │   startDate,        │              │ POST: {             │                  │
│  │   endDate,          │              │   startDate,        │                  │
│  │   metrics,          │              │   endDate,          │                  │
│  │   dimensions        │              │   dimensions        │                  │
│  │ }                   │              │ }                   │                  │
│  │                     │              │                     │                  │
│  │ Returns:            │              │ Returns:            │                  │
│  │ • overview          │              │ • queries           │                  │
│  │ • topPages          │              │ • pages             │                  │
│  │ • trafficSources    │              │ • dates             │                  │
│  │ • metadata          │              │ • summary           │                  │
│  └─────────────────────┘              └─────────────────────┘                  │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                            Service Layer                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐              ┌─────────────────────┐                  │
│  │    GA4Service       │              │ SearchConsoleService│                  │
│  │                     │              │                     │                  │
│  │ • initialize()      │              │ • getPerformance()  │                  │
│  │ • batchRunReports() │              │ • getSites()        │                  │
│  │ • processData()     │              │ • processData()     │                  │
│  │                     │              │                     │                  │
│  │ Uses:               │              │ Uses:               │                  │
│  │ • OAuth2 tokens     │              │ • OAuth2 tokens     │                  │
│  │ • Property ID       │              │ • Site URL          │                  │
│  └─────────────────────┘              └─────────────────────┘                  │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                            Data Layer                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ ga4_connections │  │search_console_  │  │  analytics_     │                 │
│  │                 │  │   connections   │  │     cache       │                 │
│  │ • id            │  │                 │  │                 │                 │
│  │ • userId        │  │ • id            │  │ • cacheKey      │                 │
│  │ • dealershipId  │  │ • userId        │  │ • data (JSONB)  │                 │
│  │ • accessToken   │  │ • dealershipId  │  │ • expiresAt     │                 │
│  │ • refreshToken  │  │ • accessToken   │  │ • createdAt     │                 │
│  │ • propertyId    │  │ • refreshToken  │  │                 │                 │
│  │ • propertyName  │  │ • siteUrl       │  │                 │                 │
│  │ • expiresAt     │  │ • siteName      │  │                 │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                         External APIs                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐              ┌─────────────────────┐                  │
│  │   Google Analytics  │              │  Google Search      │                  │
│  │        API v4       │              │   Console API       │                  │
│  │                     │              │                     │                  │
│  │ • analyticsdata     │              │ • webmasters        │                  │
│  │ • batchRunReports   │              │ • searchanalytics   │                  │
│  │ • OAuth2 flow       │              │ • OAuth2 flow       │                  │
│  │                     │              │                     │                  │
│  │ Endpoints:          │              │ Endpoints:          │                  │
│  │ /properties/{id}/   │              │ /sites/{url}/       │                  │
│  │ batchRunReports     │              │ searchAnalytics/    │                  │
│  │                     │              │ query               │                  │
│  └─────────────────────┘              └─────────────────────┘                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Data Flow                                          │
│                                                                                 │
│  User Interaction                                                               │
│        │                                                                       │
│        ▼                                                                       │
│  ┌─────────────┐                                                               │
│  │ Date Range  │                                                               │
│  │ Selection   │                                                               │
│  │ or          │                                                               │
│  │ Dealership  │                                                               │
│  │ Change      │                                                               │
│  └─────────────┘                                                               │
│        │                                                                       │
│        ▼                                                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                     │
│  │ Clear Cache │────▶│ Fetch Data  │────▶│ Update UI   │                     │
│  └─────────────┘     └─────────────┘     └─────────────┘                     │
│                             │                                                 │
│                             ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    Parallel API Calls                                  │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐              ┌─────────────────┐                  │   │
│  │  │ GA4 API Call    │              │ Search Console  │                  │   │
│  │  │                 │              │    API Call     │                  │   │
│  │  │ 1. Check Cache  │              │                 │                  │   │
│  │  │ 2. Validate     │              │ 1. Check Cache  │                  │   │
│  │  │    Connection   │              │ 2. Validate     │                  │   │
│  │  │ 3. Call Google  │              │    Connection   │                  │   │
│  │  │    Analytics    │              │ 3. Call Google  │                  │   │
│  │  │ 4. Process Data │              │    Search Con.  │                  │   │
│  │  │ 5. Cache Result │              │ 4. Process Data │                  │   │
│  │  │                 │              │ 5. Cache Result │                  │   │
│  │  └─────────────────┘              └─────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                             │                                                 │
│                             ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    Data Transformation                                  │   │
│  │                                                                         │   │
│  │  GA4 Raw Response          Search Console Raw Response                  │   │
│  │        │                             │                                  │   │
│  │        ▼                             ▼                                  │   │
│  │  transformGA4Response()      transformSearchConsoleResponse()           │   │
│  │        │                             │                                  │   │
│  │        ▼                             ▼                                  │   │
│  │  AnalyticsData                SearchConsoleData                         │   │
│  │  {                           {                                          │   │
│  │    overview: {                 queries: [...],                         │   │
│  │      dates: [...],             pages: [...],                           │   │
│  │      metrics: {                dates: [...],                           │   │
│  │        sessions: [...],        summary: {                              │   │
│  │        totalUsers: [...],        totalClicks,                          │   │
│  │        eventCount: [...]         totalImpressions,                     │   │
│  │      }                           averageCtr,                           │   │
│  │    },                            averagePosition                       │   │
│  │    topPages: [...],            }                                       │   │
│  │    trafficSources: [...],    }                                         │   │
│  │    metadata: {...}                                                     │   │
│  │  }                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                             │                                                 │
│                             ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      Component Rendering                                │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │   │
│  │  │   Overview Tab  │  │  Traffic Tab    │  │ Search Console  │         │   │
│  │  │                 │  │                 │  │      Tab        │         │   │
│  │  │ • Metric Cards  │  │ • Traffic Chart │  │ • Query Table   │         │   │
│  │  │ • Combined Chart│  │ • Top Pages     │  │ • Page Rankings │         │   │
│  │  │ • Error States  │  │ • Traffic Srcs  │  │ • Performance   │         │   │
│  │  │                 │  │ • Error States  │  │   Chart         │         │   │
│  │  │                 │  │                 │  │ • Error States  │         │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Component Hierarchy                                  │
│                                                                                 │
│  ReportingPage                                                                  │
│  ├── Header                                                                     │
│  │   ├── DealershipSelector                                                    │
│  │   ├── DateRangeSelector                                                     │
│  │   └── RefreshButton                                                         │
│  │                                                                             │
│  └── Tabs                                                                      │
│      ├── TabsList                                                              │
│      │   ├── TabsTrigger("overview")                                           │
│      │   ├── TabsTrigger("traffic")                                            │
│      │   └── TabsTrigger("searchconsole")                                      │
│      │                                                                         │
│      ├── TabsContent("overview")                                               │
│      │   └── OverviewTab                                                       │
│      │       ├── MetricCards                                                   │
│      │       │   ├── Card(Total Sessions)                                     │
│      │       │   ├── Card(Unique Users)                                       │
│      │       │   ├── Card(Organic Sessions)                                   │
│      │       │   └── Card(Avg CTR)                                            │
│      │       │                                                                │
│      │       └── CombinedChart                                                 │
│      │           ├── Line(Sessions)                                            │
│      │           ├── Line(Organic Sessions)                                    │
│      │           └── Line(Impressions ÷ 100)                                  │
│      │                                                                         │
│      ├── TabsContent("traffic")                                                │
│      │   └── TrafficTab                                                        │
│      │       ├── MetricCards                                                   │
│      │       │   ├── Card(Total Sessions)                                     │
│      │       │   ├── Card(Unique Users)                                       │
│      │       │   └── Card(Page Views)                                         │
│      │       │                                                                │
│      │       ├── TrafficTrendsChart                                            │
│      │       │   ├── Line(Sessions)                                            │
│      │       │   └── Line(Users)                                              │
│      │       │                                                                │
│      │       ├── TopPagesCard                                                  │
│      │       │   └── Bar(Page Sessions)                                       │
│      │       │                                                                │
│      │       └── TrafficSourcesCard                                            │
│      │           └── Bar(Source Sessions)                                     │
│      │                                                                         │
│      └── TabsContent("searchconsole")                                          │
│          └── SearchTab                                                         │
│              ├── MetricCards                                                   │
│              │   ├── Card(Total Clicks)                                       │
│              │   ├── Card(Total Impressions)                                  │
│              │   ├── Card(Average CTR)                                        │
│              │   └── Card(Average Position)                                   │
│              │                                                                │
│              ├── PerformanceChart                                              │
│              │   ├── Line(Clicks)                                             │
│              │   ├── Line(Impressions ÷ 10)                                   │
│              │   └── Line(Position Inverted)                                  │
│              │                                                                │
│              ├── TopQueriesCard                                                │
│              │   └── Table(Query, Clicks, Impressions, CTR, Position)         │
│              │                                                                │
│              └── TopPagesCard                                                  │
│                  └── Table(Page, Clicks, Impressions, CTR, Position)          │
│                                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Database Schema                                        │
│                                                                                 │
│  ┌─────────────────┐                                                           │
│  │     users       │                                                           │
│  │                 │                                                           │
│  │ • id (PK)       │───┐                                                       │
│  │ • email         │   │                                                       │
│  │ • name          │   │                                                       │
│  │ • role          │   │                                                       │
│  │ • agencyId      │   │                                                       │
│  │ • dealershipId  │   │                                                       │
│  └─────────────────┘   │                                                       │
│                        │                                                       │
│                        │                                                       │
│  ┌─────────────────┐   │   ┌─────────────────┐                               │
│  │ ga4_connections │   │   │search_console_  │                               │
│  │                 │   │   │   connections   │                               │
│  │ • id (PK)       │   │   │                 │                               │
│  │ • userId (FK)   │───┘   │ • id (PK)       │                               │
│  │ • dealershipId  │       │ • userId (FK)   │───┐                           │
│  │ • accessToken   │       │ • dealershipId  │   │                           │
│  │ • refreshToken  │       │ • accessToken   │   │                           │
│  │ • propertyId    │       │ • refreshToken  │   │                           │
│  │ • propertyName  │       │ • siteUrl       │   │                           │
│  │ • expiresAt     │       │ • siteName      │   │                           │
│  │ • createdAt     │       │ • expiresAt     │   │                           │
│  │ • updatedAt     │       │ • createdAt     │   │                           │
│  └─────────────────┘       │ • updatedAt     │   │                           │
│                            └─────────────────┘   │                           │
│                                                  │                           │
│                                                  │                           │
│  ┌─────────────────┐                             │                           │
│  │  dealerships    │                             │                           │
│  │                 │                             │                           │
│  │ • id (PK)       │─────────────────────────────┘                           │
│  │ • name          │                                                         │
│  │ • website       │                                                         │
│  │ • agencyId      │                                                         │
│  │ • package       │                                                         │
│  │ • status        │                                                         │
│  │ • createdAt     │                                                         │
│  │ • updatedAt     │                                                         │
│  └─────────────────┘                                                         │
│                                                                               │
│                                                                               │
│  ┌─────────────────┐        ┌─────────────────┐                             │
│  │ analytics_cache │        │    agencies     │                             │
│  │                 │        │                 │                             │
│  │ • id (PK)       │        │ • id (PK)       │                             │
│  │ • cacheKey      │        │ • name          │                             │
│  │ • data (JSONB)  │        │ • slug          │                             │
│  │ • expiresAt     │        │ • domain        │                             │
│  │ • createdAt     │        │ • plan          │                             │
│  └─────────────────┘        │ • status        │                             │
│                             │ • createdAt     │                             │
│                             │ • updatedAt     │                             │
│                             └─────────────────┘                             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## API Response Formats

### GA4 Analytics Response Structure

```json
{
  "data": {
    "overview": {
      "dates": ["2024-01-01", "2024-01-02", "..."],
      "metrics": {
        "sessions": [245, 198, 267, "..."],
        "totalUsers": [208, 168, 227, "..."],
        "eventCount": [612, 495, 668, "..."]
      }
    },
    "topPages": [
      {
        "page": "/",
        "sessions": 1800,
        "eventCount": 4400
      },
      {
        "page": "/inventory",
        "sessions": 1520,
        "eventCount": 3800
      }
    ],
    "trafficSources": [
      {
        "source": "google",
        "sessions": 2600
      },
      {
        "source": "(direct)",
        "sessions": 1520
      }
    ],
    "metadata": {
      "propertyId": "123456789",
      "propertyName": "Dealership Property",
      "dateRange": {
        "startDate": "2024-01-01",
        "endDate": "2024-01-31"
      }
    }
  },
  "cached": false
}
```

### Search Console Response Structure

```json
{
  "data": {
    "queries": [
      {
        "query": "toyota dealer near me",
        "clicks": 143,
        "impressions": 2250,
        "ctr": 0.065,
        "position": 3.7
      }
    ],
    "pages": [
      {
        "page": "https://dealership.com/",
        "clicks": 195,
        "impressions": 3000,
        "ctr": 0.065,
        "position": 2.1
      }
    ],
    "dates": [
      {
        "date": "2024-01-01",
        "clicks": 45,
        "impressions": 680,
        "ctr": 0.066,
        "position": 4.2
      }
    ],
    "summary": {
      "totalClicks": 872,
      "totalImpressions": 14500,
      "averageCtr": 0.058,
      "averagePosition": 5.5
    }
  },
  "metadata": {
    "siteUrl": "https://dealership.com/",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  },
  "cached": false
}
```

## OAuth Flow Diagrams

### GA4 Authentication Flow

```
User                    App                     Google OAuth            GA4 API
  │                      │                          │                     │
  │──── Click Connect ───▶│                          │                     │
  │                      │───── Generate URL ──────▶│                     │
  │                      │                          │                     │
  │◀──── Redirect ───────│◀──── Auth URL ──────────│                     │
  │                      │                          │                     │
  │──── Login & Approve ─────────────────────▶│                     │
  │                      │                          │                     │
  │◀──── Callback ──────────────────────────────▶│                     │
  │      (with code)     │                          │                     │
  │                      │───── Exchange Code ─────▶│                     │
  │                      │                          │                     │
  │                      │◀──── Access Token ──────│                     │
  │                      │                          │                     │
  │                      │─── Store in Database ────│                     │
  │                      │                          │                     │
  │                      │────── Test API Call ──────────────────────────▶│
  │                      │                          │                     │
  │                      │◀───── Success ────────────────────────────────│
  │                      │                          │                     │
  │◀─── Success Page ────│                          │                     │
```

### Data Fetching Flow

```
Component               API Handler              Service Layer           External API
    │                      │                        │                       │
    │──── fetchGA4Data ────▶│                        │                       │
    │                      │──── Validate Auth ────▶│                       │
    │                      │                        │                       │
    │                      │◀──── User Valid ──────│                       │
    │                      │                        │                       │
    │                      │──── Get Connection ───▶│                       │
    │                      │                        │                       │
    │                      │◀──── GA4 Tokens ──────│                       │
    │                      │                        │                       │
    │                      │──── Initialize ───────▶│                       │
    │                      │                        │                       │
    │                      │                        │──── Batch Request ───▶│
    │                      │                        │                       │
    │                      │                        │◀──── Raw Data ───────│
    │                      │                        │                       │
    │                      │◀──── Process Data ────│                       │
    │                      │                        │                       │
    │◀──── Formatted ──────│                        │                       │
    │      Response        │                        │                       │
```

This architecture documentation provides the complete visual blueprint of how all the components, data flows, and integrations work together in the analytics system.