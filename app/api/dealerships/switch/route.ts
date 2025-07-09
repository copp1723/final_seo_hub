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

    // Verify the user has access to this dealership
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          include: {
            dealerships: true
          }
        }
      }
    })

    if (!user?.agency) {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    // Check if the dealership belongs to the user's agency
    const dealership = user.agency.dealerships.find(d => d.id === dealershipId)
    
    if (!dealership) {
      return NextResponse.json(
        { error: 'Dealership not found or access denied' },
        { status: 403 }
      )
    }

    // Update the user's active dealership
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        dealershipId: dealershipId
      }
    })

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

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's agency dealerships
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          include: {
            dealerships: {
              orderBy: { name: 'asc' }
            }
          }
        },
        dealership: true
      }
    })

    if (!user?.agency) {
      return NextResponse.json(
        { error: 'User is not associated with an agency' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      currentDealership: user.dealership ? {
        id: user.dealership.id,
        name: user.dealership.name
      } : null,
      availableDealerships: user.agency.dealerships.map(d => ({
        id: d.id,
        name: d.name
      }))
    })

  } catch (error) {
    console.error('Error fetching dealerships:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}