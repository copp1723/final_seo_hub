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

    const connection = await prisma.search_console_connections.findFirst({
      where: { 
        userId: session.user.id,
        dealershipId: session.user.dealershipId 
      }
    })

    if (!connection) {
      return NextResponse.json({
        connected: false,
        debug: 'No connection found in database'
      })
    }

    // Debug information
    const debugInfo = {
      hasAccessToken: !!connection.accessToken,
      hasRefreshToken: !!connection.refreshToken,
      siteUrl: connection.siteUrl,
      siteName: connection.siteName,
      expiresAt: connection.expiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    }

    return NextResponse.json({
      connected: true,
      siteUrl: connection.siteUrl,
      siteName: connection.siteName,
      debug: debugInfo
    })
  } catch (error) {
    logger.error('Search Console status error', error, { userId: session?.user.id })
    return NextResponse.json({
      connected: false,
      debug: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}
