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
    newUsers?: number
    returningUsers?: number
    engagementRate?: number
    averageSessionDuration?: number
    bounceRate?: number
    trafficSources?: Array<{ source: string; sessions: number }>
    cities?: Array<{ city: string; sessions: number }>
    devices?: Array<{ device: string; sessions: number }>
    hourlyData?: Array<{ hour: number; sessions: number }>
  }
  searchConsoleData?: {
    clicks: number
    impressions: number
    ctr: number
    position: number
    topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
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
    searchConsolePermission?: 'ok' | 'no_permission' | 'not_connected' | 'unknown_error'
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
    result.metadata.propertyId = (ga4Result.propertyId ?? undefined)

    // Get Search Console data for dealership
    const scResult = await this.getDealershipSearchConsoleData({ startDate, endDate, dealershipId, userId })
    result.searchConsoleData = scResult.data
    result.errors.searchConsoleError = scResult.error
    result.metadata.hasSearchConsoleConnection = scResult.hasConnection
    result.metadata.siteUrl = (scResult.siteUrl ?? undefined)
    ;(result.metadata as any).searchConsolePermission = scResult.permissionStatus

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

      // IMPORTANT: Always prefer the user's actual connection over hardcoded mappings
      // This ensures data is fetched even when dealership isn't in the mapping file
      targetPropertyId = connection.propertyId || propertyId

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
        property: `properties/${String(targetPropertyId)}`,
        requestBody: {
          requests: [
            // Basic metrics
            {
              dateRanges: [{ startDate, endDate }],
              metrics: [
                { name: 'sessions' },
                { name: 'totalUsers' },
                { name: 'screenPageViews' },
                { name: 'newUsers' },
                { name: 'engagementRate' },
                { name: 'averageSessionDuration' },
                { name: 'bounceRate' }
              ],
              dimensions: [],
              limit: 1
            },
            // Traffic sources
            {
              dateRanges: [{ startDate, endDate }],
              metrics: [{ name: 'sessions' }],
              dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
              limit: 10,
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
            },
            // Geographic data (cities)
            {
              dateRanges: [{ startDate, endDate }],
              metrics: [{ name: 'sessions' }],
              dimensions: [{ name: 'city' }],
              limit: 10,
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
            },
            // Device data
            {
              dateRanges: [{ startDate, endDate }],
              metrics: [{ name: 'sessions' }],
              dimensions: [{ name: 'deviceCategory' }],
              limit: 5,
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
            },
            // Hourly data
            {
              dateRanges: [{ startDate, endDate }],
              metrics: [{ name: 'sessions' }],
              dimensions: [{ name: 'hour' }],
              limit: 24,
              orderBys: [{ dimension: { dimensionName: 'hour' } }]
            }
          ]
        }
      } as any)

      const respData: any = (response as any).data
      if (respData && respData.reports && respData.reports.length > 0) {
        // Parse basic metrics (first report)
        const basicReport = respData.reports[0]
        const basicRow = basicReport.rows?.[0]

        // Parse traffic sources (second report)
        const trafficSourcesReport = respData.reports[1]
        const trafficSources = trafficSourcesReport?.rows?.map((row: any) => ({
          source: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0')
        })) || []

        // Parse cities (third report)
        const citiesReport = respData.reports[2]
        const cities = citiesReport?.rows?.map((row: any) => ({
          city: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0')
        })) || []

        // Parse devices (fourth report)
        const devicesReport = respData.reports[3]
        const devices = devicesReport?.rows?.map((row: any) => ({
          device: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0')
        })) || []

        // Parse hourly data (fifth report)
        const hourlyReport = respData.reports[4]
        const hourlyData = hourlyReport?.rows?.map((row: any) => ({
          hour: parseInt(row.dimensionValues?.[0]?.value || '0'),
          sessions: parseInt(row.metricValues?.[0]?.value || '0')
        })) || []

        if (basicRow) {
          const sessions = parseInt(basicRow.metricValues?.[0]?.value || '0')
          const totalUsers = parseInt(basicRow.metricValues?.[1]?.value || '0')
          const pageviews = parseInt(basicRow.metricValues?.[2]?.value || '0')
          const newUsers = parseInt(basicRow.metricValues?.[3]?.value || '0')
          const engagementRate = parseFloat(basicRow.metricValues?.[4]?.value || '0')
          const averageSessionDuration = parseFloat(basicRow.metricValues?.[5]?.value || '0')
          const bounceRate = parseFloat(basicRow.metricValues?.[6]?.value || '0')

          return {
            data: {
              sessions,
              users: totalUsers,
              pageviews,
              newUsers,
              returningUsers: Math.max(0, totalUsers - newUsers),
              engagementRate,
              averageSessionDuration,
              bounceRate,
              trafficSources,
              cities,
              devices,
              hourlyData
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
    let permissionStatus: 'ok' | 'no_permission' | 'not_connected' | 'unknown_error' = 'unknown_error'

    const classifyGscError = (err: any): 'no_permission' | 'unknown_error' => {
      const msg = typeof err === 'string' ? err : (err?.message || '')
      const code = (err as any)?.code ?? (err as any)?.response?.status
      const reason = (err as any)?.errors?.[0]?.reason || (err as any)?.response?.data?.error?.errors?.[0]?.reason
      if (code === 403 && /insufficientPermissions|forbidden/i.test(String(reason || ''))) return 'no_permission'
      if (/user does not have sufficient permission|insufficientPermissions|insufficient permission/i.test(msg)) return 'no_permission'
      return 'unknown_error'
    }

    try {
      // Get dealership-specific Search Console URL from mapping
      let siteUrl: string | null = null

      if (dealershipId) {
        siteUrl = getSearchConsoleUrl(dealershipId)
        console.log(`🎯 Search Console URL mapping for ${dealershipId}:`, siteUrl)
      }

      // Find Search Console connection - check dealership-level first, then user-level
      let connection = null

      if (dealershipId) {
        connection = await prisma.search_console_connections.findFirst({
          where: { dealershipId }
        })
      }

      if (!connection) {
        connection = await prisma.search_console_connections.findFirst({
          where: { userId }
        })
      }

      if (!connection) {
        logger.info('No Search Console connection found', { userId, dealershipId })
        permissionStatus = 'not_connected'
        return {
          data: undefined,
          error: 'No Search Console connection found - please connect your Google Search Console account',
          hasConnection: false,
          siteUrl: undefined,
          permissionStatus
        }
      }

      logger.info('Search Console connection found', {
        userId,
        dealershipId,
        connectionId: connection.id,
        siteUrl: connection.siteUrl,
        connectionType: connection.dealershipId ? 'dealership' : 'user'
      })

      // Prefer user's actual connection over hardcoded mappings
      targetSiteUrl = connection.siteUrl || siteUrl

      if (!targetSiteUrl) {
        permissionStatus = 'not_connected'
        return {
          data: undefined,
          error: 'No Search Console URL available',
          hasConnection: false,
          siteUrl: undefined,
          permissionStatus
        }
      }

      console.log(`🔍 Using Search Console URL: ${targetSiteUrl} for dealership: ${dealershipId}`)

      const searchConsoleService = await this.getSearchConsoleService(userId)

      console.log(`🔍 Making Search Console API call to: ${targetSiteUrl}`)

      // Fetch both summary data and top queries in parallel
      const [searchConsoleData, topQueriesData] = await Promise.all([
        searchConsoleService.getSearchAnalytics(
          targetSiteUrl,
          {
            startDate,
            endDate,
            dimensions: [],
            searchType: 'web',
            rowLimit: 1
          }
        ),
        searchConsoleService.getSearchAnalytics(
          targetSiteUrl,
          {
            startDate,
            endDate,
            dimensions: ['query'],
            searchType: 'web',
            rowLimit: 20
          }
        )
      ])

      console.log(`📊 Search Console API response:`, {
        hasData: !!searchConsoleData,
        hasRows: !!(searchConsoleData?.rows),
        rowCount: searchConsoleData?.rows?.length || 0,
        firstRow: searchConsoleData?.rows?.[0] || null,
        hasTopQueries: !!(topQueriesData?.rows),
        topQueriesCount: topQueriesData?.rows?.length || 0,
        requestedUrl: targetSiteUrl,
        error: (searchConsoleData as any)?.error || null
      })

      permissionStatus = 'ok'

      if (searchConsoleData && searchConsoleData.rows && searchConsoleData.rows.length > 0) {
        const row = searchConsoleData.rows[0]

        // Process top queries
        const topQueries = topQueriesData?.rows?.map(queryRow => ({
          query: queryRow.keys?.[0] || 'Unknown',
          clicks: queryRow.clicks || 0,
          impressions: queryRow.impressions || 0,
          ctr: queryRow.ctr || 0,
          position: queryRow.position || 0
        })) || []

        return {
          data: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
            topQueries
          },
          error: null,
          hasConnection: true,
          siteUrl: targetSiteUrl,
          permissionStatus
        }
      }

      return {
        data: undefined,
        error: 'No data available',
        hasConnection: true,
        siteUrl: targetSiteUrl,
        permissionStatus
      }

    } catch (error) {
      logger.error('Search Console dealership data fetch error', error, { userId, dealershipId })
      const classified = classifyGscError(error)
      permissionStatus = classified

      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch Search Console data',
        hasConnection: true,
        siteUrl: targetSiteUrl,
        permissionStatus
      }
    }
  }

  async getSearchConsoleRankings(userId: string, dealershipId?: string | null, startDate?: string, endDate?: string) {
    let targetSiteUrl: string | null = null

    try {
      // Prefer the user's actual SC connection siteUrl, falling back to mapping only if missing
      // Reuse the permission-aware path by attempting to resolve via connection like getDealershipSearchConsoleData does
      // Minimal duplication: first try to find a connection
      let resolvedSiteUrl: string | null = null
      if (dealershipId) {
        const dealershipConn = await prisma.search_console_connections.findFirst({ where: { dealershipId } })
        if (dealershipConn?.siteUrl) {
          resolvedSiteUrl = dealershipConn.siteUrl
        }
      }
      if (!resolvedSiteUrl) {
        const userConn = await prisma.search_console_connections.findFirst({ where: { userId } })
        if (userConn?.siteUrl) {
          resolvedSiteUrl = userConn.siteUrl
        }
      }

      // Fallback to hardcoded mapping only if no connection siteUrl
      targetSiteUrl = resolvedSiteUrl || (dealershipId ? getSearchConsoleUrl(dealershipId) : null)

      if (!targetSiteUrl) {
        return {
          data: undefined,
          error: 'No Search Console URL available',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      const searchConsoleService = await this.getSearchConsoleService(userId)

      // Use Search Analytics API for live queries. If no explicit dates provided, default to last 30 days
      const effectiveStart = startDate || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const effectiveEnd = endDate || new Date().toISOString().slice(0, 10)

      // Fetch up to ~200 rows for broader coverage
      const rankingsData = await searchConsoleService.getSearchAnalytics(
        targetSiteUrl,
        {
          startDate: effectiveStart,
          endDate: effectiveEnd,
          dimensions: ['query'],
          searchType: 'web',
          rowLimit: 200
        }
      )

      if (rankingsData && rankingsData.rows && rankingsData.rows.length > 0) {
        const queries = rankingsData.rows.map((row: any) => ({
          query: row.keys?.[0] || 'unknown',
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0
        }))

        // Compute stats in the shape the UI expects to read today
        const top10Count = queries.filter(q => q.position <= 10).length
        const top20Count = queries.filter(q => q.position <= 20).length
        const avgPosition = queries.length > 0 ? (queries.reduce((sum, q) => sum + (Number.isFinite(q.position) ? q.position : 0), 0) / queries.length) : 0

        // Keep contract stable for the current UI usage:
        // dashboard/page.tsx reads rankingsData?.data?.data?.averagePosition
        // So return { data: { data: { averagePosition, ... } } }
        const stablePayload = {
          data: {
            averagePosition: Math.round(avgPosition * 10) / 10,
            top10Count,
            top20Count,
            totalKeywords: queries.length,
            queries: queries.slice(0, 50) // cap for response size safety
          }
        }

        return {
          data: stablePayload,
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