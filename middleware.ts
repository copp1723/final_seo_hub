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
  const publicRoutes = ['/auth/signin', '/auth/error', '/api/health', '/api/onboarding', '/api/debug'] // Add debug endpoints for troubleshooting
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow access to API routes needed before authentication or onboarding is complete
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/csrf')) {
    return NextResponse.next();
  }

  if (isPublicRoute && pathname !== '/api/onboarding') { // Let /api/onboarding be handled by auth check
    return NextResponse.next()
  }
  
  // Check for session cookie (works for both dev and prod)
  const sessionToken =
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token')

  if (!sessionToken) {
    // If not authenticated and not trying to access the root (which might be a landing page)
    // or the onboarding page itself (which also needs to be accessible to submit)
    if (pathname !== '/' && pathname !== '/onboarding') {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    // Allow access to root or onboarding page if not authenticated
    // (e.g. landing page, or if onboarding itself is the first page they see)
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}