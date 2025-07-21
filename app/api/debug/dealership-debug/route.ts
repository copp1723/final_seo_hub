import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get comprehensive user data
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: {
          include: {
            dealerships: true
          }
        },
        dealerships: true
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
        agency: user.agencies ? {
          id: user.agencies?.id,
          name: user.agencies?.name,
          dealerships: user.agencies.dealerships.map((d: any) => ({
            id: d.id,
            name: d.name
          }))
        } : null,
        currentDealership: user.dealerships ? {
          id: user.dealerships?.id,
          name: user.dealerships?.name
        } : null,
        sessionData: {
          agencyId: session.user.agencyId,
          dealershipId: session.user.dealershipId,
          role: session.user.role
        }
      },
      visibility: {
        hasAgencyId: !!user.agencyId,
        hasAvailableDealerships: (user.agencies?.dealerships?.length || 0) > 0,
        shouldShowSelector: !!user.agencyId && (user.agencies?.dealerships?.length || 0) > 0
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
