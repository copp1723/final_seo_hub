import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

export async function refreshGA4TokenIfNeeded(userId: string): Promise<boolean> {
  let connectionId: string | undefined = undefined;

  try {
    // Get user info to check for agency/dealership associations
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { agencyId: true, dealershipId: true, role: true }
    });

    // Try to find connection using the same logic as GA4Service
    let connection = null;

    // For agency admins, try to find any connection in their agency
    if (user?.role === 'AGENCY_ADMIN' && user.agencyId) {
      connection = await prisma.ga4_connections.findFirst({
        where: {
          users: {
            agencyId: user.agencyId
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    // Fallback: check for direct user or dealership connection
    if (!connection) {
      connection = await prisma.ga4_connections.findFirst({
        where: {
          OR: [
            { userId: userId },
            { dealershipId: user?.dealershipId }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!connection) {
      logger.warn('No GA4 connection found for token refresh', { userId, userDealershipId: user?.dealershipId });
      return false
    }

    connectionId = connection.id

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date()
    const expiresAt = connection.expiresAt

    logger.info('Checking GA4 token expiry', {
      userId,
      connectionId: connection.id,
      expiresAt: expiresAt?.toISOString(),
      isExpired: expiresAt ? expiresAt <= now : 'unknown'
    });

    if (!expiresAt || expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      // Token is still valid
      logger.info('GA4 token is still valid', { userId, expiresAt: expiresAt?.toISOString() });
      return true
    }

    // Token needs refresh
    if (!connection.refreshToken) {
      logger.error('No refresh token available for GA4 connection', undefined, {
        userId,
        connectionId: connection.id,
        propertyId: connection.propertyId
      })
      return false
    }

    logger.info('Attempting to refresh GA4 token', {
      userId,
      connectionId: connection.id,
      propertyId: connection.propertyId
    });

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

    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour

    // Update the connection with new token
    await prisma.ga4_connections.update({
      where: { id: connection.id },
      data: {
        accessToken: encrypt(credentials.access_token),
        expiresAt: newExpiresAt
      }
    })

    logger.info('GA4 token refreshed successfully', {
      userId,
      connectionId: connection.id,
      newExpiresAt: newExpiresAt.toISOString()
    })
    return true

  } catch (error) {
    logger.error('Failed to refresh GA4 token', error, {
      userId,
      connectionId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}
