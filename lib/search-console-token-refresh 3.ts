import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export async function refreshSearchConsoleToken(dealershipId: string): Promise<string | null> {
  try {
    const connection = await prisma.searchConsole_connections.findUnique({
      where: { userId: dealershipId }
    });

    if (!connection?.refreshToken) {
      logger.error('No refresh token found for Search Console connection', undefined, { dealershipId });
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    );

    const decryptedRefreshToken = decrypt(connection.refreshToken);
    oauth2Client.setCredentials({
      refresh_token: decryptedRefreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to obtain new access token');
    }

    // Update the stored tokens
    await prisma.searchConsole_connections.update({
      where: { userId: dealershipId },
      data: {
        accessToken: encrypt(credentials.access_token),
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        updatedAt: new Date()
      }
    });

    logger.info('Search Console token refreshed successfully', { dealershipId });
    return credentials.access_token;
  } catch (error) {
    logger.error('Failed to refresh Search Console token', error, { dealershipId });
    return null;
  }
}

export async function getValidSearchConsoleToken(dealershipId: string): Promise<string | null> {
  try {
    const connection = await prisma.searchConsole_connections.findUnique({
      where: { userId: dealershipId }
    });

    if (!connection?.accessToken) {
      return null;
    }

    const decryptedToken = decrypt(connection.accessToken);

    // Check if token is about to expire (within 5 minutes)
    if (connection.expiresAt) {
      const expiresIn = connection.expiresAt.getTime() - Date.now();
      if (expiresIn < 5 * 60 * 1000) {
        logger.info('Search Console token expiring soon, refreshing', { 
          dealershipId, 
          expiresIn: Math.floor(expiresIn / 1000) 
        });
        return await refreshSearchConsoleToken(dealershipId);
      }
    }

    return decryptedToken;
  } catch (error) {
    logger.error('Error getting valid Search Console token', error, { dealershipId });
    return null;
  }
}