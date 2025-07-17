import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const SCOPES = [
  'openid',
  'email',
  'profile'
]

export async function GET(request: NextRequest) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google OAuth signin error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=oauth_error`)
  }
}
