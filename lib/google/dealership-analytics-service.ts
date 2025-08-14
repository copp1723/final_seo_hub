import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { refreshGA4TokenIfNeeded } from './ga4-token-refresh'
import { GA4Service } from './ga4Service'
import { features } from '@/lib/features'
import { dealershipDataBridge } from '@/lib/services/dealership-data-bridge'
import { getGA4PropertyId, getSearchConsoleUrl, hasGA4Access, DEALERSHIP_PROPERTY_MAPPINGS } from '@/lib/dealership-property-mapping'
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

    // DIAGNOSTIC: Log the incoming request
    console.log('🔍 [DIAGNOSTIC] getDealershipAnalytics called with:', {
      dealershipId,
      userId,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    })


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
      // Use the dealership data bridge to resolve the correct connection
      if (!dealershipId) {
        logger.warn('No dealership ID provided for GA4 data fetch', { userId })
        return {
          data: undefined,
          error: 'No dealership specified',
          hasConnection: false,
          propertyId: undefined
        }
      }

      // Validate dealership access
      const hasAccess = await dealershipDataBridge.validateDealershipAccess(userId, dealershipId)
      if (!hasAccess) {
        logger.warn('User does not have access to dealership', { userId, dealershipId })
        return {
          data: undefined,
          error: 'Access denied to dealership',
          hasConnection: false,
          propertyId: undefined
        }
      }

      // Resolve dealership connections using the data bridge
      const dealershipConnections = await dealershipDataBridge.resolveDealershipConnections(userId, dealershipId)
      
      if (!dealershipConnections.ga4.hasConnection || !dealershipConnections.ga4.propertyId) {
        logger.info('No GA4 connection available for dealership', { userId, dealershipId })
        return {
          data: undefined,
          error: 'No GA4 connection found - please connect your Google Analytics account',
          hasConnection: false,
          propertyId: undefined
        }
      }

      targetPropertyId = dealershipConnections.ga4.propertyId
      const connectionId = dealershipConnections.ga4.connectionId!

      logger.info('GA4 connection resolved via data bridge', {
        userId,
        dealershipId,
        connectionId,
        propertyId: targetPropertyId,
        source: dealershipConnections.ga4.source
      })

      // Get the actual connection for API calls
      const connection = await dealershipDataBridge.getConnectionForApiCall(connectionId, 'ga4')
      
      if (!connection || !connection.accessToken) {
        return {
          data: undefined,
          error: 'No valid GA4 access token available',
          hasConnection: true,
          propertyId: targetPropertyId
        }
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
      // Use the dealership data bridge to resolve the correct connection
      if (!dealershipId) {
        logger.warn('No dealership ID provided for Search Console data fetch', { userId })
        permissionStatus = 'not_connected'
        return {
          data: undefined,
          error: 'No dealership specified',
          hasConnection: false,
          siteUrl: undefined,
          permissionStatus
        }
      }

      // Validate dealership access
      const hasAccess = await dealershipDataBridge.validateDealershipAccess(userId, dealershipId)
      if (!hasAccess) {
        logger.warn('User does not have access to dealership', { userId, dealershipId })
        permissionStatus = 'no_permission'
        return {
          data: undefined,
          error: 'Access denied to dealership',
          hasConnection: false,
          siteUrl: undefined,
          permissionStatus
        }
      }

      // Resolve dealership connections using the data bridge
      const dealershipConnections = await dealershipDataBridge.resolveDealershipConnections(userId, dealershipId)
      
      if (!dealershipConnections.searchConsole.hasConnection || !dealershipConnections.searchConsole.siteUrl) {
        logger.info('No Search Console connection available for dealership', { userId, dealershipId })
        permissionStatus = 'not_connected'
        return {
          data: undefined,
          error: 'No Search Console connection found - please connect your Google Search Console account',
          hasConnection: false,
          siteUrl: undefined,
          permissionStatus
        }
      }

      targetSiteUrl = dealershipConnections.searchConsole.siteUrl
      const connectionId = dealershipConnections.searchConsole.connectionId!

      logger.info('Search Console connection resolved via data bridge', {
        userId,
        dealershipId,
        connectionId,
        siteUrl: targetSiteUrl,
        source: dealershipConnections.searchConsole.source
      })

      console.log(`🔍 [DIAGNOSTIC] Using Search Console URL: ${targetSiteUrl} for dealership: ${dealershipId}`)
      console.log(`🔍 [DIAGNOSTIC] Connection resolved via data bridge:`, {
        connectionId,
        source: dealershipConnections.searchConsole.source,
        siteUrl: targetSiteUrl
      })

      // Get the actual connection for API calls
      const connection = await dealershipDataBridge.getConnectionForApiCall(connectionId, 'search_console')
      
      if (!connection || !connection.accessToken) {
        permissionStatus = 'not_connected'
        return {
          data: undefined,
          error: 'No valid Search Console access token available',
          hasConnection: true,
          siteUrl: targetSiteUrl,
          permissionStatus
        }
      }

      console.log(`🔍 Making Search Console API call to: ${targetSiteUrl}`)

      // Create Search Console service using the resolved connection
      const accessToken = decrypt(connection.accessToken)
      const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      
      const { SearchConsoleService } = await import('./searchConsoleService')
      const searchConsoleService = new SearchConsoleService(accessToken, refreshToken)

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

      console.log(`📊 [DIAGNOSTIC] Search Console API response:`, {
        hasData: !!searchConsoleData,
        hasRows: !!(searchConsoleData?.rows),
        rowCount: searchConsoleData?.rows?.length || 0,
        firstRow: searchConsoleData?.rows?.[0] || null,
        hasTopQueries: !!(topQueriesData?.rows),
        topQueriesCount: topQueriesData?.rows?.length || 0,
        topQueries: topQueriesData?.rows?.slice(0, 3).map((r: any) => r.keys?.[0]) || [],
        requestedUrl: targetSiteUrl,
        dealershipId,
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
      // Use the dealership data bridge to resolve the correct connection
      if (!dealershipId) {
        logger.warn('No dealership ID provided for Search Console rankings', { userId })
        return {
          data: undefined,
          error: 'No dealership specified',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      // Validate dealership access
      const hasAccess = await dealershipDataBridge.validateDealershipAccess(userId, dealershipId)
      if (!hasAccess) {
        logger.warn('User does not have access to dealership for rankings', { userId, dealershipId })
        return {
          data: undefined,
          error: 'Access denied to dealership',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      // Resolve dealership connections using the data bridge
      const dealershipConnections = await dealershipDataBridge.resolveDealershipConnections(userId, dealershipId)
      
      if (!dealershipConnections.searchConsole.hasConnection || !dealershipConnections.searchConsole.siteUrl) {
        logger.info('No Search Console connection available for dealership rankings', { userId, dealershipId })
        return {
          data: undefined,
          error: 'No Search Console connection found - please connect your Google Search Console account',
          hasConnection: false,
          siteUrl: undefined
        }
      }

      targetSiteUrl = dealershipConnections.searchConsole.siteUrl
      const connectionId = dealershipConnections.searchConsole.connectionId!

      logger.info('Search Console rankings connection resolved via data bridge', {
        userId,
        dealershipId,
        connectionId,
        siteUrl: targetSiteUrl,
        source: dealershipConnections.searchConsole.source
      })

      // Get the actual connection for API calls
      const connection = await dealershipDataBridge.getConnectionForApiCall(connectionId, 'search_console')
      
      if (!connection || !connection.accessToken) {
        return {
          data: undefined,
          error: 'No valid Search Console access token available',
          hasConnection: true,
          siteUrl: targetSiteUrl
        }
      }

      // Create Search Console service using the resolved connection
      const accessToken = decrypt(connection.accessToken)
      const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      
      const { SearchConsoleService } = await import('./searchConsoleService')
      const searchConsoleService = new SearchConsoleService(accessToken, refreshToken)

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