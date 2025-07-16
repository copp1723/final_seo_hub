import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/agency',
  '/settings',
  '/requests',
  '/tasks',
  '/reporting',
  '/chat',
  '/onboarding',
  '/super-admin'
];

const authRoutes = [
  '/auth/signin',
  '/auth/simple-signin',
  '/auth/error'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Get session
  const session = await SimpleAuth.getSessionFromRequest(request);
  
  // Debug session info
  if (session) {
    console.log(`✅ Middleware: Authenticated user ${session.user.email} with role ${session.user.role}`);
  } else {
    console.log(`❌ Middleware: No session found for path ${pathname}`);
  }

  // Handle protected routes
  if (isProtectedRoute) {
    if (!session) {
      // Redirect to simple-signin if not authenticated
      const signinUrl = new URL('/auth/simple-signin', request.url);
      signinUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signinUrl);
    }
  }

  // Handle auth routes - redirect to dashboard if already authenticated
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};