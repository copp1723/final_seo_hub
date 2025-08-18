import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { agencyId: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow both SUPER_ADMIN and AGENCY_ADMIN
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'AGENCY_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Admin access required.' }, { status: 403 })
    }

    const { agencyId } = params

    // Additional validation for AGENCY_ADMIN users
    if (session.user.role === 'AGENCY_ADMIN') {
      if (!session.user.agencyId || session.user.agencyId !== agencyId) {
        return NextResponse.json({ error: 'Cannot access other agencies' }, { status: 403 })
      }
    }

    const agency = await prisma.agencies.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        name: true,
        website: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            dealerships: true,
            users: true
          }
        }
      }
    })

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    logger.info('Agency details retrieved', {
      agencyId: agency.id,
      requestedBy: session.user.id,
      userRole: session.user.role
    })

    return NextResponse.json({ 
      agency: {
        id: agency.id,
        name: agency.name,
        website: agency.website,
        phone: agency.phone,
        email: agency.email,
        dealershipCount: agency._count.dealerships,
        userCount: agency._count.users,
        createdAt: agency.createdAt,
        updatedAt: agency.updatedAt
      }
    })

  } catch (error) {
    logger.error('Error fetching agency details', {
      error: error instanceof Error ? error.message : String(error),
      agencyId: params?.agencyId,
      userId: session?.user?.id
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch agency details' },
      { status: 500 }
    )
  }
}