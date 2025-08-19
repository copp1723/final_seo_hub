import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET - Fetch specific user details
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

    // Only SUPER_ADMIN can view user details
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
    }

    const { userId } = params

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true,
        currentDealershipId: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompleted: true,
        agencies: {
          select: {
            id: true,
            name: true
          }
        },
        dealerships: {
          select: {
            id: true,
            name: true
          }
        },
        currentDealership: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    logger.info('User details retrieved', {
      requestedBy: session.user.id,
      targetUserId: userId
    })

    return NextResponse.json({ user })

  } catch (error) {
    logger.error('Error fetching user details', {
      error: error instanceof Error ? error.message : String(error),
      userId: params?.userId,
      requestedBy: session?.user?.id
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}