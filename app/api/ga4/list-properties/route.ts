import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

// Jay Hatfield dealership GA4 property mapping
const JAY_HATFIELD_GA4_PROPERTIES = [
  { propertyId: "323480238", propertyName: "Jay Hatfield Chevrolet of Columbus", dealershipName: "Jay Hatfield Chevrolet of Columbus" },
  { propertyId: "323404832", propertyName: "Jay hatfield Chevrolet GMC of Chanute", dealershipName: "Jay hatfield Chevrolet GMC of Chanute" },
  { propertyId: "371672738", propertyName: "Jay Hatfield Chevrolet GMC of Pittsburg", dealershipName: "Jay Hatfield Chevrolet GMC of Pittsburg" },
  { propertyId: "320759942", propertyName: "Jay Hatfield Chevrolet of Vinita", dealershipName: "Jay Hatfield Chevrolet of Vinita" },
  { propertyId: "323415736", propertyName: "Jay Hatfield CDJR of Frontenac", dealershipName: "Jay Hatfield CDJR of Frontenac" },
  { propertyId: "452793966", propertyName: "Sarcoxie Ford", dealershipName: "Sarcoxie Ford" },
  { propertyId: "336729443", propertyName: "Jay Hatfield Honda Powerhouse", dealershipName: "Jay Hatfield Honda Powerhouse" },
  { propertyId: "317592148", propertyName: "Jay Hatfield Motorsports of Wichita", dealershipName: "Jay Hatfield Motorsports of Wichita" },
  { propertyId: "317608467", propertyName: "Jay Hatfield Motorsports of Frontenac", dealershipName: "Jay Hatfield Motorsports of Frontenac" },
  { propertyId: "317578343", propertyName: "Jay Hatfield Motorsports of Joplin", dealershipName: "Jay Hatfield Motorsports of Joplin" },
  { propertyId: "284944578", propertyName: "Acura of Columbus", dealershipName: "Acura of Columbus" },
  { propertyId: "323502411", propertyName: "Genesis of Wichita", dealershipName: "Genesis of Wichita" },
  { propertyId: "461644624", propertyName: "Jay Hatfield Motorsports Portal", dealershipName: "Jay Hatfield Motorsports Portal" },
  { propertyId: "472110523", propertyName: "Jay Hatfield Motorsports Ottawa", dealershipName: "Jay Hatfield Motorsports Ottawa" },
  { propertyId: "323448557", propertyName: "Hatchett Hyundai East", dealershipName: "Hatchett Hyundai East" },
  { propertyId: "323465145", propertyName: "Hatchett Hyundai West", dealershipName: "Hatchett Hyundai West" },
  { propertyId: "473660351", propertyName: "Premier Mitsubishi", dealershipName: "Premier Mitsubishi" },
  { propertyId: "470694371", propertyName: "Premier Auto Center - Tucson", dealershipName: "Premier Auto Center - Tucson" }
];

// Dealerships pending GA4 access
const PENDING_GA4_ACCESS = [
  { dealershipName: "World Kia", status: "no access" },
  { dealershipName: "AEO Powersports", status: "no access yet" },
  { dealershipName: "Columbus Auto Group", status: "no access (pending name change?)" },
  { dealershipName: "Winnebago of Rockford", status: "not launched" }
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

    console.log('GA4 List Properties - User info:', {
      userId: session.user.id,
      email: user?.email,
      role: user?.role,
      dealershipId: user?.dealershipId,
      agencyId: user?.agencyId
    })

    // For super admin users or Jay Hatfield agency users, show all properties
    if (user?.role === 'SUPER_ADMIN' || session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371') {
      console.log('Super admin detected - showing all Jay Hatfield GA4 properties')
      
      // Return all Jay Hatfield properties with access + pending ones
      const allProperties = [
        ...JAY_HATFIELD_GA4_PROPERTIES.map(prop => ({
          ...prop,
          accountName: 'Jay Hatfield Auto Group',
          accountId: 'jay-hatfield',
          hasAccess: true,
          createTime: new Date().toISOString(),
          timeZone: 'America/Chicago',
          currencyCode: 'USD',
          propertyType: 'ORDINARY_GA4_PROPERTY'
        })),
        ...PENDING_GA4_ACCESS.map(pending => ({
          propertyId: `pending-${pending.dealershipName.toLowerCase().replace(/\s+/g, '-')}`,
          propertyName: `${pending.dealershipName} (${pending.status})`,
          dealershipName: pending.dealershipName,
          accountName: 'Jay Hatfield Auto Group',
          accountId: 'jay-hatfield',
          hasAccess: false,
          isPending: true,
          status: pending.status,
          createTime: new Date().toISOString(),
          timeZone: 'America/Chicago',
          currencyCode: 'USD',
          propertyType: 'PENDING_ACCESS'
        }))
      ]

      return NextResponse.json({
        success: true,
        properties: allProperties,
        totalProperties: allProperties.length,
        propertiesWithAccess: JAY_HATFIELD_GA4_PROPERTIES.length,
        propertiesPending: PENDING_GA4_ACCESS.length,
        userRole: 'SUPER_ADMIN',
        message: `Showing ${allProperties.length} Jay Hatfield GA4 properties (${JAY_HATFIELD_GA4_PROPERTIES.length} with access, ${PENDING_GA4_ACCESS.length} pending)`
      })
    }

    // For agency users within Jay Hatfield, show agency properties
    const jayHatfieldAgency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { slug: 'jay-hatfield' },
          { name: { contains: 'Jay Hatfield' } }
        ]
      }
    })

    if (user?.agencyId === jayHatfieldAgency?.id) {
      console.log('Jay Hatfield agency user detected - showing agency GA4 properties')
      
      const agencyProperties = JAY_HATFIELD_GA4_PROPERTIES.map(prop => ({
        ...prop,
        accountName: 'Jay Hatfield Auto Group',
        accountId: 'jay-hatfield',
        hasAccess: true,
        createTime: new Date().toISOString(),
        timeZone: 'America/Chicago',
        currencyCode: 'USD',
        propertyType: 'ORDINARY_GA4_PROPERTY'
      }))

      return NextResponse.json({
        success: true,
        properties: agencyProperties,
        totalProperties: agencyProperties.length,
        userRole: user.role,
        message: `Showing ${agencyProperties.length} Jay Hatfield GA4 properties with access`
      })
    }

    // For other users, check if they have a GA4 connection
    const connection = await prisma.ga4_connections.findFirst({
      where: { userId: session.user.id }
    })

    if (!connection || !connection.accessToken) {
      return NextResponse.json({
        success: true,
        properties: [{
          propertyId: "323480238",
          propertyName: "Jay Hatfield Chevrolet of Columbus - Demo",
          dealershipName: "Demo Dealership",
          accountName: 'Demo Account',
          accountId: 'demo',
          isDemoData: true,
          hasAccess: false,
          createTime: new Date().toISOString(),
          timeZone: 'America/Chicago',
          currencyCode: 'USD',
          propertyType: 'DEMO_PROPERTY'
        }],
        totalProperties: 1,
        userRole: user?.role || 'USER',
        message: 'Demo GA4 property - Connect your Google Analytics for real data'
      })
    }

    // If user has a real connection, try to fetch from Google API
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
      )

      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })
      const accountsResponse = await analyticsAdmin.accounts.list()
      const accounts = accountsResponse.data.accounts || []

      const allProperties = []
      
      for (const account of accounts) {
        try {
          const propertiesResponse = await analyticsAdmin.properties.list({
            filter: `parent:${account.name}`
          })
          
          const properties = propertiesResponse.data.properties || []
          
          for (const property of properties) {
            const propertyId = property.name?.split('/').pop()
            
            // Check if this is a Jay Hatfield property
            const jayHatfieldProperty = JAY_HATFIELD_GA4_PROPERTIES.find(p => p.propertyId === propertyId)
            
            allProperties.push({
              propertyId,
              propertyName: property.displayName || `Property ${propertyId}`,
              dealershipName: jayHatfieldProperty?.dealershipName || 'Unknown Dealership',
              accountName: account.displayName || 'Unknown Account',
              accountId: account.name?.split('/').pop(),
              hasAccess: true,
              isJayHatfieldProperty: !!jayHatfieldProperty,
              createTime: property.createTime,
              industryCategory: property.industryCategory,
              timeZone: property.timeZone,
              currencyCode: property.currencyCode,
              propertyType: property.propertyType
            })
          }
        } catch (error) {
          logger.warn('Failed to fetch properties for account', {
            accountId: account.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      logger.info('GA4 properties listed successfully', {
        userId: session.user.id,
        accountsCount: accounts.length,
        propertiesCount: allProperties.length
      })

      return NextResponse.json({
        success: true,
        properties: allProperties,
        currentPropertyId: connection.propertyId,
        currentPropertyName: connection.propertyName,
        totalAccounts: accounts.length,
        totalProperties: allProperties.length,
        userRole: user?.role || 'USER',
        message: `Found ${allProperties.length} GA4 properties from ${accounts.length} accounts`
      })

    } catch (googleError) {
      // If Google API fails, return stored connection as fallback
      console.log('Google API failed, using stored connection data:', googleError)
      
      return NextResponse.json({
        success: true,
        properties: [{
          propertyId: connection.propertyId,
          propertyName: connection.propertyName || `Property ${connection.propertyId}`,
          dealershipName: 'Connected Dealership',
          accountName: 'Connected Account',
          accountId: 'connected',
          hasAccess: true,
          isStoredData: true,
          createTime: new Date().toISOString(),
          timeZone: 'America/Chicago',
          currencyCode: 'USD',
          propertyType: 'STORED_CONNECTION'
        }],
        currentPropertyId: connection.propertyId,
        currentPropertyName: connection.propertyName,
        totalProperties: 1,
        userRole: user?.role || 'USER',
        message: 'Using stored GA4 connection data'
      })
    }

  } catch (error) {
    logger.error('GA4 list properties error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list properties' },
      { status: 500 }
    )
  }
}
