import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/api/route-utils'
import { SearchConsoleAPI } from '@/lib/api/search-console-api'
import { logger } from '@/lib/logger'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    try {
      await SearchConsoleAPI.deleteConnection(session.user.id)
      return successResponse({ message: 'Search Console disconnected successfully' })
    } catch (error) {
      logger.error('Failed to disconnect Search Console', error, { userId: session.user.id })
      return errorResponse('Failed to disconnect Search Console', 500)
    }
  })
}
