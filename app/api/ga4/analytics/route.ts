import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/google/ga4Service'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Request validation schema
const analyticsRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  metrics: z.array(z.string()).optional().default(['sessions', 'activeUsers', 'screenPageViews']),
  dimensions: z.array(z.string()).optional()
})

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds
const cache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(userId: string, params: any): string {
  return `${userId}-${JSON.stringify(params)}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = analyticsRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { startDate, endDate, metrics, dimensions } = validationResult.data

    // Debug logging
    logger.info('GA4 Analytics Request', {
      userId: session.user.id,
      dateRange: { startDate, endDate },
      metrics,
      dimensions
    })

    // Check cache first
    const cacheKey = getCacheKey(session.user.id, { startDate, endDate, metrics, dimensions })
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      logger.info('Returning cached GA4 data', {
        userId: session.user.id,
        cacheAge: Date.now() - cachedData.timestamp
      })
      return NextResponse.json({ data: cachedData.data, cached: true })
    }

    // Get user's dealership ID or handle agency admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, role: true, agencyId: true }
    })

    let targetDealershipId = user?.dealershipId
    
    // If user is agency admin, they might be accessing on behalf of a dealership
    if (!targetDealershipId && user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      // For agency admins, we need a dealershipId parameter or default behavior
      // For now, return an appropriate error since this endpoint needs dealership context
      return NextResponse.json(
        { error: 'Agency admins must specify dealership context for analytics data' },
        { status: 400 }
      )
    }

    if (!targetDealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Check if dealership has GA4 connection
    const ga4Connection = await prisma.gA4Connection.findUnique({
      where: { dealershipId: targetDealershipId }
    })

    if (!ga4Connection || !ga4Connection.propertyId) {
      logger.warn('No GA4 connection found', {
        userId: session.user.id,
        dealershipId: targetDealershipId
      })
      return NextResponse.json(
        { error: 'GA4 not connected. Please connect your Google Analytics account in settings.' },
        { status: 404 }
      )
    }

    logger.info('Found GA4 connection', {
      userId: session.user.id,
      dealershipId: targetDealershipId,
      propertyId: ga4Connection.propertyId,
      propertyName: ga4Connection.propertyName
    })

    // Validate property ID format
    if (!/^\d+$/.test(ga4Connection.propertyId)) {
      logger.error('Invalid GA4 property ID format', undefined, {
        userId: session.user.id,
        propertyId: ga4Connection.propertyId
      })
      return NextResponse.json(
        { error: 'Invalid GA4 property configuration. Please reconnect your Google Analytics account.' },
        { status: 400 }
      )
    }

    // Initialize GA4 service
    const ga4Service = new GA4Service(targetDealershipId)

    // Prepare batch requests for different reports
    const batchRequests = [
      // Traffic overview
      {
        dateRanges: [{ startDate, endDate }],
        metrics: metrics.map(metric => ({ name: metric })),
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      },
      // Top pages
      {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
        dimensions: [{ name: 'pagePath' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      },
      // Traffic sources
      {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'sessionSource' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      }
    ]

    logger.info('Fetching GA4 data', {
      userId: session.user.id,
      propertyId: ga4Connection.propertyId,
      requestCount: batchRequests.length
    })

    // Fetch data from GA4
    const reports = await ga4Service.batchRunReports(ga4Connection.propertyId, batchRequests)

    logger.info('GA4 data fetched successfully', {
      userId: session.user.id,
      reportCount: reports.length,
      overviewRowCount: reports[0]?.rowCount || 0,
      topPagesCount: reports[1]?.rowCount || 0,
      trafficSourcesCount: reports[2]?.rowCount || 0
    })

    // Process the reports
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

    // Log processed data summary
    logger.info('Processed GA4 data', {
      userId: session.user.id,
      overviewDates: processedData.overview.dates.length,
      topPagesCount: processedData.topPages.length,
      trafficSourcesCount: processedData.trafficSources.length,
      totalSessions: processedData.overview.metrics.sessions?.reduce((a, b) => a + b, 0) || 0,
      totalUsers: processedData.overview.metrics.activeUsers?.reduce((a, b) => a + b, 0) || 0,
      totalPageViews: processedData.overview.metrics.screenPageViews?.reduce((a, b) => a + b, 0) || 0
    })

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
    const session = await auth()
    logger.error('GA4 analytics API error', error, {
      userId: session?.user?.id,
      path: '/api/ga4/analytics',
      method: 'POST',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })

    // Provide more specific error messages
    let errorMessage = 'Failed to fetch analytics data'
    let errorDetails = null
    
    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        stack: error.stack
      }
      
      if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage = 'Insufficient permissions for Google Analytics. Please reconnect your account.'
      } else if (error.message.includes('property')) {
        errorMessage = 'Invalid or inaccessible Analytics property. Please check your connection.'
      } else if (error.message.includes('quota') || error.message.includes('rate')) {
        errorMessage = 'Google Analytics API quota exceeded. Please try again later.'
      } else if (error.message.includes('not a valid metric') || error.message.includes('not a valid dimension')) {
        errorMessage = 'Invalid metric or dimension requested. The GA4 API schema has been updated.'
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    )
  }
}

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
    screenPageViews: parseInt(row.metricValues?.[1]?.value) || 0
  }))
}

function processTrafficSourcesReport(report: any) {
  if (!report?.rows) return []

  return report.rows.map((row: any) => ({
    source: row.dimensionValues?.[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value) || 0
  }))
}