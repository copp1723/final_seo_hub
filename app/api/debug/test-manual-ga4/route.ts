import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/google/ga4Service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {

    const body = await request.json()
    const { propertyId, startDate, endDate } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }

    const ga4Service = new GA4Service(session.user.id)
    
    // Test with the exact same query structure as the analytics endpoint
    const batchRequests = [
      // Traffic overview
      {
        dateRanges: [{ startDate: startDate || '2024-01-01', endDate: endDate || '2024-01-31' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' }
        ],
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      }
    ]

    logger.info('Testing GA4 with manual property', {
      userId: session.user.id,
      propertyId,
      dateRange: { startDate, endDate }
    })

    const reports = await ga4Service.batchRunReports(propertyId, batchRequests)
    
    // Process the first report
    const report = reports[0]
    const processedData = {
      rowCount: report?.rowCount || 0,
      rows: report?.rows || [],
      metricHeaders: report?.metricHeaders || [],
      dimensionHeaders: report?.dimensionHeaders || [],
      summary: {
        totalSessions: 0,
        totalUsers: 0,
        totalPageViews: 0
      }
    }

    // Calculate totals
    if (report?.rows) {
      report.rows.forEach((row: any) => {
        if (row.metricValues) {
          processedData.summary.totalSessions += parseInt(row.metricValues[0]?.value || '0')
          processedData.summary.totalUsers += parseInt(row.metricValues[1]?.value || '0')
          processedData.summary.totalPageViews += parseInt(row.metricValues[2]?.value || '0')
        }
      })
    }

    return NextResponse.json({
      success: true,
      propertyId,
      dateRange: { startDate, endDate },
      data: processedData
    })

  } catch (error) {
    logger.error('Manual GA4 test error', error, {
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        error: 'Failed to test GA4', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 