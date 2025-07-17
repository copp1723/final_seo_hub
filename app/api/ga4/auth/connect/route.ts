import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'

export async function GET(request: NextRequest) {
  // EMERGENCY DEMO FIX: Hardcode session for OAuth
  const session = {
    user: {
      id: 'user-super-admin-001',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN'
    }
  }
  console.log('[GA4 CONNECT] Using hardcoded session for demo')

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
  authUrl.searchParams.set('state', session.user.id) // Pass userId as state
  console.log('[GA4 CONNECT] Using state:', session.user.id)

  return NextResponse.redirect(authUrl.toString())
}
