import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's dealership ID
    const user = await prisma.user.findUnique({
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
    const connection = await prisma.gA4Connection.findUnique({
      where: { dealershipId: user.dealershipId }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'No GA4 connection found. Please connect Google Analytics first.' },
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
      refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined,
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
      await prisma.gA4Connection.update({
        where: { dealershipId: user.dealershipId },
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