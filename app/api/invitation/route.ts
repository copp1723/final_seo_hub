import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { UserRole } from '@prisma/client'
import { sendInvitationEmail } from '@/lib/mailgun/invitation'
import { rateLimits } from '@/lib/rate-limit'
import { z } from 'zod'
import { secureCompare, generateSecureToken } from '@/lib/crypto-utils'

export const dynamic = 'force-dynamic';

// Prefer NEXTAUTH_URL for any externally-visible redirects/links.
function getBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL
  if (envUrl && envUrl.length > 0) return envUrl
  const u = new URL(request.url)
  return `${u.protocol}//${u.host}`
}

// Validation schema for invitation creation
const createInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').toLowerCase(),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().optional(),
  dealershipId: z.string().optional(),
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

    // Find all users with non-expired invitation tokens to prevent timing attacks
    console.log('🔍 Looking for users with active invitation tokens')
    const usersWithTokens = await prisma.users.findMany({
      where: {
        invitationToken: {
          not: null
        },
        invitationTokenExpires: {
          gt: new Date() // Token must not be expired
        }
      }
    })

    // Use constant-time comparison to find the matching user
    let user = null
    for (const candidate of usersWithTokens) {
      if (candidate.invitationToken && secureCompare(candidate.invitationToken, token)) {
        user = candidate
        break
      }
    }

    if (!user) {
      console.log('❌ User not found or token expired')
      return NextResponse.redirect(new URL('/auth/error?error=InvalidToken', request.url))
    }

  console.log('✅ User found:', user.email, user.id)

  // Detect existing session conflict BEFORE consuming the token so the user can retry

    try {
      const existingSession = await SimpleAuth.getSessionFromRequest(request)
      if (existingSession && existingSession.user.email !== user.email) {
        console.log('⚠️ Session conflict detected. Redirecting to conflict page.')
  const conflictUrl = new URL('/auth/session-conflict', getBaseUrl(request))
        conflictUrl.searchParams.set('email', user.email)
        return NextResponse.redirect(conflictUrl)
      }
    } catch (e) {
      console.log('Session conflict check error (non-fatal):', e)
    }

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
      dealershipId: user.dealershipId,
      currentDealershipId: user.currentDealershipId
    })
    console.log('✅ SimpleAuth session created')

  // Set the session cookie - prefer NEXTAUTH_URL (production/staging)
  const baseUrl = getBaseUrl(request)
    
    // Redirect dealership users who haven't completed onboarding to the onboarding page
    const redirectUrl = (user.role === 'USER' && user.agencyId && !user.onboardingCompleted)
      ? `/onboarding/seoworks?invited=true&token=${user.id}`
      : '/dashboard'

  const response = NextResponse.redirect(new URL(redirectUrl, baseUrl))
    
    // Set SimpleAuth session cookie manually on the response
    response.cookies.set('seo-hub-session', sessionToken, {
      httpOnly: true,
      // Secure if our base URL is https
      secure: baseUrl.startsWith('https://'),
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })
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

  // Declare variables outside try block for error logging
  let name: string | undefined
  let email: string | undefined
  let role: string | undefined
  let agencyId: string | null | undefined
  let dealershipId: string | null | undefined
  let inviterSession: any = null

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

  // Extract variables after validation
  const validatedData = validation.data
  name = validatedData.name
  email = validatedData.email
  role = validatedData.role
  agencyId = validatedData.agencyId
  dealershipId = validatedData.dealershipId
  const expiresInHours = validatedData.expiresInHours

    // Ensure only SUPER_ADMIN can create ADMIN or SUPER_ADMIN invitations
    inviterSession = await SimpleAuth.getSessionFromRequest(request)
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

    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 72))

  const newUser = await prisma.users.create({
      data: {
    id: crypto.randomUUID(),
        name: name || null,
        email,
        role: role as any, // Cast to UserRole enum
        agencyId: agencyId || null,
        dealershipId: dealershipId || null,
        invitationToken: token,
        invitationTokenExpires: expiresAt,
    onboardingCompleted: role !== 'USER', // Only dealership users (USER role) need onboarding
    createdAt: new Date(),
    updatedAt: new Date(),
      },
    })

    // Generate the magic link URL
  const baseUrl = getBaseUrl(request)
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${token}`

    // Send invitation email to the new user with magic link
    const invitedBy = inviterSession.user.name || inviterSession.user.email || 'Administrator'
    const invitationSent = await sendInvitationEmail({
      user: newUser as any,
      invitedBy,
      loginUrl: magicLinkUrl,
      skipPreferences: true
    })

    if (invitationSent) {
      logger.info('Invitation sent successfully', {
        userId: newUser.id,
        email: newUser.email,
        invitedBy,
        role,
        agencyId,
        dealershipId
      })
    } else {
      logger.warn('User created but invitation email failed to send', {
        userId: newUser.id,
        email: newUser.email,
        invitedBy,
        role,
        agencyId,
        dealershipId
      })
    }

    return NextResponse.json({
      message: `Invitation ${invitationSent ? 'sent successfully' : 'created but email failed to send'}`,
      userId: newUser.id,
      email: newUser.email,
      invitationSent,
      // Note: invitationToken is not returned for security reasons
    })
  } catch (error: any) {
    logger.error('Generate invitation token error:', error, {
      email,
      role,
      agencyId,
      dealershipId,
      inviterEmail: inviterSession?.user?.email
    })

    return NextResponse.json({
      error: error.message || 'Failed to generate invitation',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, {
      status: 500
    })
  }
}
