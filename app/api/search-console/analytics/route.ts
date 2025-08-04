import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

async function checkConnectionHealth(service: ReturnType<typeof getSearchConsoleService>) {
  try {
    const sites = await service.listSites()
    return sites
  } catch (error: any) {
    throw error
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const siteUrl = searchParams.get('siteUrl')
  const metric = searchParams.get('metric') || 'queries'
  const days = parseInt(searchParams.get('days') || '28')

  if (!siteUrl) {
    return NextResponse.json(
      { error: 'Site URL required' },
      { status: 400 }
    )
  }

  try {
    const service = await getSearchConsoleService(session.user.id)

    let verifiedSites
    try {
      verifiedSites = await checkConnectionHealth(service)
    } catch (error: any) {
      logger.error('Search Console connection health check failed', error, { userId: session.user.id })
      const errorMessage = error?.message || 'Unknown error'
      const errorCode = error?.code || 'UNKNOWN'
      return NextResponse.json(
        {
          error: 'Connection health check failed',
          details: errorMessage,
          code: errorCode,
          suggestion: 'Please reconnect your Google Search Console account.'
        },
        { status: 500 }
      )
    }

    const siteUrls = verifiedSites.map((site: any) => site.siteUrl)
    if (!siteUrls.includes(siteUrl)) {
      return NextResponse.json(
        {
          error: 'Missing permission for the requested site URL',
          details: `The site URL ${siteUrl} is not verified or accessible in your account.`,
          code: 'PERMISSION_DENIED'
        },
        { status: 403 }
      )
    }
    
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
        return NextResponse.json(
          { error: 'Invalid metric' },
          { status: 400 }
        )
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    logger.error('Search Console analytics error', error, { userId: session.user.id, siteUrl, metric })
    const errorMessage = error?.message || 'Failed to fetch analytics'
    const errorCode = error?.code || 'UNKNOWN'
    return NextResponse.json(
      { error: errorMessage, code: errorCode },
      { status: 500 }
    )
  }
}
