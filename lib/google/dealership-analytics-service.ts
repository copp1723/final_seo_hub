import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { refreshGA4TokenIfNeeded } from './ga4-token-refresh'
import { GA4Service } from './ga4Service'
import { features } from '@/lib/features'

import { getGA4PropertyId, getSearchConsoleUrl, hasGA4Access } from '@/lib/dealership-property-mapping'
import { validateGA4Response } from '@/lib/validation/ga4-data-integrity'

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



    const result: DashboardAnalytics = {
      errors: {
        ga4Error: null,
        searchConsoleError: null
      },
      metadata: {
        hasGA4Connection: false,
        hasSearchConsoleConnection: false,
        dealershipId: dealershipId || 'unknown'
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

    // Validate GA4 data integrity before returning
    const validatedResult = validateGA4Response(dealershipId || null, result)

    return validatedResult
  }

  private async getDealershipGA4Data(options: AnalyticsOptions) {
    const { startDate, endDate, dealershipId, userId } = options
    let targetPropertyId: string | null = null

    try {
      // Find GA4 connection - check dealership-level first, then user-level
      let connection = null

      if (dealershipId) {
        connection = await prisma.ga4_connections.findFirst({
          where: { dealershipId }
        })
      }

      // Fallback to user-level connection if no dealership connection found
      if (!connection) {
        connection = await prisma.ga4_connections.findFirst({
          where: { userId }
        })
      }

      if (!connection) {
        logger.info('No GA4 connection found', { userId, dealershipId })
        return {
          data: undefined,
          error: 'No GA4 connection found - please connect your Google Analytics account',
          hasConnection: false,
          propertyId: undefined
        }
      }

      logger.info('GA4 connection found', {
        userId,
        dealershipId,
        connectionId: connection.id,
        propertyId: connection.propertyId,
        connectionType: connection.dealershipId ? 'dealership' : 'user'
      })

      // Get dealership-specific GA4 property ID from mapping
      let propertyId: string | null = null
      let hasDealershipMapping = false

      if (dealershipId) {
        propertyId = getGA4PropertyId(dealershipId)
        console.log(`🎯 GA4 Property mapping for ${dealershipId}:`, propertyId)

        // Use dealership-specific property if it exists and has access
        if (propertyId && hasGA4Access(dealershipId)) {
          hasDealershipMapping = true
          console.log(`✅ Using dealership-specific GA4 property ${propertyId} for ${dealershipId}`)
        } else {
          console.log(`⚠️ No dealership-specific GA4 mapping found for ${dealershipId}, falling back to user connection`)
          propertyId = null // Reset to use user connection
        }
      }

      // Use the dealership-specific property ID if available, otherwise use user connection
      targetPropertyId = propertyId || connection.propertyId

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

      // Check if the connection has a valid access token
      if (!connection.accessToken) {
        console.log(`⚠️ GA4 connection ${connection.id} has no access token, falling back to user-level connection`)

        // Fall back to user-level connection
        const userConnection = await prisma.ga4_connections.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        })

        if (!userConnection || !userConnection.accessToken) {
          return {
            data: undefined,
            error: 'No valid GA4 access token available',
            hasConnection: true, // Connection exists but no valid token
            propertyId: targetPropertyId
          }
        }

        console.log(`🔄 Using user-level GA4 connection ${userConnection.id} for authentication`)
        connection = userConnection
      }

      // Use the connection's token
      const accessToken = decrypt(connection.accessToken)
      const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
      )

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      const analyticsData = google.analyticsdata({
        version: 'v1beta',
        auth: oauth2Client
      })

      const response = await analyticsData.properties.batchRunReports({
        property: `properties/${targetPropertyId}`,
        requestBody: {
          requests: [
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
          ]
        }
      })

      if (response.data && response.data.reports && response.data.reports[0]) {
        const report = response.data.reports[0]
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
        hasConnection: true, // Connection exists, but data fetch failed
        propertyId: targetPropertyId
      }
    }
  }

  private async getDealershipSearchConsoleData(options: AnalyticsOptions) {
    const { startDate, endDate, dealershipId, userId } = options
    let targetSiteUrl: string | null = null

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

      // Find Search Console connection - check dealership-level first, then user-level
      let connection = null

      if (dealershipId) {
        connection = await prisma.search_console_connections.findFirst({
          where: { dealershipId }
        })
      }

      // Fallback to user-level connection if no dealership connection found
      if (!connection) {
        connection = await prisma.search_console_connections.findFirst({
          where: { userId }
        })
      }

      if (!connection) {
        logger.info('No Search Console connection found', { userId, dealershipId })
        return {
          data: undefined,
          error: 'No Search Console connection found - please connect your Google Search Console account',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      logger.info('Search Console connection found', {
        userId,
        dealershipId,
        connectionId: connection.id,
        siteUrl: connection.siteUrl,
        connectionType: connection.dealershipId ? 'dealership' : 'user'
      })

      // Use the dealership-specific URL from mapping, or fallback to connection URL
      targetSiteUrl = siteUrl || connection.siteUrl

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
        hasConnection: true, // Connection exists, but data fetch failed
        siteUrl: targetSiteUrl
      }
    }
  }

  async getSearchConsoleRankings(userId: string, dealershipId?: string | null, startDate?: string, endDate?: string) {
    let targetSiteUrl: string | null = null

    try {


      targetSiteUrl = dealershipId ? getSearchConsoleUrl(dealershipId) : null

      if (!targetSiteUrl) {
        return {
          data: undefined,
          error: 'No Search Console URL available',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      const searchConsoleService = await this.getSearchConsoleService(userId)

      // Get top queries with ranking data
      const rankingsData = await searchConsoleService.getTopQueries(targetSiteUrl, 30)

      if (rankingsData && rankingsData.rows && rankingsData.rows.length > 0) {
        const queries = rankingsData.rows.map(row => ({
          query: row.keys?.[0] || 'unknown',
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0
        }))

        // Calculate ranking stats
        const top10Count = queries.filter(q => q.position <= 10).length
        const top20Count = queries.filter(q => q.position <= 20).length
        const avgPosition = queries.reduce((sum, q) => sum + q.position, 0) / queries.length

        return {
          data: {
            queries: queries.slice(0, 10), // Top 10 queries
            stats: {
              top10Count,
              top20Count,
              avgPosition: Math.round(avgPosition * 10) / 10,
              totalQueries: queries.length
            }
          },
          error: null,
          hasConnection: true,
          siteUrl: targetSiteUrl
        }
      }

      return {
        data: undefined,
        error: 'No ranking data available',
        hasConnection: true,
        siteUrl: targetSiteUrl
      }

    } catch (error) {
      logger.error('Search Console rankings fetch error', error, { userId, dealershipId })
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasConnection: true, // Connection exists, but data fetch failed
        siteUrl: targetSiteUrl
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


}

// Helper function to get analytics for a dealership
export async function getDealershipAnalytics(options: AnalyticsOptions): Promise<DashboardAnalytics> {
  const service = new DealershipAnalyticsService()
  return service.getDealershipAnalytics(options)
}