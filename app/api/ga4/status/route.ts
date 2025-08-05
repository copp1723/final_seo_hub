import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedDealershipId = searchParams.get('dealershipId') || undefined

    // Access control parity with analytics endpoints:
    // Admins/agency admins can specify dealershipId. Standard users restricted to their own.
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, agencyId: true, role: true }
    })

    let targetDealershipId: string | null = null
    if (requestedDealershipId) {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'AGENCY_ADMIN') {
        // Admins can request any dealership; for agency admin, optionally verify belongs to agency if needed
        targetDealershipId = requestedDealershipId
      } else {
        // Standard users must match their dealership
        if (requestedDealershipId !== user?.dealershipId) {
          return NextResponse.json({ error: 'Access denied to requested dealership' }, { status: 403 })
        }
        targetDealershipId = requestedDealershipId
      }
    } else {
      targetDealershipId = user?.dealershipId || null
    }

    // Lookup order: dealership-first, then user-level
    const dealershipConn = targetDealershipId
      ? await prisma.ga4_connections.findFirst({
          where: { dealershipId: targetDealershipId },
          select: { id: true, propertyId: true, propertyName: true, updatedAt: true, createdAt: true }
        })
      : null

    const userConn = await prisma.ga4_connections.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, propertyId: true, propertyName: true, updatedAt: true, createdAt: true }
    })

    const connectedForDealership = !!dealershipConn
    const hasUserLevelConnection = !!userConn
    const source: 'dealership' | 'user' | 'none' = connectedForDealership ? 'dealership' : hasUserLevelConnection ? 'user' : 'none'

    // Minimal guarded debug logging
    const shouldDebug = process.env.DEBUG_ANALYTICS === 'true' || process.env.NODE_ENV !== 'production'
    if (shouldDebug) {
      logger.info('GA4 status check', {
        dealershipId: targetDealershipId,
        requestedDealershipId,
        source,
        dealershipConnId: dealershipConn?.id,
        userConnId: userConn?.id,
        userId: session.user.id
      })
    }

    // Maintain backward fields for compatibility; connected reflects dealership when dealershipId present
    const primary = dealershipConn || userConn || null
    return NextResponse.json({
      connected: !!primary, // legacy
      propertyId: primary?.propertyId || null, // legacy
      propertyName: primary?.propertyName || null, // legacy
      connectedAt: primary?.createdAt || null, // legacy
      // New dealership-aware status
      connectedForDealership,
      hasUserLevelConnection,
      dealershipId: targetDealershipId,
      source
    })
  } catch (error) {
    logger.error('GA4 status check error', error, {
      path: '/api/ga4/status',
      method: 'GET'
    })
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    )
  }
}
