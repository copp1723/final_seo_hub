import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user.id) {
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
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, role: true }
    })

    const targetAgencyId = user?.agencyId
    
    // Super admins can create for any agency, but for now use their agency
    if (!targetAgencyId) {
      return NextResponse.json({ error: 'No agency assigned' }, { status: 400 })
    }

    // Create the dealership
    const created = await prisma.dealerships.create({
      data: {
        id: crypto.randomUUID(),
        name: dealership.name,
        website: dealership.website,
        agencyId: targetAgencyId,
        updatedAt: new Date()
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
      await prisma.ga4_connections.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          dealershipId: created.id,
          accessToken: '', // Placeholder - will be set when user connects
          propertyId: dealership.ga4PropertyId,
          propertyName: dealership.name + " - GA4",
          updatedAt: new Date()
        }
      })
    }

    // Create Search Console connection if URL provided
    if (dealership.searchConsoleUrl) {
      await prisma.search_console_connections.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          dealershipId: created.id,
          accessToken: '', // Placeholder - will be set when user connects
          siteUrl: dealership.searchConsoleUrl,
          siteName: dealership.name + " - Search Console",
          updatedAt: new Date()
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
      userId: session?.user.id
    })
    
    return NextResponse.json(
      { error: 'Failed to create dealership' },
      { status: 500 }
    )
  }
}
