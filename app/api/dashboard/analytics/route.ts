import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { analyticsCoordinator } from '@/lib/analytics/analytics-coordinator'
import { CacheKeys } from '@/lib/cache/cache-keys'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentISODate, getDateRange } from '@/lib/utils/date-formatter'
import { features } from '@/lib/features'
import { safeDbOperation } from '@/lib/db-resilience'
import { withErrorBoundary, withTimeout } from '@/lib/error-boundaries'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Note: Cache management is now handled by Redis through the analytics coordinator

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

    const clearCacheParam = request.nextUrl.searchParams.get('clearCache')
    const forceRefresh = clearCacheParam === 'true'

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
    const user = await safeDbOperation(() => 
      prisma.users.findUnique({
        where: { id: session.user.id },
        select: { dealershipId: true, agencyId: true, role: true }
      })
    )
    
    // Use dealershipId from request if provided, otherwise fall back to user's dealership
    const targetDealershipId = dealershipId || user?.dealershipId

    logger.info('Dashboard analytics: Dealership targeting', {
      requestedDealershipId: dealershipId,
      userDealershipId: user?.dealershipId,
      targetDealershipId,
      userId: session.user.id
    })
    
    // Find GA4 connection (dealership-level or user-level)
    let ga4Connection = null
    if (targetDealershipId) {
      ga4Connection = await safeDbOperation(() =>
        prisma.ga4_connections.findFirst({
          where: { dealershipId: targetDealershipId }
        })
      )
      logger.info('GA4 connection search by dealership', {
        targetDealershipId,
        found: !!ga4Connection,
        connectionId: ga4Connection?.id,
        propertyId: ga4Connection?.propertyId
      })
    }
    if (!ga4Connection) {
      ga4Connection = await safeDbOperation(() =>
        prisma.ga4_connections.findFirst({
          where: { userId: session.user.id }
        })
      )
      logger.info('GA4 connection fallback to user', {
        userId: session.user.id,
        found: !!ga4Connection,
        connectionId: ga4Connection?.id,
        propertyId: ga4Connection?.propertyId
      })
    }

    dashboardData.metadata.hasGA4Connection = !!ga4Connection

    // Use analytics coordinator for synchronized data fetching
    const analyticsData = await analyticsCoordinator.fetchCoordinatedAnalytics(
      session.user.id,
      dateRange,
      targetDealershipId,
      forceRefresh
    )

    // Map from analyticsCoordinator exclusively — remove legacy/stale vars
    // Intentionally align metadata with coordinator response only.
    dashboardData.ga4Data = analyticsData.ga4Data || null
    dashboardData.searchConsoleData = analyticsData.searchConsoleData || null
    dashboardData.errors.ga4Error = analyticsData.errors.ga4 || null
    dashboardData.errors.searchConsoleError = analyticsData.errors.searchConsole || null
    // Preserve existing metadata fields and extend safely without adding unknown keys to the typed object
    dashboardData.metadata = {
      ...dashboardData.metadata,
      ...analyticsData.metadata
    } as any
    ;(dashboardData.metadata as any).connectionStatus = {
      ga4: {
        connected: !!analyticsData.metadata?.hasGA4Connection,
        connectedForDealership: analyticsData.metadata?.dataSources?.ga4 !== 'none',
        hasData: !!dashboardData.ga4Data?.sessions
      },
      searchConsole: {
        connected: !!analyticsData.metadata?.hasSearchConsoleConnection,
        connectedForDealership: analyticsData.metadata?.dataSources?.searchConsole !== 'none',
        hasData: !!dashboardData.searchConsoleData?.clicks
      }
    }

    logger.info('Dashboard analytics POST completed using DealershipAnalyticsService', {
      userId: session.user.id,
      hasGA4Data: !!dashboardData.ga4Data,
      hasSearchConsoleData: !!dashboardData.searchConsoleData,
      dealershipId: targetDealershipId,
      ga4Connected: !!analyticsData.metadata?.hasGA4Connection,
      searchConsoleConnected: !!analyticsData.metadata?.hasSearchConsoleConnection
    })

    return NextResponse.json({ data: dashboardData })

    // OLD BROKEN CODE BELOW - REMOVE THIS SECTION
    /*
    // Check Search Console connection
    let searchConsoleConnection = null
    if (targetDealershipId) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { dealershipId: targetDealershipId }
      })
      logger.info('Search Console connection search by dealership', {
        targetDealershipId,
        found: !!searchConsoleConnection,
        connectionId: searchConsoleConnection?.id,
        siteUrl: searchConsoleConnection?.siteUrl
      })
    }
    if (!searchConsoleConnection) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { userId: session.user.id }
      })
      logger.info('Search Console connection fallback to user', {
        userId: session.user.id,
        found: !!searchConsoleConnection,
        connectionId: searchConsoleConnection?.id,
        siteUrl: searchConsoleConnection?.siteUrl
      })
    }

    dashboardData.metadata.hasSearchConsoleConnection = !!searchConsoleConnection

    // Fetch GA4 data if connection exists
    if (ga4Connection) {
      try {
        const ga4Service = new GA4Service(session.user.id)
        await ga4Service.initialize()

        const ga4Reports = await ga4Service.batchRunReports(ga4Connection.propertyId || '', [
          // Basic metrics
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'screenPageViews' },
              { name: 'newUsers' },
              { name: 'averageSessionDuration' },
              { name: 'bounceRate' }
            ],
            dimensions: [],
            limit: 1
          },
          // Traffic sources
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            limit: 10,
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
          },
          // Geographic data
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'city' }],
            limit: 10,
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
          },
          // Device data
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'deviceCategory' }],
            limit: 5,
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
          },
          // Hourly data for user journey analysis
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'hour' }],
            limit: 24,
            orderBys: [{ dimension: { dimensionName: 'hour' } }]
          }
        ])

        if (ga4Reports && ga4Reports.length > 0) {
          // Process basic metrics (report 0)
          const basicReport = ga4Reports[0]
          const basicRow = basicReport.rows?.[0]

          if (basicRow) {
            const sessions = parseInt(basicRow.metricValues?.[0]?.value || '0')
            const totalUsers = parseInt(basicRow.metricValues?.[1]?.value || '0')
            const pageviews = parseInt(basicRow.metricValues?.[2]?.value || '0')
            const newUsers = parseInt(basicRow.metricValues?.[3]?.value || '0')
            const avgSessionDuration = parseFloat(basicRow.metricValues?.[4]?.value || '0')
            const bounceRate = parseFloat(basicRow.metricValues?.[5]?.value || '0')

            dashboardData.ga4Data = {
              sessions,
              users: totalUsers,
              pageviews,
              newUsers,
              returningUsers: totalUsers - newUsers,
              averageSessionDuration: avgSessionDuration,
              bounceRate,
              engagementRate: 1 - bounceRate
            }

            dashboardData.combinedMetrics.totalSessions = sessions
            dashboardData.combinedMetrics.totalUsers = totalUsers
          }

          // Process traffic sources (report 1)
          const trafficReport = ga4Reports[1]
          if (trafficReport?.rows) {
            dashboardData.ga4Data.trafficSources = trafficReport.rows.map(row => ({
              source: row.dimensionValues?.[0]?.value || 'Unknown',
              sessions: parseInt(row.metricValues?.[0]?.value || '0')
            }))
          }

          // Process geographic data (report 2)
          const geoReport = ga4Reports[2]
          if (geoReport?.rows) {
            dashboardData.ga4Data.cities = geoReport.rows.map(row => ({
              city: row.dimensionValues?.[0]?.value || 'Unknown',
              sessions: parseInt(row.metricValues?.[0]?.value || '0')
            }))
          }

          // Process device data (report 3)
          const deviceReport = ga4Reports[3]
          if (deviceReport?.rows) {
            dashboardData.ga4Data.devices = deviceReport.rows.map(row => ({
              device: row.dimensionValues?.[0]?.value || 'Unknown',
              sessions: parseInt(row.metricValues?.[0]?.value || '0')
            }))
          }

          // Process hourly data (report 4)
          const hourlyReport = ga4Reports[4]
          if (hourlyReport?.rows) {
            dashboardData.ga4Data.hourlyData = hourlyReport.rows.map(row => ({
              hour: parseInt(row.dimensionValues?.[0]?.value || '0'),
              sessions: parseInt(row.metricValues?.[0]?.value || '0')
            }))
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

        // Fetch overall metrics
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

        // Fetch top queries
        const topQueriesData = await searchConsoleService.getSearchAnalytics(
          searchConsoleConnection.siteUrl || '',
          {
            startDate,
            endDate,
            dimensions: ['query'],
            searchType: 'web',
            rowLimit: 20
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

        // Process top queries data
        if (topQueriesData?.rows && topQueriesData.rows.length > 0) {
          if (!dashboardData.searchConsoleData) {
            dashboardData.searchConsoleData = {
              clicks: 0,
              impressions: 0,
              ctr: 0,
              position: 0
            }
          }

          dashboardData.searchConsoleData.topQueries = topQueriesData.rows.map(row => ({
            query: row.keys?.[0] || 'Unknown',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0
          }))
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

    // Clean up cache to prevent memory leaks
    cleanupCache()

    return NextResponse.json({ data: dashboardData, cached: false })
    */

  } catch (error) {
    logger.error('Dashboard analytics API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return withErrorBoundary(async () => {
    // Authenticate directly in GET method
    const session = await withTimeout(
      SimpleAuth.getSessionFromRequest(request),
      5000,
      'Session authentication timeout'
    )

    if (!session?.user.id) {
      logger.warn('Dashboard analytics GET: No session found', {
        hasSession: !!session,
        hasUserId: !!session?.user?.id,
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session?.user.id
    const userRole = session?.user.role

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Dashboard analytics GET: Session found', {
      userId: userId,
      userRole: userRole
    })

    // Support GET requests with query parameters for simple dashboard data
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30days'
    const dealershipId = searchParams.get('dealershipId')
    const clearCacheParam = searchParams.get('clearCache')

    // Force refresh if requested
    const forceRefresh = clearCacheParam === 'true'

    logger.info('Dashboard analytics GET: Request details', {
      userId: userId,
      dateRange,
      dealershipId,
      url: request.url
    })

    // Add access control for dealership access
    if (dealershipId && session?.user?.id) {
      const user = await prisma.users.findUnique({
        where: { id: session.user.id },
        select: {
          dealershipId: true,
          agencyId: true,
          role: true
        }
      })

      if (user && dealershipId !== user.dealershipId) {
        // Check if user has access to this dealership (agency users can access multiple dealerships)
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN') {
          const hasAccess = await prisma.dealerships.findFirst({
            where: {
              id: dealershipId || undefined,
              OR: [
                { users: { some: { id: session.user.id } } },
                ...(user.agencyId ? [{ agencyId: user.agencyId }] : [])
              ]
            }
          })

          if (!hasAccess) {
            logger.warn('Dashboard analytics GET: Access denied to dealership', {
              userId: session.user.id,
              requestedDealershipId: dealershipId,
              userRole: user.role
            })
            return NextResponse.json(
              { error: 'Access denied to requested dealership' },
              { status: 403 }
            )
          }
        }
      }
    }

    // Calculate date range using utility
    const { startDate, endDate } = getDateRange(dateRange)

    // Note: Caching is now handled by the analytics coordinator
    logger.info('Dashboard analytics GET: Fetching data via coordinator', {
      userId,
      dateRange,
      dealershipId,
      forceRefresh
    })

    // Execute the analytics logic directly instead of delegating to POST
    // Initialize response data structure
    const dashboardData = {
      ga4Data: null as {
        sessions: number;
        users: number;
        pageviews: number;
        newUsers?: number;
        returningUsers?: number;
        averageSessionDuration?: number;
        bounceRate?: number;
        engagementRate?: number;
        trafficSources?: Array<{ source: string; sessions: number }>;
        cities?: Array<{ city: string; sessions: number }>;
        devices?: Array<{ device: string; sessions: number }>;
        hourlyData?: Array<{ hour: number; sessions: number }>;
      } | null,
      searchConsoleData: null as {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
        topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
      } | null,
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

    // Use analytics coordinator for synchronized data fetching
    logger.info('Dashboard analytics GET: Using analytics coordinator', {
      userId: userId,
      dealershipId: dealershipId || null,
      dateRange
    })

    const analyticsData = await analyticsCoordinator.fetchCoordinatedAnalytics(
      userId,
      dateRange,
      dealershipId || undefined,
      forceRefresh
    )

    // Map the coordinated analytics data to dashboard format
    dashboardData.ga4Data = analyticsData.ga4Data || null
    dashboardData.searchConsoleData = analyticsData.searchConsoleData || null
    dashboardData.metadata = {
      ...dashboardData.metadata,
      ...analyticsData.metadata
    }

    if (analyticsData.ga4Data) {
      dashboardData.combinedMetrics.totalSessions = analyticsData.ga4Data.sessions || 0
      dashboardData.combinedMetrics.totalUsers = analyticsData.ga4Data.users || 0
    }

    if (analyticsData.searchConsoleData) {
      dashboardData.combinedMetrics.totalClicks = analyticsData.searchConsoleData.clicks || 0
      dashboardData.combinedMetrics.totalImpressions = analyticsData.searchConsoleData.impressions || 0
      dashboardData.combinedMetrics.avgCTR = analyticsData.searchConsoleData.ctr || 0
      dashboardData.combinedMetrics.avgPosition = analyticsData.searchConsoleData.position || 0
    }

    // Add connection status metadata for better UI handling
    // The analytics coordinator already provides connection status in metadata
    dashboardData.metadata = {
      ...dashboardData.metadata,
      hasGA4Connection: !!analyticsData.metadata?.hasGA4Connection,
      hasSearchConsoleConnection: !!analyticsData.metadata?.hasSearchConsoleConnection,
      propertyId: analyticsData.metadata?.propertyId || null,
      siteUrl: analyticsData.metadata?.siteUrl || null
    } as any
    ;(dashboardData.metadata as any).connectionStatus = {
      ga4: {
        connected: !!analyticsData.metadata?.hasGA4Connection,
        connectedForDealership: analyticsData.metadata?.dataSources?.ga4 !== 'none',
        hasData: !!dashboardData.ga4Data?.sessions
      },
      searchConsole: {
        connected: !!analyticsData.metadata?.hasSearchConsoleConnection,
        connectedForDealership: analyticsData.metadata?.dataSources?.searchConsole !== 'none',
        hasData: !!dashboardData.searchConsoleData?.clicks
      }
    }

    logger.info('Dashboard analytics GET completed', {
      userId: userId,
      hasGA4Data: !!dashboardData.ga4Data,
      hasSearchConsoleData: !!dashboardData.searchConsoleData,
      dealershipId,
      ga4Connected: !!analyticsData.metadata?.hasGA4Connection,
      searchConsoleConnected: !!analyticsData.metadata?.hasSearchConsoleConnection
    })

    return NextResponse.json({ data: dashboardData })
  }, {
    // Fallback data for analytics dashboard
    ga4Data: { sessions: 0, users: 0, eventCount: 0, bounceRate: 0 },
    searchConsoleData: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    combinedMetrics: { totalSessions: 0, totalUsers: 0, totalClicks: 0, totalImpressions: 0, avgCTR: 0, avgPosition: 0 },
    metadata: { hasGA4Connection: false, hasSearchConsoleConnection: false, dateRange: 'Last 30 days' },
    errors: { message: 'Analytics service temporarily unavailable' }
  })()
}
