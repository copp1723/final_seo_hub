import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateAccessSchema = z.object({
  accessLevel: z.enum(['READ', 'WRITE', 'ADMIN']).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
})

// PATCH - Update access level or other properties
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; accessId: string } }
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

    const { userId, accessId } = params
    const body = await request.json()
    const validation = updateAccessSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const updateData = validation.data

    // Verify access record exists and belongs to the user
    const existingAccess = await prisma.user_dealership_access.findFirst({
      where: {
        id: accessId,
        userId
      },
      include: {
        dealership: {
          include: {
            agencies: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!existingAccess) {
      return NextResponse.json({ error: 'Access record not found' }, { status: 404 })
    }

    // Update the access record
    const updatedAccess = await prisma.user_dealership_access.update({
      where: { id: accessId },
      data: {
        ...updateData,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
        updatedAt: new Date()
      },
      include: {
        dealership: {
          include: {
            agencies: {
              select: { name: true }
            }
          }
        }
      }
    })

    logger.info('Dealership access updated', {
      accessId,
      userId,
      dealershipId: existingAccess.dealershipId,
      dealershipName: existingAccess.dealership.name,
      oldAccessLevel: existingAccess.accessLevel,
      newAccessLevel: updateData.accessLevel || existingAccess.accessLevel,
      updatedBy: session.user.id,
      updateData
    })

    return NextResponse.json({
      message: 'Access updated successfully',
      access: updatedAccess
    })

  } catch (error) {
    logger.error('Error updating dealership access', {
      error: error instanceof Error ? error.message : String(error),
      userId: params?.userId,
      accessId: params?.accessId,
      updatedBy: session?.user?.id
    })

    return NextResponse.json(
      { error: 'Failed to update access' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke dealership access
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; accessId: string } }
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

    const { userId, accessId } = params

    // Verify access record exists and belongs to the user
    const existingAccess = await prisma.user_dealership_access.findFirst({
      where: {
        id: accessId,
        userId
      },
      include: {
        dealership: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!existingAccess) {
      return NextResponse.json({ error: 'Access record not found' }, { status: 404 })
    }

    // Get user to check if this is their current dealership
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { currentDealershipId: true }
    })

    // Delete the access record
    await prisma.user_dealership_access.delete({
      where: { id: accessId }
    })

    // If this was the user's current dealership, find another one to set as current
    if (user?.currentDealershipId === existingAccess.dealershipId) {
      const remainingAccess = await prisma.user_dealership_access.findFirst({
        where: {
          userId,
          isActive: true,
          id: { not: accessId }
        },
        orderBy: { grantedAt: 'desc' }
      })

      await prisma.users.update({
        where: { id: userId },
        data: {
          currentDealershipId: remainingAccess?.dealershipId || null
        }
      })
    }

    logger.info('Dealership access revoked', {
      accessId,
      userId,
      dealershipId: existingAccess.dealershipId,
      dealershipName: existingAccess.dealership.name,
      revokedBy: session.user.id,
      wasCurrentDealership: user?.currentDealershipId === existingAccess.dealershipId
    })

    return NextResponse.json({
      message: 'Access revoked successfully'
    })

  } catch (error) {
    logger.error('Error revoking dealership access', {
      error: error instanceof Error ? error.message : String(error),
      userId: params?.userId,
      accessId: params?.accessId,
      revokedBy: session?.user?.id
    })

    return NextResponse.json(
      { error: 'Failed to revoke access' },
      { status: 500 }
    )
  }
}