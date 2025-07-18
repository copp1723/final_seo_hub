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

  // Check if user has valid session for protected routes
  const session = await SimpleAuth.getSessionFromRequest(request);
  
  // If trying to access auth routes with session, redirect to dashboard
  if (isAuthRoute && session) {
    const siteUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    return NextResponse.redirect(new URL('/dashboard', siteUrl));
  }
  
  // If trying to access protected routes without session, redirect to login
  if (!isAuthRoute && !session && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
    const siteUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    return NextResponse.redirect(new URL('/auth/simple-signin', siteUrl));
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