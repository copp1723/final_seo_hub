import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withErrorBoundary, withTimeout } from '@/lib/error-boundaries'
import { safeDbOperation } from '@/lib/db-resilience'
import { logger } from '@/lib/logger'
import { DealershipEventBus } from '@/lib/events/dealership-event-bus'

export const dynamic = 'force-dynamic';

const switchDealershipSchema = z.object({
  dealershipId: z.string().min(1)
})

export async function POST(request: NextRequest) {
  return withErrorBoundary(async () => {
    const session = await withTimeout(
      SimpleAuth.getSessionFromRequest(request),
      5000,
      'Session check timeout'
    )
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { dealershipId } = switchDealershipSchema.parse(body)

    // Handle super admin user
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {
      const dealership = await safeDbOperation(() => 
        prisma.dealerships.findUnique({
          where: { id: dealershipId }
        })
      )
      
      if (!dealership) {
        return NextResponse.json(
          { error: 'Dealership not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        dealership: {
          id: dealership.id,
          name: dealership.name
        }
      })
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    // SUPER_ADMIN users don't need an agencyId, but other users do
    if (!currentUser?.agencyId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Find dealership by ID and verify access
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId }
    })

    if (!dealership) {
      return NextResponse.json(
        { error: 'Dealership not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this dealership
    if (session.user.role !== 'SUPER_ADMIN') {
      const hasAccess = await prisma.users.findFirst({
        where: {
          id: session.user.id,
          agencyId: dealership.agencyId
        }
      })

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this dealership' },
          { status: 403 }
        )
      }
    }

    // Get previous dealership ID for event
    const previousDealershipId = currentUser?.dealershipId || undefined

    // Update the user's dealershipId in the database
    await prisma.users.update({
      where: { id: session.user.id },
      data: { dealershipId: dealership.id }
    })

    // Emit dealership change event for cache invalidation
    await DealershipEventBus.notifyDealershipChange(
      session.user.id,
      previousDealershipId,
      dealership.id
    )

    // Cache invalidation is now handled by the DealershipEventBus
    // which uses the analytics coordinator with Redis
    
    logger.info('Dealership switch completed with cache invalidation', {
      userId: session.user.id,
      previousDealershipId,
      newDealershipId: dealership.id
    })

    return NextResponse.json({
      success: true,
      dealership: {
        id: dealership.id,
        name: dealership.name
      },
      // Add validation information (safe, non-breaking addition)
      switchedFromDealershipId: previousDealershipId,
      userId: session.user.id,
      timestamp: Date.now()
    })

  }, {
    success: false,
    error: 'Service temporarily unavailable',
    message: 'Dealership switching is currently unavailable'
  })()
}

export async function GET(request: NextRequest) {
  try {
    // Test database connection first
    try {
      await prisma.$connect()
    } catch (dbError) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      )
    }
    
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle super admin user
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {
      const dealerships = await prisma.dealerships.findMany({
        orderBy: { name: 'asc' }
      })

      const availableDealerships = dealerships.map(dealership => ({
        id: dealership.id,
        name: dealership.name
      }))

      // Super admins don't need to persist dealershipId; just return

      return NextResponse.json({
        currentDealership: availableDealerships.length > 0 ? availableDealerships[0] : null,
        availableDealerships
      })
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: true
      }
    })

    // SUPER_ADMIN users don't need an agencyId, but other users do
    if (!currentUser?.agencies?.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Get all dealerships for the agency
    const dealerships = await prisma.dealerships.findMany({
      where: session.user.role === 'SUPER_ADMIN'
        ? {} // SUPER_ADMIN can see all dealerships
        : {
            agencyId: currentUser?.agencies?.id
          },
      orderBy: { name: 'asc' }
    });

    // Map dealerships to the expected format - REMOVE DEDUPLICATION
    const availableDealerships = dealerships.map(dealership => ({
      id: dealership.id,
      name: dealership.name
    }));

    // Determine current dealership - either from user's dealershipId or first available
    let currentDealership = null
    
    if (currentUser?.dealershipId) {
      const userDealership = dealerships.find(d => d.id === currentUser.dealershipId)
      if (userDealership) {
        currentDealership = {
          id: userDealership.id,
          name: userDealership.name
        }
      }
    }
    
    // Fallback to first available dealership if no current one is set
    if (!currentDealership && availableDealerships.length > 0) {
      currentDealership = availableDealerships[0]
    }

    // If user currently has no dealershipId set, persist default
    if (!currentUser?.dealershipId && currentDealership) {
      await prisma.users.update({
        where: { id: session.user.id },
        data: { dealershipId: currentDealership.id }
      })
    }

    return NextResponse.json({
      currentDealership,
      availableDealerships,
      // Add validation information (safe, non-breaking addition)
      userId: session.user.id,
      userRole: session.user.role,
      agencyId: currentUser?.agencies?.id,
      timestamp: Date.now()
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
