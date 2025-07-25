import { google } from 'googleapis'
import { decrypt, encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Enhanced Types and interfaces
export interface SearchAnalyticsOptions {
  startDate: string
  endDate: string
  dimensions?: string[]
  searchType?: string
  rowLimit?: number
  filters?: any[]
}

export interface SearchConsoleConnection {
  id: string
  userId: string
  dealershipId: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  siteUrl: string | null
  siteName: string | null
}

export interface SearchConsoleServiceOptions {
  userId: string
  enableRetry?: boolean
  maxRetries?: number
  timeout?: number
}

export interface SearchConsoleData {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface TopQuery {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface TopPage {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/**
 * Enhanced Search Console Service Class with improved error handling and retry logic
 */
export class EnhancedSearchConsoleService {
  private searchConsole: any
  private oauth2Client: any
  private userId: string
  private options: SearchConsoleServiceOptions
  private isInitialized = false

  constructor(userId: string, options: Partial<SearchConsoleServiceOptions> = {}) {
    this.userId = userId
    this.options = {
      enableRetry: true,
      maxRetries: 3,
      timeout: 30000,
      ...options
    }
  }

  async initialize(): Promise<boolean> {
    try {
      // Get user's Search Console token
      const userToken = await prisma.search_console_connections.findFirst({
        where: { userId: this.userId },
        orderBy: { updatedAt: 'desc' }
      })

      if (!userToken) {
        logger.warn('No Search Console token found for user', { userId: this.userId })
        return false
      }

      if (!userToken.accessToken) {
        logger.warn('Access token is null or undefined in SearchConsoleService', { userId: this.userId })
        return false
      }

      // Check if token is expired and needs refresh
      if (userToken.expiresAt && new Date() > userToken.expiresAt) {
        logger.info('Search Console token expired, attempting refresh', { userId: this.userId })
        
        const success = await this.refreshToken()
        if (!success) {
          return false
        }
        
        // Refetch token after refresh
        const refreshedToken = await prisma.search_console_connections.findFirst({
          where: { userId: this.userId },
          orderBy: { updatedAt: 'desc' }
        })
        
        if (!refreshedToken) {
          return false
        }
        
        userToken.accessToken = refreshedToken.accessToken
        userToken.refreshToken = refreshedToken.refreshToken
        userToken.expiresAt = refreshedToken.expiresAt
      }

      // Decrypt tokens
      const accessToken = decrypt(userToken.accessToken)
      const refreshToken = userToken.refreshToken ? decrypt(userToken.refreshToken) : null

      // Set up OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/search-console/callback`
      )

      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      this.searchConsole = google.searchconsole({
        version: 'v1',
        auth: this.oauth2Client
      })

      this.isInitialized = true
      logger.info('Enhanced Search Console service initialized successfully', { userId: this.userId })
      return true
    } catch (error) {
      logger.error('Failed to initialize Enhanced Search Console service', error, { userId: this.userId })
      return false
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const { refreshSearchConsoleTokenIfNeeded } = await import('./token-refresh-service')
      return await refreshSearchConsoleTokenIfNeeded(this.userId)
    } catch (error) {
      logger.error('Failed to refresh Search Console token in Enhanced service', error, { userId: this.userId })
      return false
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error
    let attempts = 0
    const maxAttempts = this.options.enableRetry ? this.options.maxRetries! : 1

    while (attempts < maxAttempts) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        attempts++
        
        // Check if it's an auth error that requires reinitialization
        if (error instanceof Error && 
            (error.message.includes('401') || 
             error.message.includes('invalid_grant') ||
             error.message.includes('access_denied'))) {
          
          logger.warn(`Search Console auth error on attempt ${attempts}, reinitializing`, { 
            userId: this.userId, 
            error: error.message 
          })
          
          const reinitialized = await this.initialize()
          if (!reinitialized && attempts >= maxAttempts) {
            throw new Error('Failed to reinitialize Search Console service after auth error')
          }
        } else if (attempts >= maxAttempts) {
          break
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }

  async listSites() {
    if (!this.isInitialized) {
      throw new Error('Search Console service not initialized. Call initialize() first.')
    }

    return this.executeWithRetry(async () => {
      const response = await this.searchConsole.sites.list()
      return response.data.siteEntry || []
    })
  }

  async getSearchAnalytics(siteUrl: string, options: SearchAnalyticsOptions) {
    if (!this.isInitialized) {
      throw new Error('Search Console service not initialized. Call initialize() first.')
    }

    return this.executeWithRetry(async () => {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: options.dimensions || ['query', 'page'],
          searchType: options.searchType || 'web',
          rowLimit: options.rowLimit || 1000,
          dimensionFilterGroups: options.filters
        }
      })

      return response.data
    })
  }

  async getTopQueries(siteUrl: string, days = 28): Promise<TopQuery[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const data = await this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 100
    })

    return data.rows?.map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    })) || []
  }

  async getTopPages(siteUrl: string, days = 28): Promise<TopPage[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const data = await this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit: 100
    })

    return data.rows?.map((row: any) => ({
      page: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    })) || []
  }

  /**
   * Get aggregated search data (simplified version for dashboard)
   */
  async getSearchData(options: {
    siteUrl: string
    startDate: string
    endDate: string
  }): Promise<SearchConsoleData> {
    return this.executeWithRetry(async () => {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: options.siteUrl,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: ['date'],
          searchType: 'web'
        }
      })

      // Aggregate metrics
      const rows = response.data.rows || []
      const totals = rows.reduce((acc: any, row: any) => ({
        clicks: acc.clicks + (row.clicks || 0),
        impressions: acc.impressions + (row.impressions || 0),
        ctrSum: acc.ctrSum + (row.ctr || 0),
        positionSum: acc.positionSum + (row.position || 0)
      }), { clicks: 0, impressions: 0, ctrSum: 0, positionSum: 0 })

      const avgCtr = rows.length > 0 ? totals.ctrSum / rows.length : 0
      const avgPosition = rows.length > 0 ? totals.positionSum / rows.length : 0

      return {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: Math.round(avgCtr * 1000) / 10, // Convert to percentage
        position: Math.round(avgPosition * 10) / 10
      }
    })
  }

  async testConnection(): Promise<{ success: boolean; error?: string; sites?: any[] }> {
    try {
      const initialized = await this.initialize()
      if (!initialized) {
        return { success: false, error: 'Failed to initialize Search Console service' }
      }

      const sites = await this.listSites()
      return { 
        success: true, 
        sites: sites.map((site: any) => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel
        }))
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

/**
 * Enhanced Search Console API Class
 */
export class EnhancedSearchConsoleAPI {
  static async getConnection(userId: string): Promise<SearchConsoleConnection | null> {
    return await prisma.search_console_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })
  }

  static async createOrUpdateConnection(
    userId: string,
    tokens: any,
    siteInfo: { siteUrl: string; siteName: string },
    dealershipId?: string | null
  ) {
    return await prisma.search_console_connections.upsert({
      where: { userId },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl: siteInfo.siteUrl,
        siteName: siteInfo.siteName,
        updatedAt: new Date()
      },
      create: {
        userId,
        dealershipId: dealershipId || null,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl: siteInfo.siteUrl,
        siteName: siteInfo.siteName
      }
    })
  }

  static async listSites(userId: string) {
    try {
      const service = new EnhancedSearchConsoleService(userId)
      
      const initialized = await service.initialize()
      if (!initialized) {
        return {
          success: false,
          sites: [],
          message: 'No Search Console connection found. Please connect your Google Search Console account.',
          needsConnection: true
        }
      }

      const allSites = await service.listSites()
      
      const processedSites = allSites.map((site: any) => ({
        siteUrl: site.siteUrl,
        siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
        permissionLevel: site.permissionLevel,
        hasFullAccess: site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser',
        hasRestrictedAccess: site.permissionLevel === 'siteRestrictedUser',
        canUseApi: site.permissionLevel !== 'siteUnverifiedUser'
      }))

      // Sort by permission level
      processedSites.sort((a: any, b: any) => {
        if (a.hasFullAccess && !b.hasFullAccess) return -1
        if (!a.hasFullAccess && b.hasFullAccess) return 1
        return 0
      })

      const connection = await this.getConnection(userId)

      return {
        success: true,
        sites: processedSites,
        currentSiteUrl: connection?.siteUrl,
        currentSiteName: connection?.siteName,
        totalSites: allSites.length,
        fullAccessSites: processedSites.filter((s: any) => s.hasFullAccess).length
      }
    } catch (error) {
      logger.error('Failed to list Search Console sites', error)
      
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('invalid_grant'))) {
        return {
          success: false,
          sites: [],
          message: 'Your Search Console connection has expired. Please reconnect.',
          needsReconnection: true
        }
      }

      return {
        success: false,
        sites: [],
        message: 'Failed to fetch Search Console sites. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async testConnection(userId: string): Promise<{ success: boolean; error?: string; sites?: any[] }> {
    try {
      const service = new EnhancedSearchConsoleService(userId)
      return await service.testConnection()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Helper function to get enhanced service instance for a user
 */
export async function getEnhancedSearchConsoleService(userId: string, options?: Partial<SearchConsoleServiceOptions>): Promise<EnhancedSearchConsoleService | null> {
  try {
    const connection = await prisma.search_console_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (!connection) {
      logger.warn('No Search Console connection found for user', { userId })
      return null
    }

    if (!connection.accessToken) {
      logger.warn('Access token is null or undefined in Enhanced SearchConsoleService', { userId })
      return null
    }

    const service = new EnhancedSearchConsoleService(userId, options)
    const initialized = await service.initialize()
    
    if (!initialized) {
      logger.warn('Failed to initialize Enhanced Search Console service', { userId })
      return null
    }

    return service
  } catch (error) {
    logger.error('Error creating Enhanced SearchConsoleService', { error, userId })
    return null
  }
}

export default EnhancedSearchConsoleService
