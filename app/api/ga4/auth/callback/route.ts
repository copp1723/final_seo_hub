import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the userId
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Missing authorization code`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Failed to obtain tokens`)
    }

    // Check for encryption key
    if (!process.env.ENCRYPTION_KEY) {
      logger.error('ENCRYPTION_KEY is not set in environment variables')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Server configuration error`)
    }

    // Import encryption function
    const { encrypt } = await import('@/lib/encryption')

    // Get user's dealership ID
    const user = await prisma.user.findUnique({
      where: { id: state },
      select: { dealershipId: true }
    })

    if (!user?.dealershipId) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=User not assigned to dealership`)
    }

    // Check if dealership already has a property selected
    const existingConnection = await prisma.gA4Connection.findUnique({
      where: { dealershipId: user.dealershipId }
    })
    
    // Try to fetch property info from Google Analytics
    let propertyId = existingConnection?.propertyId || null
    let propertyName = existingConnection?.propertyName || null
    
    // Only fetch new property if none was previously selected
    if (!propertyId) {
      try {
        oauth2Client.setCredentials(tokens)
        const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })
        const response = await analyticsAdmin.accounts.list()
        
        if (response.data.accounts && response.data.accounts.length > 0) {
          const account = response.data.accounts[0]
          
          // Get properties for the first account
          const propertiesResponse = await analyticsAdmin.properties.list({
            filter: `parent:${account.name}`
          })
          
          if (propertiesResponse.data.properties && propertiesResponse.data.properties.length > 0) {
            const property = propertiesResponse.data.properties[0]
            propertyId = property.name?.split('/').pop() || null
            propertyName = property.displayName || null
          }
        }
      } catch (propError) {
        logger.error('Failed to fetch GA4 property info', propError)
        // Continue without property info
      }
    } else {
      logger.info('Preserving existing property selection', {
        userId: state,
        dealershipId: user.dealershipId,
        propertyId,
        propertyName
      })
    }

    await prisma.gA4Connection.upsert({
      where: { dealershipId: user.dealershipId },
      create: {
        dealershipId: user.dealershipId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        propertyId,
        propertyName,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        propertyId,
        propertyName,
        updatedAt: new Date(),
      },
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=success`)
  } catch (error) {
    logger.error('GA4 callback error', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Authorization failed`)
  }
}
