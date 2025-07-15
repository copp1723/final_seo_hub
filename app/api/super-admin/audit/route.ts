import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || ''
    const userId = searchParams.get('userId') || ''
    const resource = searchParams.get('resource') || ''
    const date = searchParams.get('date') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause for filters
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (action) {
      whereClause.action = action
    }

    if (userId) {
      whereClause.user.id = userId
    }

    if (resource) {
      whereClause.resource = resource
    }

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      whereClause.createdAt = {
        gte: startDate,
        lt: endDate
      }
    }

    // Get audit logs with user information
    const [logs, totalCount] = await Promise.all([
      prisma.audit_logs.findMany({
        where: whereClause,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.audit_logs.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to create audit log entries (for system events)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { action, resource, resourceId, details } = body

    // Get client IP and user agent
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || null
    const userAgent = request.headers.get('user-agent') || null

    const auditLog = await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        action,
        resource,
        entityType: resource,
        entityId: resourceId || null,
        details: details || {},
        users: {
          connect: { id: session.user.id }
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({ auditLog }, { status: 201 })

  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
