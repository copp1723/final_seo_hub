import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { safeDbOperation } from '@/lib/db-resilience'
import { withErrorBoundary, withTimeout } from '@/lib/error-boundaries'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

async function handleGET(request: NextRequest) {
  return withErrorBoundary(async () => {
    const session = await withTimeout(
      SimpleAuth.getSessionFromRequest(request),
      5000,
      'Session authentication timeout'
    )
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await safeDbOperation(() =>
      prisma.users.findUnique({
        where: { id: session.user.id },
        select: {
          dealershipId: true,
          agencyId: true,
          role: true
        }
      })
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get dealershipId from query params or fall back to user's dealership
    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    
    let dealership
    if (dealershipId) {
      // Access control: Verify user can access the requested dealership
      if (dealershipId !== user.dealershipId) {
        // Check if user has access to this dealership (agency users can access multiple dealerships)
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN') {
          const hasAccess = await prisma.dealerships.findFirst({
            where: {
              id: dealershipId || undefined,
              OR: [
                { 
                  OR: [
                    { users_users_currentDealershipIdTodealerships: { some: { id: session.user.id } } },
                    { users_users_dealershipIdTodealerships: { some: { id: session.user.id } } }
                  ]
                },
                ...(user.agencyId ? [{ agencyId: user.agencyId }] : [])
              ]
            }
          })

          if (!hasAccess) {
            return NextResponse.json(
              { error: 'Access denied to requested dealership' },
              { status: 403 }
            )
          }
        }
      }

      dealership = await prisma.dealerships.findUnique({
        where: { id: dealershipId }
      })
    } else {
      // Get user's dealership
      dealership = await prisma.dealerships.findUnique({
        where: { id: user.dealershipId || '' }
      })
    }

    if (!dealership) {
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

    // Get real request data for the dealership
    // Also include requests by users of this dealership (backward compatibility)
    const requests = await safeDbOperation(() =>
      prisma.requests.findMany({
        where: {
          OR: [
            { dealershipId: dealership.id },
            { 
              userId: session.user.id,
              dealershipId: null,
              users: { dealershipId: dealership.id }
            }
          ]
        },
        include: { users: true },
        orderBy: { createdAt: 'desc' }
      })
    )

    const activeRequests = requests.filter(r =>
      r.status === 'PENDING' || r.status === 'IN_PROGRESS'
    ).length

    const totalRequests = requests.length

    // Get current month's completed tasks
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const completedThisMonth = requests.filter(r =>
      r.status === 'COMPLETED' &&
      r.completedAt &&
      r.completedAt >= monthStart
    ).length

    // Check GA4 connection
    const ga4Connection = await prisma.ga4_connections.findFirst({
      where: { userId: session.user.id }
    })

    // Get package progress using centralized function
    const { getPackageLimits } = await import('@/lib/package-utils')
    const { PackageType } = await import('@prisma/client')
    
    const packageType = dealership.activePackageType || PackageType.SILVER
    const limits = getPackageLimits(packageType)

    const packageProgress = {
      packageType: dealership.activePackageType || 'None',
      pages: {
        completed: dealership.pagesUsedThisPeriod || 0,
        total: limits.pages,
        used: dealership.pagesUsedThisPeriod || 0,
        limit: limits.pages,
        percentage: limits.pages > 0 ? Math.round(((dealership.pagesUsedThisPeriod || 0) / limits.pages) * 100) : 0
      },
      blogs: {
        completed: dealership.blogsUsedThisPeriod || 0,
        total: limits.blogs,
        used: dealership.blogsUsedThisPeriod || 0,
        limit: limits.blogs,
        percentage: limits.blogs > 0 ? Math.round(((dealership.blogsUsedThisPeriod || 0) / limits.blogs) * 100) : 0
      },
      gbpPosts: {
        completed: dealership.gbpPostsUsedThisPeriod || 0,
        total: limits.gbpPosts,
        used: dealership.gbpPostsUsedThisPeriod || 0,
        limit: limits.gbpPosts,
        percentage: limits.gbpPosts > 0 ? Math.round(((dealership.gbpPostsUsedThisPeriod || 0) / limits.gbpPosts) * 100) : 0
      },
      improvements: {
        completed: dealership.improvementsUsedThisPeriod || 0,
        total: limits.improvements,
        used: dealership.improvementsUsedThisPeriod || 0,
        limit: limits.improvements,
        percentage: limits.improvements > 0 ? Math.round(((dealership.improvementsUsedThisPeriod || 0) / limits.improvements) * 100) : 0
      },
      totalTasks: {
        completed: (dealership.pagesUsedThisPeriod || 0) + (dealership.blogsUsedThisPeriod || 0) +
                  (dealership.gbpPostsUsedThisPeriod || 0) + (dealership.improvementsUsedThisPeriod || 0),
        total: limits.pages + limits.blogs + limits.gbpPosts + limits.improvements
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        activeRequests,
        totalRequests,
        tasksCompletedThisMonth: completedThisMonth,
        tasksSubtitle: `${completedThisMonth} tasks completed this month`,
        gaConnected: !!ga4Connection,
        packageProgress,
        latestRequest: {
          packageType: dealership.activePackageType,
          pagesCompleted: dealership.pagesUsedThisPeriod || 0,
          blogsCompleted: dealership.blogsUsedThisPeriod || 0,
          gbpPostsCompleted: dealership.gbpPostsUsedThisPeriod || 0,
          improvementsCompleted: dealership.improvementsUsedThisPeriod || 0
        },
        dealershipId: dealership.id
      }
    })

  }, {
    // Fallback stats for dashboard
    activeRequests: 0,
    completedThisMonth: 0,
    tasksCompletedThisMonth: 0,
    tasksSubtitle: 'Service temporarily unavailable',
    gaConnected: false,
    packageProgress: { used: 0, total: 0, percentage: 0 },
    latestRequest: null,
    dealershipId: null
  })()
}

export const GET = handleGET