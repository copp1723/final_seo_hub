import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { cacheManager } from '@/lib/cache/centralized-cache-manager'
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
      const cached = cacheManager.get<CoordinatedAnalyticsResult>(cacheKey)
      if (cached) {
        logger.info('Analytics data served from cache', {
          userId,
          dealershipId,
          cacheKey,
          responseTime: Date.now() - startTime
        })
        return { ...cached, metadata: { ...cached.metadata, fromCache: true } }
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
      } else {
        result.errors.ga4 = 'Failed to fetch GA4 data'
        logger.error('GA4 fetch failed', ga4Result.reason)
      }

      // Process Search Console result
      if (searchConsoleResult.status === 'fulfilled') {
        result.searchConsoleData = searchConsoleResult.value.data
        result.rankingsData = searchConsoleResult.value.rankings
        result.errors.searchConsole = searchConsoleResult.value.error
        result.metadata.dataSources.searchConsole = searchConsoleResult.value.source || 'none'
      } else {
        result.errors.searchConsole = 'Failed to fetch Search Console data'
        logger.error('Search Console fetch failed', searchConsoleResult.reason)
      }

      // Cache the result if at least one service succeeded
      if (result.ga4Data || result.searchConsoleData) {
        cacheManager.set(cacheKey, result, { userId, dealershipId })
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
  ): Promise<{ data: any; error: string | null; source?: 'dealership' | 'user' }> {
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
        source: (analytics.metadata?.hasGA4Connection ? 'user' : 'dealership') as 'dealership' | 'user'
      }
    } catch (error) {
      logger.error('GA4 data fetch error', error, { userId, dealershipId })
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
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
  ): Promise<{ data: any; rankings: any; error: string | null; source?: 'dealership' | 'user' }> {
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
        source: (analytics.metadata?.hasSearchConsoleConnection ? 'user' : 'dealership') as 'dealership' | 'user'
      }
    } catch (error) {
      logger.error('Search Console data fetch error', error, { userId, dealershipId })
      return {
        data: null,
        rankings: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Invalidate all analytics cache for a dealership change
   */
  async invalidateDealershipCache(userId: string, dealershipId?: string): Promise<void> {
    if (dealershipId) {
      // Invalidate specific dealership
      cacheManager.invalidateByDealership(dealershipId)
    } else {
      // Invalidate all user cache
      cacheManager.invalidateByUser(userId)
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