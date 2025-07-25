import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's dealership ID
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.json(
        { error: 'User not assigned to dealership' },
        { status: 400 }
      )
    }

    // Get existing GA4 connection
    const connection = await prisma.ga4_connections.findUnique({
      where: { userId: user.dealershipId }
    })

    if (!connection) {
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

    console.log('DEBUG: GA4 connection.accessToken type:', typeof connection.accessToken, 'value:', connection.accessToken)
    if (!connection.accessToken) {
      return NextResponse.json(
        { error: 'Access token is missing from GA4 connection' },
        { status: 400 }
      )
    }
    
    oauth2Client.setCredentials({
      access_token: decrypt(connection.accessToken),
      refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
    })

    // Get GA4 Admin API
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })

    try {
      // List accounts
      const accountsResponse = await analyticsAdmin.accounts.list()
      if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length === 0) {
        throw new Error('No Google Analytics accounts found')
      }

      const account = accountsResponse.data.accounts[0]
      
      // Get properties for the account
      const propertiesResponse = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`
      })

      if (!propertiesResponse.data.properties || propertiesResponse.data.properties.length === 0) {
        throw new Error('No GA4 properties found in your account')
      }

      const property = propertiesResponse.data.properties[0]
      const propertyId = property.name?.split('/').pop() // Extract ID from "properties/123456789"
      const propertyName = property.displayName

      // Update the connection with property info
      await prisma.ga4_connections.update({
        where: { userId: user.dealershipId },
        data: {
          propertyId,
          propertyName,
          updatedAt: new Date()
        }
      })

      logger.info('GA4 property information updated', {
        userId: session.user.id,
        dealershipId: user.dealershipId,
        propertyId,
        propertyName
      })

      return NextResponse.json({
        success: true,
        propertyId,
        propertyName,
        message: 'Property information updated successfully'
      })

    } catch (apiError: any) {
      logger.error('Failed to fetch GA4 property info', apiError)
      return NextResponse.json(
        { error: `Failed to fetch property info: ${apiError.message}` },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error('GA4 setup property error', error)
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    )
  }
}
