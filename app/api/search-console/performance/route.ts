import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

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

function getCacheKey(userId: string, params: any): string {
  return `sc-${userId}-${JSON.stringify(params)}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = performanceRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { startDate, endDate, dimensions, searchType, rowLimit } = validationResult.data

    // Check cache first
    const cacheKey = getCacheKey(session.user.id, { startDate, endDate, dimensions, searchType })
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: cachedData.data, cached: true })
    }

    // Check if user has Search Console connection
    const searchConsoleConnection = await prisma.searchConsoleConnection.findUnique({
      where: { userId: session.user.id }
    })

    if (!searchConsoleConnection || !searchConsoleConnection.siteUrl) {
      return NextResponse.json(
        { error: 'Search Console not connected. Please connect your Search Console account in settings.' },
        { status: 404 }
      )
    }

    // Initialize Search Console service
    const searchConsoleService = await getSearchConsoleService(session.user.id)

    // Prepare batch requests
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
      }),
      // Top search queries
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: ['query'],
        searchType,
        rowLimit: 25
      }),
      // Top pages
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: ['page'],
        searchType,
        rowLimit: 10
      }),
      // Performance over time
      searchConsoleService.getSearchAnalytics(searchConsoleConnection.siteUrl, {
        startDate,
        endDate,
        dimensions: ['date'],
        searchType,
        rowLimit: 1000
      })
    ])

    // Process the data
    const processedData = {
      overview: processOverviewData(overviewData),
      topQueries: processTopQueries(topQueriesData),
      topPages: processTopPages(topPagesData),
      performanceByDate: processPerformanceByDate(performanceByDateData),
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
      method: 'POST'
    })

    return NextResponse.json(
      { error: 'Failed to fetch search performance data' },
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