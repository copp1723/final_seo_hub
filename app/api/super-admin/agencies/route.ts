import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const createAgencySchema = z.object({
  name: z.string().min(1, 'Agency name is required').max(100, 'Agency name must be less than 100 characters'),
  domain: z.string().optional().nullable()
})

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
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause for search
    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { domain: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {}

    // Get agencies with user counts and request counts
    const [agencies, totalCount] = await Promise.all([
      prisma.agencies.findMany({
        where: whereClause,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5, // Only get recent users for preview
          },
          _count: {
            select: {
              users: true,
              requests: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.agencies.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      agencies,
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
    console.error('Error fetching agencies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const validatedData = createAgencySchema.parse(body)

    // Check if agency name already exists
    const existingAgency = await prisma.agencies.findFirst({
      where: { name: { equals: validatedData.name, mode: 'insensitive' } }
    })

    if (existingAgency) {
      return NextResponse.json(
        { error: 'An agency with this name already exists' },
        { status: 400 }
      )
    }

    // Check if domain already exists (if provided)
    if (validatedData.domain) {
      const existingDomain = await prisma.agencies.findFirst({
        where: { domain: { equals: validatedData.domain, mode: 'insensitive' } }
      })

      if (existingDomain) {
        return NextResponse.json(
          { error: 'An agency with this domain already exists' },
          { status: 400 }
        )
      }
    }

    const agency = await prisma.agencies.create({
      data: {
        id: crypto.randomUUID(),
        slug: validatedData.name.toLowerCase().replace(/\s+/g, '-'),
        updatedAt: new Date(),
        name: validatedData.name,
        domain: validatedData.domain || null
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            users: true,
            requests: true
          }
        }
      }
    })

    return NextResponse.json({ agency }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating agency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
