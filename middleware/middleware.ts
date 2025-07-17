import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

const authRoutes = [
  '/auth/signin',
  '/auth/simple-signin',
  '/auth/error'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Check for existing session
  let session = await SimpleAuth.getSessionFromRequest(request);
  if (!session) {
    // No session - redirect to login for protected routes
    if (pathname.startsWith('/dashboard') ||
        pathname.startsWith('/requests') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/reporting') ||
        pathname.startsWith('/tasks') ||
        pathname.startsWith('/chat') ||
        pathname.startsWith('/focus-request') ||
        pathname.startsWith('/super-admin') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/agency')) {
      return NextResponse.redirect(new URL('/auth/simple-signin', request.url));
    }
  }

  // If trying to access auth routes with session, redirect to dashboard
  if (isAuthRoute && session) {
    const siteUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    return NextResponse.redirect(new URL('/dashboard', siteUrl));
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