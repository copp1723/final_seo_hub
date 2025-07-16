import { NextRequest, NextResponse } from 'next/server'
import { corsMiddleware } from '@/middleware/cors'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static assets - CRITICAL for preventing MIME type errors
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('.') && (pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.map') || pathname.endsWith('.ico'))
  ) {
    return NextResponse.next()
  }

  // Apply CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const corsResponse = corsMiddleware(request)
    if (request.method === 'OPTIONS') {
      return corsResponse
    }
  }
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/error', '/api/health', '/api/onboarding', '/api/debug', '/api/seoworks/webhook', '/api/seoworks/webhook-test', '/api/seoworks/mapping', '/api/seoworks/onboard', '/test-onboarding', '/api/invitation', '/api/test-email']
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

  // Add detailed cookie debugging for protected routes
  if (!isPublicRoute) {
    console.log('🔍 Middleware cookie check for:', pathname)
    console.log('- All cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`))
    console.log('- next-auth.session-token:', request.cookies.get('next-auth.session-token')?.value?.substring(0, 20) + '...')
    console.log('- __Secure-next-auth.session-token:', request.cookies.get('__Secure-next-auth.session-token')?.value?.substring(0, 20) + '...')
    console.log('- sessionToken found:', !!sessionToken)
  }

  if (!sessionToken) {
    console.log('❌ No session token found, redirecting to signin')
    if (pathname !== '/' && pathname !== '/onboarding') {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next();
  }

  console.log('✅ Session token found, allowing access to:', pathname)

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
     * - files with extensions (js, css, map, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'
  ]
}
