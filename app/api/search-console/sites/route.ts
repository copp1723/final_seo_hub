import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const authResult = await requireAuth(req)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = await getSearchConsoleService(session.user.id)
    const sites = await service.listSites()
    
    return NextResponse.json({ sites })
  } catch (error) {
    logger.error('Search Console error', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}
