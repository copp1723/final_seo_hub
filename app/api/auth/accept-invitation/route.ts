import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { SimpleAuth } from '@/lib/auth-simple'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🎯 Accept Invitation GET endpoint hit!')
    console.log('Request URL:', request.url)
    console.log('Environment check:')
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    console.log('- NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Token received:', token)
    }

    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.redirect(new URL('/auth/error?error=MissingToken', request.url))
    }

    // Find user with this invitation token
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Looking for user with token:', token)
    }
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ User found:', user.email, user.id)
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Token cleared and email verified')
    }

    // Instead of manually creating sessions, use NextAuth's approach
    // Create a temporary account record that NextAuth can use
    const account = await prisma.accounts.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'invitation',
          providerAccountId: user.id
        }
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        type: 'invitation',
        provider: 'invitation',
        providerAccountId: user.id
      }
    })
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Account record created/updated')
    }

    // Create session using NextAuth's PrismaAdapter approach
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const session = await prisma.sessions.create({
      data: {
        sessionToken,
        userId: user.id,
        expires
      }
    })
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ NextAuth-compatible session created:', sessionToken.substring(0, 20) + '...')
    }

    // Set the session cookie using NextAuth's expected format
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    
    // Redirect dealership users who haven't completed onboarding to the onboarding page
    const redirectUrl = (user.role === 'USER' && user.agencyId && !user.onboardingCompleted)
      ? '/onboarding/seoworks?invited=true'
      : '/dashboard'
    
    const response = NextResponse.redirect(baseUrl + redirectUrl)
    
    // Use NextAuth's cookie configuration from lib/auth.ts
    const isProduction = process.env.NODE_ENV === 'production'
    const useSecureCookies = baseUrl.startsWith('https://')
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🍪 Cookie configuration:')
      console.log('- isProduction:', isProduction)
      console.log('- useSecureCookies:', useSecureCookies)
      console.log('- sessionToken:', sessionToken.substring(0, 20) + '...')
      console.log('- expires:', expires)
      console.log('- baseUrl:', baseUrl)
      console.log('- redirectUrl:', redirectUrl)
    }
    
    // Set the session cookie with NextAuth's expected name and configuration
    response.cookies.set('next-auth.session-token', sessionToken, {
      expires,
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax',
      path: '/'
    })

    // Create and set SimpleAuth session cookie for front-end compatibility
    const seoHubToken = await SimpleAuth.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,
      currentDealershipId: user.currentDealershipId,
      name: user.name
    })
    response.cookies.set(SimpleAuth.COOKIE_NAME, seoHubToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax', // 'none' for OAuth compatibility when secure
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ NextAuth session cookie set: next-auth.session-token')
      console.log('🎯 Redirecting to:', baseUrl + redirectUrl)
    }

    return response

  } catch (error) {
    console.error('❌ Accept invitation token error:', error)
    return NextResponse.redirect(new URL('/auth/error?error=InternalError', request.url))
  }
} 
