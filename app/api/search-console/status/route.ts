import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse } from '@/lib/api/route-utils'
import { SearchConsoleAPI } from '@/lib/api/search-console-api'
import { logger } from '@/lib/logger'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const connection = await SearchConsoleAPI.getConnection(session.user.id)

      if (!connection) {
        return successResponse({
          connected: false,
          debug: 'No connection found in database'
        })
      }

      // Debug information
      const debugInfo = process.env.NODE_ENV === 'development' ? {
        hasAccessToken: !!connection.accessToken,
        hasRefreshToken: !!connection.refreshToken,
        expiresAt: connection.expiresAt,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt
      } : undefined

      return successResponse({
        connected: true,
        siteUrl: connection.siteUrl,
        siteName: connection.siteName,
        debug: debugInfo
      })
    } catch (error) {
      logger.error('Search Console status error', error, { userId: session.user.id })
      return successResponse({
        connected: false,
        debug: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  })
}
