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
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Set credentials to get user info and properties
    oauth2Client.setCredentials(tokens)
    const analytics = google.analytics('v3')
    
    let propertyId = '320759942' // Default to Jay Hatfield Chevrolet
    let propertyName = 'Jay Hatfield Chevrolet'
    
    try {
      // Try to get user's GA4 properties
      const accountsResponse = await analytics.management.accounts.list({
        auth: oauth2Client
      })
      
      if (accountsResponse.data.items?.[0]) {
        const account = accountsResponse.data.items[0]
        propertyName = account.name || 'Default Property'
        // Use a more realistic property ID if available
        propertyId = account.id || '320759942'
      }
    } catch (propertyError) {
      logger.warn('Could not fetch GA4 properties, using defaults', { error: propertyError })
    }

    // Use upsert to update existing connection or create new one
    const connection = await prisma.ga4_connections.upsert({
      where: { userId: state },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        propertyId,
        propertyName,
        updatedAt: new Date()
      },
      create: {
        userId: state,
        dealershipId: state === '3e50bcc8-cd3e-4773-a790-e0570de37371' ? 'cmd50a9ot0001pe174j9rx5dh' : null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        propertyId,
        propertyName
      }
    })

    logger.info('GA4 connection updated successfully', {
      userId: state,
      connectionId: connection.id,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=success&service=ga4`)

  } catch (error) {
    logger.error('GA4 OAuth callback error', { error })
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=${encodeURIComponent('Connection failed')}`)
  }
}
