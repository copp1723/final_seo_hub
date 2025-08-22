import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic';

const selectAgencySchema = z.object({
  agencyId: z.string().min(1)
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

    // Only SUPER_ADMIN users can select agencies
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied - SUPER_ADMIN required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { agencyId } = selectAgencySchema.parse(body)

    // Verify the agency exists
    const agency = await prisma.agencies.findUnique({
      where: { id: agencyId }
    })

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      )
    }

    // Store the selected agency in the user's session by updating their agencyId temporarily
    // This is just for the session, not permanent assignment
    await prisma.users.update({
      where: { id: session.user.id },
      data: { 
        agencyId: agencyId,
        dealershipId: null // Clear dealership when switching agencies
      }
    })

    return NextResponse.json({
      success: true,
      agency: {
        id: agency.id,
        name: agency.name
      }
    })

  } catch (error) {
    console.error('Error selecting agency:', error)
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

    // Only SUPER_ADMIN users can list agencies
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied - SUPER_ADMIN required' },
        { status: 403 }
      )
    }

    // Get all agencies
    const agencies = await prisma.agencies.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            dealerships: true
          }
        }
      }
    })

    // Get current user's selected agency
    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: true
      }
    })

    const currentAgency = currentUser?.agencies ? {
      id: currentUser.agencies.id,
      name: currentUser.agencies.name
    } : null

    return NextResponse.json({
      agencies: agencies.map(agency => ({
        id: agency.id,
        name: agency.name,
        dealershipCount: agency._count.dealerships
      })),
      currentAgency
    })

  } catch (error) {
    console.error('Error fetching agencies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}