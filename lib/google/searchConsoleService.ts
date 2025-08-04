import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { refreshSearchConsoleToken } from '@/lib/search-console-token-refresh'

interface SearchAnalyticsOptions {
  startDate: string
  endDate: string
  dimensions?: string[]
  searchType?: string
  rowLimit?: number
  filters?: any[]
}

// Flag to track if we're using mock data due to auth issues
let usingMockData = false

export class SearchConsoleService {
  private searchConsole

  constructor(accessToken: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/search-console/callback`
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client
    })
  }

  async listSites() {
    const response = await this.searchConsole.sites.list()
    return response.data.siteEntry || []
  }

  async getSearchAnalytics(siteUrl: string, options: SearchAnalyticsOptions) {
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
  }

  async getTopQueries(siteUrl: string, days = 28) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 100
    })
  }

  async getTopPages(siteUrl: string, days = 28) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit: 100
    })
  }

  async getPerformanceByQuery(siteUrl: string, query: string, days = 28) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['date'],
      filters: [{
        filters: [{
          dimension: 'query',
          operator: 'equals',
          expression: query
        }]
      }]
    })
  }
}

// Helper to get service instance for a user
// Mock implementation of Search Console Service
class SearchConsoleServiceMock {
  async listSites() {
    return [];
  }

  async getSearchAnalytics(siteUrl: string, options: SearchAnalyticsOptions) {
    // Return empty data structure to avoid breaking the UI
    return {
      rows: []
    };
  }

  async getTopQueries(siteUrl: string, days = 28) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 100
    });
  }

  async getTopPages(siteUrl: string, days = 28) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit: 100
    });
  }

  async getPerformanceByQuery(siteUrl: string, query: string, days = 28) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['date'],
      filters: [{
        filters: [{
          dimension: 'query',
          operator: 'equals',
          expression: query
        }]
      }]
    });
  }
}

export async function getSearchConsoleService(userId: string) {
  try {
    const token = await prisma.search_console_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (!token) {
      logger.warn('No Search Console token found for user', { userId });
      usingMockData = true;
      return new SearchConsoleServiceMock();
    }

    if (!token.accessToken) {
      logger.warn('Access token is null or undefined in SearchConsoleService', { userId });
      usingMockData = true;
      return new SearchConsoleServiceMock();
    }
    
    // Check if token is expired and try to refresh
    if (token.expiresAt && new Date() > token.expiresAt && token.refreshToken) {
      logger.info('Search Console token expired, attempting refresh', { userId });
      const newAccessToken = await refreshSearchConsoleToken(userId);
      
      if (newAccessToken) {
        const refreshToken = token.refreshToken ? decrypt(token.refreshToken) : undefined;
        return new SearchConsoleService(newAccessToken, refreshToken);
      } else {
        logger.warn('Failed to refresh Search Console token', { userId });
        usingMockData = true;
        return new SearchConsoleServiceMock();
      }
    }
    
    const accessToken = decrypt(token.accessToken);
    const refreshToken = token.refreshToken
      ? decrypt(token.refreshToken)
      : undefined;

    return new SearchConsoleService(accessToken, refreshToken);
  } catch (error) {
    logger.error('Error creating SearchConsoleService', { error, userId });
    usingMockData = true;
    
    // Return a mock service that will use mock data
    return new SearchConsoleServiceMock();
  }
}
