import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all API routes to pass through
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static files, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For all other routes, add a simple session cookie if not present
  const response = NextResponse.next();
  const hasCookie = request.cookies && typeof request.cookies.has === 'function'
    ? request.cookies.has('seo-hub-session')
    : false;
  
  // Remove auto-login for security - users must authenticate properly
  // This was a security vulnerability that automatically logged in as admin

  return response;
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