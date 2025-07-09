import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId, propertyName } = await request.json()

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Validate property ID format (should be numeric)
    if (!/^\d+$/.test(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID format' }, { status: 400 })
    }

    // Get user's dealership ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Update the GA4 connection with the specified property
    const connection = await prisma.gA4Connection.findUnique({
      where: { dealershipId: user.dealershipId }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'No GA4 connection found. Please connect Google Analytics first.' },
        { status: 404 }
      )
    }

    await prisma.gA4Connection.update({
      where: { dealershipId: user.dealershipId },
      data: {
        propertyId,
        propertyName: propertyName || `Property ${propertyId}`,
        updatedAt: new Date()
      }
    })

    logger.info('GA4 property manually updated', {
      userId: session.user.id,
      dealershipId: user.dealershipId,
      propertyId,
      propertyName
    })

    return NextResponse.json({
      success: true,
      propertyId,
      propertyName,
      message: 'Property updated successfully'
    })

  } catch (error) {
    logger.error('GA4 set property error', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}