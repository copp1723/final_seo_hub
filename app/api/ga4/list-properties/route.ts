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

    // For agency users, check for any GA4 connection in the agency
    let connection
    if (user?.agencyId) {
      // Find any GA4 connection in the agency
      const agencyConnection = await prisma.ga4_connections.findFirst({
        where: {
          users: {
            agencyId: user.agencyId
          }
        }
      })
      
      if (agencyConnection) {
        connection = agencyConnection
      }
    }
    
    // Fallback to user's own connection
    if (!connection) {
      connection = await prisma.ga4_connections.findFirst({
        where: { userId: session.user.id }
      })
    }

    if (!connection || !connection.accessToken) {
      return NextResponse.json({
        success: false,
        properties: [],
        message: 'No GA4 connection found. Please connect your Google Analytics account.',
        needsConnection: true
      })
    }

    try {
      // Create OAuth2 client with credentials
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
      )

      // Set credentials
      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      // Initialize Analytics Admin API
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })
      
      // List all accounts
      const accountsResponse = await analyticsAdmin.accounts.list()
      const accounts = accountsResponse.data.accounts || []

      const allProperties = []
      
      // For each account, list properties
      for (const account of accounts) {
        try {
          const propertiesResponse = await analyticsAdmin.properties.list({
            filter: `parent:${account.name}`
          })
          
          const properties = propertiesResponse.data.properties || []
          
          for (const property of properties) {
            const propertyId = property.name?.split('/').pop()
            
            allProperties.push({
              propertyId,
              propertyName: property.displayName || `Property ${propertyId}`,
              accountName: account.displayName || 'Unknown Account',
              accountId: account.name?.split('/').pop(),
              hasAccess: true,
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

      // Sort properties by name
      allProperties.sort((a, b) => a.propertyName.localeCompare(b.propertyName))

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
        userRole: user?.role || 'USER'
      })

    } catch (googleError: any) {
      logger.error('Google API error', googleError)
      
      // If token is expired, indicate that re-authentication is needed
      if (googleError.message?.includes('401') || googleError.message?.includes('invalid_grant')) {
        return NextResponse.json({
          success: false,
          properties: [],
          message: 'Your Google Analytics connection has expired. Please reconnect.',
          needsReconnection: true
        })
      }

      // For other errors, return a generic error message
      return NextResponse.json({
        success: false,
        properties: [],
        message: 'Failed to fetch GA4 properties. Please try again later.',
        error: googleError.message
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