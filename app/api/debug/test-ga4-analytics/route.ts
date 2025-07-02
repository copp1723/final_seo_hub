import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/google/ga4Service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GA4 connection
    const ga4Connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    })

    if (!ga4Connection || !ga4Connection.propertyId) {
      return NextResponse.json({
        error: 'No GA4 connection found',
        debug: {
          hasConnection: !!ga4Connection,
          hasPropertyId: !!ga4Connection?.propertyId,
          propertyId: ga4Connection?.propertyId
        }
      }, { status: 404 })
    }

    // Test simple analytics request
    const testRequest = {
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      metrics: ['sessions', 'activeUsers'],
      dimensions: []
    }

    console.log('Testing GA4 analytics with:', {
      propertyId: ga4Connection.propertyId,
      userId: session.user.id,
      request: testRequest
    })

    // Initialize GA4 service
    const ga4Service = new GA4Service(session.user.id)

    // Try a simple batch request
    const batchRequests = [
      {
        dateRanges: [{ startDate: testRequest.startDate, endDate: testRequest.endDate }],
        metrics: testRequest.metrics.map(metric => ({ name: metric })),
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      }
    ]

    console.log('Making GA4 API call...')
    const reports = await ga4Service.batchRunReports(ga4Connection.propertyId, batchRequests)
    console.log('GA4 API call successful:', reports?.[0]?.rows?.length || 0, 'rows')

    return NextResponse.json({
      success: true,
      propertyId: ga4Connection.propertyId,
      propertyName: ga4Connection.propertyName,
      testRequest,
      reportRowCount: reports?.[0]?.rows?.length || 0,
      sampleRow: reports?.[0]?.rows?.[0] || null,
      message: 'GA4 analytics test successful!'
    })

  } catch (error) {
    const session = await auth()
    
    // Detailed error logging
    console.error('GA4 test error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id
    })

    logger.error('GA4 analytics test error', error, {
      userId: session?.user?.id,
      path: '/api/debug/test-ga4-analytics',
      method: 'GET'
    })

    return NextResponse.json({
      error: 'GA4 test failed',
      details: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
} 