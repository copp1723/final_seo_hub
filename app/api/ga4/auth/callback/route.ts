import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { encrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the userId
    const error = searchParams.get('error')

    console.log('[GA4 CALLBACK] Received state:', state)
    logger.info('GA4 OAuth callback received', { code: !!code, state, error })

    if (error) {
      logger.error('GA4 OAuth error from Google', { error })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      logger.error('GA4 OAuth missing parameters', { hasCode: !!code, hasState: !!state })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=Missing authorization code`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )

    logger.info('Exchanging code for tokens', { hasClientId: !!process.env.GOOGLE_CLIENT_ID })
    const { tokens } = await oauth2Client.getToken(code)
    logger.info('Tokens received', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token })
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Set credentials and fetch available properties
    oauth2Client.setCredentials(tokens)

    let propertyId = '320759942' // Default to Jay Hatfield Chevrolet
    let propertyName = 'Jay Hatfield Chevrolet'

    try {
      // Try to fetch actual properties the user has access to
      const analyticsAdmin = google.analyticsadmin({ version: 'v1alpha', auth: oauth2Client })
      const response = await analyticsAdmin.accounts.list()

      if (response.data.accounts && response.data.accounts.length > 0) {
        // Get properties for the first account
        const accountName = response.data.accounts[0].name
        const propertiesResponse = await analyticsAdmin.properties.list({
          filter: `parent:${accountName}`
        })

        if (propertiesResponse.data && propertiesResponse.data.properties && propertiesResponse.data.properties.length > 0) {
          const firstProperty = propertiesResponse.data.properties[0]
          // Extract property ID from the resource name (e.g., "properties/123456789")
          const extractedPropertyId = firstProperty.name?.split('/')[1]
          if (extractedPropertyId) {
            propertyId = extractedPropertyId
            propertyName = firstProperty.displayName || 'Google Analytics Property'
            logger.info('Using user\'s first available GA4 property', { propertyId, propertyName })
          }
        }
      }
    } catch (apiError) {
      logger.warn('Failed to fetch user properties, using default', {
        error: apiError instanceof Error ? apiError.message : 'Unknown error',
        defaultPropertyId: propertyId
      })
    }

    // Get user from database using state (userId) from OAuth flow
    const user = await prisma.users.findUnique({
      where: { id: state },
      include: { dealerships: true }
    })

    if (!user) {
      logger.error('GA4 OAuth: User not found', { userId: state })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=User not found`)
    }
    
    console.log('[GA4 CALLBACK] Retrieved user from database', { userId: user.id, email: user.email })

    const dealershipId = user.dealerships?.id || null
    logger.info('Creating GA4 connection', { userId: state, dealershipId, propertyId })

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    // Manually upsert to avoid composite key name issues
    let connection = await prisma.ga4_connections.findFirst({
      where: { userId: state, dealershipId }
    })

    if (connection) {
      connection = await prisma.ga4_connections.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          propertyId,
          propertyName,
          updatedAt: new Date()
        }
      })
    } else {
      connection = await prisma.ga4_connections.create({
        data: {
          userId: state,
          dealershipId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          propertyId,
          propertyName
        }
      })
    }

    logger.info('GA4 connection updated successfully', {
      userId: state,
      connectionId: connection.id,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=success&service=ga4`)

  } catch (error) {
    // Parse URL params from request for error logging
    const url = new URL(request.url)
    const errorCode = url.searchParams.get('code')
    const errorState = url.searchParams.get('state')
    
    logger.error('GA4 OAuth callback error', error, {
      code: errorCode ? 'present' : 'missing',
      state: errorState,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });
    if (error && typeof error === 'object' && 'response' in error) {
      logger.error('GA4 API error response', { response: error.response });
    }
    const errorMessage = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=${encodeURIComponent(errorMessage)}`)
  }
}
