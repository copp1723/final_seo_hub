import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/google/ga4Service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Common GA4 metrics to test
const GA4_METRICS_TO_TEST = [
  // Session metrics
  'sessions',
  'sessionsPerUser',
  'averageSessionDuration',
  'bounceRate',
  
  // User metrics
  'activeUsers',
  'totalUsers',
  'newUsers',
  'returningUsers',
  
  // Page/Screen metrics
  'screenPageViews',
  'screenPageViewsPerSession',
  'screenPageViewsPerUser',
  'averagePageLoadTime',
  
  // Event metrics
  'eventCount',
  'conversions',
  'engagementRate',
  'engagedSessions',
  
  // Alternative pageview metrics
  'pageviews',
  'pageViewsPerSession',
  'pageViewsPerUser'
]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GA4 connection
    const ga4Connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    })

    if (!ga4Connection) {
      return NextResponse.json({ error: 'GA4 not connected' }, { status: 404 })
    }

    const ga4Service = new GA4Service(session.user.id)
    const results: Record<string, any> = {}
    
    // Test date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    const dateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }

    // Test each metric individually
    for (const metric of GA4_METRICS_TO_TEST) {
      try {
        const report = await ga4Service.runReport({
          propertyId: ga4Connection.propertyId!,
          metrics: [metric],
          dimensions: ['date'],
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: 1
        })
        
        results[metric] = {
          status: 'success',
          rowCount: report.rowCount || 0,
          sampleData: report.rows?.[0]?.metricValues?.[0]?.value || null
        }
      } catch (error) {
        results[metric] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Also test a batch report with common metrics
    let batchTestResult = null
    try {
      const workingMetrics = Object.entries(results)
        .filter(([_, result]) => result.status === 'success')
        .map(([metric, _]) => metric)
        .slice(0, 3) // Take first 3 working metrics
      
      if (workingMetrics.length > 0) {
        const batchReport = await ga4Service.batchRunReports(ga4Connection.propertyId!, [
          {
            dateRanges: [dateRange],
            metrics: workingMetrics.map(m => ({ name: m })),
            dimensions: [{ name: 'date' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }]
          }
        ])
        
        batchTestResult = {
          success: true,
          metricsUsed: workingMetrics,
          rowCount: batchReport[0]?.rowCount || 0
        }
      }
    } catch (error) {
      batchTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      propertyId: ga4Connection.propertyId,
      propertyName: ga4Connection.propertyName,
      dateRange,
      metricTests: results,
      workingMetrics: Object.entries(results)
        .filter(([_, result]) => result.status === 'success')
        .map(([metric, _]) => metric),
      failedMetrics: Object.entries(results)
        .filter(([_, result]) => result.status === 'error')
        .map(([metric, _]) => metric),
      batchTestResult,
      recommendation: generateRecommendation(results)
    })

  } catch (error) {
    logger.error('GA4 metrics test error', error)
    return NextResponse.json(
      { error: 'Failed to test GA4 metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function generateRecommendation(results: Record<string, any>) {
  const workingMetrics = Object.entries(results)
    .filter(([_, result]) => result.status === 'success')
    .map(([metric, _]) => metric)
  
  if (workingMetrics.includes('sessions') && 
      workingMetrics.includes('activeUsers') && 
      workingMetrics.includes('screenPageViews')) {
    return 'Current metrics configuration is correct'
  }
  
  const recommendations: string[] = []
  
  if (!workingMetrics.includes('sessions')) {
    recommendations.push('Replace "sessions" with a working alternative')
  }
  
  if (!workingMetrics.includes('screenPageViews')) {
    if (workingMetrics.includes('pageviews')) {
      recommendations.push('Use "pageviews" instead of "screenPageViews"')
    } else {
      recommendations.push('Page view metrics may not be available')
    }
  }
  
  return recommendations.length > 0 ? recommendations.join('; ') : 'Check API access permissions'
} 