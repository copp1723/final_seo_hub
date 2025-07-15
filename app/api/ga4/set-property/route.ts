import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId, propertyName, dealershipId } = await request.json()

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Validate property ID format (should be numeric)
    if (!/^\d+$/.test(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID format' }, { status: 400 })
    }

    // Get user's info
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, role: true, agencyId: true }
    })

    // Determine target dealership
    let targetDealershipId = dealershipId || user?.dealerships.id
    
    // If agency admin is setting property for a specific dealership
    if (dealershipId && user?.role === 'AGENCY_ADMIN' && user?.agencies?.id) {
      // Verify the dealership belongs to the agency
      const dealership = await prisma.dealerships.findFirst({
        where: {
          id: dealershipId,
          agencyId: user.agencies?.id
        }
      })
      
      if (!dealership) {
        return NextResponse.json(
          { error: 'Dealership not found or does not belong to your agency' },
          { status: 403 }
        )
      }
      targetDealershipId = dealershipId
    }

    if (!targetDealershipId) {
      return NextResponse.json(
        { error: 'No dealership context available' },
        { status: 400 }
      )
    }

    // Update the GA4 connection with the specified property
    const connection = await prisma.ga4_connections.findUnique({
      where: { userId: targetDealershipId }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'No GA4 connection found.Please connect Google Analytics first.' },
        { status: 404 }
      )
    }

    await prisma.ga4_connections.update({
      where: { userId: targetDealershipId },
      data: {
        propertyId,
        propertyName: propertyName || `Property ${propertyId}`,
        updatedAt: new Date()
      }
    })

    logger.info('GA4 property manually updated', {
      userId: session.user.id,
      dealershipId: targetDealershipId,
      propertyId,
      propertyName,
      isAgencyAdmin: user?.role === 'AGENCY_ADMIN'
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
