import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

// Request validation schema
const performanceRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dimensions: z.array(z.string()).optional().default(['query']),
  searchType: z.string().optional().default('web'),
  rowLimit: z.number().optional().default(100)
})

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds
const cache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(dealershipId: string, params: any): string {
  return `sc-${dealershipId}-${JSON.stringify(params)}`
}

export async function POST(request: NextRequest) {
  let searchConsoleConnection: any = null
  try {
    logger.info('Search Console performance request started', {
      path: '/api/search-console/performance',
      method: 'POST'
    })

    // Get session from auth
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session) {
      logger.error('Search Console performance: No valid session found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    logger.info('Search Console performance auth successful', {
      userId: session.user.id
    })

    // Parse and validate request body
    let body: any
    try {
      body = await request.json()
      logger.info('Search Console performance request body parsed', {
        userId: session.user.id,
        bodyKeys: Object.keys(body || {}),
        bodyContent: body,
        bodyType: typeof body,
        isNull: body === null,
        isUndefined: body === undefined
      })
    } catch (parseError) {
      logger.error('Search Console performance request body parse failed', parseError, {
        userId: session.user.id,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      })
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validationResult = performanceRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      logger.error('Search Console performance validation failed', {
        userId: session.user.id,
        errors: validationResult.error.errors,
        body: body,
        bodyType: typeof body,
        validationErrors: validationResult.error.errors.map(err => ({
          path: err.path,
          message: err.message,
          code: err.code
        }))
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { startDate, endDate, dimensions, searchType, rowLimit } = validationResult.data
    
    // Extract dealershipId from query parameters or request body
    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId') || body.dealershipId
    
    logger.info('Search Console performance validation successful', {
      userId: session.user.id,
      startDate,
      endDate,
      dimensions,
      searchType,
      rowLimit,
      requestedDealershipId: dealershipId
    })

    // Get user info for dealership determination and access control
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        dealershipId: true,
        agencyId: true,
        role: true
      }
    })

    if (!user) {
      logger.warn('Search Console performance: User not found', {
        userId: session.user.id
      })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use dealershipId from request if provided, otherwise fall back to user's dealership
    const targetDealershipId = dealershipId || user.dealershipId

    if (!targetDealershipId) {
      logger.warn('Search Console performance: No dealership specified', {
        userId: session.user.id,
        requestedDealershipId: dealershipId,
        userDealershipId: user.dealershipId
      })
      return NextResponse.json(
        { error: 'No dealership specified. Please select a dealership to view performance data.' },
        { status: 400 }
      )
    }

    // Access control: Verify user can access the requested dealership
    if (dealershipId && dealershipId !== user.dealershipId) {
      // Check if user has access to this dealership (agency users can access multiple dealerships)
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN') {
        const hasAccess = await prisma.dealerships.findFirst({
          where: {
            id: dealershipId,
            OR: [
              { users: { some: { id: session.user.id } } },
              { agencyId: user.agencyId }
            ]
          }
        })

        if (!hasAccess) {
          logger.warn('Search Console performance: Access denied to dealership', {
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

    // Check cache first
    const cacheKey = getCacheKey(targetDealershipId, { startDate, endDate, dimensions, searchType })
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: cachedData.data, cached: true })
    }

    // Check if dealership has Search Console connection
    logger.info('Checking Search Console connection', {
      userId: session.user.id,
      dealershipId: targetDealershipId
    })

    // Try dealership-specific connection first, then user-level connection
    searchConsoleConnection = await prisma.search_console_connections.findFirst({
      where: { dealershipId: targetDealershipId }
    })

    if (!searchConsoleConnection) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { userId: session.user.id }
      })
    }

    logger.info('Search Console connection query result', {
      userId: session.user.id,
      dealershipId: targetDealershipId,
      hasConnection: !!searchConsoleConnection,
      hasSiteUrl: !!searchConsoleConnection?.siteUrl,
      siteUrl: searchConsoleConnection?.siteUrl,
      refreshToken: !!searchConsoleConnection?.refreshToken,
      accessToken: !!searchConsoleConnection?.accessToken
    })

    if (!searchConsoleConnection || !searchConsoleConnection.siteUrl) {
      logger.warn('Search Console not connected', {
        userId: session.user.id,
        dealershipId: targetDealershipId,
        hasConnection: !!searchConsoleConnection,
        hasSiteUrl: !!searchConsoleConnection?.siteUrl
      })
      return NextResponse.json(
        { error: 'Search Console not connected. Please connect your Search Console account in settings.' },
        { status: 404 }
      )
    }

    // Initialize Search Console service
    logger.info('Initializing Search Console service', {
      userId: session.user.id,
      siteUrl: searchConsoleConnection.siteUrl
    })

    let searchConsoleService
    try {
      searchConsoleService = await getSearchConsoleService(session.user.id)
      logger.info('Search Console service initialized successfully', {
        userId: session.user.id,
        dealershipId: targetDealershipId
      })
    } catch (serviceError) {
      logger.error('Failed to initialize Search Console service', serviceError, {
        userId: session.user.id,
        dealershipId: targetDealershipId,
        siteUrl: searchConsoleConnection.siteUrl,
        serviceError: serviceError instanceof Error ? serviceError.message : 'Unknown service error'
      })
      return NextResponse.json(
        {
          error: 'Search Console service unavailable. Please reconnect your Search Console account.',
          details: process.env.NODE_ENV === 'development' ? (serviceError instanceof Error ? serviceError.message : String(serviceError)) : undefined
        },
        { status: 503 }
      )
    }

    // Prepare batch requests
    logger.info('Starting Search Console API batch requests', {
      userId: session.user.id,
      dealershipId: targetDealershipId,
      siteUrl: searchConsoleConnection.siteUrl,
      dateRange: { startDate, endDate }
    })

    const [
      overviewData,
      topQueriesData,
      topPagesData,
      performanceByDateData
    ] = await Promise.all([
      // Overall performance metrics
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: [],
        searchType,
        rowLimit: 1
      }).catch(error => {
        logger.error('Overview data request failed', error, {
          userId: session.user.id,
          dealershipId: targetDealershipId,
          siteUrl: searchConsoleConnection.siteUrl
        })
        throw error
      }),
      // Top search queries
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: ['query'],
        searchType,
        rowLimit: 25
      }).catch(error => {
        logger.error('Top queries data request failed', error, {
          userId: session.user.id,
          dealershipId: targetDealershipId,
          siteUrl: searchConsoleConnection.siteUrl
        })
        throw error
      }),
      // Top pages
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: ['page'],
        searchType,
        rowLimit: 10
      }).catch(error => {
        logger.error('Top pages data request failed', error, {
          userId: session.user.id,
          dealershipId: targetDealershipId,
          siteUrl: searchConsoleConnection.siteUrl
        })
        throw error
      }),
      // Performance over time
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: ['date'],
        searchType,
        rowLimit: 1000
      }).catch(error => {
        logger.error('Performance by date data request failed', error, {
          userId: session.user.id,
          dealershipId: targetDealershipId,
          siteUrl: searchConsoleConnection.siteUrl
        })
        throw error
      })
    ])

    logger.info('Search Console API batch requests completed successfully', {
      userId: session.user.id,
      dealershipId: targetDealershipId,
      overviewRows: overviewData?.rows?.length || 0,
      topQueriesRows: topQueriesData?.rows?.length || 0,
      topPagesRows: topPagesData?.rows?.length || 0,
      performanceByDateRows: performanceByDateData?.rows?.length || 0
    })

    // Process the data
    const topQueries = processTopQueries(topQueriesData)
    const processedData = {
      overview: processOverviewData(overviewData),
      topQueries: topQueries,
      topPages: processTopPages(topPagesData),
      performanceByDate: processPerformanceByDate(performanceByDateData),
      // Add top 10 average position calculation
      top10AveragePosition: calculateTop10AveragePosition(topQueries),
      metadata: {
        siteUrl: searchConsoleConnection.siteUrl,
        dateRange: { startDate, endDate }
      }
    }

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

    return NextResponse.json({ data: processedData, cached: false })

  } catch (error) {
    logger.error('Search Console performance API error', error, {
      path: '/api/search-console/performance',
      method: 'POST',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      searchConsoleConnectionExists: !!searchConsoleConnection,
      hasRefreshToken: !!searchConsoleConnection?.refreshToken,
      hasAccessToken: !!searchConsoleConnection?.accessToken,
      siteUrl: searchConsoleConnection?.siteUrl
    })

    // Return more specific error information in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Failed to fetch search performance data'

    return NextResponse.json(
      {
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          type: error instanceof Error ? error.constructor.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
          hasConnection: !!searchConsoleConnection,
          hasTokens: !!searchConsoleConnection?.refreshToken && !!searchConsoleConnection?.accessToken
        } : undefined
      },
      { status: 500 }
    )
  }
}

// Helper functions to process Search Console data
function processOverviewData(data: any) {
  const row = data?.rows?.[0]
  
  return {
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0
  }
}

function processTopQueries(data: any) {
  if (!data?.rows) return []

  return data.rows.map((row: any) => ({
    query: row.keys?.[0] || 'Unknown',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0
  }))
}

function processTopPages(data: any) {
  if (!data?.rows) return []

  return data.rows.map((row: any) => ({
    page: row.keys?.[0] || 'Unknown',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0
  }))
}

function processPerformanceByDate(data: any) {
  if (!data?.rows) return { dates: [], metrics: {} }

  const dates: string[] = []
  const metrics = {
    clicks: [] as number[],
    impressions: [] as number[],
    ctr: [] as number[],
    position: [] as number[]
  }

  data.rows.forEach((row: any) => {
    dates.push(row.keys?.[0] || '')
    metrics.clicks.push(row.clicks || 0)
    metrics.impressions.push(row.impressions || 0)
    metrics.ctr.push(row.ctr || 0)
    metrics.position.push(row.position || 0)
  })

  return { dates, metrics }
}

function calculateTop10AveragePosition(topQueries: any[]) {
  if (!topQueries || topQueries.length === 0) {
    return {
      position: 0,
      count: 0
    }
  }

  // Take only top 10 queries (sorted by clicks, which is how Search Console returns them)
  const top10 = topQueries.slice(0, 10)
  
  if (top10.length === 0) {
    return {
      position: 0,
      count: 0
    }
  }

  const totalPosition = top10.reduce((sum: number, query: any) => sum + (query.position || 0), 0)
  const averagePosition = totalPosition / top10.length

  return {
    position: averagePosition,
    count: top10.length
  }
}
