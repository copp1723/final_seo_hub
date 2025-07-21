import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response
  
  const dealershipId = authResult.user.dealershipId
  if (!dealershipId) {
    return NextResponse.json({ error: 'No dealership assigned' }, { status: 400 })
  }

  try {
    const results = {
      timestamp: new Date().toISOString(),
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        dealershipId
      },
      ga4: {
        connected: false,
        hasProperty: false,
        dataAvailable: false,
        sampleData: null as any,
        error: null as string | null
      },
      searchConsole: {
        connected: false,
        hasSite: false,
        dataAvailable: false,
        sampleData: null as any,
        error: null as string | null
      }
    }

    // Check GA4 connection
    const ga4Connection = await prisma.ga4_connections.findUnique({
      where: { userId: dealershipId }
    })

    if (ga4Connection) {
      results.ga4.connected = true
      results.ga4.hasProperty = !!ga4Connection.propertyId

      // Try to fetch actual data
      if (ga4Connection.propertyId) {
        try {
          const ga4Response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/ga4/analytics?propertyId=${ga4Connection.propertyId}`,
            {
              headers: {
                Cookie: request.headers.get('cookie') || ''
              }
            }
          )

          if (ga4Response.ok) {
            const data = await ga4Response.json()
            results.ga4.dataAvailable = true
            results.ga4.sampleData = {
              totalSessions: data.overview?.find((m: any) => m.metric === 'Sessions')?.value || 0,
              totalUsers: data.overview?.find((m: any) => m.metric === 'Users')?.value || 0,
              topPage: data.topPages?.[0] || null,
              dataPoints: data.overview?.length || 0
            }
          } else {
            results.ga4.error = `API returned ${ga4Response.status}: ${await ga4Response.text()}`
          }
        } catch (error) {
          results.ga4.error = error instanceof Error ? error.message : 'Failed to fetch GA4 data'
        }
      }
    }

    // Check Search Console connection
    const searchConsoleConnection = await prisma.searchConsole_connections.findUnique({
      where: { userId: dealershipId }
    })

    if (searchConsoleConnection) {
      results.searchConsole.connected = true
      results.searchConsole.hasSite = !!searchConsoleConnection.siteUrl

      // Try to fetch actual data
      if (searchConsoleConnection.siteUrl) {
        try {
          const scResponse = await fetch(
            `${process.env.NEXTAUTH_URL}/api/search-console/analytics?siteUrl=${encodeURIComponent(searchConsoleConnection.siteUrl)}&metric=queries&days=7`,
            {
              headers: {
                Cookie: request.headers.get('cookie') || ''
              }
            }
          )

          if (scResponse.ok) {
            const data = await scResponse.json()
            results.searchConsole.dataAvailable = true
            results.searchConsole.sampleData = {
              totalRows: data.rows?.length || 0,
              topQuery: data.rows?.[0] || null,
              hasData: (data.rows?.length || 0) > 0
            }
          } else {
            results.searchConsole.error = `API returned ${scResponse.status}: ${await scResponse.text()}`
          }
        } catch (error) {
          results.searchConsole.error = error instanceof Error ? error.message : 'Failed to fetch Search Console data'
        }
      }
    }

    logger.info('Data flow verification completed', results)

    return NextResponse.json(results)
  } catch (error) {
    logger.error('Data flow verification failed', error)
    return NextResponse.json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}