import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const grantAccessSchema = z.object({
  dealershipId: z.string().min(1, 'Dealership ID is required'),
  accessLevel: z.enum(['READ', 'WRITE', 'ADMIN']).default('READ'),
  expiresAt: z.string().datetime().optional()
})

// GET - Fetch user's dealership access
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  let session: any = null;
  try {
    session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can manage dealership access
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const { userId } = params

    // Verify user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true,
        currentDealershipId: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch user's dealership access
    const access = await prisma.user_dealership_access.findMany({
      where: { 
        userId,
        isActive: true
      },
      include: {
        dealerships: {
          include: {
            agencies: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        grantedAt: 'desc'
      }
    })

    logger.info('User dealership access retrieved', {
      requestedBy: session.user.id,
      targetUserId: userId,
      accessCount: access.length
    })

    return NextResponse.json({
      user,
      access
    })

  } catch (error) {
    logger.error('Error fetching user dealership access', {
      error: error instanceof Error ? error.message : String(error),
      userId: params?.userId,
      requestedBy: session?.user?.id
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch user access' },
      { status: 500 }
    )
  }
}

// POST - Grant dealership access to user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  let session: any = null;
  try {
    session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can manage dealership access
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const { userId } = params
    const body = await request.json()
    const validation = grantAccessSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { dealershipId, accessLevel, expiresAt } = validation.data

    // Verify user exists
    const user = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify dealership exists
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      include: {
        agencies: {
          select: { name: true }
        }
      }
    })

    if (!dealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    // Check if access already exists
    const existingAccess = await prisma.user_dealership_access.findUnique({
      where: {
        userId_dealershipId: {
          userId,
          dealershipId
        }
      }
    })

    if (existingAccess) {
      // Update existing access instead of creating duplicate
      const updatedAccess = await prisma.user_dealership_access.update({
        where: { id: existingAccess.id },
        data: {
          accessLevel,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
          grantedBy: session.user.id,
          grantedAt: new Date()
        },
        include: {
          dealerships: {
            include: {
              agencies: {
                select: { name: true }
              }
            }
          }
        }
      })

      logger.info('Dealership access updated', {
        accessId: updatedAccess.id,
        userId,
        dealershipId,
        dealershipName: dealership.name,
        accessLevel,
        grantedBy: session.user.id
      })

      return NextResponse.json({
        message: 'Access updated successfully',
        access: updatedAccess
      })
    }

    // Create new access record
    const newAccess = await prisma.user_dealership_access.create({
      data: {
        userId,
        dealershipId,
        accessLevel,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: session.user.id,
        isActive: true,
        updatedAt: new Date()
      },
      include: {
        dealerships: {
          include: {
            agencies: {
              select: { name: true }
            }
          }
        }
      }
    })

    // If user doesn't have a current dealership set, set this as their current
    if (!user.currentDealershipId) {
      await prisma.users.update({
        where: { id: userId },
        data: { currentDealershipId: dealershipId }
      })
    }

    logger.info('Dealership access granted', {
      accessId: newAccess.id,
      userId,
      dealershipId,
      dealershipName: dealership.name,
      agencyName: dealership.agencies.name,
      accessLevel,
      grantedBy: session.user.id,
      expiresAt
    })

    return NextResponse.json({
      message: 'Access granted successfully',
      access: newAccess
    }, { status: 201 })

  } catch (error) {
    logger.error('Error granting dealership access', {
      error: error instanceof Error ? error.message : String(error),
      userId: params?.userId,
      grantedBy: session?.user?.id
    })

    // Handle specific database constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json({ error: 'User already has access to this dealership' }, { status: 409 })
        case 'P2003':
          return NextResponse.json({ error: 'Invalid user or dealership reference' }, { status: 400 })
        default:
          break
      }
    }

    return NextResponse.json(
      { error: 'Failed to grant access' },
      { status: 500 }
    )
  }
}