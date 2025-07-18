import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { google } from 'googleapis'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  // Get session from auth
  const session = await SimpleAuth.getSessionFromRequest(req)
  
  if (!session) {
    logger.error('Search Console connect: No valid session found')
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  logger.info('Search Console connect: Valid session found', { userId: session.user.id })

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
      state: session.user.id, // Pass user ID for security
    })

    logger.info('Search Console OAuth initiated', { 
      userId: session.user.id,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('Search Console connect error', error, { 
      userId: session.user.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Failed to initiate Search Console connection' },
      { status: 500 }
    )
  }
}
