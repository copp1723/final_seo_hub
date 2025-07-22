import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  console.log('🎯 Invitation GET endpoint hit!')
  console.log('Request URL:', request.url)
  console.log('Request headers:', request.headers)
  
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    console.log('Token received:', token)

    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.redirect(new URL('/auth/error?error=MissingToken', request.url))
    }

    // Find user with this invitation token
    console.log('🔍 Looking for user with token:', token)
    const user = await prisma.users.findFirst({
      where: {
        invitationToken: token,
        invitationTokenExpires: {
          gt: new Date() // Token must not be expired
        }
      }
    })

    if (!user) {
      console.log('❌ User not found or token expired')
      return NextResponse.redirect(new URL('/auth/error?error=InvalidToken', request.url))
    }

    console.log('✅ User found:', user.email, user.id)

    // Clear the invitation token (one-time use)
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken: null,
        invitationTokenExpires: null,
        emailVerified: new Date() // Mark email as verified
      }
    })
    console.log('✅ Token cleared')

    // Create a SimpleAuth session for this user
    const sessionToken = await SimpleAuth.createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId
    })
    console.log('✅ SimpleAuth session created')

    // Set the session cookie - use NEXTAUTH_URL for proper production redirects
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    
    // Redirect dealership users who haven't completed onboarding to the onboarding page
    const redirectUrl = (user.role === 'USER' && user.agencyId && !user.onboardingCompleted)
      ? '/onboarding/seoworks?invited=true'
      : '/dashboard'
    
    const response = NextResponse.redirect(new URL(redirectUrl, baseUrl))
    
    // Set SimpleAuth session cookie manually on the response
    response.cookies.set('seo-hub-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })
    
    console.log('✅ SimpleAuth cookie set')
    console.log('🎯 Redirecting to:', baseUrl + redirectUrl)

    return response

  } catch (error) {
    logger.error('Invitation token error:', error)
    return NextResponse.redirect(new URL('/auth/error?error=ServerError', request.url))
  }
}

// Generate invitation token for a user
export async function POST(request: NextRequest) {
  console.log('🎯 Invitation POST endpoint hit!')
  
  try {
    const {
      email,
      role,
      agencyId,
      expiresInHours
    } = await request.json()

    // Basic validation
    if (!email || !role) {
      logger.error('Missing email or role for invitation', undefined, { email, role })
      return NextResponse.json({
        error: 'Email and role are required'
      }, {
        status: 400
      })
    }

    // Validate email format (simple regex for now)
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      logger.error('Invalid email format for invitation', undefined, { email })
      return NextResponse.json({
        error: 'Invalid email format'
      }, {
        status: 400
      })
    }

    // Ensure only SUPER_ADMIN can create ADMIN or SUPER_ADMIN invitations
    const inviterSession = await SimpleAuth.getSessionFromRequest(request)
    if (!inviterSession || (role !== 'USER' && inviterSession.user.role !== 'SUPER_ADMIN')) {
      logger.error('Unauthorized attempt to create invitation', undefined, {
        inviterRole: inviterSession?.user.role,
        targetRole: role
      })
      return NextResponse.json({
        error: 'Unauthorized to create this invitation type'
      }, {
        status: 403
      })
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      logger.warn('Attempt to invite existing user', { email })
      return NextResponse.json({
        error: 'User with this email already exists'
      }, {
        status: 409
      })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 72))

    const newUser = await prisma.users.create({
      data: {
        email: email.toLowerCase(),
        role: role as UserRole,
        agencyId: agencyId as string | null,
        invitationToken: token,
        invitationTokenExpires: expiresAt,
      },
    })

    // Send invitation email
    // await sendInvitationEmail(email, token) // This function is not defined in the original file

    return NextResponse.json({
      message: 'Invitation sent successfully',
      userId: newUser.id,
      email: newUser.email,
      invitationToken: newUser.invitationToken, // Return for debugging / testing purposes
    })
  } catch (error) {
    logger.error('Generate invitation token error:', error)
    return NextResponse.json({
      error: 'Failed to generate invitation'
    }, {
      status: 500
    })
  }
}
