import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const switchDealershipSchema = z.object({
  dealershipId: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { dealershipId } = switchDealershipSchema.parse(body)

    // Handle super admin user
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {
      // For super admin, allow access to any dealership
      const dealership = await prisma.dealerships.findUnique({
        where: { id: dealershipId }
      })
      
      if (!dealership) {
        return NextResponse.json(
          { error: 'Dealership not found' },
          { status: 404 }
        )
      }

      console.log(`Super admin switched to dealership: ${dealership.name}`)

      return NextResponse.json({
        success: true,
        dealership: {
          id: dealership.id,
          name: dealership.name
        }
      })
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    // SUPER_ADMIN users don't need an agencyId, but other users do
    if (!currentUser?.agencyId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Find dealership by ID and verify access
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId }
    })

    if (!dealership) {
      return NextResponse.json(
        { error: 'Dealership not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this dealership
    if (session.user.role !== 'SUPER_ADMIN') {
      const hasAccess = await prisma.users.findFirst({
        where: {
          id: session.user.id,
          agencyId: dealership.agencyId
        }
      })

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this dealership' },
          { status: 403 }
        )
      }
    }

    console.log(`User ${currentUser?.email} switched to dealership: ${dealership.name}`)

    return NextResponse.json({
      success: true,
      dealership: {
        id: dealership.id,
        name: dealership.name
      }
    })

  } catch (error) {
    console.error('Error switching dealership:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle super admin user
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' || session.user.role === 'SUPER_ADMIN') {
      // For super admin, get all dealerships directly from dealerships table
      const dealerships = await prisma.dealerships.findMany({
        orderBy: { name: 'asc' }
      })

      const availableDealerships = dealerships.map(dealership => ({
        id: dealership.id,
        name: dealership.name
      }))

      return NextResponse.json({
        currentDealership: availableDealerships.length > 0 ? availableDealerships[0] : null,
        availableDealerships
      })
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: true
      }
    })

    // SUPER_ADMIN users don't need an agencyId, but other users do
    if (!currentUser?.agencies?.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Get all dealerships for the agency
    const dealerships = await prisma.dealerships.findMany({
      where: session.user.role === 'SUPER_ADMIN'
        ? {} // SUPER_ADMIN can see all dealerships
        : {
            agencyId: currentUser?.agencies?.id
          },
      orderBy: { name: 'asc' }
    })

    // Map dealerships to the expected format
    const availableDealerships = dealerships.map(dealership => ({
      id: dealership.id,
      name: dealership.name
    }))

    // Determine current dealership - either from user's dealershipId or first available
    let currentDealership = null
    
    if (currentUser?.dealershipId) {
      const userDealership = dealerships.find(d => d.id === currentUser.dealershipId)
      if (userDealership) {
        currentDealership = {
          id: userDealership.id,
          name: userDealership.name
        }
      }
    }
    
    // Fallback to first available dealership if no current one is set
    if (!currentDealership && availableDealerships.length > 0) {
      currentDealership = availableDealerships[0]
    }
    
    // Add debug logging
    console.log(`Found ${availableDealerships.length} dealerships for user ${currentUser?.email}`)

    return NextResponse.json({
      currentDealership,
      availableDealerships
    })

  } catch (error) {
    console.error('Error fetching dealerships:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
