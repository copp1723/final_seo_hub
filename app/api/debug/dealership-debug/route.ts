import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get comprehensive user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          include: {
            dealerships: true
          }
        },
        dealership: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      debug: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        dealershipId: user.dealershipId,
        agency: user.agency ? {
          id: user.agency.id,
          name: user.agency.name,
          dealerships: user.agency.dealerships.map(d => ({
            id: d.id,
            name: d.name
          }))
        } : null,
        currentDealership: user.dealership ? {
          id: user.dealership.id,
          name: user.dealership.name
        } : null,
        sessionData: {
          agencyId: session.user.agencyId,
          dealershipId: session.user.dealershipId,
          role: session.user.role
        }
      },
      visibility: {
        hasAgencyId: !!user.agencyId,
        hasAvailableDealerships: (user.agency?.dealerships?.length || 0) > 0,
        shouldShowSelector: !!user.agencyId && (user.agency?.dealerships?.length || 0) > 0
      }
    })

  } catch (error) {
    console.error('Error in dealership debug:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}