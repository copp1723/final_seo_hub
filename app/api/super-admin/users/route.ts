import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { sendInvitationEmail, createDefaultUserPreferences } from '@/lib/mailgun/invitation'
import { logger } from '@/lib/logger'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().optional()
})

const updateUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().optional()
})

// Get all users with pagination and filtering (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  if (authResult.user.role !== 'SUPER_ADMIN') {
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

  try {
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

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          agency: true,
          _count: {
            select: { requests: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

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
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// Create new user (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  if (authResult.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validation = createUserSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { name, email, role, agencyId } = validation.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    // Validate agency if provided
    if (agencyId) {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId }
      })
      if (!agency) {
        return NextResponse.json({ error: 'Invalid agency ID' }, { status: 400 })
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        agencyId: agencyId || null,
        onboardingCompleted: true, // Super admin created users are considered onboarded
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0
      },
      include: {
        agency: true,
        _count: {
          select: { requests: true }
        }
      }
    })

    // Create default user preferences for the new user
    await createDefaultUserPreferences(user.id)

    // Send invitation email to the new user
    const invitedBy = authResult.user.name || authResult.user.email || 'Super Administrator'
    const invitationSent = await sendInvitationEmail({
      user: user as any, // Cast to include all User fields
      invitedBy,
      skipPreferences: true // New user doesn't have preferences loaded yet
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
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// Update user (SUPER_ADMIN only)
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  if (authResult.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validation = updateUserSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { userId, name, role, agencyId } = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate agency if provided
    if (agencyId) {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId }
      })
      if (!agency) {
        return NextResponse.json({ error: 'Invalid agency ID' }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        role,
        agencyId: agencyId || null
      },
      include: {
        agency: true,
        _count: {
          select: { requests: true }
        }
      }
    })

    return NextResponse.json({ 
      message: 'User updated successfully',
      user 
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// Delete user (SUPER_ADMIN only)
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  if (authResult.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access denied. Super Admin required.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting yourself
    if (userId === authResult.user.id) {
      return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 })
    }

    // Additional safety check for SUPER_ADMIN deletion
    if (existingUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' }
      })
      
      if (superAdminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot delete the last Super Admin user' 
        }, { status: 400 })
      }
    }

    // Delete user and all related data
    await prisma.$transaction(async (tx) => {
      // Delete user's requests and tasks
      await tx.task.deleteMany({
        where: { userId }
      })
      
      await tx.request.deleteMany({
        where: { userId }
      })
      
      // Delete user's integrations
      await tx.gA4Connection.deleteMany({
        where: { userId }
      })
      
      await tx.searchConsoleConnection.deleteMany({
        where: { userId }
      })
      
      // Delete user preferences and usage history
      await tx.userPreferences.deleteMany({
        where: { userId }
      })
      
      await tx.monthlyUsage.deleteMany({
        where: { userId }
      })
      
      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ 
      message: 'User deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}