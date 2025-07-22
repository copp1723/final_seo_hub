import { NextRequest, NextResponse } from 'next/server'
import { withAuth, errorResponse, successResponse } from '@/lib/api/route-utils'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { logger } from '@/lib/logger'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const { searchParams } = new URL(req.url)
    const siteUrl = searchParams.get('siteUrl')
    const metric = searchParams.get('metric') || 'queries'
    const days = parseInt(searchParams.get('days') || '28')

    if (!siteUrl) {
      return errorResponse('Site URL required', 400)
    }

    try {
      const service = await getSearchConsoleService(session.user.id)
      
      let data
      switch (metric) {
        case 'queries':
          data = await service.getTopQueries(siteUrl, days)
          break
        case 'pages':
          data = await service.getTopPages(siteUrl, days)
          break
        case 'performance':
          data = await service.getSearchAnalytics(siteUrl, {
            startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            dimensions: ['date']
          })
          break
        default:
          return errorResponse('Invalid metric', 400)
      }
      
      return successResponse(data)
    } catch (error) {
      logger.error('Search Console analytics error', error, { 
        userId: session.user.id, 
        siteUrl, 
        metric 
      })
      return errorResponse('Failed to fetch analytics', 500, error)
    }
  })
}
