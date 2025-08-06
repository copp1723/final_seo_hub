import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { redisManager } from '@/lib/redis'
import { CacheKeys } from '@/lib/cache/cache-keys'
import { logger } from '@/lib/logger'
import { getDateRange } from '@/lib/utils/date-formatter'

export interface CoordinatedAnalyticsResult {
  ga4Data?: any
  searchConsoleData?: any
  rankingsData?: any
  errors: {
    ga4?: string | null
    searchConsole?: string | null
    rankings?: string | null
  }
  metadata: {
    userId: string
    dealershipId?: string
    fromCache: boolean
    timestamp: string
    hasGA4Connection?: boolean
    hasSearchConsoleConnection?: boolean
    propertyId?: string | null
    siteUrl?: string | null
    searchConsolePermission?: 'ok' | 'no_permission' | 'not_connected' | 'unknown_error'
    dataSources: {
      ga4: 'dealership' | 'user' | 'none'
      searchConsole: 'dealership' | 'user' | 'none'
    }
  }
}

/**
 * Coordinates analytics data fetching across GA4 and Search Console
 * Ensures data consistency and proper caching
 */
export class AnalyticsCoordinator {
  private analyticsService: DealershipAnalyticsService

  constructor() {
    this.analyticsService = new DealershipAnalyticsService()
  }

  /**
   * Fetch all analytics data in a coordinated manner
   */
  async fetchCoordinatedAnalytics(
    userId: string,
    dateRange: string = '30days',
    dealershipId?: string,
    forceRefresh: boolean = false
  ): Promise<CoordinatedAnalyticsResult> {
    const startTime = Date.now()
    
    // Generate cache key
    const cacheKey = CacheKeys.analytics(userId, dateRange, dealershipId)
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const redisClient = await redisManager.getClient()
        if (redisClient) {
          const cachedData = await redisClient.get(cacheKey)
          if (cachedData) {
            const cached = JSON.parse(cachedData) as CoordinatedAnalyticsResult
            logger.info('Analytics data served from cache', {
              userId,
              dealershipId,
              cacheKey,
              responseTime: Date.now() - startTime
            })
            return { ...cached, metadata: { ...cached.metadata, fromCache: true } }
          }
        }
      } catch (error) {
        logger.warn('Cache retrieval failed, proceeding without cache', { error, cacheKey })
      }
    }

    // Initialize result
    const result: CoordinatedAnalyticsResult = {
      errors: {},
      metadata: {
        userId,
        dealershipId,
        fromCache: false,
        timestamp: new Date().toISOString(),
        dataSources: {
          ga4: 'none',
          searchConsole: 'none'
        }
      }
    }

    try {
      // Fetch GA4 and Search Console data in parallel
      const [ga4Result, searchConsoleResult] = await Promise.allSettled([
        this.fetchGA4Data(userId, dateRange, dealershipId),
        this.fetchSearchConsoleData(userId, dateRange, dealershipId)
      ])

      // Process GA4 result
      if (ga4Result.status === 'fulfilled') {
        result.ga4Data = ga4Result.value.data
        result.errors.ga4 = ga4Result.value.error
        result.metadata.dataSources.ga4 = ga4Result.value.source || 'none'
        result.metadata.hasGA4Connection = ga4Result.value.hasConnection || false
        result.metadata.propertyId = ga4Result.value.propertyId || null
      } else {
        result.errors.ga4 = 'Failed to fetch GA4 data'
        result.metadata.hasGA4Connection = false
        result.metadata.propertyId = null
        logger.error('GA4 fetch failed', ga4Result.reason)
      }

      // Process Search Console result
      if (searchConsoleResult.status === 'fulfilled') {
        result.searchConsoleData = searchConsoleResult.value.data
        result.rankingsData = searchConsoleResult.value.rankings
        result.errors.searchConsole = searchConsoleResult.value.error
        result.metadata.dataSources.searchConsole = searchConsoleResult.value.source || 'none'
        result.metadata.hasSearchConsoleConnection = searchConsoleResult.value.hasConnection || false
        result.metadata.siteUrl = searchConsoleResult.value.siteUrl || null
        ;(result.metadata as any).searchConsolePermission = searchConsoleResult.value.permissionStatus
      } else {
        result.errors.searchConsole = 'Failed to fetch Search Console data'
        result.metadata.hasSearchConsoleConnection = false
        result.metadata.siteUrl = null
        logger.error('Search Console fetch failed', searchConsoleResult.reason)
      }

      // Cache the result if at least one service succeeded
      if (result.ga4Data || result.searchConsoleData) {
        try {
          const redisClient = await redisManager.getClient()
          if (redisClient) {
            const ttlSeconds = Math.floor(CacheKeys.CACHE_TTL / 1000) // Convert to seconds
            await redisClient.setex(cacheKey, ttlSeconds, JSON.stringify(result))
          }
        } catch (error) {
          logger.warn('Cache storage failed', { error, cacheKey })
        }
      }

      logger.info('Coordinated analytics fetch completed', {
        userId,
        dealershipId,
        ga4Success: !!result.ga4Data,
        searchConsoleSuccess: !!result.searchConsoleData,
        responseTime: Date.now() - startTime
      })

    } catch (error) {
      logger.error('Analytics coordination failed', error, { userId, dealershipId })
      result.errors.ga4 = 'Unexpected error'
      result.errors.searchConsole = 'Unexpected error'
    }

    return result
  }

  /**
   * Fetch GA4 data with proper error handling
   */
  private async fetchGA4Data(
    userId: string,
    dateRange: string,
    dealershipId?: string
  ): Promise<{ data: any; error: string | null; source?: 'dealership' | 'user'; hasConnection?: boolean; propertyId?: string | null }> {
    try {
      const { startDate, endDate } = getDateRange(dateRange)

      const analytics = await this.analyticsService.getDealershipAnalytics({
        userId,
        dealershipId: dealershipId || null,
        startDate,
        endDate
      })

      return {
        data: analytics.ga4Data,
        error: analytics.errors?.ga4Error || null,
        source: (analytics.metadata?.hasGA4Connection ? 'user' : 'dealership') as 'dealership' | 'user',
        hasConnection: analytics.metadata?.hasGA4Connection || false,
        propertyId: analytics.metadata?.propertyId || null
      }
    } catch (error) {
      logger.error('GA4 data fetch error', error, { userId, dealershipId })
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasConnection: false,
        propertyId: null
      }
    }
  }

  /**
   * Fetch Search Console data with proper error handling
   */
  private async fetchSearchConsoleData(
    userId: string,
    dateRange: string,
    dealershipId?: string
  ): Promise<{ data: any; rankings: any; error: string | null; source?: 'dealership' | 'user'; hasConnection?: boolean; siteUrl?: string | null; permissionStatus?: 'ok' | 'no_permission' | 'not_connected' | 'unknown_error' }> {
    try {
      const { startDate, endDate } = getDateRange(dateRange)

      const analytics = await this.analyticsService.getDealershipAnalytics({
        userId,
        dealershipId: dealershipId || null,
        startDate,
        endDate
      })

      // Also fetch rankings
      const rankings = await this.analyticsService.getSearchConsoleRankings(
        userId,
        dealershipId || null
      )

      return {
        data: analytics.searchConsoleData,
        rankings: rankings.data,
        error: analytics.errors?.searchConsoleError || rankings.error || null,
        source: (analytics.metadata?.hasSearchConsoleConnection ? 'user' : 'dealership') as 'dealership' | 'user',
        hasConnection: analytics.metadata?.hasSearchConsoleConnection || false,
        siteUrl: analytics.metadata?.siteUrl || null,
        permissionStatus: (analytics.metadata as any)?.searchConsolePermission
      }
    } catch (error) {
      logger.error('Search Console data fetch error', error, { userId, dealershipId })
      return {
        data: null,
        rankings: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasConnection: false,
        siteUrl: null
      }
    }
  }

  /**
   * Invalidate all analytics cache for a dealership change
   */
  async invalidateDealershipCache(userId: string, dealershipId?: string): Promise<void> {
    try {
      const redisClient = await redisManager.getClient()
      if (redisClient) {
        // For Redis, we'll need to delete specific keys since Redis doesn't have pattern-based deletion
        // We'll delete common cache patterns for this user/dealership
        const patterns = [
          CacheKeys.analytics(userId, '7days', dealershipId),
          CacheKeys.analytics(userId, '30days', dealershipId),
          CacheKeys.analytics(userId, '90days', dealershipId),
          CacheKeys.dashboard(userId, '30days', dealershipId)
        ]

        for (const key of patterns) {
          await redisClient.del(key)
        }
      }
    } catch (error) {
      logger.warn('Cache invalidation failed', { error, userId, dealershipId })
    }

    logger.info('Analytics cache invalidated', { userId, dealershipId })
  }

  /**
   * Pre-warm cache for a dealership
   */
  async prewarmCache(userId: string, dealershipId: string): Promise<void> {
    try {
      // Pre-fetch common date ranges
      const dateRanges = ['7days', '30days', '90days']
      
      await Promise.all(
        dateRanges.map(range => 
          this.fetchCoordinatedAnalytics(userId, range, dealershipId, true)
        )
      )

      logger.info('Cache pre-warmed for dealership', { userId, dealershipId })
    } catch (error) {
      logger.error('Cache pre-warm failed', error, { userId, dealershipId })
    }
  }
}

// Export singleton instance
export const analyticsCoordinator = new AnalyticsCoordinator()