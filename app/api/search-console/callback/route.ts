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
  const error = searchParams.get('error')
  
  if (error) {
    logger.error('Search Console OAuth error from Google', { error, userId: session.user.id })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=error&service=search_console&error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    logger.error('Search Console callback: No authorization code received', { userId: session.user.id })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=error&service=search_console&error=No authorization code`)
  }

  try {
    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    
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
        dealershipId: session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371' ? 'cmd50a9ot0001pe174j9rx5dh' : null,
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

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=success&service=search_console`)

  } catch (error) {
    logger.error('Search Console OAuth callback error', { error, userId: session.user.id })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=error&service=search_console&error=${encodeURIComponent('Connection failed')}`)
  }
}
