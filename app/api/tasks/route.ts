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
        select: {
          dealershipId: true,
          agencyId: true,
          role: true
        }
      })
      
      if (user?.dealershipId) {
        whereClause.dealershipId = user.dealershipId
      } else if (user?.agencyId && (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN')) {
        // Agency user - get tasks for all agency dealerships
        const agency = await prisma.agencies.findUnique({
          where: { id: user.agencyId },
          include: { dealerships: true }
        })
        
        if (agency?.dealerships && agency.dealerships.length > 0) {
          whereClause.dealershipId = {
            in: agency?.dealerships?.map(d => d.id) || []
          }
        }
      }
    }

    // Fetch tasks from database
    const tasks = await prisma.tasks.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    // Get related requests if needed
    const requestIds = tasks.map(task => task.requestId).filter(Boolean) as string[]
    const requests = requestIds.length > 0 ? await prisma.requests.findMany({
      where: { id: { in: requestIds } },
      select: { id: true, packageType: true }
    }) : []

    const requestsMap = new Map(requests.map(req => [req.id, req]))

    // Transform tasks to match the expected format
    const formattedTasks = tasks.map(task => {
      const relatedRequest = task.requestId ? requestsMap.get(task.requestId) : null
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        status: task.status,
        priority: task.priority,
        requestTitle: relatedRequest?.packageType ? `${relatedRequest.packageType} Package` : undefined,
        requestId: task.requestId,
        targetUrl: task.targetUrl,
        keywords: task.keywords,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        completedAt: task.completedAt?.toISOString()
      }
    })

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