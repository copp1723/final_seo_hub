import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await SimpleAuth.getSessionFromRequest(request)
  
  try {
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedDealershipId = searchParams.get('dealershipId') || undefined

    // Access control parity with performance route
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, agencyId: true, role: true }
    })

    let targetDealershipId: string | null = null
    if (requestedDealershipId) {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'AGENCY_ADMIN') {
        targetDealershipId = requestedDealershipId
      } else {
        if (requestedDealershipId !== user?.dealershipId) {
          return NextResponse.json({ error: 'Access denied to requested dealership' }, { status: 403 })
        }
        targetDealershipId = requestedDealershipId
      }
    } else {
      targetDealershipId = user?.dealershipId || null
    }

    // Lookup order consistent with performance route: dealership-first then user-level
    const dealershipConn = targetDealershipId
      ? await prisma.search_console_connections.findFirst({
          where: { dealershipId: targetDealershipId },
          select: { id: true, siteUrl: true, siteName: true, createdAt: true, updatedAt: true }
        })
      : null

    const userConn = await prisma.search_console_connections.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, siteUrl: true, siteName: true, createdAt: true, updatedAt: true }
    })

    const connectedForDealership = !!dealershipConn
    const hasUserLevelConnection = !!userConn
    const source: 'dealership' | 'user' | 'none' = connectedForDealership ? 'dealership' : hasUserLevelConnection ? 'user' : 'none'

    const shouldDebug = process.env.DEBUG_ANALYTICS === 'true' || process.env.NODE_ENV !== 'production'
    if (shouldDebug) {
      logger.info('Search Console status check', {
        dealershipId: targetDealershipId,
        requestedDealershipId,
        source,
        dealershipConnId: dealershipConn?.id,
        userConnId: userConn?.id,
        userId: session.user.id
      })
    }

    const primary = dealershipConn || userConn || null
    return NextResponse.json({
      connected: !!primary, // legacy
      siteUrl: primary?.siteUrl || null, // legacy
      siteName: primary?.siteName || null, // legacy
      // New dealership-aware fields
      connectedForDealership,
      hasUserLevelConnection,
      dealershipId: targetDealershipId,
      source
    })
  } catch (error) {
    logger.error('Search Console status error', error, { userId: session?.user.id })
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
