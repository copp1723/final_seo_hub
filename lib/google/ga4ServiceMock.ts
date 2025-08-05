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
    // Generate simple mock data since we removed the mock data files
    const mockData = {
      overview: {
        metrics: {
          sessions: [25, 30, 35, 40, 45],
          totalUsers: [20, 25, 30, 35, 40],
          eventCount: [50, 60, 70, 80, 90]
        }
      }
    };
    
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
    // Generate simple mock data since we removed the mock data files
    const mockData = {
      overview: {
        metrics: {
          sessions: [25, 30, 35, 40, 45],
          totalUsers: [20, 25, 30, 35, 40],
          eventCount: [50, 60, 70, 80, 90]
        }
      }
    };
    
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