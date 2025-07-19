import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

async function handleGET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's dealership or first available dealership
    const userDealership = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: { dealerships: true }
    })

    const dealership = userDealership?.dealerships || await prisma.dealerships.findFirst()

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
    const requests = await prisma.requests.findMany({
      where: { dealershipId: dealership.id },
      orderBy: { createdAt: 'desc' }
    })

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
    const ga4Connection = await prisma.ga4_connections.findUnique({
      where: { userId: session.user.id }
    })

    // Get package progress
    const packageLimits = {
      SILVER: { pages: 3, blogs: 4, gbpPosts: 8, improvements: 2 },
      GOLD: { pages: 6, blogs: 8, gbpPosts: 16, improvements: 4 },
      PLATINUM: { pages: 9, blogs: 12, gbpPosts: 20, improvements: 6 }
    }

    const limits = packageLimits[dealership.activePackageType as keyof typeof packageLimits] ||
                  { pages: 0, blogs: 0, gbpPosts: 0, improvements: 0 }

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

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = handleGET