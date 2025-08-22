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
  const cookieName = SimpleAuth.COOKIE_NAME;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Clear cookie with all possible domain variations
  const domains = [];
  if (isProduction && host) {
    const baseDomain = getCookieDomain(host);
    if (baseDomain) domains.push(baseDomain);
    domains.push(host.split(':')[0]); // Without port
  }
  domains.push(undefined); // No domain
  
  // Clear cookie with all domain variations
  domains.forEach(domain => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      ...(domain && { domain })
    });
  });
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
    // Clear cookies even if there's an error but return proper error response
    const response = NextResponse.json({ 
      success: false, 
      error: 'Logout failed' 
    }, { status: 500 })
    clearSessionCookie(response, request.headers.get('host'))
    return response
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
    const redirect = NextResponse.redirect(new URL('/auth/simple-signin?error=logout_failed', request.url))
    clearSessionCookie(redirect, request.headers.get('host'))
    return redirect
  }
}
