import { NextRequest, NextResponse } from 'next/server'
import { corsMiddleware } from '@/middleware/cors'

export async function middleware(request: NextRequest) {
  // Apply CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const corsResponse = corsMiddleware(request)
    if (request.method === 'OPTIONS') {
      return corsResponse
    }
  }

  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/error', '/api/health', '/api/onboarding', '/api/debug', '/api/seoworks/webhook', '/api/seoworks/webhook-test', '/api/seoworks/mapping', '/api/seoworks/onboard', '/test-onboarding', '/api/invitation']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow access to API routes needed before authentication or onboarding is complete
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/csrf')) {
    return NextResponse.next();
  }

  if (isPublicRoute && pathname !== '/api/onboarding') {
    return NextResponse.next()
  }
  
  // Check for session cookie (works for both dev and prod)
  const sessionToken =
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token')

  if (!sessionToken) {
    if (pathname !== '/' && pathname !== '/onboarding') {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next();
  }

  // You cannot check onboardingCompleted in middleware with database sessions
  // If you need onboarding logic, handle it in your page/server logic

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}