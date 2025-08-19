import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Get session from auth
  const session = await SimpleAuth.getSessionFromRequest(req)
  
  if (!session) {
    logger.error('Search Console callback: No valid session found')
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=Authentication required`)
  }
  
  logger.info('Search Console callback: Valid session found', { userId: session.user.id })

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
    let user = null
    try {
      user = await prisma.users.findUnique({
        where: { id: session.user.id }
      })
      logger.info('Search Console: User lookup result', { userId: session.user.id, found: !!user })
    } catch (dbError) {
      logger.error('Search Console: Database error during user lookup', { 
        userId: session.user.id,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined 
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent('Database error')}`)
    }

    const dealershipId = user?.dealershipId || user?.currentDealershipId || null
    logger.info('Creating Search Console connection', { 
      userId: session.user.id, 
      dealershipId, 
      siteUrl, 
      siteName 
    })

    // Manually upsert connection
    let connection = null
    try {
      connection = await prisma.search_console_connections.findFirst({
        where: { userId: session.user.id, dealershipId }
      })
      logger.info('Search Console: Existing connection lookup', { found: !!connection, userId: session.user.id, dealershipId })

      if (connection) {
        connection = await prisma.search_console_connections.update({
          where: { id: connection.id },
          data: {
            accessToken: encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            siteUrl,
            siteName,
            updatedAt: new Date()
          }
        })
        logger.info('Search Console: Connection updated', { connectionId: connection.id })
      } else {
        connection = await prisma.search_console_connections.create({
          data: {
            userId: session.user.id,
            dealershipId,
            accessToken: encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            siteUrl,
            siteName,
            email: user?.email
          }
        })
        logger.info('Search Console: New connection created', { connectionId: connection.id })
      }
    } catch (dbError) {
      logger.error('Search Console: Database error during connection upsert', { 
        userId: session.user.id,
        dealershipId,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined 
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent('Failed to save connection')}`)
    }

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
