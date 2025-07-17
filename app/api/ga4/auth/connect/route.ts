import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'

export async function GET(request: NextRequest) {
  const session = await SimpleAuth.getSessionFromRequest(request)
  console.log('[GA4 CONNECT] Session:', session)
  console.log('[GA4 CONNECT] Production diagnosis - user ID that will be sent as state:', session?.user.id)
  console.log('[GA4 CONNECT] Environment URL:', process.env.NEXTAUTH_URL)
  if (!session?.user.id) {
    return NextResponse.redirect('/auth/simple-signin')
  }

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
