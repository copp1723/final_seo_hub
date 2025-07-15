import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const switchDealershipSchema = z.object({
  dealershipId: z.string().cuid()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { dealershipId } = switchDealershipSchema.parse(body)

    // Get user's agency to validate the mock dealership
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: true
      }
    })

    if (!user?.agency) {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Generate the same mock dealerships to validate the selection
    const mockDealerships = [
      {
        id: `${user.agency.id}-main`,
        name: `${user.agency.name} Main Location`
      },
      {
        id: `${user.agency.id}-north`,
        name: `${user.agency.name} North`
      },
      {
        id: `${user.agency.id}-south`, 
        name: `${user.agency.name} South`
      },
      {
        id: `${user.agency.id}-east`,
        name: `${user.agency.name} East`
      },
      {
        id: `${user.agency.id}-west`,
        name: `${user.agency.name} West`
      }
    ]

    // Check if the dealership is valid
    const selectedDealership = mockDealerships.find(d => d.id === dealershipId)
    
    if (!selectedDealership) {
      return NextResponse.json(
        { error: 'Dealership not found or access denied' },
        { status: 403 }
      )
    }

    // For now, we'll just return success without updating the database
    // In the future, this would update the user's dealershipId when the table exists
    console.log(`User ${user.email} switched to dealership: ${selectedDealership.name}`)

    return NextResponse.json({
      success: true,
      dealership: selectedDealership
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
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's agency info since dealerships table doesn't exist yet
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: true
      }
    })

    if (!user?.agency) {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // For now, simulate dealerships using the agency
    // This is a temporary fix until proper dealerships table is created
    const mockDealerships = [
      {
        id: `${user.agency.id}-main`,
        name: `${user.agency.name} Main Location`
      },
      {
        id: `${user.agency.id}-north`,
        name: `${user.agency.name} North`
      },
      {
        id: `${user.agency.id}-south`, 
        name: `${user.agency.name} South`
      },
      {
        id: `${user.agency.id}-east`,
        name: `${user.agency.name} East`
      },
      {
        id: `${user.agency.id}-west`,
        name: `${user.agency.name} West`
      }
    ]

    // Set first dealership as current if none selected
    const currentDealership = mockDealerships[0]

    return NextResponse.json({
      currentDealership,
      availableDealerships: mockDealerships
    })

  } catch (error) {
    console.error('Error fetching dealerships:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}