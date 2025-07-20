import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// In-memory cache for dashboard analytics
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(userId: string, dateRange: string, dealershipId?: string): string {
  return `dashboard_analytics_${userId}_${dateRange}_${dealershipId || 'global'}_${new Date().toDateString()}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
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
        dealershipId,
        cacheAge: Date.now() - cachedData.timestamp
      })
      return NextResponse.json({ data: cachedData.data, cached: true })
    }

    // Use new dealership-specific analytics service
    const analyticsService = new DealershipAnalyticsService()
    
    const analyticsData = await analyticsService.getDealershipAnalytics({
      startDate,
      endDate,
      dealershipId: dealershipId || '',
      userId: session.user.id
    })

    // Add combined metrics
    const combinedMetrics = {
      totalSessions: analyticsData.ga4Data?.sessions || 0,
      totalUsers: analyticsData.ga4Data?.users || 0,
      totalClicks: analyticsData.searchConsoleData?.clicks || 0,
      totalImpressions: analyticsData.searchConsoleData?.impressions || 0,
      avgCTR: analyticsData.searchConsoleData?.ctr || 0,
      avgPosition: analyticsData.searchConsoleData?.position || 0
    }

    const dashboardData = {
      ...analyticsData,
      combinedMetrics
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
  const dealershipId = searchParams.get('dealershipId')
  
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  
  switch (dateRange) {
    case '7days':
      startDate.setDate(startDate.getDate() - 7)
      break
    case '30days':
      startDate.setDate(startDate.getDate() - 30)
      break
    case '90days':
      startDate.setDate(startDate.getDate() - 90)
      break
    default:
      startDate.setDate(startDate.getDate() - 30)
  }

  // Create POST request body
  const postBody = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dateRange,
    dealershipId
  }

  // Forward to POST handler
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postBody)
  })

  return POST(postRequest)
}