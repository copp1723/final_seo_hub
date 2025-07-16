import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  console.log('🎯 Accept Invitation GET endpoint hit!')
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

    // Create a session for this user
    const sessionToken = crypto.randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.sessions.create({
      data: {
        id: crypto.randomUUID(),
        sessionToken,
        userId: user.id,
        expires
      }
    })
    console.log('✅ Session created:', sessionToken)

    // Set the session cookie - use NEXTAUTH_URL for proper production redirects
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    
    // Redirect dealership users who haven't completed onboarding to the onboarding page
    const redirectUrl = (user.role === 'USER' && user.agencyId && !user.onboardingCompleted)
      ? '/onboarding/seoworks?invited=true'
      : '/dashboard'
    
    const response = NextResponse.redirect(new URL(redirectUrl, baseUrl))
    
    // Use the correct cookie name based on environment
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    
    response.cookies.set(cookieName, sessionToken, {
      expires,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/'
    })
    
    console.log('✅ Cookie set:', cookieName)
    console.log('🎯 Redirecting to:', baseUrl + redirectUrl)

    return response

  } catch (error) {
    console.error('❌ Accept invitation token error:', error)
    return NextResponse.redirect(new URL('/auth/error?error=InternalError', request.url))
  }
} 
