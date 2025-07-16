import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { getDealershipPackageProgress } from '@/lib/package-utils'
import { withApiMonitoring } from '@/lib/api-wrapper'
import { createCachedFunction, CACHE_TAGS, revalidateCache } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'

// Cached function for fetching dealership stats
const getCachedDealershipStats = createCachedFunction(
  async (dealershipId: string) => {
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
        try {
          const dealershipUsers = await prisma.users.findMany({
            where: { dealershipId },
            select: { id: true }
          })
          const userIds = dealershipUsers.map(u => u.id)
          
          if (userIds.length === 0) return []
          
          return prisma.requests.groupBy({
            by: ['status'],
            where: { 
              userId: { in: userIds }
            },
            _count: true
          })
        } catch (error) {
          return []
        }
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
          const dealershipUsers = await prisma.users.findMany({
            where: { dealershipId },
            select: { id: true }
          })
          const userIds = dealershipUsers.map(u => u.id)
          
          if (userIds.length === 0) return 0
          
          return prisma.requests.count({
            where: {
              userId: { in: userIds },
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
          const dealershipUsers = await prisma.users.findMany({
            where: { dealershipId },
            select: { id: true }
          })
          const userIds = dealershipUsers.map(u => u.id)
          
          if (userIds.length === 0) return null
          
          return prisma.requests.findFirst({
            where: {
              userId: { in: userIds },
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

    // Check GA4 connection by dealershipId
    let gaConnected = false
    try {
      const gaConnection = await prisma.ga4_connections.findFirst({
        where: { dealershipId },
        select: { propertyId: true, propertyName: true }
      })
      
      if (gaConnection?.propertyId) {
        gaConnected = true
      }
    } catch (error) {
      console.error("API Dashboard: Failed to check GA4 connection", error)
    }

    return {
      statusCounts,
      completedThisMonth,
      latestRequest,
      packageProgress,
      gaConnected
    }
  },
  {
    name: 'getDealershipStats',
    tags: (dealershipId: string) => [
      CACHE_TAGS.REQUESTS(dealershipId),
      CACHE_TAGS.GA4(dealershipId),
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

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')

          // Handle super admin user  
      if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {

      // For super admin, return basic stats from first available dealership or empty stats
      const firstDealership = await prisma.dealerships.findFirst()
      if (!firstDealership) {
        return NextResponse.json({
          success: true,
          data: {
            activeRequests: 0,
            totalRequests: 0,
            tasksCompletedThisMonth: 0,
            tasksSubtitle: "No dealerships available",
            gaConnected: false,
            packageProgress: null,
            latestRequest: null,
            dealershipId: null
          }
        })
      }

      const targetDealershipId = dealershipId || firstDealership.id
      const cachedStats = await getCachedDealershipStats(targetDealershipId)
      const { statusCounts, completedThisMonth, latestRequest, packageProgress, gaConnected } = cachedStats

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
          packageProgress,
          latestRequest,
          dealershipId: targetDealershipId
        }
      })
    }

    // Get user's information and verify access
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

    // Determine which dealership to get stats for
    let targetDealershipId: string

    if (dealershipId) {
      // Verify user has access to the requested dealership
      if (user.agencies) {
        // Agency user - check if dealership belongs to their agency
        const hasAccess = user.agencies.dealerships.some(d => d.id === dealershipId)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied to this dealership' },
            { status: 403 }
          )
        }
        targetDealershipId = dealershipId
      } else {
        // Non-agency user - can only access their own dealership
        if (user.dealerships?.id !== dealershipId) {
          return NextResponse.json(
            { error: 'Access denied to this dealership' },
            { status: 403 }
          )
        }
        targetDealershipId = dealershipId
      }
    } else {
      // No specific dealership requested - use user's assigned dealership
      if (!user.dealerships?.id) {
        return NextResponse.json(
          { error: 'User is not assigned to a dealership' },
          { status: 400 }
        )
      }
      targetDealershipId = user.dealerships?.id
    }

    // Use cached function to get dealership stats
    const cachedStats = await getCachedDealershipStats(targetDealershipId)
    const { statusCounts, completedThisMonth, latestRequest, packageProgress, gaConnected } = cachedStats

    // Calculate stats with null safety
    const statusCountsMap = statusCounts.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {})

    const activeRequests = statusCountsMap['IN_PROGRESS'] || 0
    const totalRequests = Object.values(statusCountsMap).reduce((sum: number, count: any) => sum + (count as number), 0)
    
    // Use packageProgress for "Tasks Completed" card
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
