import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'

const authRoutes = [
  '/auth/signin',
  '/auth/simple-signin',
  '/auth/error'
]

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isLogoutRedirect = searchParams.has('logout') && searchParams.get('logout') === 'true'

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] Path: ${pathname}`);
  }

  // Skip for API/next/static/assets
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const session = await SimpleAuth.getSessionFromRequest(request)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Session:', session ? 'Exists' : 'Does not exist');
  }

  // Allow logout redirects to pass through even if session still exists
  if (isLogoutRedirect && isAuthRoute) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Logout redirect detected, allowing access to auth route');
    }
    return NextResponse.next()
  }

  // Prevent accessing auth routes when already signed in
  if (isAuthRoute && session) {
    const siteUrl = process.env.NEXTAUTH_URL || request.url
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] User is authenticated, redirecting from auth route to /dashboard');
    }
    return NextResponse.redirect(new URL('/dashboard', siteUrl))
  }

  // Protect all app routes except explicitly public ones
  // NOTE: Do not treat the root path '/' as public — if a user has no session
  // we should send them to the sign-in page instead of serving a missing
  // root page (which caused a 404 after clearing browser cache).
  const isPublic = pathname.startsWith('/privacy') || pathname.startsWith('/terms')
  const isApi = pathname.startsWith('/api')

  if (!isPublic && !isApi && !session) {
    const siteUrl = process.env.NEXTAUTH_URL || request.url
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] User is not authenticated, redirecting to /auth/simple-signin');
    }
    return NextResponse.redirect(new URL('/auth/simple-signin', siteUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}