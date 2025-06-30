import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  try {
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: authResult.user.id }
    })

    if (!connection) {
      logger.info('GA4 connection not found', {
        userId: authResult.user.id,
        path: '/api/ga4/status',
        method: 'GET'
      })
      return successResponse({ connected: false })
    }

    logger.info('GA4 status retrieved successfully', {
      userId: authResult.user.id,
      propertyId: connection.propertyId,
      path: '/api/ga4/status',
      method: 'GET'
    })

    // TODO: Fetch actual metrics from GA4
    // For now, return connection status only
    return successResponse({
      connected: true,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName,
      // metrics: ga4Metrics (to be implemented)
    })
  } catch (error) {
    logger.error('GA4 status error', error, {
      userId: authResult.user.id,
      path: '/api/ga4/status',
      method: 'GET'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}