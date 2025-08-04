/************************************************************
 * Middleware: Pass-through for all routes except API, static,
 * and image optimization files.
 * 
 * Currently, this middleware does not modify requests or responses.
 * Place authentication or session management logic here if needed.
 ************************************************************/

import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all API routes, static files, and image optimization files to pass through
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For all other routes, simply continue without modification
  const response = NextResponse.next();

  // Removed unused cookie check for clarity and simplicity

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