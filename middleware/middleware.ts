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

  const session = await SimpleAuth.getSessionFromRequest(request);
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If trying to access a protected route without a session, redirect to signin
  if (isProtectedRoute && !session) {
    const callbackUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(new URL(`/auth/simple-signin?callbackUrl=${callbackUrl}`, request.url));
  }

  // If session exists and trying to access an auth route, redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow the request to continue
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