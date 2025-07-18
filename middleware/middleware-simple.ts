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
  const hasCookie = request.cookies.has('seo-hub-session');
  
  if (!hasCookie) {
    // Create a simple auto-login token
    const autoLoginToken = Buffer.from(JSON.stringify({
      userId: '3e50bcc8-cd3e-4773-a790-e0570de37371',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    })).toString('base64');
    
    response.cookies.set('seo-hub-session', autoLoginToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    });
  }

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