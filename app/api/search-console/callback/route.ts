import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    logger.error('Search Console callback: No session found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  if (error) {
    logger.error('Search Console OAuth error from Google', { error, userId: session.user.id })
    return NextResponse.redirect(new URL('/settings?error=search_console_denied', process.env.NEXTAUTH_URL!))
  }
  
  if (!code) {
    logger.error('Search Console callback: No authorization code provided')
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    )
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get list of verified sites
    const searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    })
    
    const sitesResponse = await searchConsole.sites.list()
    const verifiedSites = sitesResponse.data.siteEntry?.map(site => site.siteUrl!) || []
    
    // Use the first verified site as default, or null if none
    const primarySite = verifiedSites.length > 0 ? verifiedSites[0] : null
    const siteName = primarySite ? new URL(primarySite).hostname : null

    // Save or update tokens
    const encryptedAccessToken = encrypt(tokens.access_token!)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    await prisma.searchConsoleConnection.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl: primarySite,
        siteName: siteName,
      },
      create: {
        userId: session.user.id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl: primarySite,
        siteName: siteName,
      },
    })

    logger.info('Search Console connected successfully', { 
      userId: session.user.id, 
      sitesCount: verifiedSites.length,
      primarySite 
    })

    // Redirect to settings page with success message
    return NextResponse.redirect(new URL('/settings?success=search_console_connected', process.env.NEXTAUTH_URL!))
  } catch (error) {
    logger.error('Search Console OAuth callback error', error, { 
      userId: session.user.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.redirect(new URL('/settings?error=search_console_invalid_grant', process.env.NEXTAUTH_URL!))
    }
    
    return NextResponse.json(
      { error: 'Failed to connect Search Console' },
      { status: 500 }
    )
  }
}