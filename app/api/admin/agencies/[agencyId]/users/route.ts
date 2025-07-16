import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { sendInvitationEmail, createDefaultUserPreferences } from '@/lib/mailgun/invitation'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// Validation schema for creating a user
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER), // Default to USER, AGENCY_ADMIN can change this
})

// Validation schema for updating a user
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.nativeEnum(UserRole).optional(),
  // email cannot be changed for now to keep things simple
})

export async function GET(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response || errorResponse('Unauthorized', 401)

  const { agencyId } = await context.params
  const user = authResult.user

  if (user.role !== UserRole.SUPER_ADMIN && (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied.You do not have permission to view these users.', 403)
  }

  try {
    const users = await prisma.users.findMany({
      where: { agencyId },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' }
    })
    return successResponse({ users })
  } catch (error) {
    console.error(`Error fetching users for agency ${agencyId}:`, error)
    return errorResponse('Failed to fetch users.', 500)
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response || errorResponse('Unauthorized', 401)

  const { agencyId } = await context.params
  const user = authResult.user

  if (user.role !== UserRole.SUPER_ADMIN && (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied.You do not have permission to create users for this agency.', 403)
  }

  try {
    const body = await request.json()
    const validation = createUserSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(`Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`, 400)
    }

    const { email, name, role } = validation.data

    // Ensure AGENCY_ADMIN cannot create SUPER_ADMIN
    if (user.role === UserRole.AGENCY_ADMIN && role === UserRole.SUPER_ADMIN) {
        return errorResponse('AGENCY_ADMIN cannot create SUPER_ADMIN users.', 403)
    }
    // Ensure AGENCY_ADMIN can only assign USER or AGENCY_ADMIN roles
    if (user.role === UserRole.AGENCY_ADMIN && role && role !== UserRole.USER && role !== UserRole.AGENCY_ADMIN) {
      return errorResponse('AGENCY_ADMIN can only assign USER or AGENCY_ADMIN roles.', 403);
    }


    const existingUser = await prisma.users.findUnique({ where: { email } })
    if (existingUser) {
      return errorResponse('User with this email already exists.', 409)
    }

    // For now, users are created without passwords and would typically sign in via OAuth.
    // If direct password sign-in is needed, password hashing and storage would be added here.
    
    // Generate invitation token for magic link authentication
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    const newUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        role: role || UserRole.USER,
        agencyId,
        invitationToken,
        invitationTokenExpires,
        updatedAt: new Date(),
      },
      select: { id: true, email: true, name: true, role: true, agencyId: true, createdAt: true }
    })

    // Create default user preferences for the new user
    await createDefaultUserPreferences(newUser.id)

    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/auth/accept-invitation?token=${invitationToken}`

    // Send invitation email to the new user with magic link
    const invitedBy = user.name || user.email || 'Agency Administrator'
    const invitationSent = await sendInvitationEmail({
      user: newUser as any, // Cast to include all User fields
      invitedBy,
      loginUrl: magicLinkUrl, // Pass the magic link URL
      skipPreferences: true // New user doesn't have preferences loaded yet
    })

    if (invitationSent) {
      logger.info('User created and invitation email sent successfully', {
        userId: newUser.id,
        email: newUser.email,
        agencyId,
        invitedBy
      })
    } else {
      logger.warn('User created but invitation email failed to send', {
        userId: newUser.id,
        email: newUser.email,
        agencyId,
        invitedBy
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: newUser,
        invitationSent
      },
      message: `User created successfully${invitationSent ? ' and invitation email sent' : ' but invitation email failed'}`
    }, { status: 201 })
  } catch (error) {
    console.error(`Error creating user for agency ${agencyId}:`, error)
    return errorResponse('Failed to create user.', 500)
  }
}

// Note: A separate PUT endpoint for /api/admin/agencies/[agencyId]/users/[userId] would be more RESTful for updates.
// However, the request asks for a PUT on /api/admin/agencies/[agencyId]/users/route.ts
// This implies updating a user based on userId in the request body or a query param.
// For simplicity and adhering to the plan step, we'll assume userId is part of the body for PUT.
export async function PUT(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response || errorResponse('Unauthorized', 401)

  const { agencyId } = await context.params // Agency ID from URL
  const userMakingRequest = authResult.user

  if (userMakingRequest.role !== UserRole.SUPER_ADMIN && (userMakingRequest.role !== UserRole.AGENCY_ADMIN || userMakingRequest.agencyId !== agencyId)) {
    return errorResponse('Access denied.You do not have permission to update users for this agency.', 403)
  }

  try {
    const body = await request.json()
    // The user ID to update should be in the body
    const { userId,...updateData } = body

    if (!userId) {
        return errorResponse('User ID is required in the request body for updates.', 400)
    }

    const validation = updateUserSchema.safeParse(updateData)
    if (!validation.success) {
      return errorResponse(`Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`, 400)
    }

    const { name, role } = validation.data

    const userToUpdate = await prisma.users.findUnique({ where: { id: userId } })
    if (!userToUpdate || userToUpdate.agencyId !== agencyId) {
      return errorResponse('User not found in this agency.', 404)
    }

    // Security checks for role changes
    if (role) {
      if (userMakingRequest.role === UserRole.AGENCY_ADMIN) {
        // AGENCY_ADMIN can only assign USER or AGENCY_ADMIN roles
        if (role !== UserRole.USER && role !== UserRole.AGENCY_ADMIN) {
          return errorResponse('AGENCY_ADMIN can only assign USER or AGENCY_ADMIN roles.', 403);
        }
        // AGENCY_ADMIN cannot change a SUPER_ADMIN's role
        if (userToUpdate.role === UserRole.SUPER_ADMIN) {
          return errorResponse('AGENCY_ADMIN cannot change the role of a SUPER_ADMIN.', 403)
        }
      }
      // SUPER_ADMIN can change any role, but cannot demote another SUPER_ADMIN (unless it's themselves)
      if (userMakingRequest.role === UserRole.SUPER_ADMIN && userToUpdate.role === UserRole.SUPER_ADMIN && userToUpdate.id !== userMakingRequest.id && role !== UserRole.SUPER_ADMIN) {
          return errorResponse('SUPER_ADMIN can only change their own role or other non-SUPER_ADMIN roles.', 403)
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        name: name ?? undefined, // Only update if provided
        role: role ?? undefined, // Only update if provided
      },
      select: { id: true, email: true, name: true, role: true, agencyId: true, updatedAt: true }
    })

    return successResponse({ user: updatedUser }, 'User updated successfully')
  } catch (error) {
    console.error(`Error updating user in agency ${agencyId}:`, error)
    return errorResponse('Failed to update user.', 500)
  }
}


export async function DELETE(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response || errorResponse('Unauthorized', 401)

  const { agencyId } = await context.params
  const userMakingRequest = authResult.user

  if (userMakingRequest.role !== UserRole.SUPER_ADMIN && (userMakingRequest.role !== UserRole.AGENCY_ADMIN || userMakingRequest.agencyId !== agencyId)) {
    return errorResponse('Access denied.You do not have permission to delete users from this agency.', 403)
  }

  // User ID to delete should be passed as a query parameter or in the body.
  // For DELETE, query param is more common.e.g., /users?userId=xxx
  const { searchParams } = new URL(request.url)
  const userIdToDelete = searchParams.get('userId')

  if (!userIdToDelete) {
    return errorResponse('User ID is required as a query parameter (userId).', 400)
  }

  try {
    const userToDelete = await prisma.users.findUnique({ where: { id: userIdToDelete } })

    if (!userToDelete || userToDelete.agencyId !== agencyId) {
      return errorResponse('User not found in this agency.', 404)
    }

    // Security checks
    if (userToDelete.id === userMakingRequest.id) {
        return errorResponse('You cannot delete yourself.', 403)
    }
    if (userMakingRequest.role === UserRole.AGENCY_ADMIN) {
        if (userToDelete.role === UserRole.SUPER_ADMIN) {
            return errorResponse('AGENCY_ADMIN cannot delete SUPER_ADMIN users.', 403)
        }
    }
    if (userToDelete.role === UserRole.SUPER_ADMIN) {
        return errorResponse('SUPER_ADMIN users cannot be deleted through this endpoint.', 403)
    }

    await prisma.users.delete({
      where: { id: userIdToDelete }
    })

    return successResponse({}, 'User deleted successfully')
  } catch (error) {
    console.error(`Error deleting user from agency ${agencyId}:`, error)
    return errorResponse('Failed to delete user.', 500)
  }
}
