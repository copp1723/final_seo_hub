import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class GA4Service {
  private analytics: any;
  private oauth2Client: OAuth2Client | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    try {
      // Get user's GA4 token
      const userToken = await prisma.user_ga4_tokens.findUnique({
        where: { userId: this.userId }
      });

      if (!userToken) {
        throw new Error('No GA4 token found for user');
      }

      // Decrypt tokens
      const accessToken = await decrypt(userToken.encryptedAccessToken);
      const refreshToken = userToken.encryptedRefreshToken ? 
        await decrypt(userToken.encryptedRefreshToken) : null;

      // Create OAuth2 client
      this.oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      );

      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expiry_date: userToken.expiryDate?.getTime()
      });

      // Initialize Analytics Data API
      this.analytics = google.analyticsdata('v1beta');
    } catch (error) {
      logger.error('GA4 Service initialization error', error);
      throw error;
    }
  }

  async batchRunReports(propertyId: string, requests: any[]) {
    if (!this.oauth2Client) {
      throw new Error('GA4 Service not initialized. Call initialize() first.');
    }

    try {
      const response = await this.analytics.properties.batchRunReports({
        auth: this.oauth2Client,
        property: `properties/${propertyId}`,
        requestBody: {
          requests: requests
        }
      });

      return response.data.reports || [];
    } catch (error) {
      logger.error('GA4 batchRunReports error', error);
      throw error;
    }
  }

  async getAnalyticsData(options: {
    propertyId: string;
    startDate: string;
    endDate: string;
    userId: string;
  }) {
    try {
      // Get user's GA4 token
      const userToken = await prisma.user_ga4_tokens.findUnique({
        where: { userId: options.userId }
      });

      if (!userToken) {
        throw new Error('No GA4 token found for user');
      }

      // Decrypt tokens
      const accessToken = await decrypt(userToken.encryptedAccessToken);
      const refreshToken = userToken.encryptedRefreshToken ? 
        await decrypt(userToken.encryptedRefreshToken) : null;

      // Create OAuth2 client
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expiry_date: userToken.expiryDate?.getTime()
      });

      // Initialize Analytics Data API
      this.analytics = google.analyticsdata('v1beta');

      // Run report
      const response = await this.analytics.properties.runReport({
        auth: oauth2Client,
        property: options.propertyId,
        requestBody: {
          dateRanges: [{
            startDate: options.startDate,
            endDate: options.endDate
          }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'screenPageViews' }
          ]
        }
      });

      // Extract metrics
      const row = response.data.rows?.[0];
      return {
        sessions: parseInt(row?.metricValues?.[0]?.value || '0'),
        users: parseInt(row?.metricValues?.[1]?.value || '0'),
        pageviews: parseInt(row?.metricValues?.[2]?.value || '0')
      };

    } catch (error) {
      logger.error('GA4 API error', error);
      throw error;
    }
  }
}