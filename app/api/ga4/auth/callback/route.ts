import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the userId
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Missing authorization code`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Failed to obtain tokens`)
    }

    // Check for encryption key
    if (!process.env.ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY is not set in environment variables')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Server configuration error`)
    }

    // Import encryption function
    const { encrypt } = await import('@/lib/encryption')

    await prisma.gA4Connection.upsert({
      where: { userId: state },
      create: {
        userId: state,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=success`)
  } catch (error) {
    console.error('GA4 callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Authorization failed`)
  }
}
