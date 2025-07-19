/**
 * Mock implementation of GA4 service for handling authentication failures
 */

import { logger } from '@/lib/logger';

export class GA4ServiceMock {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    logger.info('Initialized mock GA4 service', { userId: this.userId });
    return true;
  }

  async runReport() {
    const { generateMockGA4Data } = await import('@/lib/mock-data/search-console-mock');
    const mockData = generateMockGA4Data();
    
    // Format response to match GA4 API structure
    return {
      rows: [
        {
          dimensionValues: [],
          metricValues: [
            { value: String(mockData.overview.metrics.sessions.reduce((a, b) => a + b, 0)) },
            { value: String(mockData.overview.metrics.totalUsers.reduce((a, b) => a + b, 0)) },
            { value: String(mockData.overview.metrics.eventCount.reduce((a, b) => a + b, 0)) }
          ]
        }
      ]
    };
  }

  async batchRunReports(propertyId: string, requests: any[]) {
    const { generateMockGA4Data } = await import('@/lib/mock-data/search-console-mock');
    const mockData = generateMockGA4Data();
    
    // Create mock reports for each request
    return requests.map(() => ({
      rows: [
        {
          dimensionValues: [],
          metricValues: [
            { value: String(mockData.overview.metrics.sessions.reduce((a, b) => a + b, 0)) },
            { value: String(mockData.overview.metrics.totalUsers.reduce((a, b) => a + b, 0)) },
            { value: String(mockData.overview.metrics.eventCount.reduce((a, b) => a + b, 0)) }
          ]
        }
      ]
    }));
  }

  async getMetadata() {
    return {
      dimensions: [],
      metrics: []
    };
  }
}