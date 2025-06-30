import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await prisma.gA4Connection.findUnique({
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
      return NextResponse.json({
        connected: false,
        message: 'No GA4 connection found'
      })
    }

    // Check if token is expired
    const isExpired = connection.expiresAt ? new Date() > connection.expiresAt : false

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
      { error: 'Failed to check GA4 status' },
      { status: 500 }
    )
  }
}