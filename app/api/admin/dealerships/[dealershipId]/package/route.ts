import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePackageSchema = z.object({
  packageType: z.enum(['SILVER', 'GOLD', 'PLATINUM'])
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { dealershipId: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user permissions - must be SUPER_ADMIN or AGENCY_ADMIN
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'AGENCY_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied - Admin required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { packageType } = updatePackageSchema.parse(body)
    const { dealershipId } = params

    // Get the dealership and verify access
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      include: {
        agencies: true
      }
    })

    if (!dealership) {
      return NextResponse.json(
        { error: 'Dealership not found' },
        { status: 404 }
      )
    }

    // For AGENCY_ADMIN, verify they own this dealership
    if (session.user.role === 'AGENCY_ADMIN') {
      if (dealership.agencyId !== session.user.agencyId) {
        return NextResponse.json(
          { error: 'Access denied to this dealership' },
          { status: 403 }
        )
      }
    }

    // Update the package type
    const updatedDealership = await prisma.dealerships.update({
      where: { id: dealershipId },
      data: { activePackageType: packageType },
      include: {
        agencies: true
      }
    })

    return NextResponse.json({
      success: true,
      dealership: {
        id: updatedDealership.id,
        name: updatedDealership.name,
        activePackageType: updatedDealership.activePackageType,
        agencyName: updatedDealership.agencies?.name
      }
    })

  } catch (error) {
    console.error('Error updating dealership package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { dealershipId: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dealershipId } = params

    // Get the dealership
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      include: {
        agencies: true
      }
    })

    if (!dealership) {
      return NextResponse.json(
        { error: 'Dealership not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      dealership: {
        id: dealership.id,
        name: dealership.name,
        activePackageType: dealership.activePackageType,
        agencyName: dealership.agencies?.name
      }
    })

  } catch (error) {
    console.error('Error fetching dealership package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}