import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getDealershipPackageProgress } from '@/lib/package-utils'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
    
    if (!session?.user?.id) {
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
        const hasAccess = user.agencies.dealerships.some((d: any) => d.id === dealershipId)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied to this dealership' },
            { status: 403 }
          )
        }
        targetDealershipId = dealershipId
      } else {
        // Non-agency user - can only access their own dealership
        if (user.dealershipId !== dealershipId) {
          return NextResponse.json(
            { error: 'Access denied to this dealership' },
            { status: 403 }
          )
        }
        targetDealershipId = dealershipId
      }
    } else {
      // No specific dealership requested - use user's assigned dealership
      if (!user.dealershipId) {
        // If super-admin, return zeroed-out stats instead of error
        if (session.user.role === 'SUPER_ADMIN') {
          return NextResponse.json({
            success: true,
            data: {
              activeRequests: 0,
              totalRequests: 0,
              tasksCompletedThisMonth: 0,
              tasksSubtitle: 'No dealerships',
              gaConnected: false,
              packageProgress: null,
              latestRequest: null,
              dealershipId: null
            }
          })
        }
        return NextResponse.json(
          { error: 'User is not assigned to a dealership' },
          { status: 400 }
        )
      }
      targetDealershipId = user.dealershipId
    }

    // Get all users from this dealership for request statistics
    const dealershipUsers = await prisma.users.findMany({
      where: { dealershipId: targetDealershipId },
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
      packageProgress = await getDealershipPackageProgress(targetDealershipId)
    } catch (error) {
      console.error("API Dashboard: Failed to get dealership package progress", error)
    }

    // Check GA4 connection
    let gaConnected = false
    try {
      const gaConnection = await prisma.ga4_connections.findFirst({
        where: { dealershipId: targetDealershipId },
        select: { propertyId: true, propertyName: true }
      })
      
      if (gaConnection?.propertyId) {
        gaConnected = true
      }
    } catch (error) {
      console.error("API Dashboard: Failed to check GA4 connection", error)
    }

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