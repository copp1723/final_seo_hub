import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/api-auth'
import { UserRole } from '@prisma/client'
import { startOfMonth, subDays, subMonths, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  const user = authResult.user
  
  // Only agency admins and super admins can access agency analytics
  if (user.role !== UserRole.AGENCY_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    return errorResponse('Access denied. Agency admin access required.', 403)
  }

  // For super admins, they need to specify which agency (or we could show all)
  // For agency admins, use their agency
  const agencyId = user.agencyId
  if (!agencyId) {
    return errorResponse('No agency associated with this user', 400)
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || '30d'
  
  // Calculate date range
  let startDate: Date
  const now = new Date()
  
  switch (range) {
    case '7d':
      startDate = subDays(now, 7)
      break
    case '30d':
      startDate = subDays(now, 30)
      break
    case '90d':
      startDate = subDays(now, 90)
      break
    case '1y':
      startDate = subMonths(now, 12)
      break
    default:
      startDate = subDays(now, 30)
  }

  try {
    // Get all dealerships for the agency
    const dealerships = await prisma.dealerships.findMany({
      where: { agencyId },
      include: {
        users_dealerships: true,
        monthly_usage: {
          where: {
            archivedAt: { gte: startOfMonth(now) }
          }
        }
      }
    })

    // Get all users in the agency
    const users = await prisma.users.findMany({
      where: { agencyId }
    })

    // Get all requests for the agency
    const requests = await prisma.requests.findMany({
      where: {
        agencyId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate metrics
    const totalRequests = requests.length
    const activeRequests = requests.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PENDING').length
    const completedThisMonth = requests.filter(r => 
      r.status === 'COMPLETED' && 
      r.completedAt && 
      r.completedAt >= startOfMonth(now)
    ).length

    // Package distribution
    const packageDistribution = dealerships.reduce((acc, d) => {
      const pkgType = d.activePackageType || 'None'
      const existing = acc.find(p => p.package === pkgType)
      if (existing) {
        existing.count++
      } else {
        acc.push({ package: pkgType, count: 1 })
      }
      return acc
    }, [] as Array<{ package: string; count: number }>)

    // Monthly trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0))
      
      const monthRequests = await prisma.requests.count({
        where: {
          agencyId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })
      
      const monthCompleted = await prisma.requests.count({
        where: {
          agencyId,
          status: 'COMPLETED',
          completedAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })
      
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        requests: monthRequests,
        completed: monthCompleted
      })
    }

    // Dealership metrics
    const dealershipMetrics = await Promise.all(dealerships.map(async (d) => {
      const dealershipRequests = await prisma.requests.findMany({
        where: {
          dealershipId: d.id,
          createdAt: { gte: startOfMonth(now) }
        }
      })

      const activeCount = dealershipRequests.filter(r => 
        r.status === 'IN_PROGRESS' || r.status === 'PENDING'
      ).length
      
      const completedCount = dealershipRequests.filter(r => 
        r.status === 'COMPLETED'
      ).length

      // Get package limits based on type
      const packageLimits = {
        SILVER: { pages: 3, blogs: 4, gbpPosts: 8 },
        GOLD: { pages: 6, blogs: 8, gbpPosts: 16 },
        PLATINUM: { pages: 9, blogs: 12, gbpPosts: 20 }
      }

      const limits = packageLimits[d.activePackageType as keyof typeof packageLimits] || 
                    { pages: 0, blogs: 0, gbpPosts: 0 }

      const lastActivity = dealershipRequests.length > 0 
        ? dealershipRequests[0].createdAt 
        : d.createdAt

      return {
        id: d.id,
        name: d.name,
        packageType: d.activePackageType || 'None',
        monthlyUsage: {
          pages: { used: d.pagesUsedThisPeriod, total: limits.pages },
          blogs: { used: d.blogsUsedThisPeriod, total: limits.blogs },
          gbpPosts: { used: d.gbpPostsUsedThisPeriod, total: limits.gbpPosts }
        },
        activeRequests: activeCount,
        completedRequests: completedCount,
        lastActivity: lastActivity.toISOString()
      }
    }))

    // Top performers (by completion rate and activity)
    const topPerformers = dealershipMetrics
      .map(d => {
        const totalRequests = d.activeRequests + d.completedRequests
        const completionRate = totalRequests > 0 ? d.completedRequests / totalRequests : 0
        const usageRate = (d.monthlyUsage.pages.used + d.monthlyUsage.blogs.used + d.monthlyUsage.gbpPosts.used) / 
                         (d.monthlyUsage.pages.total + d.monthlyUsage.blogs.total + d.monthlyUsage.gbpPosts.total)
        const score = Math.round((completionRate * 0.6 + usageRate * 0.4) * 100)
        
        return {
          dealership: d.name,
          score
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Requests by type
    const requestsByType = requests.reduce((acc, r) => {
      const existing = acc.find(t => t.type === r.type)
      if (existing) {
        existing.count++
      } else {
        acc.push({ type: r.type, count: 1 })
      }
      return acc
    }, [] as Array<{ type: string; count: number }>)

    return NextResponse.json({
      totalDealerships: dealerships.length,
      totalUsers: users.length,
      totalRequests,
      activeRequests,
      completedThisMonth,
      packageDistribution,
      monthlyTrend,
      dealershipMetrics,
      topPerformers,
      requestsByType
    })

  } catch (error) {
    console.error('Error fetching agency analytics:', error)
    return errorResponse('Failed to fetch analytics', 500)
  }
}