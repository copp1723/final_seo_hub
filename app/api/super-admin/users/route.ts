import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { logger } from '@/lib/logger'
import { safeDbOperation } from '@/lib/db-resilience'
import { withErrorBoundary } from '@/lib/error-boundaries'
import crypto from 'crypto'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().optional(),
  dealershipId: z.string().optional()
})

const updateUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().optional(),
  dealershipId: z.string().optional()
})

// Get all users with pagination and filtering (SUPER_ADMIN only)
export const GET = withErrorBoundary(async (request: NextRequest) => {
  const session = await SimpleAuth.getSessionFromRequest(request)
  
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || 'all'
  const agency = searchParams.get('agency') || 'all'
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // Build where clause
  const where: any = {}
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  if (role !== 'all') {
    where.role = role
  }
  
  if (agency !== 'all') {
    if (agency === 'none') {
      where.agencyId = null
    } else {
      where.agencyId = agency
    }
  }

  // Build orderBy clause
  const orderBy: any = {}
  if (sortBy === 'name' || sortBy === 'email' || sortBy === 'role') {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = sortOrder
  }

  const [users, total] = await safeDbOperation(async () => {
    return Promise.all([
      prisma.users.findMany({
        where,
        include: {
          _count: {
            select: { requests: true }
          },
          agencies: {
            select: { name: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.users.count({ where })
    ])
  })

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  })
})

// Create new user (SUPER_ADMIN only)
export const POST = withErrorBoundary(async (request: NextRequest) => {
  const session = await SimpleAuth.getSessionFromRequest(request)

  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  const body = await request.json()
  const validation = createUserSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues
    }, { status: 400 })
  }

  const { name, email, role, agencyId, dealershipId } = validation.data

  // SUPER_ADMIN users should not be associated with agencies or dealerships
  if (role === 'SUPER_ADMIN' && (agencyId || dealershipId)) {
    return NextResponse.json({ 
      error: 'SUPER_ADMIN users cannot be associated with agencies or dealerships. They are system administrators.' 
    }, { status: 400 })
  }

  // Check if user already exists
  const existingUser = await safeDbOperation(async () => {
    return prisma.users.findUnique({
      where: { email }
    })
  })

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
  }

  // Validate agency if provided
  if (agencyId) {
    const agency = await safeDbOperation(async () => {
      return prisma.agencies.findUnique({
        where: { id: agencyId }
      })
    })
    if (!agency) {
      return NextResponse.json({ error: 'Invalid agency ID' }, { status: 400 })
    }
  }

  // Generate invitation token for magic link authentication
  const invitationToken = crypto.randomBytes(32).toString('hex')
  const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const user = await safeDbOperation(async () => {
    return prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        role,
        agencyId: role === 'SUPER_ADMIN' ? null : (agencyId || null),
        dealershipId: role === 'SUPER_ADMIN' ? null : (dealershipId || null),
        currentDealershipId: role === 'SUPER_ADMIN' ? null : (dealershipId || null), // Set current dealership same as dealership for backwards compatibility
        invitationToken,
        invitationTokenExpires,
        onboardingCompleted: role !== 'USER', // Only dealership users (USER role) need onboarding
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { requests: true }
        },
        agencies: {
          select: { name: true }
        }
      }
    })
  })

  // Generate the magic link URL
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLinkUrl = `${baseUrl}/api/invitation?token=${invitationToken}`

  // Send invitation email to the new user with magic link
  const invitedBy = session.user.name || session.user.email || 'Super Administrator'
  const invitationSent = await sendInvitationEmail({
    user: user as any,
    invitedBy,
    loginUrl: magicLinkUrl,
    skipPreferences: true
  })

  if (invitationSent) {
    logger.info('User created by Super Admin and invitation email sent successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      invitedBy
    })
  } else {
    logger.warn('User created by Super Admin but invitation email failed to send', {
      userId: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      invitedBy
    })
  }

  return NextResponse.json({
    message: `User created successfully${invitationSent ? ' and invitation email sent' : ' but invitation email failed'}`,
    user,
    invitationSent
  }, { status: 201 })
})

// Update user (SUPER_ADMIN only)
export const PUT = withErrorBoundary(async (request: NextRequest) => {
  const session = await SimpleAuth.getSessionFromRequest(request)

  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  const body = await request.json()
  const validation = updateUserSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues
    }, { status: 400 })
  }

  const { userId, name, role, agencyId, dealershipId } = validation.data

  // SUPER_ADMIN users should not be associated with agencies or dealerships
  if (role === 'SUPER_ADMIN' && (agencyId || dealershipId)) {
    return NextResponse.json({ 
      error: 'SUPER_ADMIN users cannot be associated with agencies or dealerships. They are system administrators.' 
    }, { status: 400 })
  }

  // Check if user exists
  const existingUser = await safeDbOperation(async () => {
    return prisma.users.findUnique({
      where: { id: userId }
    })
  })

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Validate agency if provided
  if (agencyId) {
    const agency = await safeDbOperation(async () => {
      return prisma.agencies.findUnique({
        where: { id: agencyId }
      })
    })
    if (!agency) {
      return NextResponse.json({ error: 'Invalid agency ID' }, { status: 400 })
    }
  }

  const updatedUser = await safeDbOperation(async () => {
    return prisma.users.update({
      where: { id: userId },
      data: {
        name,
        role,
        agencyId: role === 'SUPER_ADMIN' ? null : (agencyId || null),
        dealershipId: role === 'SUPER_ADMIN' ? null : (dealershipId || null),
        currentDealershipId: role === 'SUPER_ADMIN' ? null : (dealershipId || null),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { requests: true }
        },
        agencies: {
          select: { name: true }
        }
      }
    })
  })

  logger.info('User updated by Super Admin', {
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    agencyId: updatedUser.agencyId,
    updatedBy: session.user.email
  })

  return NextResponse.json({
    message: 'User updated successfully',
    user: updatedUser
  })
})

// Delete user (SUPER_ADMIN only)
export const DELETE = withErrorBoundary(async (request: NextRequest) => {
  const session = await SimpleAuth.getSessionFromRequest(request)

  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  // Check if user exists
  const existingUser = await safeDbOperation(async () => {
    return prisma.users.findUnique({
      where: { id: userId }
    })
  })

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Prevent deletion of the current super admin
  if (existingUser.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await safeDbOperation(async () => {
    // First check if user has any requests
    const requestCount = await prisma.requests.count({
      where: { userId: userId }
    })
    
    if (requestCount > 0) {
      // Cannot delete a user who still owns requests because `requests.userId` is non-nullable
      logger.warn('Attempt to delete user who still has requests - aborting', { userId, requestCount })
      throw new Error('Cannot delete user with existing requests. Reassign or remove requests first.')
    }
    
    // Now safely delete the user
    return prisma.users.delete({
      where: { id: userId }
    })
  })

  logger.info('User deleted by Super Admin', {
    deletedUserId: userId,
    deletedUserEmail: existingUser.email,
    deletedBy: session.user.email
  })

  return NextResponse.json({
    message: 'User deleted successfully'
  })
})
