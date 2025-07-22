import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse } from '@/lib/api/route-utils'
import { SearchConsoleAPI } from '@/lib/api/search-console-api'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const result = await SearchConsoleAPI.listSites(session.user.id)
    
    if (!result.success) {
      return NextResponse.json(result, { status: result.needsReconnection ? 401 : 500 })
    }
    
    return successResponse(result)
  })
}
