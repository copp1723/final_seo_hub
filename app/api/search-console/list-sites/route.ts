import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's dealership ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, role: true, agencyId: true }
    })

    // For agency admins, we'll show all sites they have access to
    if (!user?.dealershipId && user?.role !== 'AGENCY_ADMIN') {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Get Search Console connection - either from user's dealership or any dealership in their agency
    let connection = null
    
    if (user?.dealershipId) {
      connection = await prisma.searchConsoleConnection.findUnique({
        where: { dealershipId: user.dealershipId }
      })
    } else if (user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      // For agency admins, find any Search Console connection in their agency to use the tokens
      const agencyDealership = await prisma.dealership.findFirst({
        where: { agencyId: user.agencyId },
        include: { searchConsoleConnection: true }
      })
      connection = agencyDealership?.searchConsoleConnection
    }

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'No Search Console connection found. Please connect Search Console first.' },
        { status: 404 }
      )
    }

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    oauth2Client.setCredentials({
      access_token: decrypt(connection.accessToken),
      refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined,
    })

    // Get Search Console API
    const searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    })
    
    // List all sites
    const sitesResponse = await searchConsole.sites.list()
    const allSites = sitesResponse.data.siteEntry || []
    
    // Process sites and categorize by permission level
    const processedSites = allSites.map(site => ({
      siteUrl: site.siteUrl,
      siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
      permissionLevel: site.permissionLevel,
      hasFullAccess: site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser',
      hasRestrictedAccess: site.permissionLevel === 'siteRestrictedUser',
      canUseApi: site.permissionLevel !== 'siteUnverifiedUser'
    }))

    // Sort sites: full access first, then restricted, then others
    processedSites.sort((a, b) => {
      if (a.hasFullAccess && !b.hasFullAccess) return -1
      if (!a.hasFullAccess && b.hasFullAccess) return 1
      if (a.hasRestrictedAccess && !b.hasRestrictedAccess) return -1
      if (!a.hasRestrictedAccess && b.hasRestrictedAccess) return 1
      return 0
    })

    // If this is an agency admin, also get the current site mappings for all dealerships
    let dealershipMappings: Array<{
      dealershipId: string
      dealershipName: string
      currentSiteUrl: string | null
      currentSiteName: string | null
    }> = []
    if (user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      const agencyDealerships = await prisma.dealership.findMany({
        where: { agencyId: user.agencyId },
        include: {
          searchConsoleConnection: {
            select: {
              siteUrl: true,
              siteName: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })
      
      dealershipMappings = agencyDealerships.map(d => ({
        dealershipId: d.id,
        dealershipName: d.name,
        currentSiteUrl: d.searchConsoleConnection?.siteUrl || null,
        currentSiteName: d.searchConsoleConnection?.siteName || null
      }))
    }

    logger.info('Search Console sites listed successfully', {
      userId: session.user.id,
      sitesCount: allSites.length,
      fullAccessCount: processedSites.filter(s => s.hasFullAccess).length,
      restrictedAccessCount: processedSites.filter(s => s.hasRestrictedAccess).length,
      isAgencyAdmin: user?.role === 'AGENCY_ADMIN'
    })

    return NextResponse.json({
      success: true,
      sites: processedSites,
      currentSiteUrl: connection.siteUrl,
      currentSiteName: connection.siteName,
      dealershipMappings: user?.role === 'AGENCY_ADMIN' ? dealershipMappings : undefined,
      totalSites: allSites.length,
      fullAccessSites: processedSites.filter(s => s.hasFullAccess).length,
      restrictedAccessSites: processedSites.filter(s => s.hasRestrictedAccess).length
    })

  } catch (error) {
    logger.error('Search Console list sites error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list sites' },
      { status: 500 }
    )
  }
} 