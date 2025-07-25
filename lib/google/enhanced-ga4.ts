import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { decrypt, encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Enhanced Types and interfaces
export interface GA4AnalyticsOptions {
  propertyId: string
  startDate: string
  endDate: string
  userId: string
}

export interface GA4Connection {
  id: string
  userId: string
  dealershipId: string | null
  propertyId: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

export interface GA4ReportRequest {
  dateRanges: Array<{ startDate: string; endDate: string }>
  dimensions?: Array<{ name: string }>
  metrics: Array<{ name: string }>
  limit?: number
  offset?: number
  orderBys?: Array<{ metric?: { metricName: string }; dimension?: { dimensionName: string }; desc?: boolean }>
}

export interface GA4ReportResponse {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>
    metricValues?: Array<{ value: string }>
  }>
  metadata?: any
}

export interface GA4ServiceOptions {
  userId: string
  enableRetry?: boolean
  maxRetries?: number
  timeout?: number
}

/**
 * Enhanced GA4 Service Class with improved error handling and retry logic
 */
export class EnhancedGA4Service {
  private analytics: any
  private oauth2Client: OAuth2Client
  private userId: string
  private options: GA4ServiceOptions
  private isInitialized = false

  constructor(userId: string, options: Partial<GA4ServiceOptions> = {}) {
    this.userId = userId
    this.options = {
      enableRetry: true,
      maxRetries: 3,
      timeout: 30000,
      ...options
    }
    
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    )
  }

  async initialize(): Promise<boolean> {
    try {
      // Get user's GA4 token with latest connection
      const userToken = await prisma.ga4_connections.findFirst({
        where: { userId: this.userId },
        orderBy: { updatedAt: 'desc' }
      })

      if (!userToken) {
        logger.warn('No GA4 token found for user', { userId: this.userId })
        return false
      }

      if (!userToken.accessToken) {
        logger.warn('Access token is null or undefined in GA4Service', { userId: this.userId })
        return false
      }

      // Check if token is expired and needs refresh
      if (userToken.expiresAt && new Date() > userToken.expiresAt) {
        logger.info('GA4 token expired, attempting refresh', { userId: this.userId })
        
        const success = await this.refreshToken()
        if (!success) {
          return false
        }
        
        // Refetch token after refresh
        const refreshedToken = await prisma.ga4_connections.findFirst({
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
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expiry_date: userToken.expiresAt?.getTime()
      })

      // Initialize Analytics Data API
      this.analytics = google.analyticsdata('v1beta')
      this.isInitialized = true

      logger.info('Enhanced GA4 service initialized successfully', { userId: this.userId })
      return true
    } catch (error) {
      logger.error('Failed to initialize Enhanced GA4 service', error, { userId: this.userId })
      return false
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const { refreshGA4TokenIfNeeded } = await import('./token-refresh-service')
      return await refreshGA4TokenIfNeeded(this.userId)
    } catch (error) {
      logger.error('Failed to refresh GA4 token in Enhanced service', error, { userId: this.userId })
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
          
          logger.warn(`GA4 auth error on attempt ${attempts}, reinitializing`, { 
            userId: this.userId, 
            error: error.message 
          })
          
          const reinitialized = await this.initialize()
          if (!reinitialized && attempts >= maxAttempts) {
            throw new Error('Failed to reinitialize GA4 service after auth error')
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

  async runReport(propertyId: string, request: GA4ReportRequest): Promise<GA4ReportResponse> {
    if (!this.isInitialized) {
      throw new Error('GA4 service not initialized. Call initialize() first.')
    }

    return this.executeWithRetry(async () => {
      const response = await this.analytics.properties.runReport({
        auth: this.oauth2Client,
        property: `properties/${propertyId}`,
        requestBody: request
      })

      return response.data
    })
  }

  async batchRunReports(propertyId: string, requests: GA4ReportRequest[]): Promise<GA4ReportResponse[]> {
    if (!this.isInitialized) {
      throw new Error('GA4 service not initialized. Call initialize() first.')
    }

    return this.executeWithRetry(async () => {
      const response = await this.analytics.properties.batchRunReports({
        auth: this.oauth2Client,
        property: `properties/${propertyId}`,
        requestBody: {
          requests
        }
      })

      return response.data.reports || []
    })
  }

  async getAnalyticsData(options: GA4AnalyticsOptions) {
    try {
      const response = await this.runReport(options.propertyId, {
        dateRanges: [{
          startDate: options.startDate,
          endDate: options.endDate
        }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' }
        ]
      })

      const row = response.rows?.[0]
      return {
        sessions: parseInt(row?.metricValues?.[0]?.value || '0'),
        users: parseInt(row?.metricValues?.[1]?.value || '0'),
        pageviews: parseInt(row?.metricValues?.[2]?.value || '0')
      }
    } catch (error) {
      logger.error('Enhanced GA4 getAnalyticsData error', error, { userId: this.userId })
      throw error
    }
  }

  async listProperties(): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const admin = google.analyticsadmin('v1beta')
      
      const response = await admin.properties.list({
        auth: this.oauth2Client
      })

      return response.data.properties || []
    })
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const initialized = await this.initialize()
      if (!initialized) {
        return { success: false, error: 'Failed to initialize GA4 service' }
      }

      const properties = await this.listProperties()
      return { 
        success: true, 
        error: undefined 
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
 * Enhanced GA4 API Class with improved error handling
 */
export class EnhancedGA4API {
  static async getConnection(userId: string, dealershipId?: string): Promise<GA4Connection | null> {
    const whereClause: any = { userId }
    if (dealershipId) {
      whereClause.dealershipId = dealershipId
    }

    return await prisma.ga4_connections.findFirst({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    })
  }

  static async createOrUpdateConnection(
    userId: string,
    tokens: any,
    propertyId: string,
    dealershipId?: string | null
  ) {
    return await prisma.ga4_connections.upsert({
      where: { userId },
      update: {
        propertyId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updatedAt: new Date()
      },
      create: {
        userId,
        dealershipId: dealershipId || null,
        propertyId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    })
  }

  static async listProperties(userId: string) {
    try {
      const service = new EnhancedGA4Service(userId)
      
      const initialized = await service.initialize()
      if (!initialized) {
        return {
          success: false,
          properties: [],
          message: 'No GA4 connection found. Please connect your Google Analytics account.',
          needsConnection: true
        }
      }

      const properties = await service.listProperties()
      
      return {
        success: true,
        properties: properties.map(prop => ({
          id: prop.name?.replace('properties/', '') || '',
          name: prop.displayName || 'Unknown Property',
          createTime: prop.createTime,
          updateTime: prop.updateTime
        }))
      }
    } catch (error) {
      logger.error('Failed to list GA4 properties', error, { userId })
      
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('invalid_grant'))) {
        return {
          success: false,
          properties: [],
          message: 'Your GA4 connection has expired. Please reconnect.',
          needsReconnection: true
        }
      }

      return {
        success: false,
        properties: [],
        message: 'Failed to fetch GA4 properties. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async testConnection(userId: string): Promise<{ success: boolean; error?: string; properties?: any[] }> {
    try {
      const service = new EnhancedGA4Service(userId)
      const result = await service.testConnection()
      
      if (result.success) {
        const properties = await service.listProperties()
        return {
          success: true,
          properties: properties.map(prop => ({
            id: prop.name?.replace('properties/', '') || '',
            name: prop.displayName || 'Unknown Property'
          }))
        }
      }
      
      return result
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
export async function getEnhancedGA4Service(userId: string, options?: Partial<GA4ServiceOptions>): Promise<EnhancedGA4Service | null> {
  try {
    const connection = await prisma.ga4_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (!connection) {
      logger.warn('No GA4 connection found for user', { userId })
      return null
    }

    if (!connection.accessToken) {
      logger.warn('Access token is null or undefined in Enhanced GA4Service', { userId })
      return null
    }

    const service = new EnhancedGA4Service(userId, options)
    const initialized = await service.initialize()
    
    if (!initialized) {
      logger.warn('Failed to initialize Enhanced GA4 service', { userId })
      return null
    }

    return service
  } catch (error) {
    logger.error('Error creating Enhanced GA4Service', { error, userId })
    return null
  }
}

export default EnhancedGA4Service
