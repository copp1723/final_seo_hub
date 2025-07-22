import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Force dynamic rendering since we use auth
export const dynamic = 'force-dynamic'

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

    // Check cache first
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

    // Check for GA4 and Search Console connections
    const [ga4Token, searchConsoleToken, userDealership] = await Promise.all([
      prisma.user_ga4_tokens.findUnique({
        where: { userId: session.user.id }
      }),
      prisma.user_search_console_tokens.findUnique({
        where: { userId: session.user.id }
      }),
      dealershipId ? prisma.dealerships.findUnique({
        where: { id: dealershipId },
        select: { 
          ga4PropertyId: true,
          ga4PropertyName: true,
          siteUrl: true
        }
      }) : null
    ])

    // For now, return mock data with proper connection status
    const dashboardData = {
      ga4Data: ga4Token ? {
        sessions: 0,
        users: 0,
        pageviews: 0
      } : undefined,
      searchConsoleData: searchConsoleToken ? {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      } : undefined,
      errors: {
        ga4Error: !ga4Token ? 'No GA4 connection found. Please connect your Google Analytics account.' : null,
        searchConsoleError: !searchConsoleToken ? 'No Search Console connection found. Please connect your Search Console account.' : null
      },
      metadata: {
        hasGA4Connection: !!ga4Token,
        hasSearchConsoleConnection: !!searchConsoleToken,
        dealershipId: dealershipId || '',
        propertyId: userDealership?.ga4PropertyId,
        siteUrl: userDealership?.siteUrl || searchConsoleToken?.primarySite
      },
      combinedMetrics: {
        totalSessions: 0,
        totalUsers: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgCTR: 0,
        avgPosition: 0
      }
    }

    // Cache the result
    cache.set(cacheKey, { data: dashboardData, timestamp: Date.now() })

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
  // Support GET requests with query parameters
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

  // Create a new request with the session cookie
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dateRange,
      dealershipId
    })
  })

  // Copy cookies to the new request
  request.cookies.getAll().forEach(cookie => {
    postRequest.cookies.set(cookie)
  })

  return POST(postRequest)
}