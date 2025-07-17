import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await SimpleAuth.getSessionFromRequest(req)
  if (!session?.user) {
    logger.error('Search Console callback: No session found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  logger.info('Search Console OAuth callback received', { 
    hasCode: !!code, 
    hasState: !!state, 
    error, 
    userId: session.user.id 
  })
  
  if (error) {
    logger.error('Search Console OAuth error from Google', { error, userId: session.user.id })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    logger.error('Search Console callback: No authorization code received', { userId: session.user.id })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=No authorization code`)
  }

  try {
    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    logger.info('Exchanging code for tokens', { userId: session.user.id })
    const { tokens } = await oauth2Client.getToken(code)
    logger.info('Tokens received', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      userId: session.user.id
    })
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google')
    }

    // Set credentials to get site list
    oauth2Client.setCredentials(tokens)
    const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client })
    
    let siteUrl = 'https://jayhatfieldchevrolet.com/'
    let siteName = 'jayhatfieldchevrolet.com'
    
    try {
      // Try to get user's Search Console sites
      const sitesResponse = await searchConsole.sites.list()
      
      if (sitesResponse.data.siteEntry?.[0]) {
        const site = sitesResponse.data.siteEntry[0]
        siteUrl = site.siteUrl || siteUrl
        siteName = site.siteUrl?.replace(/https?:\/\//, '').replace(/\/$/, '') || siteName
      }
    } catch (sitesError) {
      logger.warn('Could not fetch Search Console sites, using defaults', { error: sitesError })
    }

    // Get user's dealership for proper connection
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: { dealerships: true }
    })

    const dealershipId = user?.dealerships?.id || null
    logger.info('Creating Search Console connection', { 
      userId: session.user.id, 
      dealershipId, 
      siteUrl, 
      siteName 
    })

    // Use upsert to update existing connection or create new one
    const connection = await prisma.search_console_connections.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl,
        siteName,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        dealershipId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl,
        siteName
      }
    })

    logger.info('Search Console connection updated successfully', {
      userId: session.user.id,
      connectionId: connection.id,
      siteUrl: connection.siteUrl,
      siteName: connection.siteName
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=success&service=search_console`)

  } catch (error) {
    logger.error('Search Console OAuth callback error', { error, userId: session.user.id })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent('Connection failed')}`)
  }
}
