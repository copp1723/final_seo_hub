import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: true,
        dealership: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If this is the SEOWERKS agency admin, let's check their setup
    if (user.email === 'access@seowerks.ai') {
      // Find the SEOWERKS agency
      const seowerksAgency = await prisma.agency.findFirst({
        where: {
          OR: [
            { name: { contains: 'SEOWERKS', mode: 'insensitive' } },
            { name: { contains: 'SEO Werks', mode: 'insensitive' } }
          ]
        },
        include: {
          dealerships: true,
          users: true
        }
      })

      if (seowerksAgency && !user.agencyId) {
        // Fix: Assign the user to the SEOWERKS agency
        await prisma.user.update({
          where: { id: user.id },
          data: { agencyId: seowerksAgency.id }
        })

        logger.info('Fixed agency admin assignment', {
          userId: user.id,
          email: user.email,
          agencyId: seowerksAgency.id,
          agencyName: seowerksAgency.name
        })

        return NextResponse.json({
          status: 'fixed',
          message: 'Agency admin has been properly assigned to SEOWERKS agency',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            agencyId: seowerksAgency.id,
            dealershipId: user.dealershipId
          },
          agency: {
            id: seowerksAgency.id,
            name: seowerksAgency.name,
            dealershipsCount: seowerksAgency.dealerships.length,
            usersCount: seowerksAgency.users.length
          }
        })
      }

      return NextResponse.json({
        status: 'checked',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          agencyId: user.agencyId,
          dealershipId: user.dealershipId,
          hasAgency: !!user.agency,
          agencyName: user.agency?.name
        },
        agency: seowerksAgency ? {
          id: seowerksAgency.id,
          name: seowerksAgency.name,
          dealershipsCount: seowerksAgency.dealerships.length,
          usersCount: seowerksAgency.users.length
        } : null,
        needsFix: !user.agencyId && !!seowerksAgency
      })
    }

    // For other users, just return their current state
    return NextResponse.json({
      status: 'checked',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        dealershipId: user.dealershipId,
        hasAgency: !!user.agency,
        agencyName: user.agency?.name,
        hasDealership: !!user.dealership,
        dealershipName: user.dealership?.name
      }
    })

  } catch (error) {
    logger.error('Agency profile debug error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 