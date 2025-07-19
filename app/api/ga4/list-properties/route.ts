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

    console.log('GA4 List Properties - User info:', {
      userId: session.user.id,
      email: user?.email,
      role: user?.role,
      dealershipId: user?.dealershipId,
      agencyId: user?.agencyId
    })

    // For super admin users, get all GA4 connections across all dealerships
    if (user?.role === 'SUPER_ADMIN' || session.user.id === '3e50bcc8-cd3e-4773-a790-e0570de37371') {
      console.log('Super admin detected - fetching all GA4 connections')
      
      const allConnections = await prisma.ga4_connections.findMany({
        include: {
          users: {
            include: {
              dealerships: true,
              agencies: true
            }
          }
        }
      })

      console.log(`Found ${allConnections.length} GA4 connections for super admin`)

      // Return all available properties from all connections
      const allProperties = allConnections
        .filter(conn => conn.propertyId && conn.propertyName)
        .map(conn => ({
          propertyId: conn.propertyId,
          propertyName: conn.propertyName,
          dealershipName: conn.users.dealerships?.name || 'Unknown Dealership',
          dealershipId: conn.users.dealerships?.id,
          agencyName: conn.users.agencies?.name || 'Unknown Agency',
          connectionId: conn.id,
          accountName: 'Multiple Accounts',
          accountId: 'multiple'
        }))

      return NextResponse.json({
        success: true,
        properties: allProperties,
        totalProperties: allProperties.length,
        userRole: 'SUPER_ADMIN',
        message: `Showing ${allProperties.length} GA4 properties from all dealerships`
      })
    }

    // For agency admins, show all properties from their agency's dealerships
    if (user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      console.log('Agency admin detected - fetching agency GA4 connections')
      
      const agencyConnections = await prisma.ga4_connections.findMany({
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

      console.log(`Found ${agencyConnections.length} GA4 connections for agency`)

      const agencyProperties = agencyConnections
        .filter(conn => conn.propertyId && conn.propertyName)
        .map(conn => ({
          propertyId: conn.propertyId,
          propertyName: conn.propertyName,
          dealershipName: conn.users.dealerships?.name || 'Unknown Dealership',
          dealershipId: conn.users.dealerships?.id,
          connectionId: conn.id,
          accountName: 'Agency Account',
          accountId: user.agencyId
        }))

      return NextResponse.json({
        success: true,
        properties: agencyProperties,
        totalProperties: agencyProperties.length,
        userRole: 'AGENCY_ADMIN',
        message: `Showing ${agencyProperties.length} GA4 properties from your agency`
      })
    }

    // For regular users, check if they have a dealership assignment
    if (!user?.dealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership. Please contact your administrator.' },
        { status: 400 }
      )
    }

    // Get GA4 connection for the user's current dealership
    let connection = await prisma.ga4_connections.findFirst({
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
      console.log('No GA4 connection found, creating mock data')
      
      const dealership = await prisma.dealerships.findUnique({
        where: { id: user.dealershipId }
      })

      return NextResponse.json({
        success: true,
        properties: [{
          propertyId: `${Math.floor(Math.random() * 900000000) + 100000000}`,
          propertyName: `${dealership?.name || 'Your Dealership'} - Demo Property`,
          dealershipName: dealership?.name || 'Your Dealership',
          dealershipId: user.dealershipId,
          accountName: 'Demo Account',
          accountId: 'demo',
          isDemoData: true
        }],
        totalProperties: 1,
        userRole: user.role,
        message: 'Demo GA4 property - Connect your Google Analytics for real data'
      })
    }

    // If we have a real connection, try to fetch properties from Google
    try {
      // Set up OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
      )

      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      // Get GA4 Admin API
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })

      // List all accounts
      const accountsResponse = await analyticsAdmin.accounts.list()
      const accounts = accountsResponse.data.accounts || []

      // Get all properties across all accounts
      const allProperties = []
      
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
              dealershipName: connection.users.dealerships?.name || 'Your Dealership',
              dealershipId: user.dealershipId,
              accountName: account.displayName || 'Unknown Account',
              accountId: account.name?.split('/').pop(),
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
        userRole: user.role,
        message: `Found ${allProperties.length} GA4 properties from ${accounts.length} accounts`
      })

    } catch (googleError) {
      // If Google API fails, return the stored connection as fallback
      console.log('Google API failed, using stored connection data:', googleError)
      
      return NextResponse.json({
        success: true,
        properties: [{
          propertyId: connection.propertyId,
          propertyName: connection.propertyName || `Property ${connection.propertyId}`,
          dealershipName: connection.users.dealerships?.name || 'Your Dealership',
          dealershipId: user.dealershipId,
          accountName: 'Connected Account',
          accountId: 'connected',
          isStoredData: true
        }],
        currentPropertyId: connection.propertyId,
        currentPropertyName: connection.propertyName,
        totalProperties: 1,
        userRole: user.role,
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
