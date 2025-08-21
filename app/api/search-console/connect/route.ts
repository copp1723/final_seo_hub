import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { google } from 'googleapis'
import { logger } from '@/lib/logger'
import { oauthDealershipResolver } from '@/lib/services/oauth-dealership-resolver'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Get session from auth
  const session = await SimpleAuth.getSessionFromRequest(req)
  
  if (!session) {
    logger.error('Search Console connect: No valid session found')
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  logger.info('Search Console connect: Valid session found', { userId: session.user.id })

  try {
    // Get current dealership context from query params
    const url = new URL(req.url)
    const currentDealershipId = url.searchParams.get('dealershipId') || undefined
    
    // Prepare OAuth state with dealership context
    const state = oauthDealershipResolver.prepareOAuthState(session.user.id, currentDealershipId)
    logger.info('Search Console OAuth initiated with enhanced state', {
      userId: session.user.id,
      dealershipId: currentDealershipId
    })

    // Check if this is a popup-based OAuth flow
    const isPopup = url.searchParams.get('popup') === 'true'

    // Add popup parameter to callback URL if needed
    const callbackUrl = isPopup
      ? `${process.env.NEXTAUTH_URL}/api/search-console/callback?popup=true`
      : `${process.env.NEXTAUTH_URL}/api/search-console/callback`

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/siteverification.verify_only'
      ],
      prompt: 'consent',
      state, // Pass enhanced state with dealership context
    })

    // Best-effort cache clear for current dealership context to avoid stale empties on new connection
    try {
      const { analyticsCoordinator } = await import('@/lib/analytics/analytics-coordinator')
      await analyticsCoordinator.invalidateDealershipCache(session.user.id, currentDealershipId)
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Search Console connect pre-emptive cache invalidation', { userId: session.user.id, dealershipId: currentDealershipId })
      }
    } catch (e) {
      logger.warn('Search Console connect cache invalidation failed (non-fatal)', { error: e, userId: session.user.id })
    }

    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('Search Console connect error', error, {
      userId: session.user.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Failed to initiate Search Console connection' },
      { status: 500 }
    )
  }
}
