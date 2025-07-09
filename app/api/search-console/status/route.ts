import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  try {
    const connection = await prisma.searchConsoleConnection.findUnique({
      where: { userId: authResult.user.id }
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
    logger.error('Search Console status error', error, { userId: authResult.user.id })
    return NextResponse.json({
      connected: false,
      debug: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}