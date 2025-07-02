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
        error: 'No GA4 connection found'
      }, { status: 404 })
    }

    // Test with known historical dates (June 2024)
    const testRequest = {
      startDate: '2024-06-01',
      endDate: '2024-06-30',
      metrics: ['sessions', 'activeUsers', 'screenPageViews']
    }

    console.log('Testing GA4 with historical dates:', testRequest)

    // Initialize GA4 service
    const ga4Service = new GA4Service(session.user.id)

    // Try a simple batch request with historical data
    const batchRequests = [
      {
        dateRanges: [{ startDate: testRequest.startDate, endDate: testRequest.endDate }],
        metrics: testRequest.metrics.map(metric => ({ name: metric })),
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      }
    ]

    const reports = await ga4Service.batchRunReports(ga4Connection.propertyId, batchRequests)
    
    const totalSessions = reports?.[0]?.rows?.reduce((sum: number, row: any) => {
      return sum + (parseInt(row.metricValues?.[0]?.value) || 0)
    }, 0) || 0

    return NextResponse.json({
      success: true,
      propertyId: ga4Connection.propertyId,
      propertyName: ga4Connection.propertyName,
      testPeriod: 'June 2024',
      testRequest,
      totalRows: reports?.[0]?.rows?.length || 0,
      totalSessions,
      sampleRows: reports?.[0]?.rows?.slice(0, 3) || [],
      message: totalSessions > 0 
        ? `Found ${totalSessions} sessions in June 2024! Data exists.`
        : 'No data found for June 2024 - property may not have historical data.'
    })

  } catch (error) {
    logger.error('GA4 historical test error', error)
    
    return NextResponse.json({
      error: 'GA4 historical test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 