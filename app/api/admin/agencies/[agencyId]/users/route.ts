import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export const dynamic = 'force-dynamic';

// Validation schema for creating a user
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
})

// Validation schema for updating a user
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.nativeEnum(UserRole).optional(),
})

// Force dynamic for authenticated routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agencyId } = await context.params
    const user = session.user

    if (user.role !== UserRole.SUPER_ADMIN && (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId)) {
      return NextResponse.json({ error: 'Access denied. You do not have permission to view these users.' }, { status: 403 })
    }

    const users = await prisma.users.findMany({
      where: { agencyId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        createdAt: true, 
        updatedAt: true,
        onboardingCompleted: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, users })
  } catch (error) {
    logger.error(`Error fetching users for agency`, error, { agencyId: (await context.params).agencyId })
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agencyId } = await context.params
    const user = session.user

    if (user.role !== UserRole.SUPER_ADMIN && (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId)) {
      return NextResponse.json({ error: 'Access denied. You do not have permission to create users for this agency.' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createUserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { email, name, role } = validation.data

    // Ensure AGENCY_ADMIN cannot create SUPER_ADMIN
    if (user.role === UserRole.AGENCY_ADMIN && role === UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'AGENCY_ADMIN cannot create SUPER_ADMIN users.' }, { status: 403 })
    }

    // Ensure AGENCY_ADMIN can only assign USER or AGENCY_ADMIN roles
    if (user.role === UserRole.AGENCY_ADMIN && role && role !== UserRole.USER && role !== UserRole.AGENCY_ADMIN) {
      return NextResponse.json({ error: 'AGENCY_ADMIN can only assign USER or AGENCY_ADMIN roles.' }, { status: 403 })
    }

    const existingUser = await prisma.users.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 })
    }

    // Generate invitation token for magic link authentication
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
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
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        agencyId: true, 
        createdAt: true,
        onboardingCompleted: true
      }
    })

    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${invitationToken}`

    // Send invitation email to the new user with magic link
    const invitedBy = user.name || user.email || 'Agency Administrator'
    const invitationSent = await sendInvitationEmail({
      user: newUser as any,
      invitedBy,
      loginUrl: magicLinkUrl,
      skipPreferences: true
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
    logger.error(`Error creating user for agency`, error, { agencyId: (await context.params).agencyId })
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 })
  }
}
