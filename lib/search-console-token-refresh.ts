import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { encrypt, decrypt } from '@/lib/encryption'

export async function refreshSearchConsoleToken(userId: string): Promise<string | null> {
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
      connection = await prisma.search_console_connections.findFirst({
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
      connection = await prisma.search_console_connections.findFirst({
        where: {
          OR: [
            { userId: userId },
            { dealershipId: user?.dealershipId }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!connection?.refreshToken) {
      logger.error('No refresh token found for Search Console connection', undefined, { userId });
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    );

    const decryptedRefreshToken = decrypt(connection.refreshToken);
    
    // Check if this is a test/dummy token
    if (decryptedRefreshToken.startsWith('test_') || decryptedRefreshToken.length < 50) {
      logger.warn('Invalid or test refresh token detected for Search Console', { 
        userId, 
        connectionId: connection.id, 
        tokenPreview: decryptedRefreshToken.substring(0, 20) + '...' 
      })
      return null
    }
    
    oauth2Client.setCredentials({
      refresh_token: decryptedRefreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to obtain new access token');
    }

    // Update the stored tokens
    await prisma.search_console_connections.update({
      where: { id: connection.id },
      data: {
        accessToken: encrypt(credentials.access_token),
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        updatedAt: new Date()
      }
    });

    logger.info('Search Console token refreshed successfully', { userId, connectionId: connection.id });
    return credentials.access_token;
  } catch (error) {
    logger.error('Failed to refresh Search Console token', error, { userId });
    return null;
  }
}