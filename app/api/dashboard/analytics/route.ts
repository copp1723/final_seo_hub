import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentISODate, getDateRange } from '@/lib/utils/date-formatter'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// In-memory cache for dashboard analytics
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Clear cache function for debugging
function clearCache() {
  cache.clear()
  logger.info('Analytics cache cleared')
}

function getCacheKey(userId: string, dateRange: string, dealershipId?: string): string {
  return `dashboard_analytics_${userId}_${dateRange}_${dealershipId || 'user-level'}_${new Date().toISOString().split('T')[0]}`
}

export async function POST(request: NextRequest) {
  try {
    // Add diagnostic logging for authentication debugging
    logger.info('Analytics POST request received', {
      url: request.url,
      headers: {
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      }
    })

    const session = await SimpleAuth.getSessionFromRequest(request)
    
    logger.info('POST Session extraction result', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || 'none',
      expires: session?.expires?.toISOString() || 'none'
    })
    
    if (!session?.user.id) {
      logger.warn('POST Authentication failed for analytics request', {
        sessionExists: !!session,
        cookieHeader: request.headers.get('cookie') ? 'present' : 'missing',
        url: request.url
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, dateRange = '30days', dealershipId } = body

    // Check cache first - include dealershipId in cache key
    const cacheKey = getCacheKey(session.user.id, dateRange, dealershipId)
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      logger.info('Returning cached dashboard analytics data', {
        userId: session.user.id,
        cacheAge: Date.now() - cachedData.timestamp
      })
      return NextResponse.json({ data: cachedData.data, cached: true })
    }

    // Initialize response data structure
    const dashboardData = {
      ga4Data: null as { sessions: number; users: number; pageviews: number } | null,
      searchConsoleData: null as { clicks: number; impressions: number; ctr: number; position: number } | null,
      combinedMetrics: {
        totalSessions: 0,
        totalUsers: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgCTR: 0,
        avgPosition: 0
      },
      errors: {
        ga4Error: null as string | null,
        searchConsoleError: null as string | null
      },
      metadata: {
        dateRange: { startDate, endDate },
        fetchedAt: getCurrentISODate(),
        hasGA4Connection: false,
        hasSearchConsoleConnection: false
      }
    }

    // Get user info for fallback dealership
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, agencyId: true, role: true }
    })
    
    // Use dealershipId from request if provided, otherwise fall back to user's dealership
    const targetDealershipId = dealershipId || user?.dealershipId
    
    // Find GA4 connection (dealership-level or user-level)
    let ga4Connection = null
    if (targetDealershipId) {
      ga4Connection = await prisma.ga4_connections.findFirst({
        where: { dealershipId: targetDealershipId }
      })
    }
    if (!ga4Connection) {
      ga4Connection = await prisma.ga4_connections.findFirst({
        where: { userId: session.user.id }
      })
    }

    dashboardData.metadata.hasGA4Connection = !!ga4Connection

    // Check Search Console connection
    let searchConsoleConnection = null
    if (targetDealershipId) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { dealershipId: targetDealershipId }
      })
    }
    if (!searchConsoleConnection) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { userId: session.user.id }
      })
    }

    dashboardData.metadata.hasSearchConsoleConnection = !!searchConsoleConnection

    // Fetch GA4 data if connection exists
    if (ga4Connection) {
      try {
        const ga4Service = new GA4Service(session.user.id)
        await ga4Service.initialize()

        const ga4Reports = await ga4Service.batchRunReports(ga4Connection.propertyId || '', [
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'eventCount' }
            ],
            dimensions: [],
            limit: 1
          }
        ])

        if (ga4Reports && ga4Reports[0]) {
          const report = ga4Reports[0]
          const row = report.rows?.[0]
          
          if (row) {
            dashboardData.ga4Data = {
              sessions: parseInt(row.metricValues?.[0]?.value || '0'),
              users: parseInt(row.metricValues?.[1]?.value || '0'),
              pageviews: parseInt(row.metricValues?.[2]?.value || '0')
            }
            
            dashboardData.combinedMetrics.totalSessions = dashboardData.ga4Data.sessions
            dashboardData.combinedMetrics.totalUsers = dashboardData.ga4Data.users
          }
        }

        logger.info('GA4 data fetched successfully for dashboard', {
          userId: session.user.id,
          sessions: dashboardData.ga4Data?.sessions || 0
        })

      } catch (error) {
        logger.error('GA4 dashboard fetch error', error, { userId: session.user.id })
        dashboardData.errors.ga4Error = error instanceof Error ? error.message : 'Failed to fetch GA4 data'
      }
    }

    // Fetch Search Console data if connection exists
    if (searchConsoleConnection) {
      try {
        const searchConsoleService = await getSearchConsoleService(session.user.id)
        
        const searchConsoleData = await searchConsoleService.getSearchAnalytics(
          searchConsoleConnection.siteUrl || '',
          {
            startDate,
            endDate,
            dimensions: [],
            searchType: 'web',
            rowLimit: 1
          }
        )

        if (searchConsoleData && searchConsoleData.rows && searchConsoleData.rows.length > 0) {
          const row = searchConsoleData.rows[0]
          
          dashboardData.searchConsoleData = {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0
          }
          
          dashboardData.combinedMetrics.totalClicks = dashboardData.searchConsoleData.clicks
          dashboardData.combinedMetrics.totalImpressions = dashboardData.searchConsoleData.impressions
          dashboardData.combinedMetrics.avgCTR = dashboardData.searchConsoleData.ctr
          dashboardData.combinedMetrics.avgPosition = dashboardData.searchConsoleData.position
        }

        logger.info('Search Console data fetched successfully for dashboard', {
          userId: session.user.id,
          clicks: dashboardData.searchConsoleData?.clicks || 0
        })

      } catch (error) {
        logger.error('Search Console dashboard fetch error', error, { userId: session.user.id })
        dashboardData.errors.searchConsoleError = error instanceof Error ? error.message : 'Failed to fetch Search Console data'
      }
    }

    // Cache the result
    cache.set(cacheKey, { data: dashboardData, timestamp: Date.now() })

    // Clean up old cache entries
    if (cache.size > 100) {
      const sortedEntries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // Remove oldest 50 entries
      for (let i = 0; i < 50; i++) {
        cache.delete(sortedEntries[i][0])
      }
    }

    return NextResponse.json({ data: dashboardData, cached: false })

  } catch (error) {
    logger.error('Dashboard analytics API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate directly in GET method
    const session = await SimpleAuth.getSessionFromRequest(request)

    if (!session?.user.id) {
      logger.warn('Dashboard analytics GET: No session found', {
        hasSession: !!session,
        hasUserId: !!session?.user?.id,
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Dashboard analytics GET: Session found', {
      userId: session.user.id,
      userRole: session.user.role
    })

    // Support GET requests with query parameters for simple dashboard data
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30days'
    const dealershipId = searchParams.get('dealershipId')
    const clearCacheParam = searchParams.get('clearCache')

    // Clear cache if requested (for debugging dealership switching)
    if (clearCacheParam === 'true') {
      clearCache()
    }

    logger.info('Dashboard analytics GET: Request details', {
      userId: session.user.id,
      dateRange,
      dealershipId,
      url: request.url
    })

    // Calculate date range using utility
    const { startDate, endDate } = getDateRange(dateRange)

    // Check cache first - include dealershipId in cache key
    const cacheKey = getCacheKey(session.user.id, dateRange, dealershipId || undefined)
    const cachedData = cache.get(cacheKey)

    logger.info('Dashboard analytics GET: Cache check', {
      cacheKey,
      hasCachedData: !!cachedData,
      cacheAge: cachedData ? Date.now() - cachedData.timestamp : 'N/A'
    })

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      logger.info('Returning cached dashboard analytics data (GET)', {
        userId: session.user.id,
        cacheAge: Date.now() - cachedData.timestamp
      })
      return NextResponse.json({ data: cachedData.data, cached: true })
    }

    // Execute the analytics logic directly instead of delegating to POST
    // Initialize response data structure
    const dashboardData = {
      ga4Data: null as { sessions: number; users: number; pageviews: number } | null,
      searchConsoleData: null as { clicks: number; impressions: number; ctr: number; position: number } | null,
      combinedMetrics: {
        totalSessions: 0,
        totalUsers: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgCTR: 0,
        avgPosition: 0
      },
      errors: {
        ga4Error: null as string | null,
        searchConsoleError: null as string | null
      },
      metadata: {
        hasGA4Connection: false,
        hasSearchConsoleConnection: false,
        dealershipId: dealershipId || null,
        propertyId: null as string | null,
        siteUrl: null as string | null
      }
    }

    // Use DealershipAnalyticsService to get comprehensive analytics data
    const analyticsService = new DealershipAnalyticsService()

    logger.info('Dashboard analytics GET: Calling analytics service', {
      startDate,
      endDate,
      userId: session.user.id,
      dealershipId: dealershipId || null
    })

    const analyticsData = await analyticsService.getDealershipAnalytics({
      startDate,
      endDate,
      userId: session.user.id,
      dealershipId: dealershipId || null
    })

    // Map the analytics data to dashboard format
    dashboardData.ga4Data = analyticsData.ga4Data || null
    dashboardData.searchConsoleData = analyticsData.searchConsoleData || null
    dashboardData.metadata.hasGA4Connection = analyticsData.metadata.hasGA4Connection
    dashboardData.metadata.hasSearchConsoleConnection = analyticsData.metadata.hasSearchConsoleConnection

    if (analyticsData.ga4Data) {
      dashboardData.combinedMetrics.totalSessions = analyticsData.ga4Data.sessions
      dashboardData.combinedMetrics.totalUsers = analyticsData.ga4Data.users
    }

    if (analyticsData.searchConsoleData) {
      dashboardData.combinedMetrics.totalClicks = analyticsData.searchConsoleData.clicks
      dashboardData.combinedMetrics.totalImpressions = analyticsData.searchConsoleData.impressions
      dashboardData.combinedMetrics.avgCTR = analyticsData.searchConsoleData.ctr
      dashboardData.combinedMetrics.avgPosition = analyticsData.searchConsoleData.position
    }

    // Cache the result
    cache.set(cacheKey, { data: dashboardData, timestamp: Date.now() })

    logger.info('Dashboard analytics GET completed', {
      userId: session.user.id,
      hasGA4Data: !!dashboardData.ga4Data,
      hasSearchConsoleData: !!dashboardData.searchConsoleData,
      dealershipId
    })

    return NextResponse.json({ data: dashboardData })
  } catch (error) {
    logger.error('Dashboard analytics GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
