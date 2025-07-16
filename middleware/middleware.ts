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

  // EMERGENCY BYPASS - Always allow access
  console.log('🚨 EMERGENCY BYPASS: Middleware allowing all access 🚨');
  
  // Skip auth routes since we're always "authenticated"
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isAuthRoute) {
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