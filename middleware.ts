import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/error', '/api/health', '/api/onboarding'] // Add /api/onboarding to public for submission
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow access to API routes needed before authentication or onboarding is complete
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/csrf')) {
    return NextResponse.next();
  }

  if (isPublicRoute && pathname !== '/api/onboarding') { // Let /api/onboarding be handled by auth check
    return NextResponse.next()
  }
  
  // Check authentication for protected routes
  const session = await auth() // Session type should include onboardingCompleted
  
  if (!session?.user) {
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

  // User is authenticated, check onboarding status
  const user = session.user as { onboardingCompleted?: boolean } // Cast to include our custom field

  if (!user.onboardingCompleted && pathname !== '/onboarding') {
    // If onboarding is not completed and the user is not already on the onboarding page,
    // redirect them to onboarding.
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (user.onboardingCompleted && pathname === '/onboarding') {
    // If onboarding is completed and the user tries to access the onboarding page,
    // redirect them to the dashboard.
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
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