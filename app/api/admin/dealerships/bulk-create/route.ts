import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is agency admin or super admin
    if (session.user.role !== 'AGENCY_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { dealership } = await request.json()
    
    if (!dealership?.name) {
      return NextResponse.json({ error: 'Dealership name is required' }, { status: 400 })
    }

    // Get user's agency ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true }
    })

    let targetAgencyId = user?.agencyId
    
    // Super admins can create for any agency, but for now use their agency
    if (!targetAgencyId) {
      return NextResponse.json({ error: 'No agency assigned' }, { status: 400 })
    }

    // Create the dealership
    const created = await prisma.dealership.create({
      data: {
        name: dealership.name,
        website: dealership.website,
        agencyId: targetAgencyId
      }
    })

    logger.info('Dealership created via bulk creation', {
      dealershipId: created.id,
      dealershipName: created.name,
      agencyId: targetAgencyId,
      createdBy: session.user.id
    })

    // Create GA4 connection if property ID provided
    if (dealership.ga4PropertyId) {
      await prisma.gA4Connection.create({
        data: {
          dealershipId: created.id,
          propertyId: dealership.ga4PropertyId,
          propertyName: dealership.name + " - GA4"
          // accessToken, refreshToken, and expiresAt will be set when user connects
        }
      })
    }

    // Create Search Console connection if URL provided
    if (dealership.searchConsoleUrl) {
      await prisma.searchConsoleConnection.create({
        data: {
          dealershipId: created.id,
          siteUrl: dealership.searchConsoleUrl,
          siteName: dealership.name + " - Search Console"
          // accessToken, refreshToken, and expiresAt will be set when user connects
        }
      })
    }

    return NextResponse.json({
      id: created.id,
      name: created.name,
      ga4Connected: !!dealership.ga4PropertyId,
      searchConsoleConnected: !!dealership.searchConsoleUrl
    })

  } catch (error) {
    logger.error('Bulk dealership creation error', error, {
      userId: session?.user?.id
    })
    
    return NextResponse.json(
      { error: 'Failed to create dealership' },
      { status: 500 }
    )
  }
}