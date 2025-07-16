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

    // For SUPER_ADMIN, allow access to any dealership. For others, check agency
    const dealershipUser = await prisma.users.findUnique({
      where: session.user.role === 'SUPER_ADMIN'
        ? { id: dealershipId }
        : {
            id: dealershipId,
            agencyId: currentUser?.agencyId
          }
    })
    
    if (!dealershipUser || !dealershipUser.id.startsWith('user-dealer-')) {
      return NextResponse.json(
        { error: 'Dealership not found or access denied' },
        { status: 403 }
      )
    }

    // Extract dealership name
    const match = dealershipUser.name?.match(/\((.+)\)$/)
    const dealershipName = match ? match[1] : dealershipUser.name || 'Unknown Dealership'

    console.log(`User ${currentUser?.email} switched to dealership: ${dealershipName}`)

    return NextResponse.json({
      success: true,
      dealership: {
        id: dealershipUser.id,
        name: dealershipName
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

    // Get all users in the same agency (these represent dealerships)
    const dealershipUsers = await prisma.users.findMany({
      where: session.user.role === 'SUPER_ADMIN'
        ? { id: { startsWith: 'user-dealer-' } } // SUPER_ADMIN can see all dealerships
        : {
            agencyId: currentUser?.agencies?.id,
            id: { startsWith: 'user-dealer-' } // Only get dealership users
          },
      orderBy: { name: 'asc' }
    })

    // Extract dealership name from user name (format: "Manager Name (Dealership Name)")
    const availableDealerships = dealershipUsers.map(user => {
      const match = user.name?.match(/\((.+)\)$/)
      const dealershipName = match ? match[1] : user.name || 'Unknown Dealership'
      
      return {
        id: user.id,
        name: dealershipName
      }
    })

    // Determine current dealership
    const currentDealership = currentUser?.id.startsWith('user-dealer-') ? {
      id: currentUser.id,
      name: (() => {
        const match = currentUser.name?.match(/\((.+)\)$/)
        return match ? match[1] : currentUser.name || 'Unknown Dealership'
      })()
    } : (availableDealerships.length > 0 ? availableDealerships[0] : null)

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
