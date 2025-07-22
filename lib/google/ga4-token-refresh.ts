import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

export async function refreshGA4TokenIfNeeded(userId: string): Promise<boolean> {
  try {
    const connection = await prisma.ga4_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (!connection) {
      return false
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date()
    const expiresAt = connection.expiresAt
    
    if (!expiresAt || expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      // Token is still valid
      return true
    }

    // Token needs refresh
    if (!connection.refreshToken) {
      logger.error('No refresh token available for GA4 connection', undefined, { userId })
      return false
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
    )

    oauth2Client.setCredentials({
      refresh_token: decrypt(connection.refreshToken)
    })

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    if (!credentials.access_token) {
      throw new Error('Failed to get new access token')
    }

    // Update the connection with new token
    await prisma.ga4_connections.update({
      where: { id: connection.id },
      data: {
        accessToken: encrypt(credentials.access_token),
        expiresAt: credentials.expiry_date 
          ? new Date(credentials.expiry_date)
          : new Date(now.getTime() + 60 * 60 * 1000) // Default to 1 hour
      }
    })

    logger.info('GA4 token refreshed successfully', { userId })
    return true

  } catch (error) {
    logger.error('Failed to refresh GA4 token', error, { userId })
    return false
  }
}
