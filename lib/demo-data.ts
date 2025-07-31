/**
 * Demo Mode Mock Data
 * Professional sample data for client presentations
 */

import type { DashboardData, DashboardAnalyticsData, Activity } from '@/types/api'

// Clean, impressive demo statistics
export const getDemoStats = (): DashboardData => ({
  activeRequests: 12,
  totalRequests: 147,
  tasksCompletedThisMonth: 28,
  tasksSubtitle: "28 tasks completed this month",
  gaConnected: true,
  packageProgress: {
    packageType: "Gold",
    pages: {
      completed: 8,
      total: 12,
      used: 8,
      limit: 12,
      percentage: 67
    },
    blogs: {
      completed: 6,
      total: 8,
      used: 6,
      limit: 8,
      percentage: 75
    },
    gbpPosts: {
      completed: 15,
      total: 20,
      used: 15,
      limit: 20,
      percentage: 75
    },
    improvements: {
      completed: 9,
      total: 12,
      used: 9,
      limit: 12,
      percentage: 75
    },
    totalTasks: {
      completed: 38,
      total: 52
    }
  },
  latestRequest: {
    packageType: "Gold",
    pagesCompleted: 8,
    blogsCompleted: 6,
    gbpPostsCompleted: 15,
    improvementsCompleted: 9
  },
  dealershipId: "demo-dealership-001"
})

// Impressive analytics data that shows growth
export const getDemoAnalytics = (): DashboardAnalyticsData => ({
  ga4Data: {
    sessions: 24680,
    users: 18950,
    pageviews: 67340
  },
  searchConsoleData: {
    clicks: 8940,
    impressions: 156780,
    ctr: 5.7,
    position: 12.3
  },
  combinedMetrics: {
    totalSessions: 24680,
    totalUsers: 18950,
    totalClicks: 8940,
    totalImpressions: 156780,
    avgCTR: 5.7,
    avgPosition: 12.3
  },
  errors: {
    ga4Error: null,
    searchConsoleError: null
  },
  metadata: {
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    },
    fetchedAt: new Date().toISOString(),
    hasGA4Connection: true,
    hasSearchConsoleConnection: true,
    dealershipId: "demo-dealership-001",
    propertyId: "GA4-DEMO-12345",
    siteUrl: "https://demo-dealership.com"
  }
})

// Recent activity showing professional workflow
export const getDemoActivity = (): Activity[] => [
  {
    id: "activity-1",
    type: "page_completed",
    title: "Landing Page Optimization Completed",
    description: "New vehicle inventory page optimized for 'Honda Civic 2024' keywords",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    dealershipId: "demo-dealership-001"
  },
  {
    id: "activity-2", 
    type: "blog_published",
    title: "Blog Post Published",
    description: "\"5 Tips for First-Time Car Buyers\" published with SEO optimization",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    dealershipId: "demo-dealership-001"
  },
  {
    id: "activity-3",
    type: "gbp_post_created", 
    title: "Google Business Profile Updated",
    description: "Monthly promotion post created with seasonal offer highlighting",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    dealershipId: "demo-dealership-001"
  },
  {
    id: "activity-4",
    type: "improvement_applied",
    title: "Technical SEO Improvement",
    description: "Site speed optimization applied - 23% faster loading times",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed", 
    dealershipId: "demo-dealership-001"
  },
  {
    id: "activity-5",
    type: "request_started",
    title: "New Content Request Initiated",
    description: "Service department landing page optimization project started",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "in_progress",
    dealershipId: "demo-dealership-001"
  }
]

// Demo dealership information
export const getDemoDealership = () => ({
  id: "demo-dealership-001",
  name: "Premier Auto Dealership",
  siteUrl: "https://premier-auto-demo.com",
  ga4PropertyId: "GA4-DEMO-12345",
  ga4PropertyName: "Premier Auto - GA4 Property",
  primaryDomain: "premier-auto-demo.com",
  activePackageType: "Gold"
})

// Generate realistic demo data with optional variations
export const getDemoDataVariant = (variant: 'growth' | 'stable' | 'premium' = 'growth') => {
  const baseStats = getDemoStats()
  const baseAnalytics = getDemoAnalytics()
  
  switch (variant) {
    case 'premium':
      return {
        stats: {
          ...baseStats,
          activeRequests: 18,
          totalRequests: 280,
          tasksCompletedThisMonth: 45,
          packageProgress: {
            ...baseStats.packageProgress!,
            packageType: "Platinum"
          }
        },
        analytics: {
          ...baseAnalytics,
          ga4Data: {
            sessions: 45680,
            users: 32450,
            pageviews: 123450
          },
          searchConsoleData: {
            clicks: 15940,
            impressions: 287650,
            ctr: 5.5,
            position: 8.7
          }
        }
      }
    case 'stable':
      return {
        stats: {
          ...baseStats,
          activeRequests: 8,
          totalRequests: 95,
          tasksCompletedThisMonth: 18
        },
        analytics: {
          ...baseAnalytics,
          ga4Data: {
            sessions: 18240,
            users: 13680,
            pageviews: 48920
          }
        }
      }
    default: // growth
      return {
        stats: baseStats,
        analytics: baseAnalytics
      }
  }
}

// Dealership-specific demo data generators
export function getDemoGA4Analytics(startDate: string, endDate: string, dealershipId?: string) {
  // Get dealership info to determine package type and traffic multiplier
  const dealership = getDealershipInfo(dealershipId)
  const packageMultiplier = getPackageMultiplier(dealership.package)

  // Generate date range
  const dates = generateDateRange(startDate, endDate)

  // Generate realistic daily metrics
  const dailyMetrics = dates.map(date => {
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6
    const baseTraffic = isWeekend ? 0.7 : 1.0 // 30% less traffic on weekends

    const sessions = Math.floor((Math.random() * 50 + 100) * packageMultiplier * baseTraffic)
    const users = Math.floor(sessions * 0.85) // ~85% unique users
    const eventCount = Math.floor(sessions * 2.3) // ~2.3 events per session

    return { date, sessions, users, eventCount }
  })

  // Calculate totals
  const totalSessions = dailyMetrics.reduce((sum, day) => sum + day.sessions, 0)
  const totalUsers = dailyMetrics.reduce((sum, day) => sum + day.users, 0)
  const totalEvents = dailyMetrics.reduce((sum, day) => sum + day.eventCount, 0)

  return {
    overview: {
      dates: dates,
      metrics: {
        sessions: dailyMetrics.map(d => d.sessions),
        totalUsers: dailyMetrics.map(d => d.users),
        eventCount: dailyMetrics.map(d => d.eventCount)
      }
    },
    topPages: generateTopPages(dealership.package),
    trafficSources: generateTrafficSources(dealership.package),
    metadata: {
      propertyId: `GA4-${dealership.id}`,
      propertyName: `${dealership.name} - GA4 Property`,
      dateRange: { startDate, endDate },
      dealershipId: dealership.id,
      hasGA4Connection: true
    },
    totals: {
      sessions: totalSessions,
      users: totalUsers,
      eventCount: totalEvents
    }
  }
}

export function getDemoSearchConsoleData(startDate: string, endDate: string, dealershipId?: string) {
  // Get dealership info to determine package type and performance
  const dealership = getDealershipInfo(dealershipId)
  const packageMultiplier = getPackageMultiplier(dealership.package)
  const positionBonus = getPositionBonus(dealership.package)

  // Generate date range
  const dates = generateDateRange(startDate, endDate)

  // Generate realistic daily metrics
  const dailyMetrics = dates.map(date => {
    const clicks = Math.floor((Math.random() * 20 + 30) * packageMultiplier)
    const impressions = Math.floor(clicks * (15 + Math.random() * 10)) // 15-25x impressions
    const ctr = clicks / impressions
    const position = 15 - positionBonus + (Math.random() * 4 - 2) // Position varies around base

    return { date, clicks, impressions, ctr, position }
  })

  // Calculate totals
  const totalClicks = dailyMetrics.reduce((sum, day) => sum + day.clicks, 0)
  const totalImpressions = dailyMetrics.reduce((sum, day) => sum + day.impressions, 0)
  const avgCTR = totalClicks / totalImpressions
  const avgPosition = dailyMetrics.reduce((sum, day) => sum + day.position, 0) / dailyMetrics.length

  return {
    overview: {
      dates: dates,
      metrics: {
        clicks: dailyMetrics.map(d => d.clicks),
        impressions: dailyMetrics.map(d => d.impressions),
        ctr: dailyMetrics.map(d => d.ctr),
        position: dailyMetrics.map(d => d.position)
      }
    },
    topQueries: generateTopQueries(dealership.package),
    topPages: generateTopSearchPages(dealership.package),
    metadata: {
      siteUrl: dealership.website,
      dateRange: { startDate, endDate },
      dealershipId: dealership.id,
      hasSearchConsoleConnection: true
    },
    totals: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCTR,
      position: avgPosition
    }
  }
}

// Helper functions
function getDealershipInfo(dealershipId?: string) {
  // Map real dealership IDs to demo info
  const dealershipMap: Record<string, any> = {
    'dealer-acura-columbus': {
      id: 'dealer-acura-columbus',
      name: 'Acura of Columbus',
      package: 'SILVER',
      website: 'https://acura-columbus-demo.com'
    },
    'dealer-jhc-columbus': {
      id: 'dealer-jhc-columbus',
      name: 'Jay Hatfield Chevrolet of Columbus',
      package: 'SILVER',
      website: 'https://jayhatfield-columbus-demo.com'
    },
    'dealer-jhm-portal': {
      id: 'dealer-jhm-portal',
      name: 'Jay Hatfield Motorsports Portal',
      package: 'PLATINUM',
      website: 'https://jhm-portal-demo.com'
    }
  }

  return dealershipMap[dealershipId || ''] || {
    id: dealershipId || 'demo-dealership-001',
    name: 'Demo Dealership',
    package: 'GOLD',
    website: 'https://demo-dealership.com'
  }
}

function getPackageMultiplier(packageType: string): number {
  switch (packageType) {
    case 'SILVER': return 1.0
    case 'GOLD': return 2.5
    case 'PLATINUM': return 5.0
    default: return 2.5
  }
}

function getPositionBonus(packageType: string): number {
  switch (packageType) {
    case 'SILVER': return 0 // Position ~15
    case 'GOLD': return 5   // Position ~10
    case 'PLATINUM': return 8 // Position ~7
    default: return 5
  }
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }

  return dates
}

function generateTopPages(packageType: string) {
  const basePages = [
    { page: '/new-vehicles', sessions: 245, eventCount: 578 },
    { page: '/used-vehicles', sessions: 189, eventCount: 423 },
    { page: '/service', sessions: 156, eventCount: 312 },
    { page: '/parts', sessions: 134, eventCount: 267 },
    { page: '/financing', sessions: 98, eventCount: 201 }
  ]

  const multiplier = getPackageMultiplier(packageType)
  return basePages.map(page => ({
    ...page,
    sessions: Math.floor(page.sessions * multiplier),
    eventCount: Math.floor(page.eventCount * multiplier)
  }))
}

function generateTrafficSources(packageType: string) {
  const baseSources = [
    { source: 'google', sessions: 450 },
    { source: 'direct', sessions: 280 },
    { source: 'facebook', sessions: 120 },
    { source: 'bing', sessions: 80 },
    { source: 'referral', sessions: 60 }
  ]

  const multiplier = getPackageMultiplier(packageType)
  return baseSources.map(source => ({
    ...source,
    sessions: Math.floor(source.sessions * multiplier)
  }))
}

function generateTopQueries(packageType: string) {
  const baseQueries = [
    { query: 'used cars near me', clicks: 145, impressions: 4523, ctr: 0.032, position: 8.2 },
    { query: 'dealership near me', clicks: 89, impressions: 1876, ctr: 0.047, position: 3.1 },
    { query: 'car service', clicks: 78, impressions: 1234, ctr: 0.063, position: 2.4 },
    { query: 'new cars', clicks: 67, impressions: 2109, ctr: 0.032, position: 7.8 },
    { query: 'car financing', clicks: 54, impressions: 3456, ctr: 0.016, position: 18.2 }
  ]

  const multiplier = getPackageMultiplier(packageType)
  const positionBonus = getPositionBonus(packageType)

  return baseQueries.map(query => ({
    ...query,
    clicks: Math.floor(query.clicks * multiplier),
    impressions: Math.floor(query.impressions * multiplier),
    position: Math.max(1, query.position - positionBonus)
  }))
}

function generateTopSearchPages(packageType: string) {
  const basePages = [
    { page: '/new-vehicles', clicks: 89, impressions: 2341, ctr: 0.038, position: 6.2 },
    { page: '/used-vehicles', clicks: 67, impressions: 1876, ctr: 0.036, position: 8.1 },
    { page: '/service', clicks: 45, impressions: 1234, ctr: 0.036, position: 5.4 },
    { page: '/parts', clicks: 34, impressions: 987, ctr: 0.034, position: 9.8 },
    { page: '/financing', clicks: 23, impressions: 654, ctr: 0.035, position: 12.3 }
  ]

  const multiplier = getPackageMultiplier(packageType)
  const positionBonus = getPositionBonus(packageType)

  return basePages.map(page => ({
    ...page,
    clicks: Math.floor(page.clicks * multiplier),
    impressions: Math.floor(page.impressions * multiplier),
    position: Math.max(1, page.position - positionBonus)
  }))
}