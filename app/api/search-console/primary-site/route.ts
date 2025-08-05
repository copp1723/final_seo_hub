import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { siteUrl, dealershipId } = await req.json()
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL required' },
        { status: 400 }
      )
    }

    // Get user's info
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, role: true, agencyId: true }
    })

    // Determine target dealership
    let targetDealershipId = dealershipId || user?.dealershipId
    
    // If agency admin is setting site for a specific dealership
    if (dealershipId && user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      // Verify the dealership belongs to the agency
      const dealership = await prisma.dealerships.findFirst({
        where: {
          id: dealershipId,
          agencyId: user.agencyId
        }
      })
      
      if (!dealership) {
        return NextResponse.json(
          { error: 'Dealership not found or does not belong to your agency' },
          { status: 403 }
        )
      }
      targetDealershipId = dealershipId
    }

    if (!targetDealershipId) {
      return NextResponse.json(
        { error: 'No dealership context available' },
        { status: 400 }
      )
    }

    // Update the primary site for the dealership
    // First find the connection to update
    const connection = await prisma.search_console_connections.findFirst({
      where: {
        OR: [
          { dealershipId: targetDealershipId },
          { userId: session.user.id }
        ]
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Search Console connection not found' },
        { status: 404 }
      )
    }

    await prisma.search_console_connections.update({
      where: { id: connection.id },
      data: {
        siteUrl: siteUrl,
        siteName: new URL(siteUrl).hostname
      }
    })

    // Invalidate coordinated analytics cache for this dealership (best-effort)
    try {
      const { analyticsCoordinator } = await import('@/lib/analytics/analytics-coordinator')
      await analyticsCoordinator.invalidateDealershipCache(session.user.id, targetDealershipId || undefined)
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Search Console cache invalidated after primary site update', {
          userId: session.user.id,
          dealershipId: targetDealershipId
        })
      }
    } catch (e) {
      logger.warn('Search Console cache invalidation failed after primary site update', { error: e, userId: session.user.id, dealershipId: targetDealershipId })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to update primary site', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to update primary site' },
      { status: 500 }
    )
  }
}
