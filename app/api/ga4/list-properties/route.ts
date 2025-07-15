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

    // Get user's dealership ID
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true, role: true, agencyId: true }
    })

    // For agency admins, we'll show all properties they have access to
    if (!user?.dealershipId && user?.role !== 'AGENCY_ADMIN') {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Get GA4 connection - either from user's dealership or any dealership in their agency
    let connection = null
    
    if (user?.dealershipId) {
      connection = await prisma.ga4_connections.findUnique({
        where: { userId: user.dealershipId }
      })
    } else if (user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      // For agency admins, find any GA4 connection in their agency to use the tokens
      const agencyDealership = await prisma.dealerships.findFirst({
        where: { agencyId: user.agencyId }
      })
      
      if (agencyDealership) {
        connection = await prisma.ga4_connections.findFirst({
          where: { userId: agencyDealership.id }
        })
      }
    }

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'No GA4 connection found.Please connect Google Analytics first.' },
        { status: 404 }
      )
    }

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

    // If this is an agency admin, also get the current property mappings for all dealerships
    let dealershipMappings: Array<{
      dealershipId: string
      dealershipName: string
      currentPropertyId: string | null
      currentPropertyName: string | null
    }> = []
    if (user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
      const agencyDealerships = await prisma.dealerships.findMany({
        where: { agencyId: user.agencyId },
        orderBy: { name: 'asc' }
      })
      
      // Get GA4 connections for each dealership
      const dealershipIds = agencyDealerships.map(d => d.id)
      const ga4Connections = await prisma.ga4_connections.findMany({
        where: { userId: { in: dealershipIds } },
        select: {
          userId: true,
          propertyId: true,
          propertyName: true
        }
      })
      
      dealershipMappings = agencyDealerships.map(d => {
        const connection = ga4Connections.find(c => c.userId === d.id)
        return {
          dealershipId: d.id,
          dealershipName: d.name,
          currentPropertyId: connection?.propertyId || null,
          currentPropertyName: connection?.propertyName || null
        }
      })
    }

    logger.info('GA4 properties listed successfully', {
      userId: session.user.id,
      accountsCount: accounts.length,
      propertiesCount: allProperties.length,
      isAgencyAdmin: user?.role === 'AGENCY_ADMIN'
    })

    return NextResponse.json({
      success: true,
      properties: allProperties,
      currentPropertyId: connection.propertyId,
      currentPropertyName: connection.propertyName,
      dealershipMappings: user?.role === 'AGENCY_ADMIN' ? dealershipMappings : undefined,
      totalAccounts: accounts.length,
      totalProperties: allProperties.length
    })

  } catch (error) {
    logger.error('GA4 list properties error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list properties' },
      { status: 500 }
    )
  }
}
