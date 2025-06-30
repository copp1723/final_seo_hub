import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  
  if (!code) {
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

    // Save or update tokens
    const encryptedAccessToken = encrypt(tokens.access_token!)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    await prisma.searchConsoleConnection.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        userId: session.user.id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    })

    // Redirect to settings page
    return NextResponse.redirect(new URL('/settings/search-console', process.env.NEXTAUTH_URL!))
  } catch (error) {
    logger.error('Search Console OAuth error', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to connect Search Console' },
      { status: 500 }
    )
  }
}