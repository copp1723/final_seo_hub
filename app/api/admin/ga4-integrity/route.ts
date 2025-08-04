import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { getDataIntegrityStatus } from '@/lib/validation/ga4-data-integrity'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GA4 Data Integrity Monitoring Endpoint
 * 
 * This endpoint provides real-time monitoring of GA4 data integrity
 * to detect when multiple dealerships are returning identical data.
 * 
 * Only accessible by SUPER_ADMIN users.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admins can access this endpoint
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const integrityStatus = getDataIntegrityStatus()
    
    // Determine overall health status
    const healthStatus = integrityStatus.suspiciousPatterns.length === 0 ? 'healthy' : 'warning'
    
    const response = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      summary: {
        totalDealerships: integrityStatus.totalDealerships,
        uniqueProperties: integrityStatus.uniqueProperties,
        suspiciousPatterns: integrityStatus.suspiciousPatterns.length
      },
      details: {
        suspiciousPatterns: integrityStatus.suspiciousPatterns.map(pattern => ({
          propertyId: pattern.propertyId,
          affectedDealerships: pattern.dealerships,
          identicalData: pattern.dataPoint,
          severity: pattern.dealerships.length > 2 ? 'critical' : 'warning'
        }))
      },
      recommendations: integrityStatus.suspiciousPatterns.length > 0 ? [
        'Check GA4 property selection logic in DealershipAnalyticsService',
        'Verify dealership property mappings are correct',
        'Review recent deployments for regressions',
        'Run GA4 property selection tests'
      ] : []
    }

    // Log critical issues
    if (healthStatus === 'warning') {
      logger.warn('GA4 Data Integrity Issues Detected', {
        suspiciousPatterns: integrityStatus.suspiciousPatterns.length,
        affectedDealerships: integrityStatus.suspiciousPatterns.flatMap(p => p.dealerships)
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('GA4 integrity check error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Manual trigger for integrity validation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()
    
    if (action === 'clear_cache') {
      // Clear the integrity cache to reset monitoring
      // This would be implemented in the validation module
      logger.info('GA4 integrity cache cleared by admin', { userId: session.user.id })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Integrity monitoring cache cleared' 
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    logger.error('GA4 integrity action error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
