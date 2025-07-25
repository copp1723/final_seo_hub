import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getEnhancedGA4Service } from './enhanced-ga4'
import { getEnhancedSearchConsoleService } from './enhanced-search-console'

interface EnhancedAnalyticsOptions {
  startDate: string
  endDate: string
  dealershipId?: string
  userId: string
}

interface EnhancedDashboardAnalytics {
  ga4Data?: {
    sessions: number
    users: number
    pageviews: number
    bounceRate?: number
    avgSessionDuration?: number
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
    dealershipId?: string
    propertyId?: string
    siteUrl?: string
    lastUpdated: string
  }
  detailed?: {
    ga4Details?: any
    searchConsoleDetails?: any
  }
}

interface ConnectionStatus {
  ga4: {
    connected: boolean
    working: boolean
    error?: string
    properties?: any[]
  }
  searchConsole: {
    connected: boolean
    working: boolean
    error?: string
    sites?: any[]
  }
}

export class EnhancedAnalyticsService {
  
  async getDealershipAnalytics(options: EnhancedAnalyticsOptions): Promise<EnhancedDashboardAnalytics> {
    const { startDate, endDate, dealershipId, userId } = options
    
    const result: EnhancedDashboardAnalytics = {
      errors: {
        ga4Error: null,
        searchConsoleError: null
      },
      metadata: {
        hasGA4Connection: false,
        hasSearchConsoleConnection: false,
        dealershipId,
        lastUpdated: new Date().toISOString()
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

  private async getDealershipGA4Data(options: EnhancedAnalyticsOptions) {
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

      const ga4Service = await getEnhancedGA4Service(userId)
      
      if (!ga4Service) {
        return {
          data: undefined,
          error: 'Failed to initialize GA4 service',
          hasConnection: false,
          propertyId: connection.propertyId
        }
      }

      const ga4Data = await ga4Service.getAnalyticsData({
        propertyId: connection.propertyId,
        startDate,
        endDate,
        userId
      })

      return {
        data: ga4Data,
        error: null,
        hasConnection: true,
        propertyId: connection.propertyId
      }

    } catch (error) {
      logger.error('Enhanced GA4 dealership data fetch error', error, { userId, dealershipId })
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch GA4 data',
        hasConnection: false,
        propertyId: undefined
      }
    }
  }

  private async getDealershipSearchConsoleData(options: EnhancedAnalyticsOptions) {
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

      const searchConsoleService = await getEnhancedSearchConsoleService(userId)
      
      if (!searchConsoleService) {
        return {
          data: undefined,
          error: 'Failed to initialize Search Console service',
          hasConnection: false,
          siteUrl: connection.siteUrl
        }
      }

      const searchConsoleData = await searchConsoleService.getSearchData({
        siteUrl: connection.siteUrl,
        startDate,
        endDate
      })

      return {
        data: searchConsoleData,
        error: null,
        hasConnection: true,
        siteUrl: connection.siteUrl
      }

    } catch (error) {
      logger.error('Enhanced Search Console dealership data fetch error', error, { userId, dealershipId })
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch Search Console data',
        hasConnection: false,
        siteUrl: undefined
      }
    }
  }

  async checkConnectionStatus(userId: string): Promise<ConnectionStatus> {
    const result: ConnectionStatus = {
      ga4: { connected: false, working: false },
      searchConsole: { connected: false, working: false }
    }

    // Check GA4 connection
    try {
      const ga4Connection = await prisma.ga4_connections.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      })

      result.ga4.connected = !!ga4Connection

      if (ga4Connection) {
        const ga4Service = await getEnhancedGA4Service(userId)
        if (ga4Service) {
          const testResult = await ga4Service.testConnection()
          result.ga4.working = testResult.success
          result.ga4.error = testResult.error
          
          if (testResult.success) {
            const properties = await ga4Service.listProperties()
            result.ga4.properties = properties.map(prop => ({
              id: prop.name?.replace('properties/', '') || '',
              name: prop.displayName || 'Unknown Property'
            }))
          }
        }
      }
    } catch (error) {
      result.ga4.error = error instanceof Error ? error.message : 'Unknown GA4 error'
      logger.error('GA4 connection status check failed', error, { userId })
    }

    // Check Search Console connection
    try {
      const scConnection = await prisma.search_console_connections.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      })

      result.searchConsole.connected = !!scConnection

      if (scConnection) {
        const scService = await getEnhancedSearchConsoleService(userId)
        if (scService) {
          const testResult = await scService.testConnection()
          result.searchConsole.working = testResult.success
          result.searchConsole.error = testResult.error
          result.searchConsole.sites = testResult.sites
        }
      }
    } catch (error) {
      result.searchConsole.error = error instanceof Error ? error.message : 'Unknown Search Console error'
      logger.error('Search Console connection status check failed', error, { userId })
    }

    return result
  }
}

// Helper function to get analytics for a dealership
export async function getEnhancedDealershipAnalytics(options: EnhancedAnalyticsOptions): Promise<EnhancedDashboardAnalytics> {
  const service = new EnhancedAnalyticsService()
  return service.getDealershipAnalytics(options)
}

// Helper function to check connection status
export async function checkEnhancedConnectionStatus(userId: string): Promise<ConnectionStatus> {
  const service = new EnhancedAnalyticsService()
  return service.checkConnectionStatus(userId)
}

export default EnhancedAnalyticsService
