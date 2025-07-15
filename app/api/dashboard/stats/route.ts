import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDealershipPackageProgress } from '@/lib/package-utils'
import { withApiMonitoring } from '@/lib/api-wrapper'
import { createCachedFunction, CACHE_TAGS, revalidateCache } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'

// Cached function for fetching dealership stats
const getCachedDealershipStats = createCachedFunction(
  async (dealershipId: string) => {
    // Get all users from this dealership for request statistics
    const dealershipUsers = await prisma.users.findMany({
      where: { dealershipId },
      select: { id: true }
    })

    const userIds = dealershipUsers.map(u => u.id)

    // Fetch dashboard stats for the dealership
    const [statusCounts, completedThisMonth, latestRequest] = await Promise.all([
      prisma.requests.groupBy({
        by: ['status'],
        where: { 
          userId: { in: userIds }
        },
        _count: true
      }),
      prisma.requests.count({
        where: {
          userId: { in: userIds },
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.requests.findFirst({
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
    ])

    // Get package progress for the dealership
    let packageProgress = null
    try {
      packageProgress = await getDealershipPackageProgress(dealershipId)
    } catch (error) {
      console.error("API Dashboard: Failed to get dealership package progress", error)
    }

    // Check GA4 connection
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
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')

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
      : "No active package"

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
