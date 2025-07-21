import { NextResponse, NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { google } from 'googleapis'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    logger.error('Search Console connect: No session found')
    return NextResponse.redirect('/auth/signin')
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/siteverification.verify_only'
      ],
      prompt: 'consent',
      state: authResult.user.id, // Pass user ID for security
    })

    logger.info('Search Console OAuth initiated', { 
      userId: authResult.user.id,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('Search Console connect error', error, { 
      userId: authResult.user.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Failed to initiate Search Console connection' },
      { status: 500 }
    )
  }
}
