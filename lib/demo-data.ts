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