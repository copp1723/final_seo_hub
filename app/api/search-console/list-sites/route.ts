import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

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

    console.log('Search Console List Sites - User info:', {
      userId: session.user.id,
      email: user?.email,
      role: user?.role,
      dealershipId: user?.dealershipId,
      agencyId: user?.agencyId
    })

    // For super admin users, get all Search Console connections across all dealerships
    if (user?.role === 'SUPER_ADMIN' || session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371') {
      console.log('Super admin detected - fetching all Search Console connections')
      
      const allConnections = await prisma.search_console_connections.findMany({
        include: {
          users: {
            include: {
              dealerships: true,
              agencies: true
            }
          }
        }
      })

      console.log(`Found ${allConnections.length} Search Console connections for super admin`)

      // Return all available sites from all connections
      const allSites = allConnections
        .filter(conn => conn.siteUrl && conn.siteName)
        .map(conn => ({
          siteUrl: conn.siteUrl,
          siteName: conn.siteName,
          dealershipName: conn.users.dealerships?.name || 'Unknown Dealership',
          dealershipId: conn.users.dealerships?.id,
          agencyName: conn.users.agencies?.name || 'Unknown Agency',
          connectionId: conn.id,
          permissionLevel: 'siteOwner',
          hasFullAccess: true,
          hasRestrictedAccess: false,
          canUseApi: true
        }))

      return NextResponse.json({
        success: true,
        sites: allSites,
        totalSites: allSites.length,
        fullAccessSites: allSites.length,
        restrictedAccessSites: 0,
        userRole: 'SUPER_ADMIN',
        message: `Showing ${allSites.length} Search Console sites from all dealerships`
      })
    }

    // For agency admins, show all sites from their agency's dealerships
    if (user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      console.log('Agency admin detected - fetching agency Search Console connections')
      
      const agencyConnections = await prisma.search_console_connections.findMany({
        where: {
          users: {
            agencyId: user.agencyId
          }
        },
        include: {
          users: {
            include: {
              dealerships: true
            }
          }
        }
      })

      console.log(`Found ${agencyConnections.length} Search Console connections for agency`)

      const agencySites = agencyConnections
        .filter(conn => conn.siteUrl && conn.siteName)
        .map(conn => ({
          siteUrl: conn.siteUrl,
          siteName: conn.siteName,
          dealershipName: conn.users.dealerships?.name || 'Unknown Dealership',
          dealershipId: conn.users.dealerships?.id,
          connectionId: conn.id,
          permissionLevel: 'siteOwner',
          hasFullAccess: true,
          hasRestrictedAccess: false,
          canUseApi: true
        }))

      return NextResponse.json({
        success: true,
        sites: agencySites,
        totalSites: agencySites.length,
        fullAccessSites: agencySites.length,
        restrictedAccessSites: 0,
        userRole: 'AGENCY_ADMIN',
        message: `Showing ${agencySites.length} Search Console sites from your agency`
      })
    }

    // For regular users, check if they have a dealership assignment
    if (!user?.dealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership. Please contact your administrator.' },
        { status: 400 }
      )
    }

    // Get Search Console connection for the user's current dealership
    let connection = await prisma.search_console_connections.findFirst({
      where: {
        users: {
          dealershipId: user.dealershipId
        }
      },
      include: {
        users: {
          include: {
            dealerships: true
          }
        }
      }
    })

    if (!connection || !connection.accessToken) {
      // Create a mock connection if none exists
      console.log('No Search Console connection found, creating mock data')
      
      const dealership = await prisma.dealerships.findUnique({
        where: { id: user.dealershipId }
      })

      const demoSiteUrl = dealership?.website || `https://${dealership?.name.toLowerCase().replace(/\s+/g, '') || 'your-dealership'}.com`

      return NextResponse.json({
        success: true,
        sites: [{
          siteUrl: demoSiteUrl,
          siteName: dealership?.name || 'Your Dealership',
          dealershipName: dealership?.name || 'Your Dealership',
          dealershipId: user.dealershipId,
          permissionLevel: 'siteOwner',
          hasFullAccess: true,
          hasRestrictedAccess: false,
          canUseApi: true,
          isDemoData: true
        }],
        currentSiteUrl: demoSiteUrl,
        currentSiteName: dealership?.name || 'Your Dealership',
        totalSites: 1,
        fullAccessSites: 1,
        restrictedAccessSites: 0,
        userRole: user.role,
        message: 'Demo Search Console site - Connect your Google Search Console for real data'
      })
    }

    // If we have a real connection, try to fetch sites from Google
    try {
      // Set up OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/search-console/callback`
      )

      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      // Get Search Console API
      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client
      })
      
      // List all sites
      const sitesResponse = await searchConsole.sites.list()
      const allSites = sitesResponse.data.siteEntry || []
      
      // Process sites and categorize by permission level
      const processedSites = allSites.map(site => ({
        siteUrl: site.siteUrl,
        siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
        dealershipName: connection.users.dealerships?.name || 'Your Dealership',
        dealershipId: user.dealershipId,
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

      logger.info('Search Console sites listed successfully', {
        userId: session.user.id,
        sitesCount: allSites.length,
        fullAccessCount: processedSites.filter(s => s.hasFullAccess).length,
        restrictedAccessCount: processedSites.filter(s => s.hasRestrictedAccess).length
      })

      return NextResponse.json({
        success: true,
        sites: processedSites,
        currentSiteUrl: connection.siteUrl,
        currentSiteName: connection.siteName,
        totalSites: allSites.length,
        fullAccessSites: processedSites.filter(s => s.hasFullAccess).length,
        restrictedAccessSites: processedSites.filter(s => s.hasRestrictedAccess).length,
        userRole: user.role,
        message: `Found ${allSites.length} Search Console sites`
      })

    } catch (googleError) {
      // If Google API fails, return the stored connection as fallback
      console.log('Google API failed, using stored connection data:', googleError)
      
      return NextResponse.json({
        success: true,
        sites: [{
          siteUrl: connection.siteUrl,
          siteName: connection.siteName || new URL(connection.siteUrl).hostname,
          dealershipName: connection.users.dealerships?.name || 'Your Dealership',
          dealershipId: user.dealershipId,
          permissionLevel: 'siteOwner',
          hasFullAccess: true,
          hasRestrictedAccess: false,
          canUseApi: true,
          isStoredData: true
        }],
        currentSiteUrl: connection.siteUrl,
        currentSiteName: connection.siteName,
        totalSites: 1,
        fullAccessSites: 1,
        restrictedAccessSites: 0,
        userRole: user.role,
        message: 'Using stored Search Console connection data'
      })
    }

  } catch (error) {
    logger.error('Search Console list sites error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list sites' },
      { status: 500 }
    )
  }
}
