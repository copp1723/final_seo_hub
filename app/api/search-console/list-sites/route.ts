import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { 
        dealershipId: true, 
        role: true, 
        agencyId: true,
        email: true
      }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has a Search Console connection (user-level or dealership-level)
    let connection = await prisma.search_console_connections.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { dealershipId: user.dealershipId }
        ]
      }
    })
    // Agency admin: if still no connection, check any dealerships under this agency
    if (!connection && user.agencyId && (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN')) {
      const agencyDealerships = await prisma.dealerships.findMany({ where: { agencyId: user.agencyId }, select: { id: true } })
      const dealershipIds = agencyDealerships.map(d => d.id)
      connection = await prisma.search_console_connections.findFirst({ where: { dealershipId: { in: dealershipIds } } })
    }

    if (!connection || !connection.accessToken) {
      return NextResponse.json({
        success: false,
        sites: [],
        message: 'No Search Console connection found. Please connect your Google Search Console account.',
        needsConnection: true
      })
    }

    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/search-console/callback`
      )

      // Set credentials
      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      // Initialize Search Console API
      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client
      })
      
      // List all sites
      const sitesResponse = await searchConsole.sites.list()
      const allSites = sitesResponse.data.siteEntry || []
      
      // Process sites
      const processedSites = allSites.map(site => ({
        siteUrl: site.siteUrl,
        siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
        permissionLevel: site.permissionLevel,
        hasFullAccess: site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser',
        hasRestrictedAccess: site.permissionLevel === 'siteRestrictedUser',
        canUseApi: site.permissionLevel !== 'siteUnverifiedUser'
      }))

      // Sort sites by permission level
      processedSites.sort((a, b) => {
        if (a.hasFullAccess && !b.hasFullAccess) return -1
        if (!a.hasFullAccess && b.hasFullAccess) return 1
        return 0
      })

      logger.info('Search Console sites listed successfully', {
        userId: session.user.id,
        sitesCount: allSites.length,
        fullAccessCount: processedSites.filter(s => s.hasFullAccess).length
      })

      return NextResponse.json({
        success: true,
        sites: processedSites,
        currentSiteUrl: connection.siteUrl,
        currentSiteName: connection.siteName,
        totalSites: allSites.length,
        fullAccessSites: processedSites.filter(s => s.hasFullAccess).length,
        userRole: user?.role || 'USER'
      })

    } catch (googleError: any) {
      logger.error('Google API error', googleError)
      
      // If token is expired, indicate that re-authentication is needed
      if (googleError.message?.includes('401') || googleError.message?.includes('invalid_grant')) {
        return NextResponse.json({
          success: false,
          sites: [],
          message: 'Your Search Console connection has expired. Please reconnect.',
          needsReconnection: true
        })
      }

      // For other errors, return a generic error message
      return NextResponse.json({
        success: false,
        sites: [],
        message: 'Failed to fetch Search Console sites. Please try again later.',
        error: googleError.message
      })
    }

  } catch (error: any) {
    logger.error('Search Console list sites error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list sites' },
      { status: 500 }
    )
  }
}