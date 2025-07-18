import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { format, formatDistanceToNow } from 'date-fns'

export async function GET(request: NextRequest) {
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

    let targetDealershipId: string
    
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

    // Determine which dealership to get activity for
    if (user.role === 'SUPER_ADMIN') {
      if (dealershipId) {
        targetDealershipId = dealershipId
      } else {
        const firstDealership = await prisma.dealerships.findFirst()
        if (!firstDealership) {
          return NextResponse.json({ success: true, data: [] })
        }
        targetDealershipId = firstDealership.id
      }
    } else if (user.role === 'AGENCY_ADMIN' && user.agencies?.id) {
      if (dealershipId && user.agencies?.dealerships.some(d => d.id === dealershipId)) {
        targetDealershipId = dealershipId
      } else {
        const firstDealership = user.agencies?.dealerships[0]
        if (!firstDealership) {
          return NextResponse.json({ success: true, data: [] })
        }
        targetDealershipId = firstDealership.id
      }
    } else if (user.dealerships?.id) {
      targetDealershipId = user.dealerships?.id
    } else {
      return NextResponse.json(
        { error: 'No dealership access' },
        { status: 403 }
      )
    }

    // Get users for this dealership
    const dealershipUsers = await prisma.users.findMany({
      where: { dealershipId: targetDealershipId },
      select: { id: true }
    })

    const userIds = dealershipUsers.map(u => u.id)

    // Fetch recent activities (last 30 days, limit 20)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [recentRequests, recentCompletions] = await Promise.all([
      // Recent request status changes
      prisma.requests.findMany({
        where: {
          userId: { in: userIds },
          updatedAt: { gte: thirtyDaysAgo }
        },
        orderBy: { updatedAt: 'desc' },
        take: 15,
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          users: {
            select: { name: true, email: true }
          }
        }
      }),
      
      // Recent task completions (from completedTasks JSON field)
      prisma.requests.findMany({
        where: {
          userId: { in: userIds },
          completedTasks: { not: Prisma.JsonNull },
          updatedAt: { gte: thirtyDaysAgo }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          completedTasks: true,
          updatedAt: true,
          users: {
            select: { name: true, email: true }
          }
        }
      })
    ])

    // Process activities
    const activities: Array<{
      id: string
      type: 'request_created' | 'request_status_changed' | 'request_completed' | 'task_completed' | 'milestone_reached'
      description: string
      timestamp: Date
      metadata?: any
    }> = []

    // Process request activities
    recentRequests.forEach(request => {
      const userName = request.users?.name || request.users?.email || 'User'
      
      // Request created
      activities.push({
        id: `request-created-${request.id}`,
        type: 'request_created',
        description: `New ${request.type.toLowerCase()} request: "${request.title}"`,
        timestamp: request.createdAt,
        metadata: { requestId: request.id, userName }
      })

      // Request completed
      if (request.status === 'COMPLETED' && request.completedAt) {
        activities.push({
          id: `request-completed-${request.id}`,
          type: 'request_completed',
          description: `Request completed: "${request.title}"`,
          timestamp: request.completedAt,
          metadata: { requestId: request.id, userName }
        })
      }
    })

    // Process task completions from completedTasks JSON
    recentCompletions.forEach(request => {
      if (request.completedTasks) {
        try {
          const tasks = Array.isArray(request.completedTasks) 
            ? request.completedTasks 
            : JSON.parse(request.completedTasks as string)
          
          if (Array.isArray(tasks)) {
            tasks.forEach((task: any) => {
              if (task.title && task.completedAt) {
                activities.push({
                  id: `task-completed-${request.id}-${task.title.replace(/\s+/g, '-')}`,
                  type: 'task_completed',
                  description: `${getTaskTypeEmoji(task.type)} ${task.title}`,
                  timestamp: new Date(task.completedAt),
                  metadata: { 
                    requestId: request.id, 
                    taskType: task.type,
                    url: task.url,
                    userName: request.users?.name || request.users?.email || 'User'
                  }
                })
              }
            })
          }
        } catch (error) {
          logger.warn('Failed to parse completedTasks JSON', { requestId: request.id, error })
        }
      }
    })

    // Sort all activities by timestamp (newest first) and limit to 20
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20)
      .map(activity => ({ ...activity,
        time: formatDistanceToNow(activity.timestamp, { addSuffix: true }),
        timestamp: activity.timestamp.toISOString()
      }))

    return NextResponse.json({
      success: true,
      data: sortedActivities
    })

  } catch (error) {
    logger.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getTaskTypeEmoji(type: string): string {
  switch (type?.toLowerCase()) {
    case 'page':
      return '📄 New page created:'
    case 'blog':
      return '📝 Blog post published:'
    case 'gbp_post':
    case 'gbp-post':
      return '🏢 GBP post created:'
    case 'improvement':
      return '🔧 Website improvement:'
    default:
      return '✅ Task completed:'
  }
}
