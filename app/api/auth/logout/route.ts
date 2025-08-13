import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function getCookieDomain(host?: string | null) {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN
  if (!host) return undefined
  const parts = host.split(':')[0].split('.')
  if (parts.length > 2) {
    return `.${parts.slice(-2).join('.')}`
  }
  return undefined
}

function clearSessionCookie(response: NextResponse, host?: string | null) {
  const domain = process.env.NODE_ENV === 'production' ? getCookieDomain(host) : undefined
  response.cookies.set(SimpleAuth.COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    domain
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    const response = NextResponse.json({ success: true })
    clearSessionCookie(response, request.headers.get('host'))
    if (session) {
      logger.info('User logged out', { userId: session.user.id, email: session.user.email })
    }
    return response
  } catch (error) {
    logger.error('Logout error', error)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    const redirect = NextResponse.redirect(new URL('/auth/simple-signin', request.url))
    clearSessionCookie(redirect, request.headers.get('host'))
    if (session) {
      logger.info('User logged out via GET', { userId: session.user.id, email: session.user.email })
    }
    return redirect
  } catch (error) {
    logger.error('Logout error', error)
    return NextResponse.redirect(new URL('/auth/error?error=Configuration', request.url))
  }
}
