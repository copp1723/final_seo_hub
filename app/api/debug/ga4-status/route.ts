import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GA4Service } from '@/lib/google/ga4Service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GA4 connection details
    const ga4Connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    })

    if (!ga4Connection) {
      return NextResponse.json({
        status: 'not_connected',
        message: 'No GA4 connection found'
      })
    }

    // Test the connection with a simple query
    let testResult = null
    let testError = null
    
    try {
      const ga4Service = new GA4Service(session.user.id)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const report = await ga4Service.runReport({
        propertyId: ga4Connection.propertyId,
        metrics: ['sessions'],
        dimensions: ['date'],
        startDate: yesterday.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        limit: 1
      })
      
      testResult = {
        success: true,
        rowCount: report.rowCount,
        metricHeaders: report.metricHeaders,
        dimensionHeaders: report.dimensionHeaders
      }
    } catch (error) {
      testError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    return NextResponse.json({
      status: 'connected',
      connection: {
        propertyId: ga4Connection.propertyId,
        propertyName: ga4Connection.propertyName,
        connectedAt: ga4Connection.createdAt,
        updatedAt: ga4Connection.updatedAt
      },
      testResult,
      testError,
      debug: {
        hasAccessToken: !!ga4Connection.accessToken,
        hasRefreshToken: !!ga4Connection.refreshToken,
        tokenLength: ga4Connection.accessToken?.length || 0
      }
    })

  } catch (error) {
    logger.error('GA4 status check error', error, {
      userId: session?.user?.id,
      path: '/api/debug/ga4-status'
    })

    return NextResponse.json(
      { error: 'Failed to check GA4 status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 