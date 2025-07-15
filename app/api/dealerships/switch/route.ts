import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const switchDealershipSchema = z.object({
  dealershipId: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { dealershipId } = switchDealershipSchema.parse(body)

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser?.agencies?.id) {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Verify the dealership user exists in the same agency
    const dealershipUser = await prisma.users.findUnique({
      where: { 
        id: dealershipId,
        agencyId: currentUser.agencies?.id
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

    console.log(`User ${currentUser.email} switched to dealership: ${dealershipName}`)

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

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: true
      }
    })

    if (!currentUser?.agencies?.id) {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Get all users in the same agency (these represent dealerships)
    const dealershipUsers = await prisma.users.findMany({
      where: {
        agencyId: currentUser.agencies?.id,
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
    const currentDealership = currentUser.id.startsWith('user-dealer-') ? {
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
