import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';
import { logger } from '@/lib/logger';


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    // Create redirect response
    const response = NextResponse.redirect(new URL('/auth/simple-signin', request.url));

    // Clear the session cookie on the redirect response
    response.cookies.set(SimpleAuth.COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Also try to clear any other auth cookies that might exist
    response.cookies.set('next-auth.session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    
    response.cookies.set('__Secure-next-auth.session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (error) {
    logger.error('Signout error:', error);
    // Still redirect even on error, but log it
    const response = NextResponse.redirect(new URL('/auth/simple-signin', request.url));
    response.cookies.set(SimpleAuth.COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    return response;
  }
}