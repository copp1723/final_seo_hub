import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Calculate date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total logs count
    const totalLogs = await prisma.audit_logs.count()

    // Get today's logs count
    const todayLogs = await prisma.audit_logs.count({
      where: {
        createdAt: {
          gte: todayStart
        }
      }
    })

    // Get this week's logs count
    const weekLogs = await prisma.audit_logs.count({
      where: {
        createdAt: {
          gte: weekStart
        }
      }
    })

    // Get top actions (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const topActionsRaw = await prisma.audit_logs.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 5
    })

    const topActions = topActionsRaw.map((item: any) => ({
      action: item.action,
      count: item._count.action
    }))

    // Get top users (last 30 days)
    const topUsersRaw = await prisma.audit_logs.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 5
    })

    // Get user details for top users
    const topUsers = await Promise.all(
      topUsersRaw.map(async (item: any) => {
        const user = await prisma.users.findUnique({
          where: { id: item.user.id },
          select: { name: true, email: true }
        })
        return {
          userId: item.user.id,
          userName: user?.name || user?.email || 'Unknown User',
          count: item._count.user.id
        }
      })
    )

    const stats = {
      totalLogs,
      todayLogs,
      weekLogs,
      topActions,
      topUsers
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching audit statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
