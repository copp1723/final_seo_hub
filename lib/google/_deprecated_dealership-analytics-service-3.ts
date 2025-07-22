import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { refreshGA4TokenIfNeeded } from './ga4-token-refresh'

interface AnalyticsOptions {
  startDate: string
  endDate: string
  dealershipId: string
  userId: string
}

interface DashboardAnalytics {
  ga4Data?: {
    sessions: number
    users: number
    pageviews: number
  }
  searchConsoleData?: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  errors: {
    ga4Error: string | null
    searchConsoleError: string | null
  }
  metadata: {
    hasGA4Connection: boolean
    hasSearchConsoleConnection: boolean
    dealershipId: string
    propertyId?: string
    siteUrl?: string
  }
}

export class DealershipAnalyticsService {
  
  async getDealershipAnalytics(options: AnalyticsOptions): Promise<DashboardAnalytics> {
    const { startDate, endDate, dealershipId, userId } = options
    
    const result: DashboardAnalytics = {
      errors: {
        ga4Error: null,
        searchConsoleError: null
      },
      metadata: {
        hasGA4Connection: false,
        hasSearchConsoleConnection: false,
        dealershipId
      }
    }

    // Get GA4 data for dealership
    const ga4Result = await this.getDealershipGA4Data({ startDate, endDate, dealershipId, userId })
    result.ga4Data = ga4Result.data
    result.errors.ga4Error = ga4Result.error
    result.metadata.hasGA4Connection = ga4Result.hasConnection
    result.metadata.propertyId = ga4Result.propertyId

    // Get Search Console data for dealership
    const scResult = await this.getDealershipSearchConsoleData({ startDate, endDate, dealershipId, userId })
    result.searchConsoleData = scResult.data
    result.errors.searchConsoleError = scResult.error
    result.metadata.hasSearchConsoleConnection = scResult.hasConnection
    result.metadata.siteUrl = scResult.siteUrl

    return result
  }

  private async getDealershipGA4Data(options: AnalyticsOptions) {
    const { startDate, endDate, dealershipId, userId } = options
    
    try {
      // Try dealership-specific connection first
      let connection = await prisma.ga4_connections.findFirst({
        where: { 
          userId,
          dealershipId
        }
      })

      // Fallback to user-level connection
      if (!connection) {
        connection = await prisma.ga4_connections.findUnique({
          where: { userId }
        })
      }

      if (!connection || !connection.propertyId) {
        return {
          data: undefined,
          error: 'No GA4 connection found for this dealership',
          hasConnection: false,
          propertyId: undefined
        }
      }

      // Refresh token if needed
      await refreshGA4TokenIfNeeded(userId)

      const ga4Service = new GA4Service(userId)
      await ga4Service.initialize()

      const ga4Reports = await ga4Service.batchRunReports(connection.propertyId, [
        {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'eventCount' }
          ],
          dimensions: [],
          limit: 1
        }
      ])

      if (ga4Reports && ga4Reports[0]) {
        const report = ga4Reports[0]
        const row = report.rows?.[0]
        
        if (row) {
          return {
            data: {
              sessions: parseInt(row.metricValues?.[0]?.value || '0'),
              users: parseInt(row.metricValues?.[1]?.value || '0'),
              pageviews: parseInt(row.metricValues?.[2]?.value || '0')
            },
            error: null,
            hasConnection: true,
            propertyId: connection.propertyId
          }
        }
      }

      return {
        data: undefined,
        error: 'No data available',
        hasConnection: true,
        propertyId: connection.propertyId
      }

    } catch (error) {
      logger.error('GA4 dealership data fetch error', error, { userId, dealershipId })
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch GA4 data',
        hasConnection: false,
        propertyId: undefined
      }
    }
  }

  private async getDealershipSearchConsoleData(options: AnalyticsOptions) {
    const { startDate, endDate, dealershipId, userId } = options
    
    try {
      // Try dealership-specific connection first
      let connection = await prisma.search_console_connections.findFirst({
        where: { 
          userId,
          dealershipId
        }
      })

      // Fallback to user-level connection
      if (!connection) {
        connection = await prisma.search_console_connections.findUnique({
          where: { userId }
        })
      }

      if (!connection || !connection.siteUrl) {
        return {
          data: undefined,
          error: 'No Search Console connection found for this dealership',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      const searchConsoleService = await this.getSearchConsoleService(userId)
      
      const searchConsoleData = await searchConsoleService.getSearchAnalytics(
        connection.siteUrl,
        {
          startDate,
          endDate,
          dimensions: [],
          searchType: 'web',
          rowLimit: 1
        }
      )

      if (searchConsoleData && searchConsoleData.rows && searchConsoleData.rows.length > 0) {
        const row = searchConsoleData.rows[0]
        
        return {
          data: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0
          },
          error: null,
          hasConnection: true,
          siteUrl: connection.siteUrl
        }
      }

      return {
        data: undefined,
        error: 'No data available',
        hasConnection: true,
        siteUrl: connection.siteUrl
      }

    } catch (error) {
      logger.error('Search Console dealership data fetch error', error, { userId, dealershipId })
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch Search Console data',
        hasConnection: false,
        siteUrl: undefined
      }
    }
  }

  private async getSearchConsoleService(userId: string) {
    const token = await prisma.search_console_connections.findUnique({
      where: { userId }
    })

    if (!token || !token.accessToken) {
      throw new Error('No Search Console token found for user')
    }
    
    const accessToken = decrypt(token.accessToken)
    const refreshToken = token.refreshToken ? decrypt(token.refreshToken) : undefined

    const { SearchConsoleService } = await import('./searchConsoleService')
    return new SearchConsoleService(accessToken, refreshToken)
  }
}

// Helper function to get analytics for a dealership
export async function getDealershipAnalytics(options: AnalyticsOptions): Promise<DashboardAnalytics> {
  const service = new DealershipAnalyticsService()
  return service.getDealershipAnalytics(options)
}