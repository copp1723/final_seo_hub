import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      logger.error('Google OAuth error', { error })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=oauth_denied`)
    }

    if (!code) {
      logger.error('No authorization code received')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=no_code`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getAccessToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    if (!userInfo.email) {
      logger.error('No email received from Google')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=no_email`)
    }

    // Find or create user in database
    let user = await prisma.users.findUnique({
      where: { email: userInfo.email }
    })

    if (!user) {
      // Create new user
      user = await prisma.users.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || userInfo.email,
          role: 'USER', // Default role
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      logger.info('New user created via Google OAuth', { email: userInfo.email, userId: user.id })
    } else {
      // Update existing user
      user = await prisma.users.update({
        where: { id: user.id },
        data: {
          name: userInfo.name || user.name,
          updatedAt: new Date()
        }
      })
      logger.info('Existing user signed in via Google OAuth', { email: userInfo.email, userId: user.id })
    }

    // Create session
    const sessionToken = await SimpleAuth.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,
      name: user.name
    })

    // Set session cookie and redirect
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`)
    response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response

  } catch (error) {
    logger.error('Google OAuth callback error', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=callback_error`)
  }
}
