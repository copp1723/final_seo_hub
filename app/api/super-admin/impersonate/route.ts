import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const impersonateSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required')
})

// Start impersonation
export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // For hardcoded admin, get user info from session
    const currentUser = session.user.id === 'hardcoded-super-admin'
      ? { role: 'SUPER_ADMIN', email: session.user.email, name: session.user.name }
      : await prisma.users.findUnique({
          where: { id: session.user.id },
          select: { role: true, email: true, name: true }
        })

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = impersonateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { targetUserId } = validation.data

    // Get the target user
    const targetUser = await prisma.users.findUnique({
      where: { id: targetUserId },
      include: {
        agencies: true,
        dealerships: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Don't allow impersonating another super admin
    if (targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot impersonate another super admin' }, { status: 403 })
    }

    // Store the original user ID in a secure cookie so we can revert back
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === 'production'
    const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://') || false
    
    // Store impersonation info in a secure cookie
    cookieStore.set('impersonation-original-user', JSON.stringify({
      id: currentUser.email,
      name: currentUser.name,
      email: currentUser.email
    }), {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4 // 4 hours max impersonation
    })

    // Create a SimpleAuth session for the target user
    const sessionToken = await SimpleAuth.createSession({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      agencyId: targetUser.agencyId,
      dealershipId: targetUser.dealershipId
    })

    // Set the new session cookie
    cookieStore.set('seo-hub-session', sessionToken, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60 // 4 hours
    })

    // Log the impersonation for audit purposes
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        action: 'IMPERSONATE_USER',
        resource: 'User',
        entityType: 'User',
        entityId: targetUser.id,
        details: {
          targetUserEmail: targetUser.email,
          targetUserRole: targetUser.role,
          originalUserEmail: currentUser.email
        },
        users: {
          connect: { id: session.user.id }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Now impersonating ${targetUser.name || targetUser.email}`,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        agency: targetUser.agencies?.name,
        dealership: targetUser.dealerships?.name
      }
    })

  } catch (error) {
    console.error('Error starting impersonation:', error)
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    )
  }
}

// Stop impersonation and return to original user
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const originalUserCookie = cookieStore.get('impersonation-original-user')
    
    if (!originalUserCookie?.value) {
      return NextResponse.json({ error: 'Not currently impersonating' }, { status: 400 })
    }

    const originalUser = JSON.parse(originalUserCookie.value)
    
    // Get the original super admin user from database
    const superAdmin = await prisma.users.findUnique({
      where: { email: originalUser.email }
    })

    if (!superAdmin || superAdmin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Original user not found or not super admin' }, { status: 404 })
    }

    // Get current session to log who was being impersonated
    const currentSession = await SimpleAuth.getSessionFromRequest(request)
    const impersonatedUserId = currentSession?.user.id

    // Create a SimpleAuth session for the original super admin
    const sessionToken = await SimpleAuth.createSession({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role,
      agencyId: superAdmin.agencyId,
      dealershipId: superAdmin.dealershipId
    })

    // Set the session cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://') || false
    
    cookieStore.set('seo-hub-session', sessionToken, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    // Clear the impersonation cookie
    cookieStore.delete('impersonation-original-user')

    // Log the end of impersonation
    if (impersonatedUserId) {
      await prisma.audit_logs.create({
        data: {
          id: crypto.randomUUID(),
          userId: superAdmin.id,
          action: 'STOP_IMPERSONATION',
          resource: 'User',
          entityType: 'User',
          entityId: impersonatedUserId,
          details: {
            impersonatedUserId,
            originalUserEmail: superAdmin.email
          },
          users: {
            connect: { id: superAdmin.id }
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Impersonation ended, returned to super admin account',
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role
      }
    })

  } catch (error) {
    console.error('Error stopping impersonation:', error)
    return NextResponse.json(
      { error: 'Failed to stop impersonation' },
      { status: 500 }
    )
  }
}

// Check if currently impersonating
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const originalUserCookie = cookieStore.get('impersonation-original-user')
    
    if (!originalUserCookie?.value) {
      return NextResponse.json({ impersonating: false })
    }

    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user) {
      return NextResponse.json({ impersonating: false })
    }

    const originalUser = JSON.parse(originalUserCookie.value)

    return NextResponse.json({
      impersonating: true,
      originalUser: {
        email: originalUser.email,
        name: originalUser.name
      },
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role
      }
    })

  } catch (error) {
    console.error('Error checking impersonation status:', error)
    return NextResponse.json({ impersonating: false })
  }
}
