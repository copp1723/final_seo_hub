import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response || errorResponse('Unauthorized', 401)

  if (authResult.user!.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  try {
    // Get system-wide statistics
    const [
      totalUsers,
      totalAgencies,
      totalRequests,
      activeUsers,
      pendingRequests,
      completedRequests,
      recentUsers,
      recentAgencies,
      recentCompletedRequests
    ] = await Promise.all([
      // Total counts
      prisma.users.count(),
      prisma.agencies.count(),
      prisma.requests.count(),
      
      // Active users (logged in within last 30 days)
      prisma.users.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Request statistics
      prisma.requests.count({
        where: { status: 'PENDING' }
      }),
      prisma.requests.count({
        where: { status: 'COMPLETED' }
      }),
      
      // Recent activity data
      prisma.users.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true }
      }),
      prisma.agencies.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true }
      }),
      prisma.requests.findMany({
        take: 5,
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: {
          id: true,
          title: true,
          completedAt: true,
          users: { select: { name: true, email: true } }
        }
      })
    ])

    // Build recent activity feed
    const recentActivity = [
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user_created' as const,
        description: `New user registered: ${user.name || user.email}`,
        timestamp: user.createdAt.toISOString()
      })),
     ...recentAgencies.map(agency => ({
        id: `agency-${agency.id}`,
        type: 'agency_created' as const,
        description: `New agency created: ${agency.name}`,
        timestamp: agency.createdAt.toISOString()
      })),
     ...recentCompletedRequests.map(request => ({
        id: `request-${request.id}`,
        type: 'request_completed' as const,
        description: `Request completed: ${request.title} by ${request.users.name || request.users.email}`,
        timestamp: request.completedAt?.toISOString() || new Date().toISOString()
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    // Determine system health (simple heuristic)
    let systemHealth: 'healthy' | 'warning' | 'error' = 'healthy'
    const pendingRatio = totalRequests > 0 ? pendingRequests / totalRequests : 0
    
    if (pendingRatio > 0.5) {
      systemHealth = 'warning'
    }
    if (pendingRatio > 0.8) {
      systemHealth = 'error'
    }

    const stats = {
      totalUsers,
      totalAgencies,
      totalRequests,
      activeUsers,
      pendingRequests,
      completedRequests,
      systemHealth,
      recentActivity
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching system stats:', error)
    return NextResponse.json({ error: 'Failed to fetch system statistics' }, { status: 500 })
  }
}
