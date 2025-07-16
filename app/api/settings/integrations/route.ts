import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check GA4 connection
    const ga4Connection = await prisma.ga4_connections.findUnique({
      where: { userId: session.user.id },
      select: {
        propertyId: true,
        propertyName: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Check Search Console connection
    const searchConsoleConnection = await prisma.search_console_connections.findUnique({
      where: { userId: session.user.id },
      select: {
        siteUrl: true,
        siteName: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    const integrations = {
      ga4: {
        connected: !!ga4Connection,
        propertyId: ga4Connection?.propertyId || null,
        propertyName: ga4Connection?.propertyName || null,
        connectedAt: ga4Connection?.createdAt || null,
        lastUpdated: ga4Connection?.updatedAt || null
      },
      searchConsole: {
        connected: !!searchConsoleConnection,
        siteUrl: searchConsoleConnection?.siteUrl || null,
        siteName: searchConsoleConnection?.siteName || null,
        connectedAt: searchConsoleConnection?.createdAt || null,
        lastUpdated: searchConsoleConnection?.updatedAt || null
      }
    }
    
    logger.info('Integrations status retrieved', {
      userId: session.user.id,
      ga4Connected: integrations.ga4.connected,
      searchConsoleConnected: integrations.searchConsole.connected
    })
    
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
