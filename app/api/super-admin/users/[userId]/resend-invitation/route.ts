import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { logger } from '@/lib/logger'
import { generateSecureToken } from '@/lib/crypto-utils'

export const dynamic = 'force-dynamic'

// Resend invitation to a user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Access denied. Super Admin privileges required.' 
      }, { status: 403 })
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        onboardingCompleted: true,
        // password field is not selectable due to security restrictions
        invitationToken: true,
        agencies: {
          select: { name: true }
        },
        dealerships_users_dealershipIdTodealerships: {
          select: { name: true }
        },
        dealerships_users_currentDealershipIdTodealerships: {
          select: { name: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has completed onboarding
    if (user.onboardingCompleted) {
      return NextResponse.json({ 
        error: 'User has already completed registration. Cannot resend invitation.' 
      }, { status: 400 })
    }

    // Generate new invitation token
    const invitationToken = generateSecureToken()
    const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Update user with new token
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        invitationToken,
        invitationTokenExpires,
        updatedAt: new Date()
      },
      include: {
        agencies: {
          select: { name: true }
        },
        dealerships_users_dealershipIdTodealerships: {
          select: { name: true }
        },
        dealerships_users_currentDealershipIdTodealerships: {
          select: { name: true }
        }
      }
    })

    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${invitationToken}`

    // Send invitation email
    const invitedBy = session.user.name || session.user.email || 'Super Administrator'
    const invitationSent = await sendInvitationEmail({
      user: updatedUser as any,
      invitedBy,
      loginUrl: magicLinkUrl,
      skipPreferences: true
    })

    if (invitationSent) {
      logger.info('Invitation resent successfully', {
        userId: user.id,
        email: user.email,
        resentBy: session.user.email
      })
    } else {
      logger.warn('Invitation token regenerated but email failed to send', {
        userId: user.id,
        email: user.email,
        resentBy: session.user.email
      })
    }

    return NextResponse.json({
      message: `Invitation ${invitationSent ? 'resent successfully' : 'token regenerated but email failed to send'}`,
      invitationSent
    })

  } catch (error) {
    logger.error('Error resending invitation', error, {
      userId: params.userId
    })
    return NextResponse.json({ 
      error: 'Failed to resend invitation' 
    }, { status: 500 })
  }
}
