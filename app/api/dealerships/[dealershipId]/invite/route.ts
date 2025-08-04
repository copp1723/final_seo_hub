import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { z } from 'zod'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Validation schema for dealership user invitation
const inviteDealershipUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
})

// Invite a user to a specific dealership
export async function POST(
  request: NextRequest,
  { params }: { params: { dealershipId: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN and AGENCY_ADMIN can invite dealership users
    if (!['SUPER_ADMIN', 'AGENCY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 })
    }

    const { dealershipId } = params
    const body = await request.json()
    const validation = inviteDealershipUserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { email, name } = validation.data

    // Verify dealership exists and user has access to it
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      include: { agencies: true }
    })

    if (!dealership) {
      return NextResponse.json({ 
        error: 'Dealership not found' 
      }, { status: 404 })
    }

    // Check if user has access to this dealership's agency
    if (session.user.role === 'AGENCY_ADMIN' && session.user.agencyId !== dealership.agencyId) {
      return NextResponse.json({ 
        error: 'Access denied. You can only invite users to dealerships in your agency.' 
      }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({
        error: 'User with this email already exists'
      }, { status: 409 })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create the dealership user
    const newUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        role: 'USER', // Dealership users have USER role
        agencyId: dealership.agencyId,
        dealershipId: dealership.id,
        invitationToken,
        invitationTokenExpires,
        onboardingCompleted: false, // Dealership users need to complete onboarding
        updatedAt: new Date()
      },
      include: {
        dealerships: {
          select: { name: true }
        },
        agencies: {
          select: { name: true }
        }
      }
    })

    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${invitationToken}`

    // Send invitation email
    const invitedBy = session.user.name || session.user.email || 'Administrator'
    const invitationSent = await sendInvitationEmail({
      user: newUser as any,
      invitedBy,
      loginUrl: magicLinkUrl,
      skipPreferences: true
    })

    if (invitationSent) {
      logger.info('Dealership user invited successfully', {
        userId: newUser.id,
        email: newUser.email,
        dealershipId: dealership.id,
        dealershipName: dealership.name,
        agencyId: dealership.agencyId,
        invitedBy
      })
    } else {
      logger.warn('Dealership user created but invitation email failed to send', {
        userId: newUser.id,
        email: newUser.email,
        dealershipId: dealership.id,
        dealershipName: dealership.name,
        invitedBy
      })
    }

    return NextResponse.json({
      message: `Dealership user ${invitationSent ? 'invited successfully' : 'created but email failed to send'}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        dealership: newUser.dealerships?.name,
        agency: newUser.agencies?.name
      },
      invitationSent
    }, { status: 201 })

  } catch (error) {
    logger.error('Error inviting dealership user', error, {
      dealershipId: params.dealershipId
    })
    return NextResponse.json({ 
      error: 'Failed to invite dealership user' 
    }, { status: 500 })
  }
}
