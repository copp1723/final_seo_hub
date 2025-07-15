import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/google/ga4Service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's dealership
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: { dealerships: true }
    })

    if (!user?.dealerships?.id) {
      return NextResponse.json({
        error: 'No dealership assigned to user'
      }, { status: 400 })
    }

    // Get GA4 connection
    const ga4Connection = await prisma.ga4_connections.findUnique({
      where: { userId: user.dealerships?.id }
    })

    if (!ga4Connection || !ga4Connection.propertyId) {
      return NextResponse.json({
        error: 'GA4 not connected',
        suggestion: 'Please connect GA4 in settings'
      }, { status: 404 })
    }

    const ga4Service = new GA4Service(user.dealerships?.id)
    const diagnostics: any = {
      connection: {
        propertyId: ga4Connection.propertyId,
        propertyName: ga4Connection.propertyName,
        connectedAt: ga4Connection.createdAt
      },
      tests: []
    }

    // Test 1: Simple single-day test
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    try {
      const singleDayReport = await ga4Service.runReport({
        propertyId: ga4Connection.propertyId!,
        metrics: ['sessions'],
        dimensions: ['date'],
        startDate: format(yesterday, 'yyyy-MM-dd'),
        endDate: format(yesterday, 'yyyy-MM-dd'),
        limit: 10
      })
      
      diagnostics.tests.push({
        name: 'Single Day Test (Yesterday)',
        success: true,
        dateRange: {
          startDate: format(yesterday, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd')
        },
        rowCount: singleDayReport.rowCount || 0,
        hasData: (singleDayReport.rowCount || 0) > 0,
        firstRow: singleDayReport.rows?.[0] || null,
        metricHeaders: singleDayReport.metricHeaders,
        dimensionHeaders: singleDayReport.dimensionHeaders
      })
    } catch (error) {
      diagnostics.tests.push({
        name: 'Single Day Test (Yesterday)',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Last 7 days with all metrics
    const weekAgo = subDays(today, 7)
    try {
      const batchReport = await ga4Service.batchRunReports(ga4Connection.propertyId!, [
        {
          dateRanges: [{ 
            startDate: format(weekAgo, 'yyyy-MM-dd'), 
            endDate: format(today, 'yyyy-MM-dd') 
          }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'screenPageViews' }
          ],
          dimensions: [{ name: 'date' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }]
        }
      ])
      
      const report = batchReport[0]
      const totalSessions = report?.rows?.reduce((sum: number, row: any) => 
        sum + parseInt(row.metricValues?.[0]?.value || '0'), 0) || 0
      const totalUsers = report?.rows?.reduce((sum: number, row: any) => 
        sum + parseInt(row.metricValues?.[1]?.value || '0'), 0) || 0
      const totalPageViews = report?.rows?.reduce((sum: number, row: any) => 
        sum + parseInt(row.metricValues?.[2]?.value || '0'), 0) || 0
      
      diagnostics.tests.push({
        name: 'Last 7 Days Batch Test',
        success: true,
        dateRange: {
          startDate: format(weekAgo, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        },
        rowCount: report?.rowCount || 0,
        hasData: (report?.rowCount || 0) > 0,
        totals: {
          sessions: totalSessions,
          activeUsers: totalUsers,
          screenPageViews: totalPageViews
        },
        rawReport: {
          metricHeaders: report?.metricHeaders,
          dimensionHeaders: report?.dimensionHeaders,
          rows: report?.rows?.slice(0, 3) // First 3 rows
        }
      })
    } catch (error) {
      diagnostics.tests.push({
        name: 'Last 7 Days Batch Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }

    // Test 3: Check available dimensions
    try {
      const metadata = await ga4Service.getMetadata(ga4Connection.propertyId!)
      diagnostics.metadata = {
        availableMetrics: metadata.metrics?.slice(0, 20).map((m: any) => ({
          apiName: m.apiName,
          uiName: m.uiName,
          description: m.description
        })),
        availableDimensions: metadata.dimensions?.slice(0, 20).map((d: any) => ({
          apiName: d.apiName,
          uiName: d.uiName,
          description: d.description
        }))
      }
    } catch (error) {
      diagnostics.metadata = {
        error: 'Failed to fetch metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Try alternative metrics
    const alternativeMetrics = ['totalUsers', 'newUsers', 'sessions', 'pageviews', 'eventCount']
    const workingMetrics: string[] = []
    
    for (const metric of alternativeMetrics) {
      try {
        const testReport = await ga4Service.runReport({
          propertyId: ga4Connection.propertyId!,
          metrics: [metric],
          dimensions: ['date'],
          startDate: format(yesterday, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd'),
          limit: 1
        })
        
        if (testReport.rowCount && testReport.rowCount > 0) {
          workingMetrics.push(metric)
        }
      } catch (error) {
        // Metric doesn't work
      }
    }
    
    diagnostics.workingMetrics = workingMetrics

    // Test 5: Check if property has web stream
    diagnostics.recommendations = generateRecommendations(diagnostics)

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        hasConnection: true,
        propertyId: ga4Connection.propertyId,
        testsRun: diagnostics.tests.length,
        testsSuccessful: diagnostics.tests.filter((t: any) => t.success).length,
        hasDataInLastWeek: diagnostics.tests.find((t: any) => t.name === 'Last 7 Days Batch Test')?.hasData || false,
        totalSessionsLastWeek: diagnostics.tests.find((t: any) => t.name === 'Last 7 Days Batch Test')?.totals?.sessions || 0
      }
    })

  } catch (error) {
    logger.error('GA4 diagnostic error', error)
    return NextResponse.json(
      { 
        error: 'Diagnostic failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = []
  
  const weekTest = diagnostics.tests.find((t: any) => t.name === 'Last 7 Days Batch Test')
  
  if (!weekTest?.hasData) {
    recommendations.push('No data found in the last 7 days.This property may not have active tracking.')
    recommendations.push('Verify that the GA4 tracking code is installed on your website.')
    recommendations.push('Check if this is the correct property ID for your website.')
  } else if (weekTest.totals?.sessions === 0) {
    recommendations.push('Property is connected but showing 0 sessions.Check if tracking is working.')
  }
  
  if (diagnostics.workingMetrics?.length === 0) {
    recommendations.push('No standard metrics are returning data.The property may not be configured correctly.')
  }
  
  if (!diagnostics.workingMetrics?.includes('screenPageViews') && diagnostics.workingMetrics?.includes('pageviews')) {
    recommendations.push('Use "pageviews" instead of "screenPageViews" for this property.')
  }
  
  return recommendations
} 
