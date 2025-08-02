import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { logger } from '@/lib/logger'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// In-memory cache for rankings data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCacheKey(userId: string, dealershipId?: string | null): string {
  return `rankings_${userId}_${dealershipId || 'user-level'}_${new Date().toISOString().split('T')[0]}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      logger.warn('Authentication failed for rankings request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')

    // Check cache first
    const cacheKey = getCacheKey(session.user.id, dealershipId || undefined)
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      logger.info('Returning cached rankings data', {
        userId: session.user.id,
        dealershipId,
        cacheKey
      })
      return NextResponse.json({ 
        data: cachedData.data,
        cached: true,
        timestamp: cachedData.timestamp
      })
    }

    // Fetch fresh data
    const analyticsService = new DealershipAnalyticsService()
    
    const rankingsData = await analyticsService.getSearchConsoleRankings(
      session.user.id,
      dealershipId
    )

    // Cache the result
    cache.set(cacheKey, {
      data: rankingsData,
      timestamp: Date.now()
    })

    // Clean up old cache entries
    const now = Date.now()
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key)
      }
    }

    logger.info('Rankings data fetched successfully', {
      userId: session.user.id,
      dealershipId,
      hasData: !!rankingsData.data,
      hasConnection: rankingsData.hasConnection,
      error: rankingsData.error
    })

    return NextResponse.json({ 
      data: rankingsData,
      cached: false,
      timestamp: Date.now()
    })

  } catch (error) {
    logger.error('Rankings API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch rankings data' },
      { status: 500 }
    )
  }
}
