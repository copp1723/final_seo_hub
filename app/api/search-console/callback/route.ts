import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { oauthDealershipResolver } from '@/lib/services/oauth-dealership-resolver'
import { getSearchConsoleUrl } from '@/lib/dealership-property-mapping'

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

// Schema sync fix - ensure email field is recognized
// Updated: 2025-08-19 to fix production Prisma client sync

export async function GET(req: NextRequest) {
  // Get session from auth
  const session = await SimpleAuth.getSessionFromRequest(req)
  
  if (!session) {
    logger.error('Search Console callback: No valid session found')
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/simple-signin?error=Authentication required`)
  }
  
  logger.info('Search Console callback: Valid session found', { userId: session.user.id })

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  logger.info('Search Console OAuth callback received', { 
    hasCode: !!code, 
    hasState: !!state, 
    error, 
    userId: session.user.id 
  })
  
  // Parse OAuth state to get dealership context if available
  let stateData = null
  if (state) {
    stateData = oauthDealershipResolver.parseOAuthState(state)
    
    // Enhanced state validation
    if (!stateData) {
      logger.error('Search Console OAuth: Failed to parse state')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&error=invalid_request`)
    }
    
    // Verify state matches current session for security
    if (stateData.userId && stateData.userId !== session.user.id) {
      logger.error('Search Console OAuth: State userId mismatch', {
        sessionUserId: session.user.id,
        stateUserId: stateData.userId
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&error=invalid_request`)
    }
    
    // Validate userId format
    if (stateData.userId && (typeof stateData.userId !== 'string' || stateData.userId.length < 8)) {
      logger.error('Search Console OAuth: Invalid userId format in state')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&error=invalid_request`)
    }
  }
  
  if (error) {
    logger.error('Search Console OAuth error from Google', { error, userId: session.user.id })
    // Map specific OAuth errors to user-friendly messages
    const userFriendlyError = mapOAuthErrorToUserMessage(error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent(userFriendlyError)}`)
  }

  if (!code) {
    logger.error('Search Console callback: No authorization code received', { userId: session.user.id })
    // Enhanced error message for browser compatibility issues
    const browserError = 'Browser privacy settings may be blocking the connection. Try disabling ad blockers or using incognito mode.'
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent(browserError)}`)
  }

  try {
    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    logger.info('Exchanging code for tokens', { userId: session.user.id })
    const { tokens } = await oauth2Client.getToken(code)
    logger.info('Tokens received', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      userId: session.user.id
    })
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google')
    }

    // Set credentials to get site list
    oauth2Client.setCredentials(tokens)
    const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client })
    
    // Resolve correct dealership for this OAuth connection first
    const dealershipResolution = await oauthDealershipResolver.resolveDealershipForCallback(session.user.id, stateData)
    
    if (!dealershipResolution.isValid) {
      logger.error('Search Console OAuth: Invalid dealership resolution', {
        userId: session.user.id,
        reason: dealershipResolution.reason
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=access_denied`)
    }

    const dealershipId = dealershipResolution.dealershipId
    
    // Get dealership-specific Search Console URL as default
    const mappedUrl = getSearchConsoleUrl(dealershipId)
    let siteUrl = mappedUrl || 'https://example.com/'
    let siteName = mappedUrl ? mappedUrl.replace(/https?:\/\//, '').replace(/\/$/, '') : 'example.com'
    
    try {
      // Try to get user's Search Console sites
      const sitesResponse = await searchConsole.sites.list()
      
      if (sitesResponse.data.siteEntry?.[0]) {
        const site = sitesResponse.data.siteEntry[0]
        siteUrl = site.siteUrl || siteUrl
        siteName = site.siteUrl?.replace(/https?:\/\//, '').replace(/\/$/, '') || siteName
      }
    } catch (sitesError) {
      logger.warn('Could not fetch Search Console sites, using defaults', { error: sitesError })
    }

    // Get user's dealership for proper connection
    let user = null
    try {
      user = await prisma.users.findUnique({
        where: { id: session.user.id }
      })
      logger.info('Search Console: User lookup result', { userId: session.user.id, found: !!user })
    } catch (dbError) {
      logger.error('Search Console: Database error during user lookup', { 
        userId: session.user.id,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined 
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=${encodeURIComponent('Database error')}`)
    }
    logger.info('Creating Search Console connection with resolved dealership', { 
      userId: session.user.id, 
      dealershipId, 
      siteUrl, 
      siteName 
    })

    // Use transaction for consistent connection management
    let connection: any = null
    try {
      await prisma.$transaction(async (tx) => {
        // Clean up any orphaned connections first
        try {
          await oauthDealershipResolver.cleanupOrphanedConnections(session.user.id)
        } catch (cleanupError) {
          // Log cleanup failure but don't fail the transaction
          logger.warn('Search Console: Failed to cleanup orphaned connections', { 
            userId: session.user.id, 
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' 
          })
        }

        // Validate dealership access within transaction
        const userContext = await oauthDealershipResolver.getUserContext(session.user.id)
        if (dealershipId && userContext && !(await oauthDealershipResolver.validateDealershipAccess(userContext, dealershipId))) {
          throw new Error('User no longer has access to the specified dealership')
        }

        // Find existing connection
        connection = await tx.search_console_connections.findFirst({
          where: { userId: session.user.id, dealershipId }
        })
        logger.info('Search Console: Existing connection lookup', { found: !!connection, userId: session.user.id, dealershipId })

        if (connection) {
          connection = await tx.search_console_connections.update({
            where: { id: connection.id },
            data: {
              accessToken: encrypt(tokens.access_token!),
              refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
              siteUrl,
              siteName,
              updatedAt: new Date()
            }
          })
          logger.info('Search Console: Connection updated', { connectionId: connection.id })
        } else {
          connection = await tx.search_console_connections.create({
            data: {
              userId: session.user.id,
              dealershipId,
              accessToken: encrypt(tokens.access_token!),
              refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
              siteUrl,
              siteName,
              email: user?.email,
              updatedAt: new Date()
            }
          })
          logger.info('Search Console: New connection created', { connectionId: connection.id })
        }
      })
    } catch (dbError) {
      logger.error('Search Console: Transaction failed during connection upsert', { 
        userId: session.user.id,
        dealershipId,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        // Don't log stack trace in production to avoid information disclosure
        ...(process.env.NODE_ENV === 'development' && { stack: dbError instanceof Error ? dbError.stack : undefined })
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=connection_failed`)
    }

    logger.info('Search Console connection updated successfully', {
      userId: session.user.id,
      connectionId: connection?.id,
      siteUrl: connection?.siteUrl,
      siteName: connection?.siteName,
      dealershipId: connection?.dealershipId
    })

  // Check if this is a popup-based OAuth flow
  const { searchParams } = new URL(req.url)
  const isPopup = searchParams.get('popup') === 'true'

    if (isPopup) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/api/oauth/popup-callback?success=true&service=search_console`)
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=success&service=search_console`)

  } catch (error) {
    // Log detailed error server-side only
    logger.error('Search Console OAuth callback error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: session?.user?.id,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    })
    
    // Return generic error message to user
    // Check if this is a popup-based OAuth flow
    const { searchParams } = new URL(req.url)
    const isPopup = searchParams.get('popup') === 'true'

    if (isPopup) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/api/oauth/popup-callback?success=false&service=search_console&error=${encodeURIComponent('connection_failed')}`)
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?tab=integrations&status=error&service=search_console&error=connection_failed`)
  }
}
