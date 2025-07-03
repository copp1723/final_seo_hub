import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { auth } from '@/lib/auth'

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = acceptInvitationSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(`Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`, 400)
    }

    const { token } = validation.data

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        agency: true,
        inviter: {
          select: { name: true, email: true }
        }
      }
    })

    if (!invitation) {
      return errorResponse('Invalid invitation token.', 404)
    }

    if (invitation.acceptedAt) {
      return errorResponse('This invitation has already been accepted.', 400)
    }

    if (invitation.expiresAt < new Date()) {
      return errorResponse('This invitation has expired.', 400)
    }

    // Get current session
    const session = await auth()

    if (!session?.user?.email) {
      return errorResponse('You must be signed in to accept an invitation.', 401)
    }

    // Check if the email matches
    if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return errorResponse('This invitation is for a different email address. Please sign in with the correct account.', 403)
    }

    // Check if user already belongs to this agency
    const existingUser = await prisma.user.findFirst({
      where: {
        email: session.user.email,
        agencyId: invitation.agencyId
      }
    })

    if (existingUser) {
      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
          acceptedById: existingUser.id
        }
      })

      return successResponse({
        alreadyMember: true,
        agency: invitation.agency
      }, 'You are already a member of this agency.')
    }

    // Update the user with the agency and role
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        agencyId: invitation.agencyId,
        role: invitation.role,
        name: invitation.name || session.user.name // Use invitation name if provided
      }
    })

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        acceptedById: updatedUser.id
      }
    })

    logger.info('Invitation accepted', {
      invitationId: invitation.id,
      userId: updatedUser.id,
      agencyId: invitation.agencyId,
      email: session.user.email
    })

    return successResponse({
      user: updatedUser,
      agency: invitation.agency
    }, 'Invitation accepted successfully. Welcome to ' + invitation.agency.name + '!')
  } catch (error) {
    logger.error('Error accepting invitation:', error)
    return errorResponse('Failed to accept invitation.', 500)
  }
}

// GET: Get invitation details
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return errorResponse('Invitation token is required.', 400)
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        agency: true,
        inviter: {
          select: { name: true, email: true }
        }
      }
    })

    if (!invitation) {
      return errorResponse('Invalid invitation token.', 404)
    }

    if (invitation.acceptedAt) {
      return successResponse({
        invitation: {
          ...invitation,
          status: 'accepted'
        }
      })
    }

    if (invitation.expiresAt < new Date()) {
      return successResponse({
        invitation: {
          ...invitation,
          status: 'expired'
        }
      })
    }

    return successResponse({
      invitation: {
        ...invitation,
        status: 'pending'
      }
    })
  } catch (error) {
    logger.error('Error fetching invitation:', error)
    return errorResponse('Failed to fetch invitation details.', 500)
  }
}