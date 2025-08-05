import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedDealershipId = searchParams.get('dealershipId') || undefined

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, dealershipId: true, role: true }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Resolve target dealership (admins can specify; standard users restricted)
    let targetDealershipId: string | null = null
    if (requestedDealershipId) {
      if (user.role === 'SUPER_ADMIN' || user.role === 'AGENCY_ADMIN') {
        targetDealershipId = requestedDealershipId
      } else {
        if (requestedDealershipId !== user.dealershipId) {
          return NextResponse.json({ error: 'Access denied to requested dealership' }, { status: 403 })
        }
        targetDealershipId = requestedDealershipId
      }
    } else {
      targetDealershipId = user.dealershipId || null
    }

    // Compute dealership-specific and user-level flags
    const [ga4DealershipConn, ga4UserConn, scDealershipConn, scUserConn] = await Promise.all([
      targetDealershipId
        ? prisma.ga4_connections.findFirst({
            where: { dealershipId: targetDealershipId },
            select: { propertyId: true, propertyName: true, createdAt: true, updatedAt: true }
          })
        : Promise.resolve(null),
      prisma.ga4_connections.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { propertyId: true, propertyName: true, createdAt: true, updatedAt: true }
      }),
      targetDealershipId
        ? prisma.search_console_connections.findFirst({
            where: { dealershipId: targetDealershipId },
            select: { siteUrl: true, siteName: true, createdAt: true, updatedAt: true }
          })
        : Promise.resolve(null),
      prisma.search_console_connections.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { siteUrl: true, siteName: true, createdAt: true, updatedAt: true }
      })
    ])

    const ga4 = {
      connected: !!(targetDealershipId ? ga4DealershipConn : (ga4DealershipConn || ga4UserConn)), // legacy connected reflects dealership when provided
      propertyId: (ga4DealershipConn || ga4UserConn)?.propertyId || null,
      propertyName: (ga4DealershipConn || ga4UserConn)?.propertyName || null,
      connectedAt: (ga4DealershipConn || ga4UserConn)?.createdAt || null,
      lastUpdated: (ga4DealershipConn || ga4UserConn)?.updatedAt || null,
      // New explicit flags
      connectedForSelectedDealership: !!ga4DealershipConn,
      hasUserLevelConnection: !!ga4UserConn
    }

    const searchConsole = {
      connected: !!(targetDealershipId ? scDealershipConn : (scDealershipConn || scUserConn)),
      siteUrl: (scDealershipConn || scUserConn)?.siteUrl || null,
      siteName: (scDealershipConn || scUserConn)?.siteName || null,
      connectedAt: (scDealershipConn || scUserConn)?.createdAt || null,
      lastUpdated: (scDealershipConn || scUserConn)?.updatedAt || null,
      // New explicit flags
      connectedForSelectedDealership: !!scDealershipConn,
      hasUserLevelConnection: !!scUserConn
    }

    const integrations = { ga4, searchConsole }

    const shouldDebug = process.env.DEBUG_ANALYTICS === 'true' || process.env.NODE_ENV !== 'production'
    if (shouldDebug) {
      logger.info('Settings integrations status', {
        userId: session.user.id,
        dealershipId: targetDealershipId,
        ga4: {
          connectedForSelectedDealership: ga4.connectedForSelectedDealership,
          hasUserLevelConnection: ga4.hasUserLevelConnection
        },
        searchConsole: {
          connectedForSelectedDealership: searchConsole.connectedForSelectedDealership,
          hasUserLevelConnection: searchConsole.hasUserLevelConnection
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { integrations }
    })
  } catch (error) {
    logger.error('Integrations status error', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations status' },
      { status: 500 }
    )
  }
}
