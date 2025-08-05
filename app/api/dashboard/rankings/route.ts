import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { analyticsCoordinator } from '@/lib/analytics/analytics-coordinator'
import { CacheKeys } from '@/lib/cache/cache-keys'
import { logger } from '@/lib/logger'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Note: Cache management is now handled by Redis through the analytics coordinator

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      logger.warn('Authentication failed for rankings request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')

    const clearCacheParam = request.nextUrl.searchParams.get('clearCache')
    const forceRefresh = clearCacheParam === 'true'
    // Use analytics coordinator for synchronized data fetching
    const analyticsData = await analyticsCoordinator.fetchCoordinatedAnalytics(
      session.user.id,
      '30days', // Default date range for rankings
      dealershipId || undefined,
      forceRefresh
    )

    // Extract rankings data from coordinated response
    const rankingsData = {
      data: analyticsData.rankingsData,
      error: analyticsData.errors.rankings || analyticsData.errors.searchConsole,
      hasConnection: analyticsData.metadata.dataSources.searchConsole !== 'none'
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
