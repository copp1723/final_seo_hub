import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { oauthDealershipResolver } from '@/lib/services/oauth-dealership-resolver'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await SimpleAuth.getSessionFromRequest(request)

  if (!session?.user?.id) {
    console.warn('[GA4 CONNECT] Unauthorized attempt - No user ID in session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current dealership context from query params
  const url = new URL(request.url)
  const currentDealershipId = url.searchParams.get('dealershipId') || undefined
  
  // Prepare OAuth state with dealership context
  const state = oauthDealershipResolver.prepareOAuthState(session.user.id, currentDealershipId)
  console.log('[GA4 CONNECT] Using enhanced state with dealership context:', { userId: session.user.id, dealershipId: currentDealershipId })

  const SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics',
    'https://www.googleapis.com/auth/analytics.edit',
    'https://www.googleapis.com/auth/analytics.manage.users'
  ]

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES.join(' '))
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state) // Pass enhanced state with dealership context

  // Best-effort cache clear for current dealership context to avoid stale empties on new connection
  try {
    const { analyticsCoordinator } = await import('@/lib/analytics/analytics-coordinator')
    await analyticsCoordinator.invalidateDealershipCache(session.user.id, currentDealershipId)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('GA4 connect pre-emptive cache invalidation', { userId: session.user.id, dealershipId: currentDealershipId })
    }
  } catch (e) {
    logger.warn('GA4 connect cache invalidation failed (non-fatal)', { error: e, userId: session.user.id })
  }

  return NextResponse.redirect(authUrl.toString())
}
