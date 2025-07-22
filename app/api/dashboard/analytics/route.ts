import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { GA4Service } from '@/lib/google/ga4Service'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCurrentISODate, getDateRange } from '@/lib/utils/date-formatter'

// In-memory cache for dashboard analytics
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(userId: string, dateRange: string): string {
  return `dashboard_analytics_${userId}_${dateRange}_${new Date().toISOString().split('T')[0]}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, dateRange = '30days' } = body

    // Check cache first
    const cacheKey = getCacheKey(session.user.id, dateRange)
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

    // Check GA4 connection
    // Get user's current dealership
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, agencyId: true, role: true }
    })
    
    // Find GA4 connection (dealership-level or user-level)
    let ga4Connection = null
    if (user?.dealershipId) {
      ga4Connection = await prisma.ga4_connections.findFirst({
        where: { dealershipId: user.dealershipId }
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
    if (user?.dealershipId) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { dealershipId: user.dealershipId }
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
        
        // Import mock data generator
        try {
          const { generateMockSearchConsoleData } = await import('@/lib/mock-data/search-console-mock')
          const mockData = generateMockSearchConsoleData({ startDate, endDate })
          
          // Use mock data as fallback
          dashboardData.searchConsoleData = mockData.overview
          dashboardData.combinedMetrics.totalClicks = mockData.overview.clicks
          dashboardData.combinedMetrics.totalImpressions = mockData.overview.impressions
          dashboardData.combinedMetrics.avgCTR = mockData.overview.ctr
          dashboardData.combinedMetrics.avgPosition = mockData.overview.position
          
          logger.info('Using mock Search Console data due to API error', { userId: session.user.id })
        } catch (mockError) {
          logger.error('Failed to generate mock Search Console data', mockError, { userId: session.user.id })
        }
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
  // Support GET requests with query parameters for simple dashboard data
  const { searchParams } = new URL(request.url)
  const dateRange = searchParams.get('dateRange') || '30days'
  
  // Calculate date range using utility
  const { startDate, endDate } = getDateRange(dateRange)

  // Create a new request with the calculated dates
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({
      startDate,
      endDate,
      dateRange
    })
  })

  return POST(mockRequest as NextRequest)
}
