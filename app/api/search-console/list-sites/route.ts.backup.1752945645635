import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

// Jay Hatfield dealership website mapping
const JAY_HATFIELD_WEBSITES = [
  { siteUrl: "https://www.jayhatfieldchevy.net/", siteName: "Jay Hatfield Chevrolet of Columbus", dealershipName: "Jay Hatfield Chevrolet of Columbus" },
  { siteUrl: "https://www.jayhatfieldchanute.com/", siteName: "Jay hatfield Chevrolet GMC of Chanute", dealershipName: "Jay hatfield Chevrolet GMC of Chanute" },
  { siteUrl: "https://www.jayhatfieldchevroletgmc.com/", siteName: "Jay Hatfield Chevrolet GMC of Pittsburg", dealershipName: "Jay Hatfield Chevrolet GMC of Pittsburg" },
  { siteUrl: "https://www.jayhatfieldchevroletvinita.com/", siteName: "Jay Hatfield Chevrolet of Vinita", dealershipName: "Jay Hatfield Chevrolet of Vinita" },
  { siteUrl: "https://www.jayhatfieldchryslerdodgejeepram.com/", siteName: "Jay Hatfield CDJR of Frontenac", dealershipName: "Jay Hatfield CDJR of Frontenac" },
  { siteUrl: "https://www.sarcoxieford.com", siteName: "Sarcoxie Ford", dealershipName: "Sarcoxie Ford" },
  { siteUrl: "https://www.jayhatfieldhondawichita.com/", siteName: "Jay Hatfield Honda Powerhouse", dealershipName: "Jay Hatfield Honda Powerhouse" },
  { siteUrl: "https://www.kansasmotorsports.com/", siteName: "Jay Hatfield Motorsports of Wichita", dealershipName: "Jay Hatfield Motorsports of Wichita" },
  { siteUrl: "https://www.jayhatfieldkawasaki.com/", siteName: "Jay Hatfield Motorsports of Frontenac", dealershipName: "Jay Hatfield Motorsports of Frontenac" },
  { siteUrl: "https://www.jhmofjoplin.com/", siteName: "Jay Hatfield Motorsports of Joplin", dealershipName: "Jay Hatfield Motorsports of Joplin" },
  { siteUrl: "https://www.acuracolumbus.com/", siteName: "Acura of Columbus", dealershipName: "Acura of Columbus" },
  { siteUrl: "https://www.genesisofwichita.com/", siteName: "Genesis of Wichita", dealershipName: "Genesis of Wichita" },
  { siteUrl: "http://jayhatfieldmotorsports.com/", siteName: "Jay Hatfield Motorsports Portal", dealershipName: "Jay Hatfield Motorsports Portal" },
  { siteUrl: "https://www.jayhatfieldottawa.com/", siteName: "Jay Hatfield Motorsports Ottawa", dealershipName: "Jay Hatfield Motorsports Ottawa" },
  { siteUrl: "https://www.hatchetthyundaieast.com/", siteName: "Hatchett Hyundai East", dealershipName: "Hatchett Hyundai East" },
  { siteUrl: "https://www.hatchetthyundaiwest.com/", siteName: "Hatchett Hyundai West", dealershipName: "Hatchett Hyundai West" },
  { siteUrl: "https://premiermitsubishi.com/", siteName: "Premier Mitsubishi", dealershipName: "Premier Mitsubishi" },
  { siteUrl: "https://scottsaysyes.com/", siteName: "Premier Auto Center - Tucson", dealershipName: "Premier Auto Center - Tucson" },
  { siteUrl: "https://www.worldkiajoliet.com/", siteName: "World Kia", dealershipName: "World Kia" },
  { siteUrl: "https://aeopowersports.com/", siteName: "AEO Powersports", dealershipName: "AEO Powersports" },
  { siteUrl: "https://columbusautogroup.com/", siteName: "Columbus Auto Group", dealershipName: "Columbus Auto Group" },
  { siteUrl: "https://www.winnebagomotorhomes.com/", siteName: "Winnebago of Rockford", dealershipName: "Winnebago of Rockford" }
];

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

    // For super admin users or Jay Hatfield agency users, show all sites
    if (user?.role === 'SUPER_ADMIN' || session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371') {
      console.log('Super admin detected - showing all Jay Hatfield Search Console sites')
      
      // Return all Jay Hatfield websites
      const allSites = JAY_HATFIELD_WEBSITES.map(site => ({
        ...site,
        permissionLevel: 'siteOwner',
        hasFullAccess: true,
        hasRestrictedAccess: false,
        canUseApi: true,
        isJayHatfieldSite: true
      }))

      return NextResponse.json({
        success: true,
        sites: allSites,
        totalSites: allSites.length,
        fullAccessSites: allSites.length,
        restrictedAccessSites: 0,
        userRole: 'SUPER_ADMIN',
        message: `Showing ${allSites.length} Jay Hatfield Search Console sites`
      })
    }

    // For agency users within Jay Hatfield, show agency sites
    const jayHatfieldAgency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { slug: 'jay-hatfield' },
          { name: { contains: 'Jay Hatfield' } }
        ]
      }
    })

    if (user?.agencyId === jayHatfieldAgency?.id) {
      console.log('Jay Hatfield agency user detected - showing agency Search Console sites')
      
      const agencySites = JAY_HATFIELD_WEBSITES.map(site => ({
        ...site,
        permissionLevel: 'siteOwner',
        hasFullAccess: true,
        hasRestrictedAccess: false,
        canUseApi: true,
        isJayHatfieldSite: true
      }))

      return NextResponse.json({
        success: true,
        sites: agencySites,
        totalSites: agencySites.length,
        fullAccessSites: agencySites.length,
        restrictedAccessSites: 0,
        userRole: user.role,
        message: `Showing ${agencySites.length} Jay Hatfield Search Console sites`
      })
    }

    // For other users, check if they have a Search Console connection
    const connection = await prisma.search_console_connections.findFirst({
      where: { userId: session.user.id }
    })

    if (!connection || !connection.accessToken) {
      return NextResponse.json({
        success: true,
        sites: [{
          siteUrl: "https://www.jayhatfieldchevy.net/",
          siteName: "Jay Hatfield Chevrolet of Columbus - Demo",
          dealershipName: "Demo Dealership",
          permissionLevel: 'siteOwner',
          hasFullAccess: true,
          hasRestrictedAccess: false,
          canUseApi: true,
          isDemoData: true
        }],
        currentSiteUrl: "https://www.jayhatfieldchevy.net/",
        currentSiteName: "Jay Hatfield Chevrolet of Columbus - Demo",
        totalSites: 1,
        fullAccessSites: 1,
        restrictedAccessSites: 0,
        userRole: user?.role || 'USER',
        message: 'Demo Search Console site - Connect your Google Search Console for real data'
      })
    }

    // If user has a real connection, try to fetch from Google API
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/search-console/callback`
      )

      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client
      })
      
      // List all sites
      const sitesResponse = await searchConsole.sites.list()
      const allSites = sitesResponse.data.siteEntry || []
      
      // Process sites and categorize by permission level
      const processedSites = allSites.map(site => {
        // Check if this is a Jay Hatfield site
        const jayHatfieldSite = JAY_HATFIELD_WEBSITES.find(jh => jh.siteUrl === site.siteUrl)
        
        return {
          siteUrl: site.siteUrl,
          siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
          dealershipName: jayHatfieldSite?.dealershipName || 'Unknown Dealership',
          permissionLevel: site.permissionLevel,
          hasFullAccess: site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser',
          hasRestrictedAccess: site.permissionLevel === 'siteRestrictedUser',
          canUseApi: site.permissionLevel !== 'siteUnverifiedUser',
          isJayHatfieldSite: !!jayHatfieldSite
        }
      })

      // Sort sites: Jay Hatfield sites first, then by permission level
      processedSites.sort((a, b) => {
        if (a.isJayHatfieldSite && !b.isJayHatfieldSite) return -1
        if (!a.isJayHatfieldSite && b.isJayHatfieldSite) return 1
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
        restrictedAccessCount: processedSites.filter(s => s.hasRestrictedAccess).length,
        jayHatfieldSitesCount: processedSites.filter(s => s.isJayHatfieldSite).length
      })

      return NextResponse.json({
        success: true,
        sites: processedSites,
        currentSiteUrl: connection.siteUrl,
        currentSiteName: connection.siteName,
        totalSites: allSites.length,
        fullAccessSites: processedSites.filter(s => s.hasFullAccess).length,
        restrictedAccessSites: processedSites.filter(s => s.hasRestrictedAccess).length,
        jayHatfieldSites: processedSites.filter(s => s.isJayHatfieldSite).length,
        userRole: user?.role || 'USER',
        message: `Found ${allSites.length} Search Console sites`
      })

    } catch (googleError) {
      // If Google API fails, return stored connection as fallback
      console.log('Google API failed, using stored connection data:', googleError)
      
      return NextResponse.json({
        success: true,
        sites: [{
          siteUrl: connection.siteUrl,
          siteName: connection.siteName || new URL(connection.siteUrl).hostname,
          dealershipName: 'Connected Dealership',
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
        userRole: user?.role || 'USER',
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
