import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await prisma.ga4_connections.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        propertyId: true,
        propertyName: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true
      }
    })

    if (!connection) {
      logger.info('GA4 connection not found', {
        userId: session.user.id,
        path: '/api/ga4/status',
        method: 'GET'
      })
      return NextResponse.json({
        connected: false,
        message: 'No GA4 connection found'
      })
    }

    // Check if token is expired
    const isExpired = connection.expiresAt ? new Date() > connection.expiresAt : false

    logger.info('GA4 status retrieved successfully', {
      userId: session.user.id,
      propertyId: connection.propertyId,
      path: '/api/ga4/status',
      method: 'GET'
    })

    return NextResponse.json({
      connected: true,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName,
      connectedAt: connection.createdAt,
      tokenExpired: isExpired,
      expiresAt: connection.expiresAt
    })

  } catch (error) {
    logger.error('GA4 status check error', error, {
      path: '/api/ga4/status',
      method: 'GET'
    })

    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    )
  }
}
