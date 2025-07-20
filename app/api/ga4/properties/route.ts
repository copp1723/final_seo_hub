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

    // Get optional dealership filter
    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')

    // Fetch all GA4 connections for this user (and dealership if specified)
    const connections = await prisma.ga4_connections.findMany({
      where: {
        userId: session.user.id,
        ...(dealershipId ? { dealershipId } : {})
      }
    })

    if (connections.length === 0) {
      return NextResponse.json({
        properties: [],
        message: 'No GA4 connections found. Please connect GA4 for your dealership.'
      })
    }

    try {
      // Map connections to properties list
      const properties = connections.map(conn => ({
        propertyId: conn.propertyId || '',
        propertyName: conn.propertyName || `Property ${conn.propertyId}`,
        accountName: 'Connected Account',
        accountId: 'connected-account',
        dealershipId: conn.dealershipId
      }))

      logger.info('GA4 properties fetched successfully', {
        userId: session.user.id,
        propertyCount: properties.length,
        dealershipId
      })

      // Determine current property selection
      const currentPropertyId = dealershipId
        ? connections.find(c => c.dealershipId === dealershipId)?.propertyId
        : connections[0].propertyId
      return NextResponse.json({
        properties,
        currentPropertyId,
        message: `Found ${properties.length} GA4 properties`
      })

    } catch (error) {
      logger.error('Failed to fetch GA4 properties', error, {
        userId: session.user.id
      })

      // Return fallback data if API fails
      // Map connections to fallback properties
      const fallbackProperties = connections.map(conn => ({
        propertyId: conn.propertyId || '',
        propertyName: conn.propertyName || `Property ${conn.propertyId}`,
        accountName: 'Connected Account',
        accountId: 'fallback-account',
        dealershipId: conn.dealershipId
      }))
      return NextResponse.json({
        properties: fallbackProperties,
        currentPropertyId: connections[0].propertyId,
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
