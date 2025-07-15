import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 401 }
      )
    }

    // Get the current user
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: { agencies: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let agency = user.agency

    // Create an agency if the user doesn't have one
    if (!agency) {
      agency = await prisma.agencies.create({
        data: {
        id: crypto.randomUUID(),
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        updatedAt: new Date(),
          name: 'Jay Hatfield Automotive Group',
          domain: 'jayhatfield.com'
        }
      })

      // Associate the user with the agency
      await prisma.users.update({
        where: { id: user.id },
        data: { agencyId: agency.id }
      })
    }

    // Check if dealerships already exist
    const existingDealerships = await prisma.dealerships.findMany({
      where: { agencyId: agency.id }
    })

    if (existingDealerships.length > 0) {
      return NextResponse.json({
        message: 'Test dealerships already exist',
        agency: { id: agency.id, name: agency.name },
        dealerships: existingDealerships.map(d => ({ id: d.id, name: d.name }))
      })
    }

    // Create test dealerships
    const dealership1 = await prisma.dealerships.create({
      data: {
        name: 'Jay Hatfield Chevrolet',
        address: '123 Auto Row, Wichita, KS',
        phone: '(316) 555-0100',
        website: 'https://jayhatfieldchevrolet.com',
        agencyId: agency.id,
        activePackageType: 'GOLD'
      }
    })

    const dealership2 = await prisma.dealerships.create({
      data: {
        name: 'Jay Hatfield Motorsports of Wichita',
        address: '456 Speed Way, Wichita, KS',
        phone: '(316) 555-0200',
        website: 'https://jayhatfieldmotorsports.com',
        agencyId: agency.id,
        activePackageType: 'PLATINUM'
      }
    })

    // Set the user's active dealership to the first one
    await prisma.users.update({
      where: { id: user.id },
      data: { dealershipId: dealership1.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Test dealerships created successfully',
      agency: { id: agency.id, name: agency.name },
      dealerships: [
        { id: dealership1.id, name: dealership1.name },
        { id: dealership2.id, name: dealership2.name }
      ],
      activeDealership: { id: dealership1.id, name: dealership1.name }
    })

  } catch (error) {
    console.error('Error setting up test dealerships:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
