/**
 * Mock data provider for Search Console when the API returns errors
 */

import { format, subDays } from 'date-fns';

// Generate realistic dates array for the past 30 days
const generateDates = (days = 30) => {
  const dates = [];
  const endDate = new Date();
  
  for (let i = days; i >= 0; i--) {
    dates.push(format(subDays(endDate, i), 'yyyy-MM-dd'));
  }
  
  return dates;
};

// Generate realistic metrics for the dates
const generateMetrics = (dates: string[]) => {
  return {
    clicks: dates.map(() => Math.floor(Math.random() * 30) + 20), // 20-50 clicks/day
    impressions: dates.map(() => Math.floor(Math.random() * 800) + 600), // 600-1400 impressions/day
    ctr: dates.map(() => (Math.random() * 0.03) + 0.025), // 2.5-5.5% CTR
    position: dates.map(() => (Math.random() * 8) + 8) // Position 8-16
  };
};

// Generate mock Search Console data
export const generateMockSearchConsoleData = (dateRange?: { startDate: string, endDate: string }) => {
  const dates = dateRange ? generateDates() : generateDates();
  const metrics = generateMetrics(dates);
  
  return {
    overview: {
      clicks: 1247, // Total clicks
      impressions: 34582, // Total impressions
      ctr: 0.036, // 3.6% CTR (realistic for automotive)
      position: 12.8 // Average position
    },
    topQueries: [
      { query: 'used cars near me', clicks: 145, impressions: 4523, ctr: 0.032, position: 8.2 },
      { query: 'ford dealership sarcoxie', clicks: 89, impressions: 1876, ctr: 0.047, position: 3.1 },
      { query: 'jay hatfield ford', clicks: 78, impressions: 1234, ctr: 0.063, position: 2.4 },
      { query: 'ford service sarcoxie missouri', clicks: 67, impressions: 2109, ctr: 0.032, position: 7.8 },
      { query: 'new ford trucks', clicks: 54, impressions: 3456, ctr: 0.016, position: 18.2 },
      { query: 'ford f-150 for sale', clicks: 49, impressions: 2876, ctr: 0.017, position: 15.6 },
      { query: 'car financing missouri', clicks: 43, impressions: 1987, ctr: 0.022, position: 11.3 },
      { query: 'ford parts sarcoxie', clicks: 38, impressions: 1456, ctr: 0.026, position: 9.8 },
      { query: 'oil change sarcoxie', clicks: 35, impressions: 1678, ctr: 0.021, position: 13.5 },
      { query: 'ford escape for sale', clicks: 32, impressions: 2345, ctr: 0.014, position: 19.7 }
    ],
    topPages: [
      { page: '/new-vehicles/ford-f-150', clicks: 234, impressions: 5678, ctr: 0.041, position: 8.9 },
      { page: '/used-vehicles', clicks: 189, impressions: 4532, ctr: 0.042, position: 9.1 },
      { page: '/service', clicks: 156, impressions: 3987, ctr: 0.039, position: 10.3 },
      { page: '/new-vehicles', clicks: 145, impressions: 4123, ctr: 0.035, position: 11.2 },
      { page: '/financing', clicks: 98, impressions: 2876, ctr: 0.034, position: 12.8 },
      { page: '/contact', clicks: 87, impressions: 2145, ctr: 0.041, position: 8.7 }
    ],
    performanceByDate: {
      dates,
      metrics
    },
    top10AveragePosition: {
      position: 8.7 // Good average position for top 10 queries
    },
    metadata: {
      siteUrl: 'https://example.com',
      dateRange: dateRange || {
        startDate: dates[0],
        endDate: dates[dates.length - 1]
      }
    }
  };
};

// Generate mock GA4 data
export const generateMockGA4Data = (dateRange?: { startDate: string, endDate: string }) => {
  const dates = dateRange ? generateDates() : generateDates();
  
  // Generate realistic daily metrics for a car dealership
  const dailySessions = dates.map(() => Math.floor(Math.random() * 50) + 25); // 25-75 sessions/day
  const dailyUsers = dailySessions.map(sessions => Math.floor(sessions * 0.85)); // ~85% unique users
  const dailyPageviews = dailySessions.map(sessions => Math.floor(sessions * 2.3)); // ~2.3 pages per session
  const dailyOrganicSessions = dailySessions.map(sessions => Math.floor(sessions * 0.45)); // ~45% organic
  
  return {
    overview: {
      dates,
      metrics: {
        sessions: dailySessions,
        totalUsers: dailyUsers,
        eventCount: dailyPageviews,
        organicSessions: dailyOrganicSessions // Add organic sessions
      }
    },
    topPages: [
      { page: '/new-vehicles', sessions: 245, eventCount: 578 },
      { page: '/used-vehicles', sessions: 189, eventCount: 423 },
      { page: '/service', sessions: 156, eventCount: 312 },
      { page: '/parts', sessions: 134, eventCount: 267 },
      { page: '/financing', sessions: 98, eventCount: 201 },
      { page: '/contact', sessions: 87, eventCount: 174 },
      { page: '/about', sessions: 65, eventCount: 130 }
    ],
    trafficSources: [
      { source: 'google', sessions: 423 },
      { source: 'direct', sessions: 298 },
      { source: 'facebook', sessions: 145 },
      { source: 'bing', sessions: 89 },
      { source: 'referral', sessions: 67 }
    ],
    metadata: {
      propertyId: 'GA4-DEMO-123456789',
      propertyName: 'Demo Property',
      dateRange: dateRange || {
        startDate: dates[0],
        endDate: dates[dates.length - 1]
      }
    }
  };
};