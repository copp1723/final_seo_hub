import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { sendEmail } from '@/lib/mailgun/client'
import { logger } from '@/lib/logger'

// Validation schema for creating an invitation
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
  message: z.string().optional(),
})

// GET: List all invitations for the agency
export async function GET(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const { agencyId } = await context.params
  const user = authResult.user

  // Check permissions
  if (user.role !== UserRole.SUPER_ADMIN && 
      (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId) &&
      (user.role !== UserRole.ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied. You do not have permission to view invitations for this agency.', 403)
  }

  try {
    const invitations = await prisma.invitation.findMany({
      where: { agencyId },
      include: {
        inviter: {
          select: { id: true, name: true, email: true }
        },
        acceptedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return successResponse({ invitations })
  } catch (error) {
    logger.error(`Error fetching invitations for agency ${agencyId}:`, error)
    return errorResponse('Failed to fetch invitations.', 500)
  }
}

// POST: Create a new invitation
export async function POST(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const { agencyId } = await context.params
  const user = authResult.user

  // Check permissions
  if (user.role !== UserRole.SUPER_ADMIN && 
      (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId) &&
      (user.role !== UserRole.ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied. You do not have permission to create invitations for this agency.', 403)
  }

  try {
    const body = await request.json()
    const validation = createInvitationSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(`Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`, 400)
    }

    const { email, name, role, message } = validation.data

    // Check role permissions
    if (user.role === UserRole.AGENCY_ADMIN && 
        (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN)) {
      return errorResponse('Agency admins cannot invite users with SUPER_ADMIN or ADMIN roles.', 403)
    }

    // Check if user already exists in the agency
    const existingUser = await prisma.user.findFirst({
      where: { 
        email,
        agencyId 
      }
    })

    if (existingUser) {
      return errorResponse('A user with this email already exists in this agency.', 409)
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        agencyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      }
    })

    if (existingInvitation) {
      return errorResponse('An active invitation already exists for this email.', 409)
    }

    // Get agency details
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId }
    })

    if (!agency) {
      return errorResponse('Agency not found.', 404)
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        inviterId: user.id,
        agencyId,
        email,
        name,
        role,
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // Send invitation email
    const inviteUrl = `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`
    const inviterName = user.name || user.email || 'An administrator'

    const emailSent = await sendEmail({
      to: email,
      subject: `You're invited to join ${agency.name}`,
      html: `
        <h2>You're invited to join ${agency.name}</h2>
        <p>${inviterName} has invited you to join ${agency.name} as a ${role.toLowerCase().replace('_', ' ')}.</p>
        ${message ? `<p><strong>Message from ${inviterName}:</strong><br>${message}</p>` : ''}
        <p>Click the link below to accept the invitation:</p>
        <p><a href="${inviteUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
        <p><small>This invitation will expire in 7 days.</small></p>
      `,
      text: `You're invited to join ${agency.name}\n\n${inviterName} has invited you to join ${agency.name} as a ${role.toLowerCase().replace('_', ' ')}.\n\n${message ? `Message from ${inviterName}: ${message}\n\n` : ''}Accept the invitation: ${inviteUrl}\n\nThis invitation will expire in 7 days.`
    })

    logger.info('Invitation created', {
      invitationId: invitation.id,
      agencyId,
      invitedEmail: email,
      invitedBy: user.email,
      emailSent
    })

    return successResponse({ 
      invitation,
      emailSent 
    }, 'Invitation created successfully')
  } catch (error) {
    logger.error(`Error creating invitation for agency ${agencyId}:`, error)
    return errorResponse('Failed to create invitation.', 500)
  }
}

// DELETE: Cancel/revoke an invitation
export async function DELETE(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const { agencyId } = await context.params
  const user = authResult.user

  // Check permissions
  if (user.role !== UserRole.SUPER_ADMIN && 
      (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId) &&
      (user.role !== UserRole.ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied. You do not have permission to manage invitations for this agency.', 403)
  }

  const { searchParams } = new URL(request.url)
  const invitationId = searchParams.get('invitationId')

  if (!invitationId) {
    return errorResponse('Invitation ID is required.', 400)
  }

  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        agencyId
      }
    })

    if (!invitation) {
      return errorResponse('Invitation not found.', 404)
    }

    if (invitation.acceptedAt) {
      return errorResponse('Cannot delete an accepted invitation.', 400)
    }

    await prisma.invitation.delete({
      where: { id: invitationId }
    })

    logger.info('Invitation deleted', {
      invitationId,
      agencyId,
      deletedBy: user.email
    })

    return successResponse({}, 'Invitation deleted successfully')
  } catch (error) {
    logger.error(`Error deleting invitation for agency ${agencyId}:`, error)
    return errorResponse('Failed to delete invitation.', 500)
  }
}