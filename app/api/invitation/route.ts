import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import crypto from 'crypto'

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
    console.error('❌ Invitation token error:', error)
    return NextResponse.redirect(new URL('/auth/error?error=InternalError', request.url))
  }
}

// Generate invitation token for a user
export async function POST(request: NextRequest) {
  console.log('🎯 Invitation POST endpoint hit!')
  
  try {
    const { email } = await request.json()
    console.log('Email requested:', email)

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User not found:', email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('✅ User found:', user.id)

    // Generate secure token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with invitation token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })

    console.log('✅ Token saved to database')

    // Generate invitation URL - Updated to use the fixed endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/api/auth/accept-invitation?token=${invitationToken}`

    console.log('✅ Invitation URL generated:', invitationUrl)

    return NextResponse.json({
      success: true,
      invitationUrl,
      expiresAt: invitationTokenExpires
    })

  } catch (error) {
    console.error('❌ Generate invitation token error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invitation token' },
      { status: 500 }
    )
  }
}
