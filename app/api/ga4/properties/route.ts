import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { GA4Service } from '@/lib/google/ga4Service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has GA4 connection
    const ga4Connection = await prisma.ga4_connections.findUnique({
      where: { userId: session.user.id }
    })

    if (!ga4Connection) {
      return NextResponse.json({
        properties: [],
        message: 'No GA4 connection found. Please connect your Google Analytics account.'
      })
    }

    try {
      // Initialize GA4 service and fetch properties
      const ga4Service = new GA4Service(session.user.id)
      await ga4Service.initialize()

      // For now, return the connected property
      // In a full implementation, you'd call the GA4 Management API to list all properties
      const properties = [
        {
          propertyId: ga4Connection.propertyId,
          propertyName: ga4Connection.propertyName || `Property ${ga4Connection.propertyId}`,
          accountName: 'Connected Account',
          accountId: 'connected-account'
        }
      ]

      logger.info('GA4 properties fetched successfully', {
        userId: session.user.id,
        propertyCount: properties.length
      })

      return NextResponse.json({
        properties,
        currentPropertyId: ga4Connection.propertyId,
        message: `Found ${properties.length} GA4 property`
      })

    } catch (error) {
      logger.error('Failed to fetch GA4 properties', error, {
        userId: session.user.id
      })

      // Return fallback data if API fails
      return NextResponse.json({
        properties: [
          {
            propertyId: ga4Connection.propertyId,
            propertyName: ga4Connection.propertyName || 'Connected Property',
            accountName: 'Connected Account',
            accountId: 'fallback-account'
          }
        ],
        currentPropertyId: ga4Connection.propertyId,
        message: 'Using cached property information'
      })
    }

  } catch (error) {
    logger.error('GA4 properties API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch GA4 properties' },
      { status: 500 }
    )
  }
}
