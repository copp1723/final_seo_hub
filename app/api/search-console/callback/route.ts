import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const authResult = await requireAuth(req)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
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
      auth: oauth2Client
    })
    
    const sitesResponse = await searchConsole.sites.list()
    const allSites = sitesResponse.data.siteEntry || []
    
    // Filter for sites with sufficient permissions for API access
    const fullAccessSites = allSites.filter(site =>
      site.permissionLevel === 'siteOwner' ||
      site.permissionLevel === 'siteFullUser'
    )

    const restrictedAccessSites = allSites.filter(site =>
      site.permissionLevel === 'siteRestrictedUser'
    )

    // Prefer full access sites, but allow restricted access as fallback
    const primarySite = fullAccessSites.length > 0
      ? fullAccessSites[0].siteUrl!
      : (restrictedAccessSites.length > 0
          ? restrictedAccessSites[0].siteUrl!
          : (allSites.length > 0 ? allSites[0].siteUrl! : null))

    const siteName = primarySite ? new URL(primarySite).hostname : null

    // Check if we have any sites with API access
    if (allSites.length === 0) {
      logger.error('No Search Console sites found for user', { userId: session.user.id })
      return NextResponse.redirect(new URL('/settings?error=no_search_console_sites', process.env.NEXTAUTH_URL!))
    }

    if (fullAccessSites.length === 0 && restrictedAccessSites.length === 0) {
      logger.error('No Search Console sites with sufficient permissions', {
        userId: session.user.id,
        sitesFound: allSites.map(s => ({ url: s.siteUrl, permission: s.permissionLevel }))
      })
      return NextResponse.redirect(new URL('/settings?error=insufficient_search_console_permissions', process.env.NEXTAUTH_URL!))
    }
    
    logger.info('Search Console sites found', {
      userId: session.user.id,
      totalSites: allSites.length,
      fullAccessSites: fullAccessSites.length,
      restrictedAccessSites: restrictedAccessSites.length,
      selectedSite: primarySite,
      allSitesPermissions: allSites.map(s => ({ url: s.siteUrl, permission: s.permissionLevel }))
    })

    // Get user's dealership ID
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      logger.error('User not assigned to dealership', { userId: session.user.id })
      return NextResponse.redirect(new URL('/settings?error=user_not_assigned_to_dealership', process.env.NEXTAUTH_URL!))
    }

    // Save or update tokens
    const encryptedAccessToken = encrypt(tokens.access_token!)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    await prisma.search_console_connections.upsert({
      where: { userId: user.dealershipId },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl: primarySite,
        siteName: siteName
      },
      create: {
        users: { connect: { id: user.dealershipId } },
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        siteUrl: primarySite,
        siteName: siteName
      }
    })

    logger.info('Search Console connected successfully', {
      userId: session.user.id,
      sitesCount: allSites.length,
      fullAccessSitesCount: fullAccessSites.length,
      restrictedAccessSitesCount: restrictedAccessSites.length,
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
