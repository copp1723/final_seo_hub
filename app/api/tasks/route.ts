import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealershipId from query params
    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    
    // Build the where clause based on user role and dealership selection
    let whereClause: any = {}
    
    if (dealershipId) {
      // If dealership is specified, filter by it
      whereClause.dealershipId = dealershipId
    } else {
      // Otherwise, get tasks for user's dealership(s)
      const user = await prisma.users.findUnique({
        where: { id: session.user.id },
        include: { 
          dealerships: true,
          agencies: {
            include: {
              dealerships: true
            }
          }
        }
      })
      
      if (user?.dealerships?.id) {
        whereClause.dealershipId = user.dealerships.id
      } else if (user?.agencies && user.agencies.dealerships.length > 0) {
        // Agency user - get tasks for all agency dealerships
        whereClause.dealershipId = {
          in: user.agencies.dealerships.map(d => d.id)
        }
      }
    }

    // Fetch tasks from database
    const tasks = await prisma.tasks.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        requests: {
          select: {
            id: true,
            packageType: true
          }
        }
      }
    })

    // Transform tasks to match the expected format
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority || 'MEDIUM',
      requestTitle: task.requests?.packageType ? `${task.requests.packageType} Package` : undefined,
      requestId: task.requestId,
      targetUrl: task.targetUrl,
      targetCity: task.targetCity,
      targetModel: task.targetModel,
      dueDate: task.dueDate?.toISOString(),
      startedAt: task.startedAt?.toISOString(),
      createdAt: task.createdAt.toISOString(),
      completedUrl: task.completedUrl,
      completedAt: task.completedAt?.toISOString()
    }))

    return NextResponse.json({
      success: true,
      tasks: formattedTasks
    })

  } catch (error) {
    console.error('Tasks API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tasks',
      tasks: [] 
    }, { status: 500 })
  }
}