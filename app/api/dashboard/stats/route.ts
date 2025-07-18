import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { getDealershipPackageProgress } from '@/lib/package-utils'
import { withApiMonitoring } from '@/lib/api-wrapper'
import { createCachedFunction, CACHE_TAGS, revalidateCache } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { GA4Service } from '@/lib/google/ga4Service'

// Cached function for fetching dealership stats
const getCachedDealershipStats = createCachedFunction(
  async (dealershipId: string) => {
    // Get users associated with the dealership to pass to GA4 and Search Console services
    const dealershipUsers = await prisma.users.findMany({
      where: { dealershipId },
      select: { id: true }
    })
    const firstUserId = dealershipUsers[0]?.id; // Use the first user's ID for service initialization

    // Try both approaches: requests by dealershipId and by userId
    const [statusCountsByDealership, statusCountsByUserId, completedThisMonth, latestRequest] = await Promise.all([
      // Direct dealership requests
      prisma.requests.groupBy({
        by: ['status'],
        where: { 
          dealershipId: dealershipId
        },
        _count: true
      }).catch(() => []),
      
      // User-based requests (fallback)
      (async () => {
        if (!firstUserId) return [];
        return prisma.requests.groupBy({
          by: ['status'],
          where: { 
            userId: firstUserId
          },
          _count: true
        })
      })(),
      
      // Completed this month - try both approaches
      (async () => {
        try {
          // Try by dealershipId first
          const byDealership = await prisma.requests.count({
            where: {
              dealershipId: dealershipId,
              status: 'COMPLETED',
              completedAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          })
          
          if (byDealership > 0) return byDealership
          
          // Fallback to user-based
          if (!firstUserId) return 0;
          return prisma.requests.count({
            where: {
              userId: firstUserId,
              status: 'COMPLETED',
              completedAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          })
        } catch (error) {
          return 0
        }
      })(),
      
      // Latest request - try both approaches
      (async () => {
        try {
          // Try by dealershipId first
          const byDealership = await prisma.requests.findFirst({
            where: {
              dealershipId: dealershipId,
              packageType: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            select: {
              packageType: true,
              pagesCompleted: true,
              blogsCompleted: true,
              gbpPostsCompleted: true,
              improvementsCompleted: true
            }
          })
          
          if (byDealership) return byDealership
          
          // Fallback to user-based
          if (!firstUserId) return null;
          return prisma.requests.findFirst({
            where: {
              userId: firstUserId,
              packageType: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            select: {
              packageType: true,
              pagesCompleted: true,
              blogsCompleted: true,
              gbpPostsCompleted: true,
              improvementsCompleted: true
            }
          })
        } catch (error) {
          return null
        }
      })()
    ])

    // Combine status counts from both approaches
    const combinedStatusCounts = [...statusCountsByDealership, ...statusCountsByUserId]
    const statusCountsMap = combinedStatusCounts.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + item._count
      return acc
    }, {})

    // Convert back to array format
    const statusCounts = Object.entries(statusCountsMap).map(([status, count]) => ({
      status,
      _count: count
    }))

    // Get package progress for the dealership
    let packageProgress = null
    try {
      packageProgress = await getDealershipPackageProgress(dealershipId)
    } catch (error) {
      console.error("API Dashboard: Failed to get dealership package progress", error)
    }

    // Check GA4 connection by dealershipId and fetch data
    let gaConnected = false
    let gaAnalyticsData = null
    try {
      const gaConnection = await prisma.ga4_connections.findFirst({
        where: { dealershipId },
        select: { propertyId: true, propertyName: true }
      })
      
      if (gaConnection?.propertyId && firstUserId) {
        gaConnected = true
        const ga4Service = new GA4Service(firstUserId) // Initialize GA4Service with a user ID
        gaAnalyticsData = await ga4Service.batchRunReports(gaConnection.propertyId, [
          {
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' }],
          },
          // Add more GA4 reports here as needed for the dashboard
        ])
      }
    } catch (error) {
      console.error("API Dashboard: Failed to check GA4 connection or fetch data", error)
    }

    // Check Search Console connection and fetch performance data
    let searchConsoleConnected = false
    let searchConsoleData = null
    try {
      const scConnection = await prisma.search_console_connections.findFirst({
        where: { dealershipId },
        select: { siteUrl: true }
      })

      if (scConnection?.siteUrl && firstUserId) {
        searchConsoleConnected = true
        const searchConsoleService = await getSearchConsoleService(firstUserId); // Initialize with user ID
        searchConsoleData = await searchConsoleService.getSearchAnalytics(scConnection.siteUrl, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          dimensions: ['date']
        })
      }
    } catch (error) {
      console.error("API Dashboard: Failed to check Search Console connection or fetch data", error)
    }

    return {
      statusCounts,
      completedThisMonth,
      latestRequest,
      packageProgress,
      gaConnected,
      gaAnalyticsData,
      searchConsoleConnected,
      searchConsoleData
    }
  },
  {
    name: 'getDealershipStats',
    tags: (dealershipId: string) => [
      CACHE_TAGS.REQUESTS(dealershipId),
      CACHE_TAGS.GA4(dealershipId),
      CACHE_TAGS.SEARCH_CONSOLE(dealershipId),
      `dealership-stats-${dealershipId}`
    ],
    revalidate: CACHE_TTL.ANALYTICS / 1000, // 5 minutes
  }
)

async function handleGET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let targetDealershipId: string
    const url = new URL(request.url)
    const queryDealershipId = url.searchParams.get('dealershipId')

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: {
          include: {
            dealerships: true
          }
        },
        dealerships: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role === 'SUPER_ADMIN') {
        if (queryDealershipId) {
            targetDealershipId = queryDealershipId
        } else {
            const firstDealership = await prisma.dealerships.findFirst();
            if (!firstDealership) {
                return NextResponse.json({
                    success: true,
                    data: {
                        activeRequests: 0, totalRequests: 0, tasksCompletedThisMonth: 0,
                        tasksSubtitle: "No dealerships available", gaConnected: false,
                        packageProgress: null, latestRequest: null, dealershipId: null,
                        gaAnalyticsData: null, searchConsoleConnected: false, searchConsoleData: null
                    }
                });
            }
            targetDealershipId = firstDealership.id;
        }
    } else {
        if (queryDealershipId) {
            if (user.agencies) {
                const hasAccess = user.agencies.dealerships.some(d => d.id === queryDealershipId);
                if (!hasAccess) {
                    return NextResponse.json(
                        { error: 'Access denied to this dealership' },
                        { status: 403 }
                    );
                }
                targetDealershipId = queryDealershipId;
            } else {
                if (user.dealerships?.id !== queryDealershipId) {
                    return NextResponse.json(
                        { error: 'Access denied to this dealership' },
                        { status: 403 }
                    );
                }
                targetDealershipId = queryDealershipId;
            }
        } else {
            if (!user.dealerships?.id) {
                return NextResponse.json(
                    { error: 'User is not assigned to a dealership' },
                    { status: 400 }
                );
            }
            targetDealershipId = user.dealerships?.id;
        }
    }

    const cachedStats = await getCachedDealershipStats(targetDealershipId)
    const { 
      statusCounts, 
      completedThisMonth, 
      latestRequest, 
      packageProgress, 
      gaConnected, 
      gaAnalyticsData,
      searchConsoleConnected,
      searchConsoleData
    } = cachedStats

    const statusCountsMap = statusCounts.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {})

    const activeRequests = statusCountsMap['IN_PROGRESS'] || 0
    const totalRequests = Object.values(statusCountsMap).reduce((sum: number, count: any) => sum + (count as number), 0)
    
    const tasksCompletedThisMonth = packageProgress ? packageProgress.totalTasks.completed : completedThisMonth
    const tasksTotalThisMonth = packageProgress ? packageProgress.totalTasks.total : 0
    const tasksSubtitle = packageProgress
      ? `${tasksCompletedThisMonth} of ${tasksTotalThisMonth} used this month`
      : totalRequests > 0 ? `${completedThisMonth} requests completed this month` : "No active package"

    return NextResponse.json({
      success: true,
      data: {
        activeRequests,
        totalRequests,
        tasksCompletedThisMonth,
        tasksSubtitle,
        gaConnected,
        gaAnalyticsData,
        searchConsoleConnected,
        searchConsoleData,
        packageProgress,
        latestRequest,
        dealershipId: targetDealershipId
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiMonitoring(handleGET)
