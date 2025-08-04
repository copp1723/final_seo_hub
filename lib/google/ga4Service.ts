import { google } from 'googleapis';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { refreshGA4TokenIfNeeded } from './ga4-token-refresh';
import { logger } from '@/lib/logger';

interface RunReportOptions {
  propertyId: string;
  metrics: string[];
  dimensions?: string[];
  startDate: string;
  endDate: string;
  limit?: number;
  orderBys?: any[];
}

// Utility function to detect authentication errors
function isAuthenticationError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;

  return (
    errorCode === 401 ||
    errorCode === 403 ||
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('token has been expired') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('access denied')
  );
}

export class GA4Service {
  private analyticsData: any;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    // Refresh token if needed
    await refreshGA4TokenIfNeeded(this.userId);

    // Get user info to check for agency/dealership associations
    const user = await prisma.users.findUnique({
      where: { id: this.userId },
      select: { agencyId: true, dealershipId: true, role: true }
    });

    let connection = null;

    // For agency-level users, check agency dealerships first
    if (user?.agencyId && (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN')) {
      const agencyDealerships = await prisma.dealerships.findMany({
        where: { agencyId: user.agencyId },
        select: { id: true }
      });

      if (agencyDealerships.length > 0) {
        const dealershipIds = agencyDealerships.map(d => d.id);

        connection = await prisma.ga4_connections.findFirst({
          where: { dealershipId: { in: dealershipIds } },
          orderBy: { updatedAt: 'desc' }
        });
      }
    }

    // Fallback: check for direct user or dealership connection
    if (!connection) {
      connection = await prisma.ga4_connections.findFirst({
        where: {
          OR: [
            { userId: this.userId },
            { dealershipId: user?.dealershipId }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!connection) {
      throw new Error('No GA4 connection found for user');
    }

    console.log('DEBUG: GA4Service connection.accessToken type:', typeof connection.accessToken, 'value:', connection.accessToken)
    if (!connection.accessToken) {
      throw new Error('Access token is null or undefined in GA4Service')
    }
    const accessToken = decrypt(connection.accessToken);
    const refreshToken = connection.refreshToken 
      ? decrypt(connection.refreshToken) 
      : undefined;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/ga4/auth/callback`
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    this.analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: oauth2Client
    });
  }

  async runReport(options: RunReportOptions, retryCount = 0): Promise<any> {
    try {
      if (!this.analyticsData) {
        await this.initialize();
      }
    } catch (error) {
      logger.error('Failed to initialize GA4 analytics', error, { userId: this.userId });
      throw new Error('Failed to initialize GA4 analytics');
    }

    const { propertyId, metrics, dimensions, startDate, endDate, limit, orderBys } = options;

    try {
      const response = await this.analyticsData!.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: metrics.map(metric => ({ name: metric })),
          dimensions: dimensions?.map(dimension => ({ name: dimension })),
          limit: limit || 10000,
          orderBys: orderBys || [{ metric: { metricName: metrics[0] }, desc: true }]
        }
      });

      return response.data;
    } catch (error) {
      // Check if this is an authentication error and we haven't retried yet
      if (isAuthenticationError(error) && retryCount === 0) {
        logger.info('GA4 authentication error detected, attempting token refresh', {
          userId: this.userId,
          error: error.message
        });

        // Try to refresh the token
        const refreshSuccess = await refreshGA4TokenIfNeeded(this.userId);

        if (refreshSuccess) {
          // Re-initialize with new token and retry
          this.analyticsData = null;
          await this.initialize();
          return this.runReport(options, retryCount + 1);
        } else {
          logger.error('Failed to refresh GA4 token', error, { userId: this.userId });
          throw new Error('GA4 token expired and refresh failed. Please reconnect your Google Analytics account.');
        }
      }

      // If not an auth error or retry failed, throw the original error
      logger.error('GA4 runReport failed', error, { userId: this.userId, propertyId });
      throw error;
    }
  }

  async batchRunReports(propertyId: string, requests: any[], retryCount = 0): Promise<any> {
    if (!this.analyticsData) {
      await this.initialize();
    }

    // Validate property ID format
    if (!propertyId || !/^\d+$/.test(propertyId)) {
      throw new Error(`Invalid property ID format: ${propertyId}. Expected numeric string.`);
    }

    try {
      const response = await this.analyticsData!.properties.batchRunReports({
        property: `properties/${propertyId}`,
        requestBody: { requests }
      });

      return response.data.reports;
    } catch (error) {
      // Check if this is an authentication error and we haven't retried yet
      if (isAuthenticationError(error) && retryCount === 0) {
        logger.info('GA4 authentication error detected in batchRunReports, attempting token refresh', {
          userId: this.userId,
          propertyId,
          error: error.message
        });

        // Try to refresh the token
        const refreshSuccess = await refreshGA4TokenIfNeeded(this.userId);

        if (refreshSuccess) {
          // Re-initialize with new token and retry
          this.analyticsData = null;
          await this.initialize();
          return this.batchRunReports(propertyId, requests, retryCount + 1);
        } else {
          logger.error('Failed to refresh GA4 token in batchRunReports', error, { userId: this.userId });
          throw new Error('GA4 token expired and refresh failed. Please reconnect your Google Analytics account.');
        }
      }

      // If not an auth error or retry failed, throw the original error
      logger.error('GA4 batchRunReports failed', error, { userId: this.userId, propertyId });
      throw error;
    }
  }

  async getMetadata(propertyId: string, retryCount = 0): Promise<any> {
    if (!this.analyticsData) {
      await this.initialize();
    }

    try {
      const response = await this.analyticsData!.properties.getMetadata({
        name: `properties/${propertyId}/metadata`
      });

      return response.data;
    } catch (error) {
      // Check if this is an authentication error and we haven't retried yet
      if (isAuthenticationError(error) && retryCount === 0) {
        logger.info('GA4 authentication error detected in getMetadata, attempting token refresh', {
          userId: this.userId,
          propertyId,
          error: error.message
        });

        // Try to refresh the token
        const refreshSuccess = await refreshGA4TokenIfNeeded(this.userId);

        if (refreshSuccess) {
          // Re-initialize with new token and retry
          this.analyticsData = null;
          await this.initialize();
          return this.getMetadata(propertyId, retryCount + 1);
        } else {
          logger.error('Failed to refresh GA4 token in getMetadata', error, { userId: this.userId });
          throw new Error('GA4 token expired and refresh failed. Please reconnect your Google Analytics account.');
        }
      }

      // If not an auth error or retry failed, throw the original error
      logger.error('GA4 getMetadata failed', error, { userId: this.userId, propertyId });
      throw error;
    }
  }
}
