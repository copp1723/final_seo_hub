import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { OAuth2Client } from 'google-auth-library'
import { encrypt, decrypt } from '@/lib/encryption'

export class TokenRefreshService {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )
  }

  // Refresh GA4 tokens for all users
  async refreshAllGA4Tokens(): Promise<void> {
    try {
      logger.info('Starting GA4 token refresh for all users')

      // Get all GA4 connections that expire within 1 hour
      const connections = await prisma.ga4_connections.findMany({
        where: {
          OR: [
            { expiresAt: { lte: new Date(Date.now() + 3600000) } }, // 1 hour
            { expiresAt: null } // Handle missing expiry dates
          ]
        },
        include: {
          users: {
            select: { id: true, email: true }
          }
        }
      })

      logger.info(`Found ${connections.length} GA4 connections to refresh`)

      // Process each connection
      for (const connection of connections) {
        try {
          await this.refreshGA4Token(connection.userId)
        } catch (error) {
          logger.error('Failed to refresh GA4 token for user', error, {
            userId: connection.userId,
            userEmail: connection.users.email
          })
        }
      }

      logger.info('GA4 token refresh completed')
    } catch (error) {
      logger.error('GA4 token refresh process failed', error)
    }
  }

  // Refresh GA4 token for specific user
  async refreshGA4Token(userId: string): Promise<boolean> {
    try {
      const connection = await prisma.ga4_connections.findUnique({
        where: { userId }
      })

      if (!connection || !connection.refreshToken) {
        logger.warn('No GA4 connection or refresh token found', { userId })
        return false
      }

      // Decrypt the refresh token
      const refreshToken = decrypt(connection.refreshToken)
      
      // Set up OAuth client with refresh token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh')
      }

      // Update the connection with new tokens
      await prisma.ga4_connections.update({
        where: { userId },
        data: {
          accessToken: encrypt(credentials.access_token),
          refreshToken: credentials.refresh_token ? encrypt(credentials.refresh_token) : connection.refreshToken,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date()
        }
      })

      logger.info('GA4 token refreshed successfully', {
        userId,
        expiresAt: credentials.expiry_date
      })

      return true
    } catch (error) {
      logger.error('Failed to refresh GA4 token', error, { userId })
      
      // If refresh fails, mark connection as expired
      await prisma.ga4_connections.update({
        where: { userId },
        data: {
          expiresAt: new Date(), // Mark as expired
          updatedAt: new Date()
        }
      }).catch(() => {}) // Ignore update errors

      return false
    }
  }

  // Refresh Search Console tokens for all users
  async refreshAllSearchConsoleTokens(): Promise<void> {
    try {
      logger.info('Starting Search Console token refresh for all users')

      const connections = await prisma.search_console_connections.findMany({
        where: {
          OR: [
            { expiresAt: { lte: new Date(Date.now() + 3600000) } },
            { expiresAt: null }
          ]
        },
        include: {
          users: {
            select: { id: true, email: true }
          }
        }
      })

      logger.info(`Found ${connections.length} Search Console connections to refresh`)

      for (const connection of connections) {
        try {
          await this.refreshSearchConsoleToken(connection.userId)
        } catch (error) {
          logger.error('Failed to refresh Search Console token for user', error, {
            userId: connection.userId,
            userEmail: connection.users.email
          })
        }
      }

      logger.info('Search Console token refresh completed')
    } catch (error) {
      logger.error('Search Console token refresh process failed', error)
    }
  }

  // Refresh Search Console token for specific user
  async refreshSearchConsoleToken(userId: string): Promise<boolean> {
    try {
      const connection = await prisma.search_console_connections.findUnique({
        where: { userId }
      })

      if (!connection || !connection.refreshToken) {
        logger.warn('No Search Console connection or refresh token found', { userId })
        return false
      }

      const refreshToken = decrypt(connection.refreshToken)
      
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh')
      }

      await prisma.search_console_connections.update({
        where: { userId },
        data: {
          accessToken: encrypt(credentials.access_token),
          refreshToken: credentials.refresh_token ? encrypt(credentials.refresh_token) : connection.refreshToken,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date()
        }
      })

      logger.info('Search Console token refreshed successfully', {
        userId,
        expiresAt: credentials.expiry_date
      })

      return true
    } catch (error) {
      logger.error('Failed to refresh Search Console token', error, { userId })
      
      await prisma.search_console_connections.update({
        where: { userId },
        data: {
          expiresAt: new Date(),
          updatedAt: new Date()
        }
      }).catch(() => {})

      return false
    }
  }

  // Check token health for a user
  async checkTokenHealth(userId: string): Promise<{
    ga4: { connected: boolean; expired: boolean; expiresAt?: Date }
    searchConsole: { connected: boolean; expired: boolean; expiresAt?: Date }
  }> {
    const [ga4Connection, scConnection] = await Promise.all([
      prisma.ga4_connections.findUnique({ where: { userId } }),
      prisma.search_console_connections.findUnique({ where: { userId } })
    ])

    const now = new Date()

    return {
      ga4: {
        connected: !!ga4Connection,
        expired: ga4Connection?.expiresAt ? ga4Connection.expiresAt <= now : false,
        expiresAt: ga4Connection?.expiresAt || undefined
      },
      searchConsole: {
        connected: !!scConnection,
        expired: scConnection?.expiresAt ? scConnection.expiresAt <= now : false,
        expiresAt: scConnection?.expiresAt || undefined
      }
    }
  }

  // Get refresh statistics
  async getRefreshStats(): Promise<any> {
    const [ga4Stats, scStats] = await Promise.all([
      prisma.ga4_connections.groupBy({
        by: ['expiresAt'],
        _count: true,
        where: {
          expiresAt: {
            not: null
          }
        }
      }),
      prisma.search_console_connections.groupBy({
        by: ['expiresAt'],
        _count: true,
        where: {
          expiresAt: {
            not: null
          }
        }
      })
    ])

    const now = new Date()
    const oneHour = new Date(Date.now() + 3600000)

    return {
      ga4: {
        total: ga4Stats.length,
        expired: ga4Stats.filter(s => s.expiresAt && s.expiresAt <= now).length,
        expiringSoon: ga4Stats.filter(s => s.expiresAt && s.expiresAt <= oneHour && s.expiresAt > now).length
      },
      searchConsole: {
        total: scStats.length,
        expired: scStats.filter(s => s.expiresAt && s.expiresAt <= now).length,
        expiringSoon: scStats.filter(s => s.expiresAt && s.expiresAt <= oneHour && s.expiresAt > now).length
      }
    }
  }
}