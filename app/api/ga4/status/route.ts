import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's dealership ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.json({
        connected: false,
        message: 'User not assigned to dealership'
      })
    }

    const connection = await prisma.gA4Connection.findUnique({
      where: { dealershipId: user.dealershipId },
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
        dealershipId: user.dealershipId,
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
    const session = await auth()
    logger.error('GA4 status check error', error, {
      userId: session?.user?.id,
      path: '/api/ga4/status',
      method: 'GET'
    })

    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    )
  }
}