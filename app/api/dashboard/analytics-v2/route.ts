import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { GA4Service } from '@/lib/google/ga4Service'
import { SearchConsoleService } from '@/lib/google/search-console-service'

// Force dynamic rendering since we use auth
export const dynamic = 'force-dynamic'

// In-memory cache for dashboard analytics
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(userId: string, dateRange: string, dealershipId?: string): string {
  return `dashboard_analytics_${userId}_${dateRange}_${dealershipId || 'none'}_${new Date().toDateString()}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, dateRange = '30days', dealershipId } = body

    // IMPORTANT: If no dealership is selected, return empty data
    if (!dealershipId) {
      return NextResponse.json({ 
        data: {
          ga4Data: undefined,
          searchConsoleData: undefined,
          errors: {
            ga4Error: 'Please select a dealership to view analytics',
            searchConsoleError: 'Please select a dealership to view search data'
          },
          metadata: {
            hasGA4Connection: false,
            hasSearchConsoleConnection: false,
            dealershipId: '',
            propertyId: undefined,
            siteUrl: undefined
          },
          combinedMetrics: {
            totalSessions: 0,
            totalUsers: 0,
            totalClicks: 0,
            totalImpressions: 0,
            avgCTR: 0,
            avgPosition: 0
          }
        },
        cached: false 
      })
    }

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

    // Get dealership-specific configuration
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      select: { 
        id: true,
        name: true,
        ga4PropertyId: true,
        ga4PropertyName: true,
        siteUrl: true,
        primaryDomain: true
      }
    })

    if (!dealership) {
      return NextResponse.json({ 
        error: 'Dealership not found' 
      }, { status: 404 })
    }

    // Check for user's GA4 and Search Console connections
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    // Find connections - check both user-level and dealership-level
    const [ga4Connection, searchConsoleConnection] = await Promise.all([
      // First try dealership-level, then user-level
      user?.dealershipId ? 
        prisma.ga4_connections.findFirst({
          where: { dealershipId: user.dealershipId }
        }).then(conn => conn || prisma.ga4_connections.findFirst({
          where: { userId: session.user.id }
        })) :
        prisma.ga4_connections.findFirst({
          where: { userId: session.user.id }
        }),
      user?.dealershipId ?
        prisma.search_console_connections.findFirst({
          where: { dealershipId: user.dealershipId }
        }).then(conn => conn || prisma.search_console_connections.findFirst({
          where: { userId: session.user.id }
        })) :
        prisma.search_console_connections.findFirst({
          where: { userId: session.user.id }
        })
    ])

    let ga4Data = undefined;
    let ga4Error = null;
    let searchConsoleData = undefined;
    let searchConsoleError = null;

    // Fetch GA4 data if connected AND dealership has GA4 property configured
    if (ga4Connection && (dealership.ga4PropertyId || ga4Connection.propertyId)) {
      try {
        const ga4Service = new GA4Service()
        const propertyId = dealership.ga4PropertyId || ga4Connection.propertyId
        ga4Data = await ga4Service.getAnalyticsData({
          propertyId,
          startDate,
          endDate,
          userId: session.user.id
        })
      } catch (error) {
        logger.error('GA4 fetch error', error)
        ga4Error = 'Failed to fetch GA4 data'
      }
    } else if (!ga4Connection) {
      ga4Error = 'Connect your Google Analytics account in Settings > Integrations'
    } else if (!dealership.ga4PropertyId && !ga4Connection.propertyId) {
      ga4Error = `No GA4 property configured for ${dealership.name}`
    }

    // Fetch Search Console data if connected AND dealership has site URL configured
    const dealershipUrl = dealership.siteUrl || dealership.primaryDomain
    if (searchConsoleConnection && (dealershipUrl || searchConsoleConnection.siteUrl)) {
      try {
        const siteUrl = dealershipUrl || searchConsoleConnection.siteUrl
        const scService = new SearchConsoleService()
        searchConsoleData = await scService.getSearchData({
          siteUrl,
          startDate,
          endDate,
          userId: session.user.id
        })
      } catch (error) {
        logger.error('Search Console fetch error', error)
        searchConsoleError = 'Failed to fetch Search Console data'
      }
    } else if (!searchConsoleConnection) {
      searchConsoleError = 'Connect your Search Console account in Settings > Integrations'
    } else if (!dealershipUrl && !searchConsoleConnection.siteUrl) {
      searchConsoleError = `No website URL configured for ${dealership.name}`
    }

    // Build response with dealership-specific data
    const dashboardData = {
      ga4Data: ga4Data || undefined,
      searchConsoleData: searchConsoleData || undefined,
      errors: {
        ga4Error,
        searchConsoleError
      },
      metadata: {
        hasGA4Connection: !!ga4Connection && !!(dealership.ga4PropertyId || ga4Connection.propertyId),
        hasSearchConsoleConnection: !!searchConsoleConnection && !!(dealershipUrl || searchConsoleConnection.siteUrl),
        dealershipId: dealership.id,
        dealershipName: dealership.name,
        propertyId: dealership.ga4PropertyId || ga4Connection?.propertyId,
        siteUrl: dealershipUrl || searchConsoleConnection?.siteUrl
      },
      combinedMetrics: {
        totalSessions: ga4Data?.sessions || 0,
        totalUsers: ga4Data?.users || 0,
        totalClicks: searchConsoleData?.clicks || 0,
        totalImpressions: searchConsoleData?.impressions || 0,
        avgCTR: searchConsoleData?.ctr || 0,
        avgPosition: searchConsoleData?.position || 0
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