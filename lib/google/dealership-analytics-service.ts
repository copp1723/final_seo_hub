import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { refreshGA4TokenIfNeeded } from './ga4-token-refresh'
import { GA4Service } from './ga4Service'
import { features } from '@/lib/features'
import { getDemoGA4Analytics, getDemoSearchConsoleData } from '@/lib/demo-data'
import { getGA4PropertyId, getSearchConsoleUrl, hasGA4Access } from '@/lib/dealership-property-mapping'

interface AnalyticsOptions {
  startDate: string
  endDate: string
  dealershipId?: string | null
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

    // Check if demo mode is enabled
    if (features.demoMode) {
      logger.info('🎭 Returning demo analytics data', {
        userId,
        dealershipId,
        dateRange: { startDate, endDate }
      })

      return this.getDemoAnalytics(startDate, endDate, dealershipId)
    }

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
      // Find user's GA4 connection first
      let connection = await prisma.ga4_connections.findFirst({
        where: { userId }
      })

      if (!connection) {
        return {
          data: undefined,
          error: 'No GA4 connection found - please connect your Google Analytics account',
          hasConnection: false,
          propertyId: undefined
        }
      }

      // Get dealership-specific GA4 property ID from mapping
      let propertyId: string | null = null
      let hasDealershipMapping = false

      if (dealershipId) {
        propertyId = getGA4PropertyId(dealershipId)
        console.log(`🎯 GA4 Property mapping for ${dealershipId}:`, propertyId)

        // Check if dealership has mapping AND user's connection matches the dealership property
        if (propertyId && hasGA4Access(dealershipId) && propertyId === connection.propertyId) {
          hasDealershipMapping = true
          console.log(`✅ Found dealership-specific GA4 mapping for ${dealershipId} that matches user connection`)
        } else {
          console.log(`⚠️ Dealership mapping exists but doesn't match user's GA4 property (${connection.propertyId}), falling back to user connection`)
          propertyId = null // Reset to use user connection
        }
      }

      // Use the dealership-specific property ID if it matches user access, otherwise use user connection
      const targetPropertyId = propertyId || connection.propertyId

      if (!targetPropertyId) {
        return {
          data: undefined,
          error: 'No GA4 property ID available',
          hasConnection: false,
          propertyId: undefined
        }
      }

      console.log(`📊 Using GA4 property ID: ${targetPropertyId} ${hasDealershipMapping ? '(from dealership mapping)' : '(from user connection)'}`)

      console.log(`🔍 Using GA4 property ID: ${targetPropertyId} for dealership: ${dealershipId}`)

      // Refresh token if needed
      await refreshGA4TokenIfNeeded(userId)

      const ga4Service = new GA4Service(userId)
      await ga4Service.initialize()

      const ga4Reports = await ga4Service.batchRunReports(targetPropertyId, [
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
            propertyId: targetPropertyId
          }
        }
      }

      return {
        data: undefined,
        error: 'No data available',
        hasConnection: true,
        propertyId: targetPropertyId
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
      // Get dealership-specific Search Console URL from mapping
      let siteUrl: string | null = null

      if (dealershipId) {
        siteUrl = getSearchConsoleUrl(dealershipId)
        console.log(`🎯 Search Console URL mapping for ${dealershipId}:`, siteUrl)

        if (!siteUrl) {
          console.log(`❌ No Search Console URL found for dealership: ${dealershipId}`)
          return {
            data: undefined,
            error: `No Search Console URL configured for dealership: ${dealershipId}`,
            hasConnection: false,
            siteUrl: undefined
          }
        }
      }

      // Find any Search Console connection (we'll use the URL from mapping, not from connection)
      let connection = await prisma.search_console_connections.findFirst({
        where: {
          userId,
          // We can use any connection since we have the specific URL from mapping
        }
      })

      if (!connection) {
        return {
          data: undefined,
          error: 'No Search Console connection found - please connect your Google Search Console account',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      // Use the dealership-specific URL from mapping, or fallback to connection URL
      const targetSiteUrl = siteUrl || connection.siteUrl

      if (!targetSiteUrl) {
        return {
          data: undefined,
          error: 'No Search Console URL available',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      console.log(`🔍 Using Search Console URL: ${targetSiteUrl} for dealership: ${dealershipId}`)

      const searchConsoleService = await this.getSearchConsoleService(userId)

      const searchConsoleData = await searchConsoleService.getSearchAnalytics(
        targetSiteUrl,
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
          siteUrl: targetSiteUrl
        }
      }

      return {
        data: undefined,
        error: 'No data available',
        hasConnection: true,
        siteUrl: targetSiteUrl
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
    // Get user info to check for agency/dealership associations
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { agencyId: true, dealershipId: true, role: true }
    });

    let token = null;

    // For agency-level users, check agency dealerships first
    if (user?.agencyId && (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN')) {
      const agencyDealerships = await prisma.dealerships.findMany({
        where: { agencyId: user.agencyId },
        select: { id: true }
      });

      if (agencyDealerships.length > 0) {
        const dealershipIds = agencyDealerships.map(d => d.id);

        token = await prisma.search_console_connections.findFirst({
          where: { dealershipId: { in: dealershipIds } },
          orderBy: { updatedAt: 'desc' }
        });
      }
    }

    // Fallback: check for direct user or dealership connection
    if (!token) {
      token = await prisma.search_console_connections.findFirst({
        where: {
          OR: [
            { userId },
            { dealershipId: user?.dealershipId }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!token || !token.accessToken) {
      throw new Error('No Search Console token found for user')
    }
    
    const accessToken = decrypt(token.accessToken)
    const refreshToken = token.refreshToken ? decrypt(token.refreshToken) : undefined

    const { SearchConsoleService } = await import('./searchConsoleService')
    return new SearchConsoleService(accessToken, refreshToken)
  }

  private getDemoAnalytics(startDate: string, endDate: string, dealershipId?: string | null): DashboardAnalytics {
    logger.info('🎭 Generating demo analytics for dealership', {
      dealershipId,
      startDate,
      endDate
    })

    // Get demo GA4 data
    const demoGA4 = getDemoGA4Analytics(startDate, endDate, dealershipId || undefined)

    // Get demo Search Console data
    const demoSC = getDemoSearchConsoleData(startDate, endDate, dealershipId || undefined)

    logger.info('🎭 Demo data generated', {
      dealershipId,
      ga4Sessions: demoGA4.totals.sessions,
      ga4Users: demoGA4.totals.users,
      scClicks: demoSC.totals.clicks,
      propertyId: demoGA4.metadata.propertyId
    })

    return {
      ga4Data: {
        sessions: demoGA4.totals.sessions,
        users: demoGA4.totals.users,
        pageviews: demoGA4.totals.eventCount
      },
      searchConsoleData: {
        clicks: demoSC.totals.clicks,
        impressions: demoSC.totals.impressions,
        ctr: demoSC.totals.ctr,
        position: demoSC.totals.position
      },
      errors: {
        ga4Error: null,
        searchConsoleError: null
      },
      metadata: {
        hasGA4Connection: true,
        hasSearchConsoleConnection: true,
        dealershipId: dealershipId || 'demo-dealership-001',
        propertyId: demoGA4.metadata.propertyId,
        siteUrl: demoSC.metadata.siteUrl
      }
    }
  }
}

// Helper function to get analytics for a dealership
export async function getDealershipAnalytics(options: AnalyticsOptions): Promise<DashboardAnalytics> {
  const service = new DealershipAnalyticsService()
  return service.getDealershipAnalytics(options)
}