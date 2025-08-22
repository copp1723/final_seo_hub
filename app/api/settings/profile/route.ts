import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
      return NextResponse.json({
        success: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          agencyId: session.user.agencyId,
          dealershipId: session.user.dealershipId
        }
      })
    }



    // Get user profile from database
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        agencies: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        // The `users` relation points to a single dealership via `dealerships_users_dealershipIdTodealerships`
        dealerships_users_dealershipIdTodealerships: {
          select: {
            id: true,
            name: true,
            website: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        dealershipId: user.dealershipId,
  agency: user.agencies,
  dealership: user.dealerships_users_dealershipIdTodealerships
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)

    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email } = body

    // Prevent modifying the original seeded super admin only
    if (session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371') {
      return NextResponse.json(
        { error: 'Cannot update seeded super admin profile' },
        { status: 403 }
      )
    }

    // Update user profile
    const updatedUser = await prisma.users.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
