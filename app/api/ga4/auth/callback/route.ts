import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { encrypt } from '@/lib/encryption'
import { oauthDealershipResolver } from '@/lib/services/oauth-dealership-resolver'

export const dynamic = 'force-dynamic';

// OAuth error mapping for user-friendly messages
function mapOAuthErrorToUserMessage(error: string): string {
  const errorMappings: Record<string, string> = {
    'access_denied': 'Permission denied. Please grant access to continue.',
    'invalid_request': 'Invalid request. Please try again.',
    'invalid_client': 'Authentication error. Please contact support.',
    'invalid_grant': 'Authentication expired. Please try again.',
    'unsupported_response_type': 'Configuration error. Please contact support.',
    'invalid_scope': 'Permission error. Please contact support.',
    'server_error': 'Google services temporarily unavailable. Please try again.',
    'temporarily_unavailable': 'Google services temporarily unavailable. Please try again.'
  }
  
  return errorMappings[error] || 'Connection failed. Please try again.'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('[GA4 CALLBACK] Received state:', state)
    logger.info('GA4 OAuth callback received', { code: !!code, state, error })

    if (error) {
      logger.error('GA4 OAuth error from Google', { error })
      // Map specific OAuth errors to user-friendly messages
      const userFriendlyError = mapOAuthErrorToUserMessage(error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=${encodeURIComponent(userFriendlyError)}`)
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

    // Parse OAuth state to get user context
    const stateData = oauthDealershipResolver.parseOAuthState(state)
    if (!stateData?.userId) {
      logger.error('GA4 OAuth: Invalid state data - missing userId')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&error=invalid_request`)
    }
    
    // Validate userId format (basic UUID/string validation)
    if (typeof stateData.userId !== 'string' || stateData.userId.length < 8) {
      logger.error('GA4 OAuth: Invalid userId format in state')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&error=invalid_request`)
    }

    const userId = stateData.userId

    // Get user from database
    let user = null
    try {
      user = await prisma.users.findUnique({
        where: { id: userId }
      })
      logger.info('GA4 OAuth: User lookup result', { userId, found: !!user })
    } catch (dbError) {
      logger.error('GA4 OAuth: Database error during user lookup', { 
        userId, 
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined 
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=${encodeURIComponent('Database error')}`)
    }

    if (!user) {
      logger.error('GA4 OAuth: User not found in database', { 
        userId,
        stateType: typeof state,
        stateLength: state?.length 
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&error=session_expired`)
    }
    
    console.log('[GA4 CALLBACK] Retrieved user from database', { userId: user.id, email: user.email })

    // Resolve correct dealership for this OAuth connection
    const dealershipResolution = await oauthDealershipResolver.resolveDealershipForCallback(userId, stateData)
    
    if (!dealershipResolution.isValid) {
      logger.error('GA4 OAuth: Invalid dealership resolution', {
        userId,
        reason: dealershipResolution.reason
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=access_denied`)
    }

    const dealershipId = dealershipResolution.dealershipId
    logger.info('Creating GA4 connection with resolved dealership', { userId, dealershipId, propertyId })

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    // Use transaction for consistent connection management
    let connection: any = null
    try {
      await prisma.$transaction(async (tx) => {
        // Clean up any orphaned connections first
        try {
          await oauthDealershipResolver.cleanupOrphanedConnections(userId)
        } catch (cleanupError) {
          // Log cleanup failure but don't fail the transaction
          logger.warn('GA4 OAuth: Failed to cleanup orphaned connections', { 
            userId, 
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' 
          })
        }

        // Validate dealership access within transaction
        const userContext = await oauthDealershipResolver.getUserContext(userId)
        if (dealershipId && userContext && !(await oauthDealershipResolver.validateDealershipAccess(userContext, dealershipId))) {
          throw new Error('User no longer has access to the specified dealership')
        }

        // Find existing connection
        connection = await tx.ga4_connections.findFirst({
          where: { userId, dealershipId }
        })
        logger.info('GA4 OAuth: Existing connection lookup', { found: !!connection, userId, dealershipId })

        if (connection) {
          connection = await tx.ga4_connections.update({
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
          logger.info('GA4 OAuth: Connection updated', { connectionId: connection.id })
        } else {
          connection = await tx.ga4_connections.create({
            data: {
              userId,
              dealershipId,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
              propertyId,
              propertyName,
              email: user.email
            }
          })
          logger.info('GA4 OAuth: New connection created', { connectionId: connection.id })
        }
      })
    } catch (dbError) {
      logger.error('GA4 OAuth: Transaction failed during connection upsert', { 
        userId,
        dealershipId,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        // Don't log stack trace in production to avoid information disclosure
        ...(process.env.NODE_ENV === 'development' && { stack: dbError instanceof Error ? dbError.stack : undefined })
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=connection_failed`)
    }

    logger.info('GA4 connection updated successfully', {
      userId,
      connectionId: connection?.id,
      propertyId: connection?.propertyId,
      propertyName: connection?.propertyName,
      dealershipId: connection?.dealershipId
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=success&service=ga4`)

  } catch (error) {
    // Parse URL params from request for error logging
    const url = new URL(request.url)
    const errorCode = url.searchParams.get('code')
    const errorState = url.searchParams.get('state')
    
    // Log detailed error server-side only
    logger.error('GA4 OAuth callback error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: errorCode ? 'present' : 'missing',
      hasState: !!errorState,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    });
    
    if (error && typeof error === 'object' && 'response' in error) {
      logger.error('GA4 API error response', { 
        statusCode: (error as any).response?.status,
        statusText: (error as any).response?.statusText
        // Don't log full response body to avoid sensitive data exposure
      });
    }
    
    // Return generic error message to user
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=ga4&error=connection_failed`)
  }
}
