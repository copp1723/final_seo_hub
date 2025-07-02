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

    // Test with recent dates (assuming today is July 2, 2025)
    const testRequests = [
      {
        label: 'Last 7 days',
        startDate: '2025-06-25',
        endDate: '2025-07-02'
      },
      {
        label: 'Last 30 days', 
        startDate: '2025-06-02',
        endDate: '2025-07-02'
      },
      {
        label: 'June 2025',
        startDate: '2025-06-01',
        endDate: '2025-06-30'
      }
    ]

    console.log('Testing GA4 with recent dates for property:', ga4Connection.propertyId)

    // Initialize GA4 service
    const ga4Service = new GA4Service(session.user.id)

    const results = []

    for (const testRequest of testRequests) {
      try {
        const batchRequests = [
          {
            dateRanges: [{ startDate: testRequest.startDate, endDate: testRequest.endDate }],
            metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
            dimensions: [],
            orderBys: []
          }
        ]

        const reports = await ga4Service.batchRunReports(ga4Connection.propertyId, batchRequests)
        
        const sessions = parseInt(reports?.[0]?.rows?.[0]?.metricValues?.[0]?.value) || 0
        const users = parseInt(reports?.[0]?.rows?.[0]?.metricValues?.[1]?.value) || 0

        results.push({
          period: testRequest.label,
          dateRange: `${testRequest.startDate} to ${testRequest.endDate}`,
          sessions,
          users,
          hasData: sessions > 0 || users > 0
        })

      } catch (error) {
        results.push({
          period: testRequest.label,
          dateRange: `${testRequest.startDate} to ${testRequest.endDate}`,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const totalDataFound = results.filter(r => r.hasData).length

    return NextResponse.json({
      success: true,
      propertyId: ga4Connection.propertyId,
      propertyName: ga4Connection.propertyName,
      serverDate: new Date().toISOString(),
      testResults: results,
      summary: {
        periodsWithData: totalDataFound,
        totalPeriodsTested: testRequests.length,
        dataAvailable: totalDataFound > 0
      },
      message: totalDataFound > 0 
        ? `Found data in ${totalDataFound} periods! GA4 property has traffic.`
        : 'No data found in any recent periods. Property may be new or have no traffic.'
    })

  } catch (error) {
    logger.error('GA4 recent data test error', error)
    
    return NextResponse.json({
      error: 'GA4 recent data test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 