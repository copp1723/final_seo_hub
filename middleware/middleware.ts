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

  // AUTO-LOGIN: Create super admin session if none exists
  let session = await SimpleAuth.getSessionFromRequest(request);
  if (!session) {
    // Create auto-login session
    const superAdminToken = await SimpleAuth.createSession({
      id: 'user-super-admin-001',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      agencyId: null,
      dealershipId: null,
      name: 'Josh Copp (Auto Super Admin)'
    });
    
    const response = NextResponse.next();
    response.cookies.set(SimpleAuth.COOKIE_NAME, superAdminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    });
    return response;
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