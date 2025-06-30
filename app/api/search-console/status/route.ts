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
      return NextResponse.json({ connected: false })
    }

    // TODO: Fetch actual metrics from Search Console
    // For now, return connection status only
    return NextResponse.json({
      connected: true,
      siteUrl: connection.siteUrl,
      siteName: connection.siteName,
      // metrics: searchConsoleMetrics (to be implemented)
    })
  } catch (error) {
    logger.error('Search Console status error', error, { userId: authResult.user.id })
    return NextResponse.json({ connected: false })
  }
}