import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { safeDbOperation } from '@/lib/db-resilience'

export const dynamic = 'force-dynamic'

// Activity type definitions
type ActivityType = 'request_created' | 'request_completed' | 'task_completed' | 
                   'blog_published' | 'page_created' | 'gbp_posted' | 
                   'improvement_made' | 'ranking_improved' | 'analytics_milestone'

interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  icon: string
  color: string
  metadata?: any
}

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const since = searchParams.get('since') // ISO timestamp for polling updates
    
    // Get user's dealership context
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

    const effectiveDealershipId = dealershipId || user.dealershipId
    
    if (!effectiveDealershipId) {
      return NextResponse.json({ 
        success: true, 
        activities: [],
        message: 'No dealership selected'
      })
    }

    // Build the where clause for filtering activities
    const whereClause: any = {}
    
    if (since) {
      whereClause.createdAt = { gt: new Date(since) }
    }

    // Fetch recent activities from multiple sources
    const activities: Activity[] = []

    // 1. Get recent requests
    const requests = await safeDbOperation(() =>
      prisma.requests.findMany({
        where: {
          dealershipId: effectiveDealershipId,
          ...whereClause
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          users: {
            select: { name: true, email: true }
          }
        }
      })
    ) || []

    // Convert requests to activities
    requests.forEach(req => {
      // Request created activity
      activities.push({
        id: `req-created-${req.id}`,
        type: 'request_created',
        title: `New ${req.type} request created`,
        description: req.title,
        timestamp: req.createdAt,
        icon: 'FileText',
        color: 'blue',
        metadata: {
          requestId: req.id,
          priority: req.priority,
          user: req.users?.name || req.users?.email
        }
      })

      // Request completed activity
      if (req.status === 'COMPLETED' && req.completedAt) {
        activities.push({
          id: `req-completed-${req.id}`,
          type: 'request_completed',
          title: `${req.type} request completed`,
          description: req.title,
          timestamp: req.completedAt,
          icon: 'CheckCircle',
          color: 'green',
          metadata: {
            requestId: req.id,
            contentUrl: req.contentUrl
          }
        })
      }
    })

    // 2. Get recent tasks
    const tasks = await safeDbOperation(() =>
      prisma.tasks.findMany({
        where: {
          dealershipId: effectiveDealershipId,
          status: 'COMPLETED',
          completedAt: whereClause.createdAt || { not: null }
        },
        orderBy: { completedAt: 'desc' },
        take: limit
      })
    ) || []

    // Convert tasks to activities
    tasks.forEach(task => {
      if (!task.completedAt) return
      
      const typeMap: Record<string, { icon: string; color: string; label: string }> = {
        'PAGE': { icon: 'FileText', color: 'purple', label: 'Page created' },
        'BLOG': { icon: 'PenTool', color: 'indigo', label: 'Blog published' },
        'GBP_POST': { icon: 'MapPin', color: 'orange', label: 'GBP post published' },
        'IMPROVEMENT': { icon: 'TrendingUp', color: 'emerald', label: 'SEO change made' }
      }

      const taskInfo = typeMap[task.type] || { icon: 'Activity', color: 'gray', label: 'Task completed' }

      activities.push({
        id: `task-${task.id}`,
        type: task.type === 'BLOG' ? 'blog_published' : 
              task.type === 'PAGE' ? 'page_created' :
              task.type === 'GBP_POST' ? 'gbp_posted' : 'improvement_made',
        title: taskInfo.label,
        description: task.title,
        timestamp: task.completedAt,
        icon: taskInfo.icon,
        color: taskInfo.color,
        metadata: {
          taskId: task.id,
          targetUrl: task.targetUrl,
          keywords: task.keywords
        }
      })
    })

    // 3. Get SEOWorks webhook activities (completed tasks from external system)
    const seoworksTasks = await safeDbOperation(() =>
      prisma.orphaned_tasks.findMany({
        where: {
          clientId: effectiveDealershipId,
          processed: true,
          createdAt: whereClause.createdAt || undefined
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 2)
      })
    ) || []

    seoworksTasks.forEach(task => {
      const deliverables = task.deliverables as any
      if (deliverables && Array.isArray(deliverables)) {
        deliverables.forEach((deliverable: any) => {
          activities.push({
            id: `seoworks-${task.id}-${deliverable.type}`,
            type: deliverable.type === 'blog' ? 'blog_published' : 'page_created',
            title: `${deliverable.type === 'blog' ? 'Blog' : 'Content'} delivered`,
            description: deliverable.title || 'SEOWorks task completed',
            timestamp: task.createdAt,
            icon: 'Package',
            color: 'amber',
            metadata: {
              url: deliverable.url,
              externalId: task.externalId
            }
          })
        })
      }
    })

    // Activities are now complete - all data comes from real database sources

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Limit the results
    const limitedActivities = activities.slice(0, limit)

    // Get the latest timestamp for polling
    const latestTimestamp = limitedActivities.length > 0 
      ? limitedActivities[0].timestamp.toISOString()
      : new Date().toISOString()

    return NextResponse.json({
      success: true,
      activities: limitedActivities,
      latestTimestamp,
      hasMore: activities.length > limit
    })

  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}