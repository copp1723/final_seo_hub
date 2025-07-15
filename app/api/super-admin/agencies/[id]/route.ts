import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateAgencySchema = z.object({
  name: z.string().min(1, 'Agency name is required').max(100, 'Agency name must be less than 100 characters'),
  domain: z.string().optional().nullable()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: agencyId } = await params

    // Check if agency exists
    const existingAgency = await prisma.agencies.findUnique({
      where: { id: agencyId }
    })

    if (!existingAgency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateAgencySchema.parse(body)

    // Check if agency name already exists (excluding current agency)
    const nameConflict = await prisma.agencies.findFirst({
      where: { 
        name: { equals: validatedData.name, mode: 'insensitive' },
        id: { not: agencyId }
      }
    })

    if (nameConflict) {
      return NextResponse.json(
        { error: 'An agency with this name already exists' },
        { status: 400 }
      )
    }

    // Check if domain already exists (if provided, excluding current agency)
    if (validatedData.domain) {
      const domainConflict = await prisma.agencies.findFirst({
        where: { 
          domain: { equals: validatedData.domain, mode: 'insensitive' },
          id: { not: agencyId }
        }
      })

      if (domainConflict) {
        return NextResponse.json(
          { error: 'An agency with this domain already exists' },
          { status: 400 }
        )
      }
    }

    const updatedAgency = await prisma.agencies.update({
      where: { id: agencyId },
      data: {
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

    return NextResponse.json({ agency: updatedAgency })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating agency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: agencyId } = await params

    // Check if agency exists and get user count
    const existingAgency = await prisma.agencies.findUnique({
      where: { id: agencyId },
      include: {
        _count: {
          select: {
            users: true,
            requests: true
          }
        }
      }
    })

    if (!existingAgency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    // Prevent deletion if agency has users
    if (existingAgency._count.users > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete agency with existing users. Please reassign or remove users first.',
          userCount: existingAgency._count.users
        },
        { status: 400 }
      )
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete related requests first
      await tx.requests.deleteMany({
        where: { agencyId: agencyId }
      })

      // Delete the agency
      await tx.agencies.delete({
        where: { id: agencyId }
      })
    })

    return NextResponse.json({ 
      message: 'Agency deleted successfully',
      deletedAgency: {
        id: existingAgency.id,
        name: existingAgency.name,
        requestsDeleted: existingAgency._count.requests
      }
    })

  } catch (error) {
    console.error('Error deleting agency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: agencyId } = await params

    const agency = await prisma.agencies.findUnique({
      where: { id: agencyId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        requests: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            users: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Recent requests
        },
        _count: {
          select: {
            users: true,
            requests: true
          }
        }
      }
    })

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    return NextResponse.json({ agency })

  } catch (error) {
    console.error('Error fetching agency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
