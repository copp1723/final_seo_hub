import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response

  try {
    // Get user's dealership ID
    const user = await prisma.users.findUnique({
      where: { id: authResult.user!.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.json({
        connected: false,
        debug: 'User not assigned to dealership'
      })
    }

    const connection = await prisma.search_console_connections.findUnique({
      where: { userId: user.dealershipId }
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
    logger.error('Search Console status error', error, { userId: authResult.user!.id })
    return NextResponse.json({
      connected: false,
      debug: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}
