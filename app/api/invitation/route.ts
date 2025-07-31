import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { UserRole } from '@prisma/client'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { rateLimits } from '@/lib/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic';

// Validation schema for invitation creation
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().optional(),
  expiresInHours: z.number().min(1).max(168).optional() // Max 7 days
})

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

  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Validate input using Zod schema
    const validation = createInvitationSchema.safeParse(body)
    if (!validation.success) {
      logger.error('Invalid invitation data', undefined, {
        errors: validation.error.issues,
        body
      })
      return NextResponse.json({
        error: 'Invalid invitation data',
        details: validation.error.issues
      }, {
        status: 400
      })
    }

    const { email, role, agencyId, expiresInHours } = validation.data

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
      where: { email }
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
        email,
        role,
        agencyId: agencyId || null,
        invitationToken: token,
        invitationTokenExpires: expiresAt,
      },
    })

    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${token}`

    // Send invitation email to the new user with magic link
    const invitedBy = inviterSession.user.name || inviterSession.user.email || 'Administrator'
    const invitationSent = await sendInvitationEmail({
      user: newUser as any,
      invitedBy,
      loginUrl: magicLinkUrl,
      skipPreferences: true
    })

    return NextResponse.json({
      message: `Invitation ${invitationSent ? 'sent successfully' : 'created but email failed to send'}`,
      userId: newUser.id,
      email: newUser.email,
      invitationSent,
      // Note: invitationToken is not returned for security reasons
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
